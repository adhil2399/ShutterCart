const User = require("../../models/userSchema")
const Order = require('../../models/orderSchema')
const Product = require('../../models/productSchema')

const getOrderList = async (req, res) => {
    try {
        // Get the page and limit from the query parameters, with defaults
        const page = parseInt(req.query.page) || 1; // Default to page 1
        const limit = parseInt(req.query.limit) || 10;  
         const skip = (page - 1) * limit;

        // Fetch orders with pagination and sorting
        const orders = await Order.find()
            .populate('userId')
            .populate('orderedItems.product')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get the total count of orders for calculating total pages
        const totalOrders = await Order.countDocuments();
        const totalPages = Math.ceil(totalOrders / limit);

        console.log('Fetched Orders:', orders);

        // Render the orders page with pagination details
        return res.render('orders', {
            orders,
            currentPage: page,
            totalPages,
            totalOrders,
            limit,
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        return res.status(500).send('Internal Server Error');
    }
};

const getOrderDetailsPage = async (req, res) => {
    try {
        const { orderId } = req.params;

         const order = await Order.findOne({ orderId })
            .populate('userId')  
            .populate('orderedItems.product') 
            .populate('address'); 

        if (!order) {
            return res.status(404).send('Order not found');
        }

         const subtotal = order.orderedItems.reduce(
            (sum, item) => sum + item.product.price * item.quantity,
            0
        );
        const shippingCost = order.shippingCost || 0;  
        const grandTotal = subtotal + shippingCost

      
        res.render('orderDetails', {
            order,
            subtotal,
            shippingCost,
            grandTotal,
        });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).send('Internal Server Error');
    }
};


module.exports={
    getOrderList,
    getOrderDetailsPage,
}