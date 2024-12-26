const Product= require('../../models/productSchema')
const category = require('../../models/categorySchema');
const User = require("../../models/userSchema");




const productDetails =async (req,res)=>{
    try {
        const userId = req.session.user

        const userData = await User.findById(userId)
        const productid = req.query.id;
        const product = await Product.findById(productid).populate('category')

        const findCategory = product.category;
         const cat= findCategory.name
         const productOffer = product?.productOffer || 0
         const relatedProducts = await Product.find({
            category: findCategory._id,  
            _id: { $ne: productid }, 
        }).limit(5);     
        
        console.log('find category',relatedProducts);
 
      return res.render('product-details',{
            user:userData,
            product:product,
            quantity:product.quantity,
             category:cat,
             relatedProducts:relatedProducts
        })

    } catch (error) {
        console.error(error);
         res.redirect('/pageNotFound')   
    }
}


module.exports={
    productDetails,
}