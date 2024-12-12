const mongoose =require('mongoose')

const {Schema}= mongoose;


const addressSchema= new Schema({
    userId:{
        type : Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    address:[{
        addressType:{
            type: String,
            required:true
        },
        name:{
            type :String,
            required: true
        },
        city:{
            type:String,
            required:true
        },
        landMark:{
            type :String,
            required: true
        },
        pinCode:{
            type:String,
            required:true
        },
        state:{
            type :String,
            required: true
        },
         phone:{
            type: Number,
            required:true
        },
        altPhone:{
            type:Number,
            required:true
        }
    }]
})


const Address= mongoose.model('address',addressSchema)
module.exports=Address