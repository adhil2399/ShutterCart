const Category = require("../../models/categorySchema");
const Product =require('../../models/productSchema');
const Brand = require("../../models/brandSchema");
const User= require('../../models/userSchema')
const Wishlist = require('../../models/wishlistSchema');


// Fetch products based on filters
const getShopPage = async (req, res) => {
  try {
 const user = req.session.user;
    const { category, brand, price, availability, page = 1 } = req.query;

    const limit = 12; // Number of products per page
    const skip = (page - 1) * limit;

    // Initialize filter query
    const filterQuery = { isBlocked: false }; // Only fetch unblocked products

    // Apply category filter
    if (category) {
      const categoryNames = category.split(",");
      const matchingCategories = await Category.find({
        name: { $in: categoryNames },
        isListed: true,
      });

      const categoryIds = matchingCategories.map((cat) => cat._id);
      filterQuery.category = { $in: categoryIds };
    }

    // Apply brand filter
    if (brand) {
      const brandNames = brand.split(",");
      const matchingBrands = await Brand.find({
        brandName: { $in: brandNames },
        isBlocked: false,
      });

      const brandNamesSet = matchingBrands.map((br) => br.brandName);
      filterQuery.brand = { $in: brandNamesSet };
    }

// Apply price filter
if (price) {
  const priceRanges = price.split(",").map((range) => {
    const [min, max] = range.split("-").map(Number);
    return { min, max };
  });

  // Create a single `$or` query combining all ranges
  filterQuery.$or = priceRanges.map((range) => {
    return range.max !== undefined
      ? { salePrice: { $gte: range.min, $lte: range.max } }
      : { salePrice: { $gte: range.min } };
  });
}



    // Apply availability filter
    if (availability) {
      const availabilityFilters = [];
      if (availability.includes("in-stock")) {
        availabilityFilters.push({ quantity: { $gt: 0 } });
      }
      if (availability.includes("out-of-stock")) {
        availabilityFilters.push({ quantity: { $eq: 0 } });
      }
      filterQuery.$or = availabilityFilters;
    }

    // Log filter query for debugging
    console.log("Filter Query:", filterQuery);

    // Fetch products based on filters
    const products = await Product.find(filterQuery)
      .sort({ createdAt: -1 }) 
      .skip(skip)
      .limit(limit)
      .populate("category", "name")  
      .exec();

    // Total count for pagination
    const totalProducts = await Product.countDocuments(filterQuery);
    const totalPages = Math.ceil(totalProducts / limit);

    // Prepare categories and brands for filters
    const categories = await Category.find({ isListed: true }).select("name");
    const brands = await Brand.find({ isBlocked: false }).select("brandName");

    let wishlistProductIds = [];  // Initialize as empty array
    if (user) {
      const wishlist = await Wishlist.findOne({ userId: user });   
      if (wishlist) {
        wishlistProductIds = wishlist.products.map(item => item.productId.toString());
      }
    }
    // Prepare pagination data
    const pagination = {
      currentPage: parseInt(page),
      totalPages,
      prevPage: page > 1 ? page - 1 : null,
      nextPage: page < totalPages ? page + 1 : null,
      pages: Array.from({ length: totalPages }, (_, i) => ({
        number: i + 1,
        isActive: i + 1 === parseInt(page),
      })),
    };

    console.log('wishlist Products',wishlistProductIds);
    // Render the shop page
    res.render("shop", {
      products,
      user,
      categories,
      brands,
      pagination,
      totalProducts,
      wishlistProductIds
    });
  } catch (error) {
    console.error("Error fetching shop page:", error);
    res.status(500).send("An error occurred while fetching the shop page.");
  }
};





const searchProducts = async (req, res) => {
  try {
    const user = req.session.user;
      const { query, page = 1 } = req.query;

      if (!query) {
          return res.status(400).json({ 
              success: false, 
              message: 'Search query is required' 
          });
      }

      const limit = 16;
      const skip = (page - 1) * limit;

      const searchRegex = new RegExp(query, 'i');

      const products = await Product.find({
          isBlocked: false, // Only show unblocked products
          $or: [
              { productName: searchRegex },
              { description: searchRegex },
              { brand: searchRegex }
          ]
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('category', 'name');

      const totalProducts = await Product.countDocuments({
          isBlocked: false,
          $or: [
              { productName: searchRegex },
              { description: searchRegex },
              { brand: searchRegex }
          ]
      });

      const totalPages = Math.ceil(totalProducts / limit);

      res.json({
          success: true,
          products,
          user,
          totalProducts,
          pagination: {
              currentPage: parseInt(page),
              totalPages,
              hasNextPage: page < totalPages,
              hasPrevPage: page > 1
          }
      });

  } catch (error) {
      console.error('Error searching products:', error);
      res.status(500).json({ 
          success: false, 
          message: 'An error occurred while searching for products'
      });
  }
};


  const sortProducts = async (req,res)=>{
    try {
      const sort = req.query.sort || 'default';
       let sortCriteria;
         console.log(sort);
         
      switch (sort) {
          case 'az':
              sortCriteria = { productName: 1 }; 
              break;
          case 'za':
              sortCriteria = { productName: -1 }; 
              break;
          case 'priceLow':
              sortCriteria = { salePrice: 1 };  
              break;
          case 'priceHigh':
              sortCriteria = { salePrice: -1 };  
              break;
          default:
            sortCriteria = { createdOn: -1 }
            }
            console.log(sortCriteria)

       const products = await Product.find().sort(sortCriteria).collation({locale:"en",strength:2});
       console.log('backend productssssssssssssssssssss',products);
       
      res.json(products);  
  } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
}

 
  module.exports={
    getShopPage,
    searchProducts,
    sortProducts
     
  }