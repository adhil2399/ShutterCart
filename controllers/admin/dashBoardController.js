const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Brand = require('../../models/brandSchema');
const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');
const { listenerCount } = require('pdfkit');


const loadDashboard =async (req,res)=>{
    try{
    if(req.session.admin){


        let totalSales = await Order.aggregate([
            { $match: { status: 'Delivered' } },{$group: {_id: null,totalSales: { $sum: '$totalPrice' }}}
        ]);
        console.log(totalSales)
         totalSales= totalSales[0].totalSales;
        const totalUsers= await User.find().countDocuments()

        const totalOrders= await Order.find().countDocuments();
         const totalProducts= await Product.find().countDocuments();

         res.render('dashboard',{totalSales,totalOrders,totalUsers,totalProducts})
    }else{
        res.redirect('/admin/login')
    }
}catch(error){
    console.error(error)
    res.redirect('/admin/pageerror')
}
};


module.exports={
    loadDashboard,
}