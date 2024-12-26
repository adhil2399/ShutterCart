const mongoose= require('mongoose');
 
const {Schema}= mongoose;
const cartSchema= new Schema({
    userId:{
        type:Schema.Types.ObjectId,
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
        cancellationReason:{
            type:String,
            default:"null"
        }
    }]
})

const cart= mongoose.model('cart',cartSchema)
module.exports=cart