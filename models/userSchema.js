const mongoose = require('mongoose')

const {Schema} = mongoose;

const userSchema = new Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
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
    },
    password:{
        type:String,
        required:false
    },
    isBlocked:{
        type:Boolean,
        default: false
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    cart:[{
        type:Schema.Types.ObjectId,
        ref:'cart'
    }],
    wishlist:[{
        type:Schema.Types.ObjectId,
        ref:'wishlist'
    }],
    orderHistory:[{
        type:Schema.Types.ObjectId,
        ref:'order'
    }],
     
},{timestamps: true})

const User = mongoose.model('User', userSchema)

module.exports = User;