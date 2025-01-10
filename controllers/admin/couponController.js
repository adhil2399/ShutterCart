const User = require('../../models/userSchema')
const Coupon = require('../../models/couponSchema')

const getCouponList = async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdOn: -1 }); 
        res.render('coupon', { coupons }); 
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
};

const createCoupon = async (req, res) => {
  try {
    console.log(req.body);
    const { couponName, startDate, endDate, offerPrice, minimumPrice } = req.body;

    // Validate required fields
    if (!couponName || !startDate || !endDate || !offerPrice || !minimumPrice) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Check if the coupon name already exists
    const existingCoupon = await Coupon.findOne({ name: couponName });
    if (existingCoupon) {
      return res.status(400).json({ success: false, message: "Coupon name already exists." });
    }

    // Create a new coupon
    const newCoupon = new Coupon({
      name: couponName,
      createdOn: new Date(startDate),
      expireOn: new Date(endDate),
      offerPrice: parseFloat(offerPrice),
      minimumPrice: parseFloat(minimumPrice),
      isListed: true
    });

    await newCoupon.save();

    // Respond with success message
    res.status(200).json({
      message: "Coupon created successfully!",
      coupon: newCoupon,
    });
  } catch (error) {
    console.error("Error creating coupon:", error);
    res.status(500).json({ message: "Internal server error. Please try again." });
  }
};

const deleteCoupon = async (req,res)=>{
  try {
   const couponId = req.params.id;
    const coupon = await Coupon.findByIdAndDelete(couponId);
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found." });
    }

    res.status(200).json({ success: true, message: "Coupon deleted successfully." });

  } catch (error) {
    res.status(500).json({ message: "Internal server error. Please try again." });
    console.error("Error deleting coupon:", error);
  }
}

const toggleCouponStatus = async (req, res) => {
    try {
        const couponId = req.params.id;
        const coupon = await Coupon.findById(couponId);
        
        if (!coupon) {
            return res.status(404).json({ 
                success: false, 
                message: "Coupon not found." 
            });
        }

        // Toggle the isListed status
        coupon.isListed = !coupon.isListed;
        await coupon.save();

        res.status(200).json({ 
            success: true, 
            message: `Coupon ${coupon.isListed ? 'listed' : 'unlisted'} successfully.`,
            isListed: coupon.isListed
        });

    } catch (error) {
        console.error("Error toggling coupon status:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error. Please try again." 
        });
    }
};

module.exports = {
    getCouponList,
    createCoupon,
    deleteCoupon,
    toggleCouponStatus
};