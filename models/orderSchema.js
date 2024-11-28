const mongoose= require('mongoose')
const {Schema}= mongoose;
const {v4:uuidv4}= require('uuid');
const product = require('./productSchema');
const orderSchema=new SVGAnimatedLengthListchema({
    orderId:{
        type :String,
        default:()=>uuidv4(),
        unique:true
    },
    orderedItems:[{
        product:{
            type:Schema.Types.ObjectId,
            ref:'product',
            required:true
        },
        quantity:{
            type:Number,
            required:true
        },
        price:{
            type:Number,
            default:0
        }
    }],
    totalPrice :{
        type:Number,
        required:true
    },
    discount:{
        type:Number,
        default:0
    },
    finalAmount:{
        type:Number,
        required:true
    },
    addredd:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    invoiveDate:{
        type:Date
    },
    status:{
        type:String,
        required:true,
        enum:['Pending','Processing','Shipped','Delivered','Cancelled','Return Request','Returened']
    },
  createdOn:{
    type:Date,
    default:Date.now,
    required:true
  },
  couponApplied:{
    type:Boolean,
    default:false
  }

})
const Order= mongoose.model('Order',orderSchema)
module.exports= Order