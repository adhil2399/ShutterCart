const express= require('express')
const router= express.Router()
const userController= require('../controllers/user/userController')
const passport = require('passport')

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

 module.exports = router