const mongoose= require('mongoose');
const product = require('./productSchema');
const {Schema}= mongoose;
const cartSchema= new Schema({
    userId:{
        type:Schema.types.ObjectId,
        ref:'User',
        required:true
    },
    items:[{
        productId:{
            type:Schema.Types.ObjectId,
            ref:'product',
            required:true
        },
        quantity:{
            type:Number,
            default:1
        },
        Price:{
            type:Number,
            required:true
        },
        totalPrice:{
            type:Number,
            required:true
        },
        status:{
            type:String,
            default:'placed'
        },
        concellationReason:{
            type:String,
            default:"null"
        }
    }]
})

const cart= mongoose.model('cart',cartSchema)
module.exports=cart