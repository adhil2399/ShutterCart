const mongoose= require('mongoose')
const {Schema}= mongoose;
const categorySchema = new mongoosh.Schema({
    name:{
        type:String,
        required:true,
        unique:true
    },
    discription:{
        type:String,
        required:true
    },
    isListed:{
        type:Boolean,
        default:true
    },
    categoryOffer:{
        type:Number,
        default:0
    },
    createdAt :{
        type:Date,
        default:Date.now

    }
})
const category=mongoose.model('Category',categorySchema)
module.exports=category