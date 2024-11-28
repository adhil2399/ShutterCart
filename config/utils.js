const nodemailer= require('nodemailer')
const bcrypt = require('bcrypt')


//password Hashing

const securePassword = async(password)=>{
    try {
        return await bcrypt.hash(password,10)
    
    } catch (error) {
        console.error('Error hashing password',error);
        return null;
        
    }
}

//Email sender

const transporter = nodemailer.createTransport({
    service:'gmail',
port:587,
secure:false,
requireTLS:true,
auth:{
    user:process.env.NODEMAILER_EMAIL,
    pass:process.env.NODEMAILER_PASSWORD
}
})

async function sendVerificationEmail(email,otp) {
    try {

    const info = await transporter.sendMail({
        from:process.env.NODEMAILER_EMAIL,
        to:email,
        subject:'Verify your account',
        html:`<b>Your OTP: ${otp}</b>`
        
    })
    return info.accepted.length > 0;
} catch (error) {
    console.error('Error sending email',error);
    return false;
}    
}


module.exports={
    securePassword,
    sendVerificationEmail
}