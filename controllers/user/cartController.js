const  Cart = require('../../models/cartSchema')
const  Product = require('../../models/productSchema')
const User= require('../../models/userSchema')

const addToCart = async (req,res)=>{
    const {productId, quantity}= req.body
 
    try {
         console.log(productId)
        const userId= req.session.user
        if (!userId) {
            return res.status(401).json({success:false, message: 'Please login to add products to the cart' });
        }

        const product = await Product.findById(productId)

        if(!product){
            return res.status(404).json({message:'Product not found'})
        }
        if (product.quantity < 1) {
            return res.status(400).json({ success: false, message: 'Product is out of stock' });
          }
        
          if(quantity > product.quantity){
            res.status(401).json({success:false, message:`only ${product.quantity} stock left `})
        }

        let cart = await Cart.findOne({userId})

        if(!cart){
            cart = new Cart({userId,items:[]})
        }

        console.log(cart)
        const existingItem= cart.items.find(item=>item.productId.toString()===productId)

        if(existingItem){
            
            if( existingItem.quantity + +quantity > 6){
                
                return res.status(400).json({success:false,message:'Maximum 6 items allwed per product'})
            }
            existingItem.quantity+=+quantity
        }else{

            if(quantity > 6){
                return res.status(400).json({success:false,message:'Maximum 6 items allwed per product'})

            }
            if(quantity < 1){
                return res.status(400).json({success:false,message:'Minimum 1 items allwed per product'})

            }
            cart.items.push({
                productId,
                quantity,
            })
        }

        await cart.save()

        const subtotal= cart.items.reduce((sum,item)=>{
            const product= item.productId;
            const salePrice= product.salePrice || 0;
    
            return sum +(salePrice * item.quantity)
         },0)
    
        const countItems= cart.items.length
     
 
        res.status(200).json({success:true, message:'Cart updated successfully',cart,subtotal,countItems})
    } catch (error) {
        console.error(error);
        res.status(500).json({success:false, message: 'Internal server error' });
        
    }
}

const getCart= async (req,res)=>{
    
    try {
        const userId= req.session.user

        if(!userId){
            return res.status(401).json({ success:false,message:'User not logged in'})
        }

        const userDetails = await User.findById(userId);
        if (!userDetails) {
          return res
            .status(404)
            .json({ success: false, message: "User not found" });
        }
        
        let cart = await Cart.findOne({ userId }).populate('items.productId')
        if (!cart){
            cart = new Cart({userId,items:[]})
            await cart.save()   
         }
  
const subtotal = cart.items.reduce((sum, item) => {
              if (item.productId && item.productId.salePrice) {
        return sum + (item.productId.salePrice * item.quantity)
    }
    return sum
}, 0)
 
    const countItems= cart.items.length
 
        res.render('cart',{
            user:userDetails,
            cartItems:cart.items,
            subtotal:subtotal,
            countItems
            
         })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}


const removeFromCart = async (req,res)=>{
    const {productId}= req.body
    const userId= req.session.user

    try {

        if (!userId) {
            return res.status(401).json({ message: 'User not logged in' });
          }
        const cart = await Cart.findOne({userId})
        if(!cart){
            return res.status(404).json({message:'cart not found'})
        }

        cart.items= cart.items.filter(item=>item.productId.toString()!==productId)

        await cart.save()
        res.status(200).json({message:'Item removed from cart',cart})
    } catch (error) {
        console.error(error)
        res.satus(500).json({message:'Internal server error'})
    }
}

 
module.exports={
    getCart,
    addToCart,
    removeFromCart,
 }