const Order = require('../../models/orderSchema');
const Cart = require('../../models/cartSchema'); 
const User = require('../../models/userSchema');
const Product= require('../../models/productSchema');
const Razorpay = require('razorpay');
const Address = require('../../models/addressSchema');
const Wallet = require('../../models/walletSchema');
const Coupon = require('../../models/couponSchema');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ success: false, message: "User not authenticated." });
        }
        const userCart = await Cart.findOne({ userId }).populate({
            path: 'items.productId',
            populate: { path: 'category', select: 'categoryOffer' }
        });

        if (!userCart || userCart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty!, add products to the cart" });
        }

        // Check product availability and quantity
        for (const cartItem of userCart.items) {
            const product = await Product.findById(cartItem.productId._id);
            
            if (!product) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Product ${cartItem.productId.productName} is no longer available.` 
                });
            }

            if (!product.isListed) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Product ${cartItem.productId.productName} is currently unavailable.` 
                });
            }

            if (cartItem.quantity > product.quantity) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Only ${product.quantity} units of ${product.productName} are available. Please update your cart.` 
                });
            }
        }

        const { addressId, paymentMethod, totalPrice } = req.body;
        const sessionCoupon = req.session.appliedCoupon;

        if (!addressId && !paymentMethod) {
            return res.status(400).json({ success: false, message: "Address and payment method are required." });
        }

        const addressDocument = await Address.findOne({
            userId,
            address: { $elemMatch: { _id: addressId } },
        });

        if (!addressDocument) {
            return res.status(404).json({ success: false, message: "Address not found." });
        }

        const address = addressDocument.address.find(
            (addr) => addr._id.toString() === addressId
        );

        if (!address) {
            return res.status(404).json({ success: false, message: "Address not found." });
        }

        // Calculate prices using the same logic as checkout
        let totalAmount = 0;
        let bestOfferDiscount = 0;

        // Calculate prices and offers for each item
        userCart.items.forEach(item => {
            if (item.productId) {
                const productOffer = item.productId.productOffer || 0;
                const categoryOffer = item.productId.category?.categoryOffer || 0;
                const bestOffer = Math.max(productOffer, categoryOffer);

                const salePrice = item.productId.salePrice * item.quantity;
                const offerDiscount = (salePrice * bestOffer / 100);
                
                totalAmount += salePrice;
                bestOfferDiscount += offerDiscount;
            }
        });

        const totalAfterOffers = totalAmount - bestOfferDiscount;

        // Handle coupon discount
        let couponDiscount = 0;
        let coupon = null;
        if (sessionCoupon && sessionCoupon.couponName) {
            coupon = await Coupon.findOne({ 
                name: sessionCoupon.couponName,
                isListed: true,  
                expireOn: { $gt: new Date() }
            });

            if (coupon) {
                // Validate minimum purchase amount
                if (totalAmount < coupon.minimumPrice) {
                    return res.status(400).json({ 
                        success: false, 
                        message: `Minimum purchase amount of ₹${coupon.minimumPrice} required for this coupon.` 
                    });
                }
                
                // Calculate coupon discount ensuring it doesn't exceed the total after offers
                couponDiscount = Math.min(coupon.offerPrice, totalAfterOffers);
            } else {
                // If coupon is not found or invalid, clear the session coupon
                delete req.session.appliedCoupon;
            }
        }

        const finalAmount = totalAfterOffers - couponDiscount;
        const totalDiscount = bestOfferDiscount + couponDiscount;

        // Calculate shipping
        const freeShippingThreshold = 1000;
        const shippingRate = 0
        const shipping = finalAmount >= freeShippingThreshold ? 0 : shippingRate;
        const finalAmountWithShipping = finalAmount + shipping;

        const orderedItems = userCart.items.map((item) => ({
            product: item.productId._id,
            quantity: item.quantity,
            price: item.productId.salePrice,
            productName: item.productId.productName,
            productImage: item.productId.productImage[0],
        }));

        // Generate order ID
        const generateOrderId = () => {
            const prefix = "ORD";
            const timestamp = Date.now();
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            return `${prefix}-${timestamp}-${randomNum}`;
        };

        const orderId = generateOrderId();
        let razorpayOrderId = null;

        //online payment logic
        if (paymentMethod === "ONLINE") {
            const razorpay = new Razorpay({
                key_id: process.env.RAZORPAY__KEY_ID,
                key_secret: process.env.RAZORPAY__KEY_SECRET,
            });

            if(finalAmountWithShipping > 400000){
                return res.status(400).json({ success: false, message: "Maximum order in ONLINE should be ₹400000" });
            }
            const razorpayOrder = await razorpay.orders.create({
                amount: Math.round(finalAmountWithShipping * 100),  
                currency: "INR",
                receipt: orderId,
            });

            razorpayOrderId = razorpayOrder.id;

            // Store order details in session for later use
            const newOrder = new Order({
                userId,
                orderId,
                razorpayOrderId,
                orderedItems,
                totalPrice: totalAmount,
                discount: {
                    bestOffer: bestOfferDiscount,
                    coupon: couponDiscount,
                    total: totalDiscount
                },
                finalAmount: finalAmountWithShipping,
                couponApplied: !!coupon,
                couponDetails: coupon ? { code: coupon.name, offerPrice: couponDiscount, minimumPrice: coupon.minimumPrice } : null,
                address: {
                    name: address.name,
                    addressType: address.addressType,
                    city: address.city,
                    pinCode: address.pinCode,
                    landMark: address.landMark,
                    state: address.state,
                    phone: address.phone,
                    altPhone: address.altPhone || null,
                },
                paymentMethod,
                status: "Pending Payment",
                paymentStatus: "Unpaid",
                razorpayOrderId
            });

            await newOrder.save();

            // Update product quantities
            for (const item of orderedItems) {
                await Product.findByIdAndUpdate(
                    item.product,
                    { $inc: { quantity: -item.quantity } }
                );
            }

            // clear cart
            await Cart.findOneAndUpdate(
                {userId }, 
                { $set: { items: [] } }
            );

            res.status(200).json({
                message: "Razorpay Order created successfully!",
                razorpayOrderId,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                orderId,
            });
        } else if (paymentMethod === "COD") {
            if(finalAmountWithShipping < 10000){
                return res.status(400).json({ success: false, message: "Minimum order in COD should be ₹10000" });
            }

            const newOrder = new Order({
                userId,
                orderId,
                orderedItems,
                totalPrice: totalAmount,
                discount: {
                    bestOffer: bestOfferDiscount,
                    coupon: couponDiscount,
                    total: totalDiscount
                },
                finalAmount: finalAmountWithShipping,
                couponApplied: !!coupon,
                couponDetails: coupon ? { code: coupon.name, offerPrice: couponDiscount, minimumPrice: coupon.minimumPrice } : null,
                address: {
                    name: address.name,
                    addressType: address.addressType,
                    city: address.city,
                    pinCode: address.pinCode,
                    landMark: address.landMark,
                    state: address.state,
                    phone: address.phone,
                    altPhone: address.altPhone || null,
                },
                status: "Placed",
                paymentMethod,
                paymentStatus: "Unpaid",
            });

            // Save order to database
            await newOrder.save();
            if (coupon) {
                await Coupon.findByIdAndUpdate(coupon._id, { $addToSet: { userId: userId } });
                }
                req.session.appliedCoupon=null;

            //decrease product quantity from database
            for (const item of userCart.items) {
                const product = await Product.findById(item.productId._id);
                if (product) {
                    product.quantity -= item.quantity;
                    if (product.quantity < 0) {
                        product.quantity = 0;
                    }
                    await product.save();
                }
            }
            // Remove items from cart
            await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

            res.json({
                success: true,
                message: "Order placed successfully!",
                orderId: newOrder.orderId,
            });
        }else if(paymentMethod === "wallet"){

             const wallet = await Wallet.findOne({ userId });
            if (!wallet) {
                return res.status(404).json({ error: 'Wallet not found.' });
            }
            if(wallet.totalBalance< finalAmountWithShipping){
                return res.status(400).json({ success: false, message: "Insufficient wallet balance." });
            }
            
console.log('coupon',couponDiscount)

            const newOrder = new Order({
                userId,
                orderId,
                orderedItems,
                totalPrice: totalAmount,
                discount: {
                    bestOffer: bestOfferDiscount,
                    coupon: couponDiscount,
                    total: totalDiscount
                },
                finalAmount: finalAmountWithShipping,
                couponApplied: !!coupon,
                couponDetails: coupon ? { code: coupon.name, offerPrice: couponDiscount ,minimumPrice: coupon.minimumPrice} : null,
                address: {
                    name: address.name,
                    addressType: address.addressType,
                    city: address.city,
                    pinCode: address.pinCode,
                    landMark: address.landMark,
                    state: address.state,
                    phone: address.phone,
                    altPhone: address.altPhone || null,
                },
                status: "Placed",
                paymentMethod,
                paymentStatus: "Paid",
             });

            // Save order to database
            await newOrder.save();
            if (coupon) {
                await Coupon.findByIdAndUpdate(coupon._id, { $addToSet: { userId: userId } });  
              }
              req.session.appliedCoupon=null;

            //decrease product quantity from database
            for (const item of userCart.items) {
                const product = await Product.findById(item.productId._id);
                if (product) {
                    product.quantity -= item.quantity;
                    if (product.quantity < 0) {
                        product.quantity = 0;
                    }
                    await product.save();
                }
            }
            // Remove items from cart
            await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

            //decrease amount from wallet
            wallet.totalBalance -= finalAmountWithShipping;
            wallet.transactions.push({
                type: 'Purchase',
                amount: finalAmountWithShipping,
                orderId: newOrder.orderId,
                status: 'Completed',
                description: 'Wallet payment for order',
                date: new Date()
            });
            await wallet.save();
            

            res.json({
                success: true,
                message: "Order placed successfully!",
                orderId: newOrder.orderId,
            });
        }
    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).json({ success: false,message: "An error occurred while placing the order." });
    }
};


const verifyPayment = async (req, res) => {
    try {
        const userId = req.session.user
        const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
        const order = await Order.findOneAndUpdate(
            { razorpayOrderId: razorpayOrderId }, 
            { $set: { paymentStatus: "Paid", status: "Placed" } },
            { new: true }
        );
        if (!order) {
            return res.status(400).json({ success: false, message: "Order not found" });
        }
         const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY__KEY_SECRET)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest('hex');

        if (generatedSignature !== razorpaySignature) {
            return res.status(400).json({ success: false, message: "Invalid payment signature" });
        }
            const coupon = await Coupon.findOne({ name: order.couponDetails.code });
            if (coupon) {
                await Coupon.findByIdAndUpdate(coupon._id, { $addToSet: { userId: order.userId } });
            }
        
          req.session.appliedCoupon = null;
          
       

        // Update product quantities
        for (const item of order.orderedItems) {
            const product = await Product.findById(item.product);
            if (product) {
                product.quantity -= item.quantity;
                if (product.quantity < 0) {
                    product.quantity = 0;
                }
                await product.save();
            }
        }

        res.json({
            success: true,
            message: "Payment verified and order placed successfully",
            orderId: order.orderId
        });

    } catch (error) {
        console.error("Payment verification error:", error);
        res.status(500).json({ success: false, message: "Payment verification failed" });
    }
};


 const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.query.Id;   
        const user = req.session.user;

        if (!user) {
            return res.status(401).json({ success: false, message: "User not authenticated." });
        }

        const order = await Order.findOne({ orderId: orderId })
                .populate({
                    path: 'orderedItems.product',
                    select: 'productName regularPrice salePrice productImage brand',
                    model: 'product'  
                })
                .populate('userId', ['email', 'name', 'mobile']);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        res.render('orderSuccess', { order, user });
    } catch (error) {
        console.error('Get order details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get order details',
            error: error.message
        });
    }
};

//cancel order
const cancelOrder = async (req, res) => {
    try {
        const userId = req.session.user
        const { orderId } = req.params; 
        const { reason } = req.body;   

         const order = await Order.findOne({
            orderId,
            userId
        }).populate('orderedItems.product');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

         if (!['Placed'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: 'Order cannot be cancelled at this stage'
            });
        }
 
        order.cancelOrder.reason = reason;
        order.status = 'Cancelled'; 

        // Refund logic
        if (['ONLINE', 'wallet'].includes(order.paymentMethod)) {
            const refundAmount = order.finalAmount;

            // Fetch or create wallet
            let wallet = await Wallet.findOne({ userId });
            if (!wallet) {
                wallet = new Wallet({
                    userId,
                    totalBalance: refundAmount,
                    transactions: [{
                        type: 'Refund',
                        amount: refundAmount,
                        orderId,
                        status: 'Completed',
                        description: `Refund for cancelled order #${orderId}`,
                        date: new Date()
                    }]
                });
            } else {
                 wallet.totalBalance += refundAmount;
                wallet.transactions.push({
                    type: 'Refund',
                    amount: refundAmount,
                    orderId,
                    status: 'Completed',
                    description: `Refund for cancelled order #${orderId}`,
                    date: new Date()
                });
            }

            await wallet.save();

            // Update refund details in the order
            order.paymentStatus = 'Refunded';
            order.refundDetails = {
                amount: refundAmount,
                status: 'Completed',
                processedAt: new Date(),
                method: 'wallet'
            };
        }

        // Return items to stock
        for (const item of order.orderedItems) {
            await Product.findByIdAndUpdate(
                item.product,
                { $inc: { quantity: item.quantity } }
            );
        }

        await order.save();  

         const message = order.paymentStatus === 'Refunded'
            ? `Order cancelled successfully. ₹${order.refundDetails.amount} has been refunded to your wallet.`
            : 'Order cancelled successfully.';

        res.json({
            success: true,
            message,
            refunded: order.paymentStatus === 'Refunded',
            refundAmount: order.refundDetails?.amount || 0
        });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel order'
        });
    }
};


    // Return order request
   const returnOrder = async (req, res) => {
        try {
            const { orderId } = req.params;
            const { reason, details } = req.body;
            const userId = req.session.user

            if (!reason || !details) {
                return res.status(400).json({
                    success: false,
                    message: 'Reason and details are required'
                });
            }

            const order = await Order.findOne({ orderId: orderId, userId: userId });

            console.log('orderrerrrrrrrrrrrrrr',order);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found or does not belong to the current user'
                });
            }
 
            if (order.status !== 'Delivered') {
                return res.status(400).json({
                    success: false,
                    message: 'Only delivered orders can be returned'
                });
            }

            if (order.returnRequest && order.returnRequest.status) {
                return res.status(400).json({
                    success: false,
                    message: 'A return request has already been submitted for this order.',
                });
            }            

            order.returnRequest = {
                status: 'Pending',
                reason,
                details,
                date: new Date(),
            };

          order.status = 'Return Request';  
            await order.save();


            res.status(200).json({
            success: true,
            message: 'Return request submitted successfully.',
            returnRequest: order.returnRequest,
        });
            
        } catch (error) { 

            console.error('Error processing return order request:', error);
            res.status(500).json({
           success: false,
          message: 'Failed to process return order request. Please try again later.',
          });
            
        }
    }



    const downloadInvoice = async (req, res) => {
        try {
            const orderId = req.params.orderId;
            const order = await Order.findById(orderId)
                .populate({
                    path: 'orderedItems.product',
                    select: 'productName regularPrice productImage',
                    model: 'product'  
                })
                .populate('userId', ['email', 'name', 'mobile']);

            if (!order) {
                return res.status(404).send('Order not found');
            }

            // Create a new PDF document
            const doc = new PDFDocument({
                margin: 50,
                size: 'A4'
            });

            // Set response headers for PDF download
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=ShutterCart-Invoice-${order.orderId}.pdf`);

            // Pipe the PDF document to the response
            doc.pipe(res);

            // Debug log to check order data
            console.log('Order Data:', JSON.stringify(order, null, 2));

            // Define professional colors
            const colors = {
                primary: '#1e3799',     // Deep Royal Blue
                secondary: '#4a69bd',   // Softer Blue
                accent: '#0c2461',      // Dark Navy
                background: '#f1f2f6',  // Light Gray
                table: {
                    header: '#1e3799',  // Deep Blue for headers
                    odd: '#ffffff',     // White for odd rows
                    even: '#f8f9fa'     // Very Light Gray for even rows
                },
                text: {
                    light: '#ffffff',   // White
                    dark: '#2f3542',    // Almost Black
                    muted: '#57606f'    // Gray
                }
            };

            // Add header with company info
            doc.rect(0, 0, doc.page.width, 120).fill(colors.primary);
            
            doc.fontSize(35).font('Helvetica-Bold').fillColor(colors.text.light)
                .text('ShutterCart', 0, 40, { align: 'center' });
            
            doc.fontSize(12).font('Helvetica').fillColor(colors.text.light)
                .text('Your Premium Camera Store', 0, 80, { align: 'center' });
            
            doc.fontSize(10).fillColor(colors.text.light)
                .text('www.shuttercart.com | support@shuttercart.com', 0, 95, { align: 'center' });

            // Add invoice title
            doc.rect(50, 140, doc.page.width - 100, 40)
                .fill(colors.secondary);
            doc.fontSize(20).font('Helvetica-Bold').fillColor(colors.text.light)
                .text('INVOICE', 0, 150, { align: 'center' });

            // Create two columns for billing details
            const leftColumn = 50;
            const rightColumn = doc.page.width / 2 + 20;
            const columnWidth = doc.page.width / 2 - 70;

            // Bill To section
            doc.rect(leftColumn, 200, columnWidth, 120)
                .fill(colors.background);
            doc.fontSize(12).font('Helvetica-Bold').fillColor(colors.primary)
                .text('Bill To:', leftColumn + 10, 210);
            doc.font('Helvetica').fillColor(colors.text.dark)
                .fontSize(10)
                .text(order.userId.name || 'Customer', leftColumn + 10, 230)
                .text(order.userId.email || '', leftColumn + 10, 245)
                .text(order.userId.mobile || '', leftColumn + 10, 260);

            // Add shipping address if available
            if (order.address) {
                doc.text(order.address.addressType || '', leftColumn + 10, 275)
                    .text(order.address.city + ', ' + order.address.state || '', leftColumn + 10, 290)
                    .text('PIN: ' + (order.address.pinCode || ''), leftColumn + 10, 305);
            }

            // Invoice Details section
            doc.rect(rightColumn, 200, columnWidth, 120)
                .fill(colors.background);
            doc.fontSize(12).font('Helvetica-Bold').fillColor(colors.primary)
                .text('Invoice Details:', rightColumn + 10, 210);
            doc.font('Helvetica').fillColor(colors.text.dark)
                .fontSize(10)
                .text(`Invoice Number: ${order.orderId}`, rightColumn + 10, 230)
                .text(`Order Date: ${new Date(order.orderDate).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })}`, rightColumn + 10, 245)
                .text(`Payment Method: ${order.paymentMethod}`, rightColumn + 10, 260);

            // Add items table
            let yPos = 340;
            const tableTop = yPos;
            
            // Table header
            doc.rect(leftColumn, yPos, doc.page.width - 100, 30)
                .fill(colors.table.header);
            
            // Header text
            doc.fillColor(colors.text.light).fontSize(10).font('Helvetica-Bold');
            doc.text('Image', leftColumn + 10, yPos + 10, { width: 60 });
            doc.text('Product', leftColumn + 80, yPos + 10, { width: 200 });
            doc.text('Quantity', leftColumn + 290, yPos + 10, { width: 60 });
            doc.text('Price', leftColumn + 360, yPos + 10, { width: 70 });
            doc.text('Total', leftColumn + 440, yPos + 10, { width: 70 });

            yPos += 30;
            let totalAmount = 0;

            // Add items
            for (let i = 0; i < order.orderedItems.length; i++) {
                const item = order.orderedItems[i];
                const rowHeight = 60;

                // Alternate row background
                doc.rect(leftColumn, yPos, doc.page.width - 100, rowHeight)
                    .fill(i % 2 === 0 ? colors.table.odd : colors.table.even);

                // Add product image
                if (item.product && item.product.productImage && item.product.productImage[0]) {
                    try {
                        const relativePath = item.product.productImage[0].replace(/^\//, '');
                        const imagePath = path.join(process.cwd(), 'public', relativePath);
                        if (fs.existsSync(imagePath)) {
                            doc.image(imagePath, leftColumn + 10, yPos + 5, {
                                fit: [50, 50],
                                align: 'center',
                                valign: 'center'
                            });
                        }
                    } catch (err) {
                        console.error('Error adding product image:', err);
                    }
                }

                // Add product details
                doc.font('Helvetica').fontSize(10).fillColor(colors.text.dark)
                    .text(item.product.productName || 'Product Unavailable', leftColumn + 80, yPos + 20, { width: 200 })
                    .text(item.quantity.toString(), leftColumn + 290, yPos + 20, { width: 60 })
                    .text(`₹${item.price.toLocaleString('en-IN')}`, leftColumn + 360, yPos + 20, { width: 70 })
                    .text(`₹${(item.quantity * item.price).toLocaleString('en-IN')}`, leftColumn + 440, yPos + 20, { width: 70 });

                totalAmount += item.quantity * item.price;
                yPos += rowHeight;
            }

            // Add summary section
            yPos += 20;
            const summaryWidth = 250;
            const summaryX = doc.page.width - summaryWidth - 50;

            // Summary background
            doc.rect(summaryX, yPos, summaryWidth, 100)
                .fill(colors.background);

            // Summary details
            doc.font('Helvetica').fontSize(10).fillColor(colors.text.dark)
                .text('Subtotal:', summaryX + 10, yPos + 10)
                .text(`₹${totalAmount.toLocaleString('en-IN')}`, summaryX + summaryWidth - 80, yPos + 10);

            if (order.discount && order.discount.total > 0) {
                doc.text('Discount:', summaryX + 10, yPos + 35)
                    .text(`-₹${order.discount.total.toLocaleString('en-IN')}`, summaryX + summaryWidth - 80, yPos + 35);
            }

            // Final amount with accent background
            doc.rect(summaryX, yPos + 60, summaryWidth, 30)
                .fill(colors.accent);
            doc.font('Helvetica-Bold').fillColor(colors.text.light)
                .text('Final Amount:', summaryX + 10, yPos + 68)
                .text(`₹${order.finalAmount.toLocaleString('en-IN')}`, summaryX + summaryWidth - 80, yPos + 68);

            // Thank you section
            yPos += 140;
            doc.rect(50, yPos, doc.page.width - 100, 100)
                .fill(colors.background);

            doc.fontSize(16).font('Helvetica-Bold').fillColor(colors.primary)
                .text('Thank You for Choosing ShutterCart!', 0, yPos + 20, { align: 'center' });

            doc.fontSize(10).font('Helvetica').fillColor(colors.text.dark)
                .text('We truly appreciate your business and trust in our products.', 0, yPos + 45, { align: 'center' })
                .text('Your satisfaction is our top priority. We hope your new camera equipment brings you joy and captures beautiful moments.', 0, yPos + 60, { align: 'center' });

            // Footer
            doc.rect(0, doc.page.height - 40, doc.page.width, 40)
                .fill(colors.primary);

            doc.fontSize(8).font('Helvetica').fillColor(colors.text.light)
                .text('ShutterCart - Your Premium Camera Store | www.shuttercart.com', 0, doc.page.height - 25, { align: 'center' })
                .text('For support: support@shuttercart.com | Customer Care: +91 1234567890', 0, doc.page.height - 15, { align: 'center' });

            // Finalize the PDF
            doc.end();

        } catch (error) {
            console.error('Error generating invoice:', error);
            res.status(500).send('Error generating invoice');
        }
    };

const retryPayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findOne({ orderId: orderId })
            .populate('userId', 'email')
            .populate('address');
        
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // Check if Razorpay keys are properly configured
        const razorpayKeyId = process.env.RAZORPAY__KEY_ID;
        const razorpayKeySecret = process.env.RAZORPAY__KEY_SECRET;

        if (!razorpayKeyId || !razorpayKeySecret) {
            console.error('Razorpay keys not found:', { keyId: razorpayKeyId, keySecret: !!razorpayKeySecret });
            return res.status(500).json({ 
                success: false, 
                message: "Payment configuration error. Please contact support." 
            });
        }

        // Create Razorpay instance with proper error handling
        let instance;
        try {
            instance = new Razorpay({
                key_id: razorpayKeyId,
                key_secret: razorpayKeySecret
            });
        } catch (error) {
            console.error('Razorpay initialization error:', error);
            return res.status(500).json({ 
                success: false, 
                message: "Payment service initialization failed" 
            });
        }

        // Create Razorpay order
        const razorpayOrder = await instance.orders.create({
            amount: Math.round(order.finalAmount * 100), // Convert to smallest currency unit (paise)
            currency: "INR",
            receipt: orderId,
        });

        // Update order with new Razorpay order details
        await Order.updateOne(
            { orderId: orderId },
            { 
                $set: {
                    razorpayOrderId: razorpayOrder.id,
                    paymentStatus: 'Pending'
                }
            }
        );

        res.json({
            success: true,
            order: razorpayOrder,
            key: razorpayKeyId,
            orderDetails: {
                name: order.address ? order.address.name : '',
                email: order.userId ? order.userId.email : '',
                contact: order.address ? order.address.mobile : ''
            }
        });

    } catch (error) {
        console.error('Retry payment error:', error);
        res.status(500).json({
            success: false,
            message: "Failed to initiate payment retry",
            error: error.message
        });
    }
};

module.exports = {
    placeOrder,
    getOrderDetails,
    verifyPayment,
    retryPayment,
    cancelOrder,
    returnOrder,
    downloadInvoice
};