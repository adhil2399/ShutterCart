const Order = require('../../models/orderSchema');
const Cart = require('../../models/cartSchema'); 
const User = require('../../models/userSchema');
const Product= require('../../models/productSchema');
const Razorpay = require('razorpay');
const Address = require('../../models/addressSchema');
const Wallet = require('../../models/walletSchema');
const Coupon = require('../../models/couponSchema');
 // Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: 'YOUR_RAZORPAY_KEY_ID',
    key_secret: 'YOUR_RAZORPAY_KEY_SECRET'
});
const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ success: false, message: "User not authenticated." });
        }

        const { addressId, paymentMethod, totalPrice, Discount, couponCode } = req.body;
        console.log('Client side values received:', { 
            totalPrice: parseFloat(totalPrice), 
            Discount, 
            couponCode,
            paymentMethod 
        });

        // Validate request body
        if (!addressId || !paymentMethod) {
            return res.status(400).json({ success: false, message: "Address and payment method are required." });
        }

        // Validate address fields
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

        const userCart = await Cart.findOne({ userId }).populate({
            path: 'items.productId',
            populate: { path: 'category', select: 'categoryOffer' }
        });

        if (!userCart || userCart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty." });
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
        if (couponCode) {
            coupon = await Coupon.findOne({ name: couponCode});
            if (!coupon) {
                return res.status(400).json({ success: false, message: "Invalid  coupon." });
            }

            if (new Date() > new Date(coupon.expireOn)) {
                return res.status(400).json({ success: false, message: "Coupon has expired." });
            }

            if(coupon.userId == userId){
                return res.status(400).json({ success: false, message: "Coupon already used." });
            }

            if (totalAmount < coupon.minimumPrice) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Minimum purchase amount of ₹${coupon.minimumPrice} required for this coupon.` 
                });
            }
            
            // Calculate coupon discount same as checkout
            couponDiscount = Math.min(coupon.offerPrice, totalAfterOffers);
        }

        const finalAmount = totalAfterOffers - couponDiscount;
        const totalDiscount = bestOfferDiscount + couponDiscount;

        // Calculate shipping
        const freeShippingThreshold = 1000;
        const shippingRate = 0
        const shipping = finalAmount >= freeShippingThreshold ? 0 : shippingRate;
        const finalAmountWithShipping = finalAmount + shipping;

        // console.log('Price calculations:', {
        //     totalAmount,
        //     bestOfferDiscount,
        //     totalAfterOffers,
        //     couponDiscount,
        //     totalDiscount,
        //     finalAmount,
        //     shipping,
        //     finalAmountWithShipping
        // });

        const orderedItems = userCart.items.map((item) => ({
            product: item.productId._id,
            quantity: item.quantity,
            price: item.productId.salePrice,
        }));

        const generateOrderId = () => {
            const prefix = "ORD";
            const timestamp = Date.now();
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            return `${prefix}-${timestamp}-${randomNum}`;
        };

        const orderId = generateOrderId();
        let razorpayOrderId = null;

        if (paymentMethod === "ONLINE") {
            const razorpay = new Razorpay({
                key_id: process.env.RAZORPAY__KEY_ID,
                key_secret: process.env.RAZORPAY__KEY_SECRET,
            });

            // Create Razorpay order
            const razorpayOrder = await razorpay.orders.create({
                amount: finalAmountWithShipping * 100,
                currency: "INR",
                receipt: orderId,
            });

            razorpayOrderId = razorpayOrder.id;

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
                couponDetails: coupon ? { code: coupon.name, discountAmount: couponDiscount } : null,
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
                status: "Pending Payment",
                paymentMethod,
                paymentStatus: "Unpaid",
            });

            await newOrder.save();
            await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });
            res.status(200).json({
                message: "Razorpay Order created successfully!",
                razorpayOrderId,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                orderId,
            });

        } else if (paymentMethod === "COD") {
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
                couponDetails: coupon ? { code: coupon.name, discountAmount: couponDiscount } : null,
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

            await newOrder.save();

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

            await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

            res.json({
                success: true,
                message: "Order placed successfully!",
                orderId: newOrder.orderId,
            });
        }
    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).json({ success: false, message: "An error occurred while placing the order." });
    }
};


const crypto = require('crypto');

const verifyPayment = async (req, res) => {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY__KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

    if (generatedSignature === razorpaySignature) {
        const order = await Order.findOneAndUpdate(
            { razorpayOrderId },
            { 
                status: "Placed", 
                paymentStatus: "Paid",
                paymentId: razorpayPaymentId 
            },
            { new: true }
        );
        if (order) {
            res.status(200).json({ success: true, orderId: order.orderId });
        } else {
            res.status(400).json({ success: false, message: "Order not found." });
        }
    } else {
        // If signature verification fails, only update payment status to Failed
        await Order.findOneAndUpdate(
            { razorpayOrderId },
            { 
                paymentStatus: "Failed"
                // Keep status as "Pending Payment"
            }
        );
        res.status(400).json({ success: false, message: "Invalid payment signature." });
    }
};


 const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.query.Id;   
        const user = req.session.user;

        if (!user) {
            return res.status(401).json({ success: false, message: "User not authenticated." });
        }

        const order = await Order.findOne({ orderId })
    .populate('address')
 
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
         res.render('orderSuccess', { order ,user});
    } catch (error) {
        console.error('Get order details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order details'
        });
    }
};

//cancel order
const cancelOrder = async (req, res) => {
    try {
        const userId = req.session.user
        const { orderId } = req.params; 

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
                // Update wallet balance and transaction history
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

        await order.save(); // Save the updated order

        // Send success response
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

          order.status = 'Return Request'; // Update the order status to indicate a return request
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



    module.exports={
        placeOrder,   
         getOrderDetails,
         verifyPayment,
         cancelOrder,
         returnOrder
    }