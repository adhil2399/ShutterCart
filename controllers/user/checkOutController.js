const Cart = require('../../models/cartSchema');
const User = require('../../models/userSchema');
const Address =require('../../models/addressSchema')






const renderCheckoutPage = async (req, res) => {
    try {
        const userId = req.session.user;

         if (!userId) {
            return res.status(401).json({ success: false, message: 'User not logged in' });
        }

         const userDetails = await User.findById(userId);
        if (!userDetails) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        let cart = await Cart.findOne({ userId }).populate('items.productId');

        if (!cart) {
            return res.render('checkout', {
                user: userDetails,
                cartItems: [],
                subtotal: 0,
                tax: 0,
                totalAmount: 0
            });
        }

        const userAddress= await Address.find({userId})
      

        const subtotal = cart.items.reduce((sum, item) => {
            if (item.productId && item.productId.salePrice) {
      return sum + (item.productId.salePrice * item.quantity)
        }
       return sum
        }, 0)

         const discount = 0;  
        // Total amount
 
         res.render('checkout', {
            user: userDetails,
            cartItems: cart.items,
            userAddress,
            subtotal,
            discount,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// const  orderConfirm = async(req,res)=>{
//     const orderId = req.query.id;
//     try {
//         if(!req.session.user){
//             return res.redirect("/signup");
//         }
//       return  res.render("orderConfirmation");
        
//     } catch (error) {
//         console.log("error in loading confirmation page ",error.message);
//         return res.redirect("/pageNotFound")
//     }
// }

module.exports={
    renderCheckoutPage,
    // orderConfirm
}