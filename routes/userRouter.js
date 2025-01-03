const express= require('express')
const router= express.Router()
const userController= require('../controllers/user/userController')
const passport = require('passport')
const productController= require('../controllers/user/productController')
const profileController = require('../controllers/user/profileController')
const StoreController = require('../controllers/user/storeController')
const CartController = require('../controllers/user/cartController')
const checkoutController= require('../controllers/user/checkOutController')
const orderController = require('../controllers/user/orderController')
const {userAuth,adminAuth}=require('../middlewares/auth')
const wishListController= require('../controllers/user/wishListController')
router.get('/',userController.lodeHomepage) //render homepage
router.get('/pageNotFound',userController.pageNotFound)//render pageNotFound
router.get('/signup',userController.loadsignup)
router.post('/signup',userController.signup)
router.post('/verify-otp',userController.verifyOtp)
router.post('/resend-otp',userController.resendOtp)

//google auth

router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
   const user = req?.user;
   if (user) {
      req.session.user = user
      // console.log("Antenticated User: ", user)
   }
   res.redirect('/')
})

router.get('/login',userController.loadlogin)
router.post('/login',userController.login)
router.get('/logout',userController.logout)

//product Managment
router.get('/productDetails',productController.productDetails)


//profile managment
router.get('/forgot-password',profileController.getForgotPassword)
router.post('/forgot-email-valid',profileController.forgotEmailValid)
router.post('/verify-passForgot-otp',profileController.verifyForgotPassOtp)
router.get('/reset-password',profileController.getResetPassPage)
router.post('/resend-forgot-otp',profileController.resendOtp)
router.post('/reset-password',profileController.postNewPassword)
router.get('/userProfile',userAuth,profileController.userProfile)
router.get('/change-password',userAuth,profileController.changePassword)

// address managememt

router. post('/profile/add-address',userAuth,profileController.postaddAddress)
router.get('/editAddress',userAuth,profileController.editAddress)
router.post('/editAddress',userAuth,profileController.posteditAddress)
router.delete('/delete-address/:id',userAuth,profileController.deleteAddress) 
router.post('/edit-profile',userAuth,profileController.editProfile)


// shop page & filter

router.get('/shop',StoreController.getShopPage)
router.get('/products',StoreController.sortProducts)
 router.get('/cart',userAuth,CartController.getCart)
 router.post('/cart/add',CartController.addToCart)
 router.delete('/cart/remove',userAuth,CartController.removeFromCart)
 router.get('/shop/search',StoreController.searchProducts)
 
 //checkOut 
 router.get('/checkout', userAuth,checkoutController.renderCheckoutPage);
 
 
// Place new order
router.post('/order/place', userAuth, orderController.placeOrder);

  
// Get specific order details
 router.get('/order/success',userAuth,orderController.getOrderDetails)


 router.post('/wishlist/toggle',wishListController.toggleWishlist)
router.delete('/wishlist/remove/:productId',userAuth,wishListController.removeFromWishlist)
module.exports = router
