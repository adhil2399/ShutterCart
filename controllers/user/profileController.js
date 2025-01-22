const User = require('../../models/userSchema')
const env = require('dotenv').config()
const session = require('express-session')
const { securePassword, isOtpExpired, generateOtp, sendVerificationEmail } = require("../../config/utils");
const Address = require('../../models/addressSchema')
const bcrypt = require('bcrypt')
const Order = require('../../models/orderSchema')
const Wishlist = require('../../models/wishlistSchema')
const Wallet = require('../../models/walletSchema'); 
const getForgotPassword = async (req, res) => {

  try {

    return res.render('forgot-password')
  } catch (error) {

    console.log('Error on get forgot-password :', error)
    return res.redirect('/pageNotFound')
  }
}


const forgotEmailValid = async (req, res) => {
  try {
    const { email } = req.body

    const findUser = await User.findOne({ email: email })

    if (!findUser) {
      return res.render('forgot-password', { message: 'user not found' })
    } else {
      const otp = generateOtp()
      const emailSend = await sendVerificationEmail(email, otp);
      if (!emailSend) {

        res.json({ success: false, message: 'Failed to send OTP . please try again' })

      } else {
        req.session.userOtp = { otp, timestamp: Date.now() };
        req.session.email = email;
        res.render('forgot-pass-otp')
        console.log('otp sended', otp)
      }
    }
  } catch (error) {
    res.redirect('/pageNotFound')
    console.log(error);

  }
}



const verifyForgotPassOtp = async (req, res) => {
  try {
    const enderedOtp = req.body.otp;
    if (!enderedOtp === req.session.userOtp) {

      res.json({ success: false, message: 'OTP not matching' })

    } else {
      res.json({ success: true, redirectUrl: '/reset-password' })
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'An error occured , please try again' })
  }
}


const getResetPassPage = async (req, res) => {
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


const postNewPassword = async (req, res) => {
  try {
    const { pass1, pass2 } = req.body;
    const email = req.session.email

    if (!pass1 === pass2) {
      return res.render('reset-password', { message: 'Password do not match' })

    } else {

      const passwordHash = await securePassword(pass1)
      await User.updateOne({ email: email }, { $set: { password: passwordHash } })
      res.redirect('/login')
    }
  } catch (error) {
    res.redirect('pageNotFound')
    console.log('post NewPassword Error:', error)
  }
}


const userProfile = async (req, res) => {
  try {
    const userId = req.session.user
    if (!userId) {
      return res.redirect('/login');  
    }
    const userData = await User.findById(userId)
    const addressData = await Address.find({ userId: userId })
     const userOrders = await Order.find({ userId })
     .populate('orderedItems.product')  
     .populate('address')  
     .lean()
    const wishlistData = await Wishlist.findOne({ userId })
    .populate({
        path: 'products.productId',
        model: 'product', 
        populate: {
            path: 'category', 
            model: 'Category' 
        }
    })
    .lean(); 
     const AddressData = addressData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
     const userorders =  userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
     console.log('wishhhhhhhhhhhhhhhhhhhhh',wishlistData);

     const walletData = await Wallet.findOne({ userId });
     if (walletData) {
     walletData.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
     }
     console.log('User Data:', userData);
     console.log('Wallet Data:', walletData);

     res.render('profile', { 
      user: userData,
      userAddress: AddressData , 
      orders: userorders,
      wishlist: wishlistData,
      wallet: walletData || { totalBalance: 0, transactions: [] },

    });


  } catch (error) {
    console.log('Error for retieve profile data', error);
    res.redirect('/pageNotFound')

  }
}


const changePassword = async (req, res) => {

  try {
    res.render('forgot-password')


  } catch (error) {
    console.log(error)
  }
}


const postaddAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const findUser = await User.findById(userId);

    if (!findUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const { name, city, addressType, state, landMark, pinCode, phone, altPhone } = req.body;
    const userAddress = await Address.findOne({ userId: findUser._id });

    if(!name || !city || !addressType || !state || !landMark || !pinCode || !phone){
      return res.status(400).json({status: false, message: "All fields are required" });
    }
    let newAddress;

    if (!userAddress) {
      // Creating a new address document
      const addressData = {
        userId: findUser._id,
        address: [
          { name, city, addressType, state, landMark, pinCode, phone, altPhone },
        ],
      };
      newAddress = addressData.address[0];
      await new Address(addressData).save();
    } else {
      // Appending to existing address array
      newAddress = { name, city, addressType, state, landMark, pinCode, phone, altPhone };
      userAddress.address.push(newAddress);
      await userAddress.save();
    }

    // Return the new address as JSON
    res.status(200).json({ success: true, message: "Address added successfully."});
  } catch (error) {
    console.error("Error adding address:", error);
    res.status(500).json({ message: "Failed to add address. Please try again." });
  }
};



