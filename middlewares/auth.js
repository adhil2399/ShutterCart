const User = require('../models/userSchema')

const userAuth = async (req,res,next)=>{
    try {
        if(!req.session.user){
            return res.redirect("/user/login");
        }else{
            next();
        }
    } catch (error) {
        console.log('Error in user auth middleware');
        res.status(500).send('Internal server error')
    }
}


const adminAuth= async (req,res,next)=>{
     
    try {
        if(!req.session.admin){
            return res.redirect("/admin/login")
        }else{
            next();
        }
    } catch (error) {
        console.log('Error in user auth middleware');
        res.status(500).send('Internal server error')
    }
}



module.exports ={
    userAuth,
    adminAuth
}