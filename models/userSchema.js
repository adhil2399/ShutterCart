const mongoose =require('mongoose')

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
        res:'cart'
    }],
    wishlist:[{
        type:Schema.Types.ObjectId,
        res:'wishlist'
    }],
    orderHistory:[{
        type:Schema.Types.ObjectId,
        res:'order'
    }],
     
},{timeStamps:true})

const User= mongoose.model('User',userSchema)

module.exports = User;