const category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
 
 //category page info 

const categoryinfo = async(req,res)=>{
    try {
        const page= parseInt(req.query.page) || 1 
        const limit = 4;
        const skip = (page-1)*limit;

        const categoryData = await category.find({})
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit)

        const totalcategories = await category.countDocuments();
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
        const existingcategory = await category.findOne({name})
        
        if(existingcategory){
            return res.status(400).json({error:'category already exists'})
        }
        
        const newcategory = new category({
            name,
            description,
        })
        // console.log( newcategory)
        await newcategory.save();
        return res.json({message:'category added successfully'})

    } catch (error) {
        return res.status(500).json({error:'Internal server Error'})
    }
}

// add category offers

const addcategoryOffer= async (req,res)=>{
    try {   
        const percentage = parseInt(req.body.percentage)
        const categoryid = req.body.categoryid;
        console.log('Request body:', req.body);
 
        if (!percentage || percentage <= 0) {
            return res.status(400).json({ status: false, message: 'Invalid percentage value' });
        }

        
        const category= await category.findById(categoryid)
        console.log('Category:', category); 
        if(!category){
            return res.status(404).json({status:false,message:'category not found'})
        }

        const products = await Product.find({category:category._id})
        const hasproductOffer = products.some(product=> product.productOffer > percentage)

        if(hasproductOffer){
            return res.json({status:false , message:'Products within this category already have product offers'})
        }
        await category.updateOne({_id:categoryid},{$set:{categoryOffer:percentage}})

        for(const product of products){
            product.productOffer= 0;
            product.salePrice = product.regularPrice;
            await product.save()
        }

        res.json({status:true})

    } catch (error) {
        res.status(500).json({status:false,message:'Internal server Error'})
    }
}

const removecategoryOffer = async (req,res)=>{
    try {
        const categoryid = req.body.categoryid;
        const category = await category.findById(categoryid)

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
    }
}


const getListcategory = async (req,res)=>{
    try {
        let id = req.query.id;
        await category.updateOne({_id:id},{$set:{isListed:false}})
        console.log(id);
        
        res.redirect('/admin/category')
    } catch (error) {
        res.redirect('/pageerror')
    }
}


const getUnListcategory = async (req,res)=>{
    try {
        
        let id = req.query.id;
        await category.updateOne({_id:id},{$set:{isListed: true}})
        res.redirect('/admin/category')
    } catch (error) {
        res.redirect('/pageerror')
}
}

const geteditcategory = async (req,res)=>{
    try {
        
        const id= req.query.id
        console.log(id)
        const Category = await category.findById(id)
        res.render('edit-category',{category:Category})

    } catch (error) {
       res.redirect('/pageerror')
       console.log('edit-category error',error)
    }
}

const editcategory =async (req,res)=>{
    try {
        const id= req.params.id;
        const {categoryName,description}= req.body

        const  existingcategory = await category.findOne({name:categoryName})
        
    
        if(existingcategory){
            return res.status(400).json({error:'Category exists , please choose another name'})
        }
        const updatecategory = await category.findByIdAndUpdate(id,{$set:{name:categoryName,description:description}},{new:true})
        
        if(updatecategory){
            return res.redirect('/admin/category')
        }
        return res.status(404).json({error:'category not found'})
    } catch (error) {
        console.error('Error in editcategory:', error);
        return  res.status(500).json({error:'Internal server error'})
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