const editAddress = async (req, res) => {
  try {
    const addressId = req.query.id;
    const user = req.session.user
    const currAddress = await Address.findOne({
      'address._id': addressId
    })

    if (!currAddress) {
      return res.redirect('/pageNotfound')
    }
    const addressData = currAddress.address.find((item) => {
      return item.id.toString() === addressId.toString()
    })

    if (!addressData) {
      return res.redirect('/pageNotFound')
    } else {
      res.render('edit-address', { address: addressData, user: user })
    }
  } catch (error) {
    console.log('error in edit address', error)
    res.redirect('/pageNotFound')
  }
}

const posteditAddress = async (req, res) => {
  try {
    const data = req.body;
    console.log(data)
    const addressid = req.query.id
    const user = req.session.user;
    const findAddress = await Address.findOne({ 'address._id': addressid });

    if (!findAddress) {
      res.redirect('/pageNotFound')
    }
    await Address.updateOne({ 'address._id': addressid }, { $set: { 'address.$': {
       _id: addressid,
        addressType: data.addressType,
         name: data.name, 
         city: data.city, 
         landMark: data.landMark, 
         state: data.state,
         pinCode: data.pinCode,
         phone: data.phone, 
         altPhone: data.altPhone
           }
           } })
           res.redirect('/userProfile')

  } catch (error) {
 console.error('Error in edit address',error)
 res.redirect('/pageNotFound')
  }
}


const deleteAddress = async (req,res)=>{
  try {
    const{id}=req.params
    const userId = req.session.user
     console.log( 'parannss',id)

     const deleteaddress = await Address.findOneAndUpdate({userId},{$pull:{address:{_id:id}}},{new:true});
      console.log('deleteidddd',deleteaddress)
    if (!deleteaddress) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

     return res.status(200).json({ success: true, message: 'Address deleted successfully.' });

  } catch (error) {
    console.error("Error deleting address:", error);

     if (!res.headersSent) {
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
};
const editProfile = async (req, res) => {
  try {
      const id = req.session.user;  
      const { name, phone, currentPassword, newPassword } = req.body;
   

      console.log(currentPassword)
      console.log(newPassword)
       const user = await User.findById(id);
      if (!user) {
          return res.status(404).json({ success: false, message: 'User not found' });
      }

       const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
          return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      }

       const updateData = { name, phone };

       if (newPassword) {
          updateData.password = await securePassword(newPassword);  
      }

       await User.updateOne({ _id: id }, { $set: updateData });

       return res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
      console.error("Error updating profile:", error.message);
      return res.status(500).json({ success: false, message: 'An error occurred while updating the profile' });
  }
};



module.exports = {
  getForgotPassword,
  forgotEmailValid,
  verifyForgotPassOtp,
  getResetPassPage,
  resendOtp,
  postNewPassword,
  userProfile,
  changePassword,
  postaddAddress,
  editAddress,
  posteditAddress,
  deleteAddress,
  editProfile,
}