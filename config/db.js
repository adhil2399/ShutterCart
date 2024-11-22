const mongoose= require('mongoose')
const env= require('dotenv').config()

const conncetDB= async()=>{
    try {
       await mongoose.connect(process.env.MONGODB_URI)
       console.log('DB conncected')
    } catch (error) {
        console.log('DB connection error ',error.message)
    }
}

module.exports=conncetDB