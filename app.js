 const express = require('express')
const app = express()
 const env= require('dotenv').config()
 const DB=require('./config//db')
DB()

app.get('/', (req, res) => res.render())
 app.listen(process.env.PORT,()=>{
    console.log(`server is running ${process.env.PORT}`)
 })

 module.exports =app