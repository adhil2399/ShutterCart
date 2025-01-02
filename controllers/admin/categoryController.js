const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
 
 //category page info 

const categoryinfo = async(req,res)=>{
    try {
        const page= parseInt(req.query.page) || 1 
        const limit = 10;
        const skip = (page-1)*limit;

        const categoryData = await Category.find({})
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit)

        const totalcategories = await Category.countDocuments();
        const totalPage = Math.ceil(totalcategories/limit)
    res.render('category',{
        cat:categoryData,
        currentpage:page,
        totalPage:totalPage,
        totalcategories:totalcategories
    }
    )
    } catch (error) {
        console.error(error)
        res.redirect('/pageerror')
        
    }
}

// add category

const addcategory = async (req,res)=>{
    try {
        const {name,description} = req.body; 
        // console.log(description)
        const existingcategory = await Category.findOne({name})
        
        if(existingcategory){
            return res.status(400).json({message:'Category already exists'})
        }
        
        const newcategory = new Category({
            name,
            description,
        })
        // console.log( newcategory)
        await newcategory.save();
        return res.json({message:'category added successfully'})

    } catch (error) {
        return res.status(500).json({message:'Internal server Error'})
    }
}

// add category offers
const addcategoryOffer = async (req, res) => {
    try {
      const percentage = parseInt(req.body.percentage);
      const categoryId = req.body.categoryid;
  
      if (!percentage || percentage <= 0) {
        return res.status(400).json({ status: false, message: "Invalid percentage value" });
      }
  
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ status: false, message: "Category not found" });
      }
  
      const products = await Product.find({ category: category._id });
      let categoryOfferApplied = false;
  
      for (const product of products) {
        if (product.productOffer > 0 && product.productOffer > percentage) {
          // Retain the higher product offer
          product.salePrice = product.regularPrice - Math.floor(product.regularPrice * (product.productOffer / 100));
        } else {
          // Apply the category offer
          product.salePrice = product.regularPrice - Math.floor(product.regularPrice * (percentage / 100));
          product.productOffer = 0; // Remove product-specific offer
          categoryOfferApplied = true;
        }
        await product.save();
      }
  
      if (categoryOfferApplied) {
        category.categoryOffer = percentage;
        await category.save();
      }
  
      res.json({ status: true, message: "Category offer added successfully" });
    } catch (error) {
      console.error("Error in addCategoryOffer:", error);
      res.status(500).json({ status: false, message: "Internal server error" });
    }
  };
  
const removecategoryOffer = async (req,res)=>{
    try {
        const categoryid = req.body.categoryid;
        const category = await Category.findById(categoryid)

        if(!category){
            return res.status(404).json({status:false, message:'Category not found'})
        }

        const percentage= category.categoryOffer;
        const products = await Product.find({category:category._id})
      

        if(products.length > 0 ){
            for(const product of products){
                product.salePrice += Math.floor(product.regularPrice * (percentage/100))
                product.productOffer = 0;
                await product.save()
            }
        }
        category.categoryOffer = 0;
        await category.save()
        res.json({status:true})

    } catch (error) {
        res.status(500).json({status:false,message:'Internal server Error'})
        console.log(error)
        
    }
}


const getListcategory = async (req,res)=>{
    try {
        let id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:false}})
         
        res.redirect('/admin/category')
    } catch (error) {
        res.redirect('/admin/pageerror')
    }
}


const getUnListcategory = async (req,res)=>{
    try {
        
        let id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed: true}})
        res.redirect('/admin/category')
    } catch (error) {
        res.redirect('/admin/pageerror')
}
}

const geteditcategory = async (req,res)=>{
    try {
        
        const id= req.query.id
        console.log(id)
        if(!id){
            res.status(401).json({ status:false,message:'dont get the category id '})
        }
        const category = await Category.findById(id)
        res.render('edit-category',{category})

    } catch (error) {
       res.redirect('/admin/pageerror')
       console.log('edit-category error',error)
    }
}

const editcategory =async (req,res)=>{
    try {
        const id= req.params.id;
        const {categoryName,description}= req.body

        const existingcategory = await Category.findOne({ 
            name: { $regex: new RegExp(`^${categoryName}$`, 'i') }, // Case-insensitive match
            _id: { $ne: id }   
        });
        
    
        if(existingcategory){
            return res.status(400).json({status:false,message:'Category exists , please choose another name'})
        }
        const updatecategory = await Category.findByIdAndUpdate(id,{$set:{name:categoryName,description:description}},{new:true})
        
        if(updatecategory){
            return res.redirect('/admin/category')
        }
        return res.status(404).json({ status:false,message:'category not found'})
    } catch (error) {
        console.error('Error in editcategory:', error);
        return  res.redirect('/admin/pageerror')
    }
}


module.exports = {
    categoryinfo,
    addcategory,
    addcategoryOffer,
    removecategoryOffer,
    getListcategory,
    getUnListcategory,
    geteditcategory,
    editcategory,
}