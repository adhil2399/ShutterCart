const User = require("../models/userSchema");
const bcrypt = require('bcrypt');
const mongoose= require('mongoose')

const {adminAuth,userAuth}= require('../middlewares/auth')

// render admin error page

const pageerror= async (req,res)=>{
    res.render('admin-error')
}

//render admin login page 

const loadlogin =async (req,res)=>{
    if(!req.session.admin){
        return res.render('admin-login',{message:null})
    }
    res.redirect('/admin')
}

   // admin login

const login = async (req,res)=>{
    const {email,password}= req.body
    try {
        const admin= await User.findOne({email,isAdmin:true})
        console.log("kugcg",admin)
        if(admin){
            const passwordMatch= bcrypt.compare(admin.password,password)
            if(passwordMatch){
                req.session.admin= true
                return res.redirect('/admin')
            }else{
                // return res.render('admin-login',{message:'Wrong password'})
            }
        }
    } catch (error) {
        console.log('login error',error);
        return res.redirect('/pageerror')        
    }
}

// render dashBoard

const loadDashboard =async (req,res)=>{
    if(req.session.admin){
        try {
            res.render('dashBoard')
        } catch (error) {
            res.redirect('/pageerror')
        }
    }res.redirect('/admin/login')
}


//admin logout

const logout= async (req,res)=>{
    try {
          
        req.session.destroy(err=>{
            if(err){
                conosole.log('Error desstroying session ',err)
                return res.render('pageerror')
            }
            return res.redirect('/admin/login')
        })
    } catch (error) {
        console.log('unexpected Error during logout ',error);
        res.redirect('/pageerror')
    }
}
module.exports = {
    loadlogin,
    login,
    loadDashboard,
    pageerror,
    logout,
}
