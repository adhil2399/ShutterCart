const Order = require('../../models/orderSchema');
const Cart = require('../../models/cartSchema'); 
const User = require('../../models/userSchema');
const Product= require('../../models/productSchema');
const Razorpay = require('razorpay');


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

        const { addressId, paymentMethod } = req.body;

        // Validate request body
        if (!addressId || !paymentMethod) {
            return res.status(400).json({ success: false, message: "Address and payment method are required." });
        }

        // Get user cart
        const userCart = await Cart.findOne({ userId }).populate("items.productId");
        if (!userCart || userCart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty." });
        }

        // Calculate total price
        const totalPrice = userCart.items.reduce(
            (sum, item) => sum + item.productId.salePrice * item.quantity,
            0
        );
        const discount = 0;
        const finalAmount = totalPrice - discount;

        const orderedItems = userCart.items.map((item) => ({
            product: item.productId._id,
            quantity: item.quantity,
        }));

        const generateOrderId = () => {
            const prefix = "ORD";
            const timestamp = Date.now();
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            return `${prefix}-${timestamp}-${randomNum}`;
        };

        const orderId = generateOrderId();

        let razorpayOrderId = null;

        // Check payment method
        if (paymentMethod === "ONLINE") {
            // Create Razorpay payment order
            const razorpayOrder = await razorpay.orders.create({
                amount: finalAmount * 100, // Amount in paise
                currency: "INR",
                receipt: orderId,
            });
            
            console.log('onlineeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');
            razorpayOrderId = razorpayOrder.id; // Store Razorpay Order ID
        }

        // Create new order in your database
        const newOrder = new Order({
            userId,
            orderId,
            razorpayOrderId,
            orderedItems,
            totalPrice,
            discount,
            finalAmount,
            address: addressId,
            status: paymentMethod === "COD" ? "Pending" : "Awaiting Payment",
            paymentMethod,
            couponApplied: false,
        });

        await newOrder.save();

        // Decrease product quantities
        for (let item of userCart.items) {
            const product = await Product.findById(item.productId._id);
            if (product) {
                product.quantity -= item.quantity;
                if (product.quantity < 0) {
                    product.quantity = 0;
                }
                await product.save();
            }
        }

        // Clear user cart
        userCart.items = [];
        await userCart.save();

        // Respond to frontend
        res.json({
            success: true,
            orderId: newOrder.orderId,
            ...(paymentMethod === "ONLINE" && {
                razorpayOrderId,
                amount: finalAmount * 100,
                currency: "INR",
            }),
        });
    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).json({ success: false, message: "An error occurred while placing the order." });
    }
};

 const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.query.Id;
        const user = req.session.user;

        if (!userId) {
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
     console.log('orderrrrrrrrr',order)
        res.render('orderSuccess', { order ,user});
    } catch (error) {
        console.error('Get order details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order details'
        });
    }
};


 
    
// const viewOrderDetails = async (req, res) => {
//     try {
//       const orderId = req.params.Id;
//       const order = await Order.findById(orderId)
//         .populate('orderItems.product')
//         .populate('address');
  
//       if (!order) {
//         return res.status(404).send('Order not found');
//       }
  
//       res.render('orderSuccess', {order});
//     } catch (error) {
//       console.error('Error fetching order details:', error);
//       res.status(500).send('Server error');
//     }
//   };
    module.exports={
        placeOrder,   
         getOrderDetails,
        // viewOrderDetails
    }