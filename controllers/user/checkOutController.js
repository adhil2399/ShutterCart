const Cart = require('../../models/cartSchema');
const User = require('../../models/userSchema');
const Address =require('../../models/addressSchema')
const Coupon = require('../../models/couponSchema');

const renderCheckoutPage = async (req, res) => {
    try {
        const userId = req.session.user;

         if (!userId) {
            return res.status(401).json({ success: false, message: 'User not logged in' });
        }

         const userDetails = await User.findById(userId);
        if (!userDetails) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const cart = await Cart.findOne({ userId }).populate({
            path: "items.productId",
            populate: { path: "category" } // Populate category inside product
          });
          console.log('cartgg',cart)
        if (!cart) {
            return res.render('checkout', {
                user: userDetails,
                cartItems: [],
                subtotal: 0,
                tax: 0,
                totalAmount: 0
            });
        }

        const userAddress= await Address.find({userId})
        const coupon= await Coupon.find()

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

          console.log('couponnnnnnnnnnnnnnnnnn',coupon)

 
         res.render('checkout', {
            user: userDetails,
            cartItems:cartItemsWithOffers,
            userAddress,
            coupon,
            discount:totalDiscount.toFixed(2),
            total:totalWithoutDiscount.toFixed(2),
            finalTotal:totalPriceAfterOffers.toFixed(2),
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

        // Find the coupon
        const coupon = await Coupon.findOne({
            name: couponCode,
            isList: true,
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
        const totalDiscount = bestOfferDiscount + couponDiscount;

        // Store applied coupon in session
        req.session.appliedCoupon = {
            name: coupon.name,
            discount: couponDiscount,
        };

        return res.json({
            success: true,
            discount: totalDiscount, // Send total discount (offer + coupon)
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
        // Remove coupon from session
        if (req.session.appliedCoupon) {
            delete req.session.appliedCoupon;
        }

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
        const totalAmount = cart.items.reduce((sum, item) => {
            const product = item.productId;
            const bestOffer = Math.max(product.productOffer || 0, product.category.categoryOffer || 0);
            const salePrice = product.regularPrice - (product.regularPrice * bestOffer / 100);
            return sum + salePrice * item.quantity;
        }, 0);

        return res.json({
            success: true,
            finalAmount: totalAmount,
            message: 'Coupon removed successfully.',
        });
    } catch (error) {
        console.error('Remove coupon error:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing coupon.',
        });
    }
};


module.exports = {
    renderCheckoutPage,
    applyCoupon,
    removeCoupon
}