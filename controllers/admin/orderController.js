const User = require("../../models/userSchema")
const Order = require('../../models/orderSchema')
const Product = require('../../models/productSchema')

const getOrderList = async (req, res) => {
    try {
         const page = parseInt(req.query.page) || 1; // Default to page 1
        const limit = parseInt(req.query.limit) || 10;  
         const skip = (page - 1) * limit;

         const orders = await Order.find()
            .populate('userId')
            .populate('orderedItems.product')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

         const totalOrders = await Order.countDocuments();
        const totalPages = Math.ceil(totalOrders / limit);

        console.log('Fetched Orders:', orders);

         return res.render('orders', {
           orders,
           currentPage: page,
           totalPages,
           totalOrders,
           limit,
           hasNextPage: page < totalPages,
           hasPrevPage: page > 1
               });
    
    } catch (error) {
        console.error('Error fetching orders:', error);
        return res.status(500).send('Internal Server Error');
    }
};

const getOrderDetailsPage = async (req, res) => {

    try {   
        console.log("hii")
        const {orderId}= req.query;
        console.log('dddddddddddddddddddddddd',orderId);
        const order = await Order.findOne({ orderId })
            .populate('userId')
            .populate({
                path: 'orderedItems.product',
                populate: {
                    path: 'category',
                    select: 'name'
                }
            })
            .populate('address');
    

        if (!order) {
            return res.status(404).send('Order not found');
        }

         const subtotal = order.orderedItems.reduce(
            (sum, item) => sum + item.product.salePrice * item.quantity,
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

const updateOrderStatus = async (req, res) => {
    const { orderId, status } = req.body;

    if (!orderId || !status) {
        return res.status(400).json({ success: false, message: 'Order ID and status are required' });
    }
     try {
        const order = await Order.findOne({orderId});
         if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.status = status;
        await order.save();

        res.json({ success: true, message: 'Order status updated successfully' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}



const deleteOrder = async (req, res) => {
    const { orderId } = req.body;

    if (!orderId) {
        return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    try {
        const order = await Order.findByIdAndDelete(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.json({ success: true, message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const processReturnRequest = async (req, res) => {
    try {
      const { orderId } = req.params;
      const { action } = req.body;
  
      const order = await Order.findOne({orderId});
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
  
      //  pending return request
      if (!order.returnRequest || order.returnRequest.status !== "Pending") {
        return res
          .status(400)
          .json({ message: "No pending return request found" });
      }
  
      // Update return request status
      order.returnRequest.status = action === "approve" ? "Approved" : "Rejected";
      order.returnRequest.processedDate = new Date();
  
      // If approved, update order status to Returned
      if (action === "approve") {
        order.status = "Returned";
      }
  
      await order.save();
  
      res.status(200).json({
        message: `Return request ${action}ed successfully`,
        order: order,
      });
    } catch (error) {
      console.error("Error in processReturnRequest:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };

module.exports={
    getOrderList,
    getOrderDetailsPage,
    updateOrderStatus,
    deleteOrder,
    processReturnRequest
}