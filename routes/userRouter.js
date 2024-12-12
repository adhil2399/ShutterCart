const express= require('express')
const router= express.Router()
const userController= require('../controllers/user/userController')
const passport = require('passport')
const productController= require('../controllers/user/productController')
const profileController = require('../controllers/user/profileController')
const {userAuth,adminAuth}=require('../middlewares/auth')
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

router.get('/addAdress',userAuth,profileController.addAddress)

 module.exports = router
