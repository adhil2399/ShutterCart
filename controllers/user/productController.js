const Product= require('../../models/productSchema')
const category = require('../../models/categorySchema');
const User = require("../../models/userSchema");




const productDetails =async (req,res)=>{
    try {
        const userId = req.body.user
        const userData = await User.findById(userId)
        const productid = req.query.id;
        const product = await Product.findById(productid).populate('category')
        const findcategory = product.category
        const categoryOffer= findcategory?.categoryOffer || 0 
        const productOffer = product?.productOffer || 0
        const totalOffer = categoryOffer + productOffer
        const relatedProducts = await Product.find({category: category._id,_id: { $ne: productid },})
       console.log('find category',findcategory);
       

        console.log(product)
     return res.render('product-details',{
            user:userData,
            product:product,
            quantity:product.quantity,
            totalOffer:totalOffer,
            category:findcategory,
            categoryOffer:categoryOffer,
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