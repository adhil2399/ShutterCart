const User = require("../../models/userSchema");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const { securePassword,isOtpExpired,generateOtp, sendVerificationEmail } = require("../../config/utils");
const Category = require("../../models/categorySchema");
const Product =require('../../models/productSchema');
const category = require("../../models/categorySchema");
const { addProducts } = require("../admin/productController");
//page Not Found

const pageNotFound = async (req, res) => {
  try {
    res.render("page-404");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};
//render homepage

const lodeHomepage = async (req, res) => {
  try {
    const user = req.session.user
    const categories = await Category.find({isListed:true})
     let productData =await Product.find({
      isBlocked:false,
      category:{$in:categories.map(category=>category._id)},
      quantity:{$gt:0}
    })

    productData.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn))
    productData= productData.slice(0,6)


    // console.log(user);
     let userData = null
    if (user) {
       userData = await User.findById(user);
       
       return res.render("home", { user: userData,products:productData });
      }else{
        console.log(productData)
        return  res.render("home", {products:productData });

    }
    // console.log(userData);
    
  } catch (error) {
    console.log("homepage not found", error);
    res.status(500).send("server side error");
  }
};

//render signup page

const loadsignup = async (req, res) => {
  try {
    return res.render("signup");
  } catch (error) {
    console.log("signup page not loading", error);
    res.status(500).send("server side error");
  }
};

//otp generate

 

// signup, check the user is already exists and verify the Otp

const signup = async (req, res) => {
  try {
    console.log(req.body);
    const { name, email, phone, password, cpassword } = req.body;
    // console.log(req.body)

    if (password !== cpassword) {
      return res.render("signup", { message: "passwords is dont match" });
    }
    const finduser = await User.findOne({ email });
    if (finduser) {
      return res.render("signup", {
        message: "user with this email already exists",
      });
    }

    const otp = generateOtp();
    console.log(`Generated OTP ${otp}`);

    const emailsend = await sendVerificationEmail(email, otp);

    if (!emailsend) {
      return res.json("email-error");
    }

    req.session.userOtp = { otp, timestamp: Date.now() };
    req.session.userData = { name, phone, email, password };

    res.render("Varify-otp");
    console.log("Session OTP:", req.session.userOtp.otp);

    console.log(`Generated OTP received ${otp}`);
  } catch (error) {
    console.error("signup error", error.message);
    res.redirect("/pageNotFound");
  }
};

// resend OTP

const resendOtp = async (req, res) => {
  try {
    const { email } = req.session.userData;
    if (!email) {
      console.log("Email not found in session");
      return res
        .status(400)
        .json({ success: false, message: "Email not found in session" });
    }
    //   console.log(email)
    const otp = generateOtp();
    req.session.userOtp = otp;
    console.log("Generated OTP:", otp);

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

 

 

// OTP verification

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    console.log("req.body", otp);

    if (
      !req.session.userOtp.otp ||
      isOtpExpired(req.session.userOtp.timestamp)
    ) {
      return res.json({ success: false, message: "OTP has expired" });
    }
    if (otp !== req.session.userOtp.otp) {
      return res.json({
        success: false,
        message: "Invalide OTP , please try again",
      });
    }

    const user = req.session.userData;
    const passwordHash = await securePassword(user.password);
    console.log("happy");
    if (!passwordHash) {
      throw new Error("password hashing failed");
    }
    const saveUserData = new User({
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: passwordHash,
    });
    await saveUserData.save();

    // clear session cariables afer successful signup

    req.session.user = saveUserData._id;
    req.session.userOtp = null;
    req.session.userData = null;

    res.json({ success: true, redirectUrl: "/" });
    // res.redirect('/')
  } catch (error) {
    console.error("Verifying OTP ", error);
    res.status(500).json({ success: false, message: "An error occured" });
  }
};

//render login page

const loadlogin = async (req, res) => {
  try {

    if (!req.session.user) {
      return res.render("login");
    } else {
      res.redirect("/");
    }
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

// user login

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const finduser = await User.findOne({ isAdmin: false, email: email });
    
    console.log(finduser)

    if (!finduser) {
      return res.render("login", { message: "user not found" });
    }
    if (finduser.isblocked) {
      return res.render("login", { message: "User is blocked by admin" });
    }

    const passwordMatch = await bcrypt.compare(password, finduser.password);
    if (!passwordMatch) {
      return res.render("login", { message: "Incorrect password" });
    }
    req.session.user = finduser._id;
    res.redirect("/");
  } catch (error) {
    console.log("login error", error);
    res.render("login", { message: "login failed. please try again later " });
  }
}

// logout session 

const logout = async (req,res)=>{
try {
    req.session.destroy((err)=>{
        if(err){
        console.log('session destruction error', err.message)
        return res.redirect('/pageNotFound')
        }
        return res.redirect('/')
    })
} catch (error) {
    console.log('logout error',error)
    res.redirect('/pageNotFound')
}
}


module.exports = {
  lodeHomepage,
  pageNotFound,
  loadsignup,
  signup,
  loadlogin,
  login,
  verifyOtp,
  resendOtp,
  logout,
  
};
