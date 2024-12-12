const User = require('../../models/userSchema')
  const env = require('dotenv').config()
const session =require('express-session')
const { securePassword,isOtpExpired,generateOtp, sendVerificationEmail } = require("../../config/utils");
const Address = require('../../models/addressSchema')


const getForgotPassword = async (req,res)=>{

    try {

      return res.render('forgot-password')
    } catch (error) {

        console.log('Error on get forgot-password :',error)
       return res.redirect('/pageNotFound')
    }
}


const forgotEmailValid= async (req,res)=>{
    try {
        const {email} = req.body

        const findUser = await User.findOne({email:email})

        if(!findUser){
          return  res.render('forgot-password', {message:'user not found'})      
          }else{
            const otp = generateOtp()
            const emailSend = await sendVerificationEmail(email,otp);
            if(!emailSend){
              
              res.json({success:false,message:'Failed to send OTP . please try again'})

            }else{
              req.session.userOtp = { otp, timestamp: Date.now() };
              req.session.email= email;
              res.render('forgot-pass-otp')
              console.log('otp sended',otp)
            }
          }
    } catch (error) {
        res.redirect('/pageNotFound')
        console.log(error);
        
    }
}



const verifyForgotPassOtp = async (req,res)=>{
try {
  const enderedOtp = req.body.otp;
  if(!enderedOtp===req.session.userOtp){
   
    res.json({success:false,message:'OTP not matching'})

  }else{
    res.json({success:true ,redirectUrl:'/reset-password'})
  }
} catch (error) {
  res.status(500).json({success:false,message:'An error occured , please try again'})
}
}


const getResetPassPage = async (req,res)=>{
  try {

    res.render('reset-password')
    
  } catch (error) {
   res.redirect('/pageNotFound')
  }
}

const resendOtp = async (req, res) => {
  try {
    const email = req.session.email;
    if (!email) {
      console.log("Email not found in session");
      return res
      .status(400)
      .json({ success: false, message: "Email not found in session" });
    }
    //   console.log(email)
    const otp = generateOtp();
    req.session.userOtp = otp;
    console.log(" resending OTP:", otp);

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to send email" });
    }

    console.log("Resend OTP successful");
    return res
      .status(200)
      .json({ success: true, message: "OTP Sent Successfully" });
  } catch (error) {
    console.error("Resend OTP Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


const postNewPassword = async (req,res)=>{
  try {
    const {pass1,pass2}= req.body;
    const email= req.session.email

    if(!pass1===pass2){
     return res.render('reset-password',{message:'Password do not match'})

    }else{

      const passwordHash = await securePassword(pass1)
      await User.updateOne({email:email},{$set:{password:passwordHash}})
      res.redirect('/login')
    }
  } catch (error) {
    res.redirect('pageNotFound')
    console.log('post NewPassword Error:',error)
  }
}


const userProfile = async (req,res)=>{
  try {
    const userId= req.session.user
    const userData= await User.findById(userId)
    const addresData= await Address.findOne({userId:userId})
    res.render('profile',{user:userData,adress:addresData})

  } catch (error) {
    console.log('Error for retieve profile data',error);
    res.redirect('/pageNotFound')
    
  }
}


const changePassword = async  (req,res)=>{

  try {
   res.render('forgot-password')
   
   
  } catch (error) {
    console.log(error)
  }
}
  

const addAddress = async (req,res)=>{
  try {
    const user= res.session.user;

    res.render('add-address',{user:user})
  } catch (error) {
    
    res.redirect('/pageNotFound')
  }
}


module.exports={
    getForgotPassword,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    postNewPassword,
    userProfile,
    changePassword,
    addAddress
}