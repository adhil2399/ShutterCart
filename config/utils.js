const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt')

//password Hashing

const securePassword = async (password) => {
  try {
    return await bcrypt.hash(password, 10)

  } catch (error) {
    console.error('Error hashing password', error);
    return null;

  }
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

//Email sender

const transporter = nodemailer.createTransport({
  service: 'gmail',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD
  }
})

const generateOtpEmail = (otp) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>ShutterCart - Email Verification</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          padding: 20px;
          background: white;
          border-radius: 10px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding: 20px 0;
          border-bottom: 2px solid #f0f0f0;
        }
        .header h1 {
          color: #333;
          margin: 0;
          font-size: 28px;
        }
        .content {
          padding: 30px 20px;
          text-align: center;
        }
        .otp-box {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          font-size: 32px;
          letter-spacing: 5px;
          font-weight: bold;
          color: #4f5d73;
        }
        .message {
          color: #666;
          margin: 20px 0;
          font-size: 16px;
        }
        .warning {
          color: #dc3545;
          font-size: 14px;
          margin-top: 20px;
        }
        .footer {
          text-align: center;
          padding-top: 20px;
          border-top: 2px solid #f0f0f0;
          color: #666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ShutterCart</h1>
        </div>
        <div class="content">
          <h2>Verify Your Email</h2>
          <p class="message">Thank you for choosing ShutterCart! Please use the following OTP to verify your email address:</p>
          <div class="otp-box">${otp}</div>
          <p class="message">This OTP will expire in 2 minute.</p>
          <p class="warning">Please do not share this OTP with anyone for security reasons.</p>
        </div>
        <div class="footer">
          <p>This is an automated email, please do not reply.</p>
          <p>&copy; ${new Date().getFullYear()} ShutterCart. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

async function sendVerificationEmail(email, otp) {
  try {

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: 'Verify your account',
      html: generateOtpEmail(otp)

    })
    return info.accepted.length > 0;
  } catch (error) {
    console.error('Error sending email', error);
    return false;
  }
}

function isOtpExpired(otpGeneratedTime) {
  const OTP_VALIDITY_DURATION = 2 * 60 * 1000; // 2 minutes
  return Date.now() - otpGeneratedTime > OTP_VALIDITY_DURATION;
}

module.exports = {
  securePassword,
  sendVerificationEmail,
  generateOtp,
  isOtpExpired
}