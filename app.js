const nocache = require('nocache'); 
 const express = require('express')
const app = express()

const path = require('path')
 const env= require('dotenv').config()
 const session = require('express-session')
 const DB=require('./config//db')
 
 const passport= require('./config/passport')

 const userRouter= require('./routes/userRouter')
 const adminRouter = require('./routes/adminRouter')
DB()

app.use(express.urlencoded({extended:true}))
app.use(express.json())

// app.use(nocache());

app.use(session({
   secret: process.env.SESSION_SECRET,
   resave: false,
   saveUninitialized: true,
   cookie: { 
     secure: false,   
     httpOnly: true 
   }
 }));
 

 app.use(passport.initialize())
 app.use(passport.session())

 app.use((req,res,next)=>{
  res.set('cache-control','no-store')
  next()
 })
 
//  //setting view engine

app.set('view engine','ejs')
app.set('views',[path.join( __dirname,'views/admin'),
                 path.join(__dirname,'views/user')])
app.use(express.static('public'))


 app.use(userRouter)
 app.use('/admin',adminRouter)
 

const PORT=  process.env.PORT || 3003

 app.listen( PORT,()=>{
    console.log(`server is running on ${PORT}`)
 })

 module.exports =app