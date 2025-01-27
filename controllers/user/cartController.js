const  Cart = require('../../models/cartSchema')
const  Product = require('../../models/productSchema')
const User= require('../../models/userSchema')

const addToCart = async (req, res) => {
    const { productId, quantity } = req.body;

    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Please login to add products to the cart' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (product.quantity < 1) {
            return res.status(400).json({ success: false, message: 'Product is out of stock' });
        }

        if (quantity > product.quantity) {
            return res.status(400).json({ success: false, message: `Only ${product.quantity} items available in stock` });
        }

        const cart = await Cart.findOne({ userId })
            .populate({
                path: 'items.productId',
                populate: { path: 'category', select: 'categoryOffer' }
            }) || new Cart({ userId, items: [] });

        const existingItem = cart.items.find(item => item.productId._id.toString() === productId);

        if (existingItem) {
            const newTotalQuantity = +existingItem.quantity + +quantity;
            
            if (newTotalQuantity > product.quantity) {
                return res.status(400).json({ success: false, message: `Only ${product.quantity} items available in stock` });
            }
            
            if (newTotalQuantity > 6) {
                return res.status(400).json({ success: false, message: 'Maximum 6 items allowed per product' });
            }
            
            existingItem.quantity = newTotalQuantity;
            if (existingItem.quantity < 1) {
                return res.status(400).json({ success: false, message: 'Minimum quantity is 1' });
            }
        } else {
            if (quantity < 1 || quantity > 6) {
                return res.status(400).json({ success: false, message: 'Quantity must be between 1 and 6' });
            }
            
            if (quantity > product.quantity) {
                return res.status(400).json({ success: false, message: `Only ${product.quantity} items available in stock` });
            }
            
            cart.items.push({ productId, quantity });
        }

        await cart.save();

        const subtotal = calculateSubtotal(cart.items);
        const discount = calculateDiscount(cart.items);
        const shipping = calculateShipping(subtotal - discount);
        const totalPrice = calculateTotalPrice(subtotal, discount, shipping);

        return res.status(200).json({ success: true, cart, subtotal, discount, shipping, totalPrice , quantity:existingItem});
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

function calculateDiscount(cartItems) {
    return cartItems.reduce((totalDiscount, item) => {
        const productOffer = item.productId?.productOffer || 0;
        const categoryOffer = item.productId?.category?.categoryOffer || 0;
        const bestOffer = Math.max(productOffer, categoryOffer);
        const salePrice = item.productId?.salePrice || 0;
        const discount = (salePrice * bestOffer) / 100 * item.quantity;
        return totalDiscount + discount;
    }, 0);
}

function calculateShipping(totalPrice) {
    const freeShippingThreshold = 1000;  
    const shippingRate = 0
    return totalPrice >= freeShippingThreshold ? 0 : shippingRate;
}
function calculateTotalPrice(subtotal, discount, shipping) {
    return subtotal - discount + shipping;
}
function calculateSubtotal(cartItems) {
    return cartItems.reduce((sum, item) => {
        const salePrice = item.productId.salePrice || 0;  
        return sum + salePrice * item.quantity;
    }, 0);
}

const getCart = async (req, res) => {
    try {
        const userId = req.session.user;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not logged in' });
        }

        const userDetails = await User.findById(userId);
        if (!userDetails) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        let cart = await Cart.findOne({ userId }).populate({
            path: 'items.productId',
            populate: { path: 'category', select: 'categoryOffer' }
        });
        if (!cart) {
            cart = new Cart({ userId, items: [] });
            await cart.save();
        }

        let subtotal = 0;
        let totalDiscount = 0;

        // Calculate prices and offers for each item
        const cartItemsWithOffers = cart.items.map(item => {
            if (item.productId) {
                const productOffer = item.productId.productOffer || 0;
                const categoryOffer = item.productId.category?.categoryOffer || 0;
                const bestOffer = Math.max(productOffer, categoryOffer);

                const originalPrice = item.productId.salePrice;
                const salePrice = originalPrice - (originalPrice * bestOffer / 100);
                const quantity = item.quantity;
                const discount = (originalPrice - salePrice) * quantity;

                subtotal += originalPrice * quantity;
                totalDiscount += discount;

                return {
                    ...item.toObject(),
                    bestOffer,
                    finalPrice: salePrice
                };
            }
            return item;
        });

        const totalAmount = subtotal - totalDiscount;

        res.render('cart', {
            user: userDetails,
            cartItems: cartItemsWithOffers,
            cartSubtotal: subtotal,
            discount: totalDiscount,
            totalAmount: totalAmount,
            countItems: cart.items.length
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


const removeFromCart = async (req,res)=>{
    const {productId}= req.body
    const userId= req.session.user

    try {

        if (!userId) {
            return res.status(401).json({ message: 'User not logged in' });
          }
        const cart = await Cart.findOne({userId})
        if(!cart){
            return res.status(404).json({message:'cart not found'})
        }

        cart.items= cart.items.filter(item=>item.productId.toString()!==productId)

        await cart.save()
        res.status(200).json({message:'Item removed from cart',cart})
    } catch (error) {
        console.error(error)
        res.satus(500).json({message:'Internal server error'})
    }
}


const clearCart = async (req, res) => {
    const userId = req.session.user;
  
    try {
      const cart = await Cart.findOneAndUpdate(
        { userId },
        { items: [] },
        { new: true }
      );
      if (!cart) {
        return res.status(404).json({success: false, message: 'Cart not found' });
      }
      res.status(200).json({ success: true, message: 'Cart cleared successfully', cart });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
 
module.exports={
    getCart,
    addToCart,
    removeFromCart,
    clearCart
 }