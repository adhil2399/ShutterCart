const Category = require("../../models/categorySchema");
const Product =require('../../models/productSchema');
const Brand = require("../../models/brandSchema");
const User= require('../../models/userSchema')
const Wishlist = require('../../models/wishlistSchema');


// Fetch products based on filters
const getShopPage = async (req, res) => {
  try {
     const userId = req.session.user || req.session.user_id;
    console.log('Session:', req.session);
    console.log('User ID from session:', userId);

    const { category, brand, price, availability, sort, search, page = 1 } = req.query;
    const currentPage = parseInt(page) || 1;

    // Get category IDs from names
    let categoryIds = [];
    if (category) {
      const categories = await Category.find({ 
        name: { $in: Array.isArray(category) ? category : [category] },
        isListed: true 
      }).select('_id');
      categoryIds = categories.map(cat => cat._id);
      console.log('Category IDs:', categoryIds);
    }

    // Get brand names
    let brandNames = [];
    if (brand) {
      brandNames = Array.isArray(brand) ? brand : [brand];
      console.log('brand names:', brandNames);
    }

    const { filter, sortOption } = buldProductsQuery({
      ...req.query,
      category: categoryIds,
      brand: brandNames
    });
    
    console.log('Final filter:', JSON.stringify(filter, null, 2));
    console.log('Sort option:', sortOption);

     const totalProducts = await Product.countDocuments(filter);
    const limit = 12;
    const totalPages = Math.ceil(totalProducts / limit);
    const skip = (currentPage - 1) * limit;

    console.log('Pagination info:', {
      totalProducts,
      currentPage,
      totalPages,
      limit,
      skip
    });

     const products = await Product.find(filter)
      .collation({ locale: 'en', strength: 2 }) 
      .sort(sortOption)
      .populate("category", "categoryOffer")
      .skip(skip)
      .limit(limit)
      .lean();

    console.log('Products after sort:', products.map(p => p.productName));

    // Calculate offers for products
    const productsWithOffers = products.map(product => {
      const productOffer = product.productOffer || 0;
      const categoryOffer = product.category?.categoryOffer || 0;
      const bestOffer = Math.max(productOffer, categoryOffer);

      let finalProduct = {
        ...product,
        bestOffer,
        offerType: bestOffer === productOffer ? "Product Offer" : "Category Offer",
        productName: product.productName.trim()
      };

      if (bestOffer > 0) {
        const offerPrice = product.salePrice - (product.salePrice * (bestOffer / 100));
        finalProduct.offerPrice = Math.round(offerPrice);
      }

      return finalProduct;
    });

    // Get all categories and brands for filter options
    const categories = await Category.find({ isListed: true }).lean();
    console.log('found categories:', categories.map(c => c.name));
    
    const brands = await Brand.find({ isBlocked: false }).lean();
    console.log('found brands:', brands.map(b => b.brandName));

    // Get wishlist items if user is logged in
    let wishlistProductIds = [];
    if (userId) {
      console.log('Looking for wishlist for user:', userId);
      
      // Try both userId and user_id fields
      const wishlist = await Wishlist.findOne({
        $or: [
          { userId: userId },
          { user_id: userId },
          { user: userId }
        ]
      }).lean();
      
      console.log('Found wishlist:', wishlist);
      
      if (wishlist) {
        console.log('Wishlist structure:', {
          userId: wishlist.userId,
          user_id: wishlist.user_id,
          user: wishlist.user,
          productsLength: wishlist.products ? wishlist.products.length : 0,
          products: wishlist.products
        });
        
        if (wishlist.products && wishlist.products.length > 0) {
          wishlistProductIds = wishlist.products.map(item => {
             const productId = item.productId || item.product_id || item;
            return productId.toString();
          });
          console.log('Wishlist product IDs:', wishlistProductIds);
        }
      }
    }

     productsWithOffers.forEach(product => {
      const productId = product._id.toString();
      const isInWishlist = wishlistProductIds.includes(productId);
      console.log(`Product ${productId}: ${isInWishlist ? 'in wishlist' : 'not in wishlist'}`);
      if (isInWishlist) {
        console.log('Found matching wishlist item!');
      }
    });

     let userDetails = null;
    if (userId) {
      userDetails = await User.findById(userId).lean();
     }

    // Render the shop page
    res.render("shop", {
      products: productsWithOffers,
      user: userDetails,
      categories,
      brands,
      wishlistProductIds,
      currentPage,
      totalPages,
      selectedCategories: Array.isArray(category) ? category : category ? [category] : [],
      selectedBrands: Array.isArray(brand) ? brand : brand ? [brand] : [],
      selectedPrice: Array.isArray(price) ? price : price ? [price] : [],
      selectedAvailability: availability || '',
      sort: sort || 'default',
      search: search || ''
    });

  } catch (error) {
    console.error('Error fetching shop page:', error);
    res.status(500).render('user/error', { error: 'Error loading shop page' });
  }
};


const buldProductsQuery = (query) => {
  const { category, brand, price, availability, search, sort } = query;
  console.log('Building query with:', query);

  let filter = {};
  let sortOption = {};

  // Category filter
  if (category && category.length > 0) {
    filter.category = { $in: category };
  }

  // Brand filter
  if (brand && brand.length > 0) {
    filter.brand = { $in: brand };
  }

  // Price filter
  if (price) {
    const priceRanges = Array.isArray(price) ? price : price.split(',');
    console.log('Processing price ranges:', priceRanges);

    const priceConditions = priceRanges.map(range => {
      if (range === '100001') {
         return { salePrice: { $gte: 100001 } };
      }
      
      const [min, max] = range.split('-').map(Number);
      if (!isNaN(min) && !isNaN(max)) {
        return { salePrice: { $gte: min, $lte: max } };
      }
      return null;
    }).filter(condition => condition !== null);

    if (priceConditions.length > 0) {
      filter.$or = priceConditions;
    }
    console.log('Price conditions:', JSON.stringify(priceConditions, null, 2));
  }

  // Availability filter
  if (availability) {
    if (availability === 'inStock') {
      filter.quantity = { $gt: 0 };
    } else if (availability === 'outOfStock') {
      filter.quantity = { $lte: 0 };
    }
  }

 if (search) {
  if (!filter.$or) {
    filter.$or = [];
  }
  filter.$or.push({ productName: { $regex: search, $options: 'i' } });
}

  // Sort options
  if (sort) {
    switch (sort) {
      case 'priceAsc':
        sortOption = { salePrice: 1 };
        break;
      case 'priceDesc':
        sortOption = { salePrice: -1 };
        break;
      case 'nameAsc':
        sortOption = { productName: 1, _id: 1 };
        break;
      case 'nameDesc':
        sortOption = { productName: -1, _id: -1 };
        break;
      default:
        sortOption = { _id: -1 }; // Default sort by newest
    }
  } else {
    sortOption = { _id: -1 }; // Default sort by newest
  }

  console.log('Built filter:', filter);
  console.log('Sort option:', sortOption);

  return { filter, sortOption };
};


  module.exports={
    getShopPage,
  }