

const Category = require("../../models/categorySchema");
const Product =require('../../models/productSchema');
const Brand = require("../../models/brandSchema");
const User= require('../../models/userSchema')

const getShopPage=async(req,res)=>{
  
    try {
      const user=req.session.user
        const userData=await User.findOne({_id:user})
       const categories=await Category.find({isListed:true}) 
       const categoryId =categories.map((category)=>category._id.toString())

       const page=parseInt(req.query.page) || 1
       const limit=12
       const skip=(page-1)*limit
  
       const products=await Product.find({
        isBlocked:false,
        category:{$in:categoryId},
        }).sort({createdOn:-1}).skip(skip).limit(limit)

       const totalProducts=await Product.countDocuments({
         isBlocked:false,
         category:{$in:categoryId},
         quantity:{$gt:0}
       })
  
       const totalPages=Math.ceil(totalProducts / limit)

       const pagination = {
        currentPage: page,
        totalPages,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page < totalPages ? page + 1 : null,
        pages: Array.from({ length: totalPages }, (_, i) => ({
            number: i + 1,
            isActive: i + 1 === page,
        })),
    };
       const categoriesWithIds=categories.map(category=>({_id:category._id, categoryName:category.categoryName}))
  
  
       res.render("shop", {
        user: userData,
        products: products,
        categories: categoriesWithIds, 
        totalProducts: totalProducts,
        currentPage: page,
        totalPages: totalPages,
        pagination
      });
      
    } catch (error) {
       res.status(500).redirect('/pageNotFound')
  
       console.log('Error on shop page rendering ',error)
        
    }
  }
  
  
  // const filterProducts = async (req,res)=>{
  //   try {
  //     const user = req.session.user
  //     const category = req.query.category
  //     const brand = req.query.brand
  //     const findCategory = category ? await Category.findOne({_id:category}) : null
  //     const findBrand = brand ? await Brand.findOne({_id:brand}) : null
  //     const brands = await  Brand.find({}).lean()
  //     const query = {
  //       isBlocked :false,
  //       quantity:{$gt:0}
  //     }
  
  // if(findCategory){
  //   query.category = findCategory._id
  // }
  // if(findBrand){
  //   query.brand = findBrand.brandName
  // }
  
  // let findProducts= await product.find(query).lean()
  
  // findProducts.sort((a,b)=> new Date(b.createdOn)-new Date(a.createdOn))
  
  // const categories = await Category.find({isListed:true})
  
  // let itemesPerPage = parseInt(req.query.page) || 1
  // let startIndex = (currentPage-1) * itemesPerPage;
  // let endIndex = startIndex+itemesPerPage;
  // let totalPages= Math.ceil(findProducts.length/itemesPerPage)
  // const currentProduct = findProducts.slice(startIndex,endIndex)
  // let userData = null;
  // if(user){
  //   userData = await User.findOne({_id:user})
  // if(userData){
  //   const searchEntry = {
  //     category : findCategory ? findCategory._id : null,
  //     brand : findBrand ? findBrand.brandName : null,
  //     searchedOn : new Date()
  //   }
  //   userData.searchHistory.push(searchEntry)
  //   await userData.save()
  // }
  
  // }
  // req.session.filterProducts= currentProduct
  // res.render('shop',{
  //   user:userData,
  //   products:currentProduct,
  //   category:categories,
  //   brand: brands,
  //   totalPages,
  //   currentPage,
  //   selectedCategory : category || null,
  //   selectedBrand : brand || null
  // })
  //   } catch (error) {
  //    res.redirect('pageNotFound')
  //    console.log('error on filter side', error)
  
  //   }
  // }
  

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
    // filterProducts,
    sortProducts
     
  }