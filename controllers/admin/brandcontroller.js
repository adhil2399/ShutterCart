const Brand = require('../../models/brandSchema')
const product = require('../../models/productSchema')


const getBrandpage= async (req,res)=>{
    try {
        const page = parseInt(req.query.page)
        const limit = 4;
        const skip = (page-1)*limit

        const brandData = await Brand.find({}).sort({cretedAt:-1}).skip(skip).limit(limit)
        const totalBrands = await Brand.countDocuments();
        const totalpages = Math.ceil(totalBrands/limit)
        const reversBrand = brandData.reverse()

        res.render('brand',{
            data:reversBrand,
            currentpage:page,
            totalpages:totalpages,
            totalBrands:totalBrands
        })
    } catch (error) {
        res.redirect('/pageerror')
    }
}

const addBrand = async (req,res)=>{
    try {
        const brand = req.body.name;
        const findBrand = await Brand.findOne({brand})
        if(!findBrand){
            const image = req.file.filename;
            const newBrand = new Brand({
                brandName: brand,
                brandImage:image
            })
            await newBrand.save();
            return  res.redirect('/admin/brands')
        }

    } catch (error) {
        res.redirect('/pageerror')
        console.log('addd brand Error',error)
    }
}


const blockBrand = async (req,res)=>{
    try {
        const id = req.query.id
        await Brand.updateOne({_id:id},{$set:{isBlocked:true}})
        return res.redirect('/admin/brands')
    } catch (error) {
        res.redirect('/pageerror')
        console.log('block brand Error',error)
    }
}


const unBlockBrand = async (req,res)=>{
    try {
        const id = req.query.id
        await Brand.updateOne({_id:id},{$set:{isBlocked:false}})
        return res.redirect('/admin/brands')
    } catch (error) {
        res.redirect('/pageerror')
        console.log('unblock brand Error',error)
    }
}


const deleteBrand = async (req,res)=>{
    try {
        const {id} = req.query
        if(!id){
           return res.status(400).redirect('/pageerror')
        }

        await Brand.deleteOne({_id:id})
        return res.redirect('/admin/brands')

    } catch (error) {
        res.redirect('/pageerror')
        console.log('delete brand Error',error)
        
    }
}

module.exports={
  getBrandpage,
  addBrand,
  blockBrand,
  unBlockBrand,
  deleteBrand,

}