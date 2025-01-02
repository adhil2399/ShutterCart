const Wishlist = require('../../models/wishlistSchema');
const Product = require('../../models/productSchema');
const { default: mongoose } = require('mongoose');

const toggleWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'You need to login first' });
    }

    const wishlist = await Wishlist.findOne({ userId });

    if (wishlist) {
      const productIndex = wishlist.products.findIndex(
        (item) => item.productId.toString() === productId
      );

      if (productIndex > -1) {
        // Remove product from wishlist
        wishlist.products.splice(productIndex, 1);
        await wishlist.save();
        return res.status(200).json({ action: 'removed', message: 'Product removed from wishlist' });
      } else {
        // Add product to wishlist
        wishlist.products.push({ productId });
        await wishlist.save();
        return res.status(200).json({ action: 'added', message: 'Product added to wishlist' });
      }
    } else {
      // Create new wishlist and add the product
      const newWishlist = new Wishlist({
        userId,
        products: [{ productId }],
      });
      await newWishlist.save();
      return res.status(200).json({ action: 'added', message: 'Product added to wishlist' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
};


 
// Remove from Wishlist
 const removeFromWishlist =  async (req, res) => {
  const { productId } = req.params;
  const userId = req.session.user
  
  try {
    // console.log(productId,userId);
    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      return res.status(404).json({ error: 'Wishlist not found' });
    }

    const productIndex = wishlist.products.findIndex(
      (product) => product.productId.toString() === productId.toString()
    );
        if (productIndex === -1){
      return res.status(404).json({ error: 'Product not found in wishlist' });
    }

    wishlist.products.splice(productIndex, 1);
    await wishlist.save();

    res.json({ success: true, message: 'Product removed from wishlist' });
  } catch (error) {
    console.error('Error removing product from wishlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}


module.exports = {
  toggleWishlist,
   removeFromWishlist
};