const Cart = require('../../models/cartSchema');
const User = require('../../models/userSchema');
const Address =require('../../models/addressSchema')
const Coupon = require('../../models/couponSchema');
const Product = require('../../models/productSchema');


const renderCheckoutPage = async (req, res) => {
    try {
        const userId = req.session.user;
        const { couponName, couponDiscount } = req.session.appliedCoupon || {};
        const userDetails = await User.findById(userId);
        
        const cart = await Cart.findOne({ userId }).populate({
            path: "items.productId",
            populate: { path: "category" } // Populate category inside product
          });
          console.log('cartgg',cart)
              
          
        const userAddress= await Address.find({userId})
        const currentDate = new Date();

        const availableCoupons = await Coupon.find({
            isListed: true,
            userId: { $ne: userId },
            createdOn: { $lte: currentDate }, 
            expireOn: { $gte: currentDate }  
        });

        let totalWithoutDiscount = 0;
        const cartItemsWithOffers = cart.items.map((item) => {
            const product = item.productId;
            const category = product.category;
            const bestOffer = Math.max(product.productOffer || 0, category.categoryOffer || 0);
            const salePrice = product.salePrice - (product.salePrice * bestOffer / 100);
            const totalPrice = salePrice * item.quantity;
            const itemDiscount = (product.salePrice - salePrice) * item.quantity;
            totalWithoutDiscount += product.salePrice * item.quantity;
            return {
              ...item.toObject(),
              salePrice,
              totalPrice,
              itemDiscount,
            };
          });

          const totalPriceAfterOffers = cartItemsWithOffers.reduce((sum, item) => sum + item.totalPrice, 0);
          const totalDiscount = cartItemsWithOffers.reduce((sum, item) => sum + parseFloat(item.itemDiscount), 0);

          // Calculate final total with coupon discount if applicable
          const finalTotal = couponDiscount 
            ? (totalPriceAfterOffers - couponDiscount).toFixed(2)
            : totalPriceAfterOffers.toFixed(2);

          // Calculate total discount including coupon
          const totalDiscountWithCoupon = couponDiscount 
            ? (totalDiscount + couponDiscount).toFixed(2)
            : totalDiscount.toFixed(2);

         res.render('checkout', {
            user: userDetails,
            cartItems:cartItemsWithOffers,
            userAddress,
            coupon: availableCoupons,
            couponName,
            discount: totalDiscountWithCoupon,
            total: totalWithoutDiscount.toFixed(2),
            finalTotal,
            razorpayKey: process.env.RAZORPAY__KEY_ID, // Pass the Razorpay Key

        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};


const applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const userId = req.session.user;

        if (!couponCode) {
            return res.status(400).json({
                success: false,
                message: 'Coupon code is required.',
            });
        }

        if(!userId){
            return res.status(401).json({
                success: false,
                message: 'You are logged out ,please login first',
            });
        }
        // Find the coupon
        const coupon = await Coupon.findOne({
            name: couponCode,
            isListed: true,
            expireOn: { $gt: new Date() }, // Ensure the coupon is not expired
        });

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Invalid or expired coupon code.',
            });
        }

        // Get the cart details
        const cart = await Cart.findOne({ userId }).populate({
            path: 'items.productId',
            populate: { path: 'category' },
        });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found.',
            });
        }

        // Calculate total before discount
        let totalAmount = 0;
        let bestOfferDiscount = 0;

        console.log('cart items', cart.items)
        cart.items.forEach(item => {
            const product = item.productId;
            const salePrice = product.salePrice * item.quantity;
            const bestOffer = Math.max(product.productOffer || 0, product.category.categoryOffer || 0);
            const offerDiscount = (salePrice * bestOffer / 100);
            
            totalAmount += salePrice;
            bestOfferDiscount += offerDiscount;
        });

        const totalAfterOffers = totalAmount - bestOfferDiscount;

        // Check minimum purchase requirement against original total
        if (totalAmount < coupon.minimumPrice) {
            return res.status(400).json({
                success: false,
                message: `Minimum purchase amount of ₹${coupon.minimumPrice} is required.`,
            });
        }

        // Calculate coupon discount
        const couponDiscount = Math.min(coupon.offerPrice, totalAfterOffers); // Ensure coupon discount doesn't exceed the total after offers
        const finalAmount = totalAfterOffers - couponDiscount;

        // Store applied coupon in session
        req.session.appliedCoupon = {
            couponName: coupon.name,
            couponDiscount: couponDiscount,
        };  

        return res.json({
            success: true,
            discount: couponDiscount, // Send total discount (offer + coupon)
            finalAmount: finalAmount,
            message: 'Coupon applied successfully.',
        });
    } catch (error) {
        console.error('Coupon application error:', error);
        res.status(500).json({
            success: false,
            message: 'Error applying coupon.',
        });
    }
};
const removeCoupon = async (req, res) => {
    try {
     
         // Get the cart details
        const userId = req.session.user;
        const cart = await Cart.findOne({ userId }).populate({
            path: 'items.productId',
            populate: { path: 'category' },
        });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found.',
            });
        }

        // Recalculate total amount without coupon discount
        let totalAmount = 0;
        let bestOfferDiscount = 0;

        cart.items.forEach(item => {
            const product = item.productId;
            const salePrice = product.salePrice * item.quantity;
            const bestOffer = Math.max(product.productOffer || 0, product.category.categoryOffer || 0);
            const offerDiscount = (salePrice * bestOffer / 100);
            
            totalAmount += salePrice;
            bestOfferDiscount += offerDiscount;
        });
        const finalAmount = totalAmount - bestOfferDiscount;
        // Remove coupon from session
        req.session.appliedCoupon=null;
        return res.json({
            success: true,
            discount:bestOfferDiscount,
            finalAmount,
            message: 'Coupon removed successfully.',
        });
    } catch (error) {
        console.error('Error removing coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing coupon.',
        });
    }
};


module.exports = {
    renderCheckoutPage,
    applyCoupon,
    removeCoupon,
}