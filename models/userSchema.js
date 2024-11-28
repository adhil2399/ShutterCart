const mongoose= require('mongoose')
const {Schema}= mongoose;

const userSchema= new Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unque:true
    },
    phone:{
        type:String,
        required:false,
        unique:false,
        sparse:true,
        default:null
    },
    googleId:{
        type:String,
        unique:true,
        sparse : true,
    },
    password:{
        type:String,
        required:false
    },
    idBlocked:{
        type:Boolean,
        default: false
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    cart:[{
        type:Schema.Types.ObjectId,
        res:'cart'
    }],
    wallet:{
        type:Number,
        default:0
    },
    wishlist:[{
        type:Schema.Types.ObjectId,
        res:'wishlist'
    }],
    orderHistory:[{
        type:Schema.Types.ObjectId,
        res:'order'
    }],
    createdOn:{
        type:Date,
        default:Date.now
    },
    referalCode:{
        type:String,
    },
    redeemed:{
        type:Boolean
    },
    redeemedUser:[{
        type:Schema.Types.ObjectId,
        res:'user'
    }],
    searchHistory:[{
        category:{
            type:Schema.Types.ObjectId,
            ref:'category'
        },
        brand:{
            type:String,
        },
        searchOn:{
            type:Date,
            default:Date.now
        }
    }]
})

const User= mongoose.model('User',userSchema)

module.exports = User;