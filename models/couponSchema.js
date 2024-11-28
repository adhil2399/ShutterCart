const mongoose= require('mongoose')
const {Schema}= mongoose;

const couponSchema= new mongoose.Schema({
   name:{
    type:String,
    required:true,
    unique:true
   },
   createOn:{
    type:Date,
    default:Date.now
   },
   expireOn:{
    type:Number,
    required:true
   },
   minimumPrice:{
    type:Number,
    required:true
   },
   isList:{
    type:Boolean,
    default:false
   },
   userId:[{
    type:mongoosh.Schema.Types.ObjectId,
    ref:'User'
   }]
})

const coupon = mongoose.model('coupon',couponSchema)

module.exports=coupon