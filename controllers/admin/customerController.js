const User = require("../../models/userSchema")

const customerInfo = async (req,res)=>{
    try {
        const search = req.query.search || ''
        const page= req.query.page || 1
        
        const limit=4
        const userData= await User.find({
            isAdmin:false,
            $or:[
                {name:{$regex:'.*'+search+'.*'}},
                {email:{$regex:'.*'+search+'.*'}}
            ]
        })
        .limit(limit*1)
        .skip((page-1)*limit)
        .exec()

        const count = await User.find({
            isAdmin:false,
            $or:[
                {name:{$regex:'.*'+search+'.*'}},
                {email:{$regex:'.*'+search+'.*'}}
            ]}).countDocuments()
        const totalPage= Math.ceil(count / limit)
            res.render('customers', { 
                data: userData, 
                total: count, 
                currentPage: page, 
                totalPage,
              });
    } catch (error) {
            console.error('Error:', error);
            res.redirect('/pageerror');    
    }
}

 const BlockCustomer = async (req,res)=>{
    try {
        const id = req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect("/admin/users")
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/pageerror');
    }
    
 }

 const unBlockCustomer = async (req,res)=>{
    try {
        const id = req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked: false}});
        res.redirect("/admin/users")
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/pageerror');
    }
    
 }

module.exports ={
    customerInfo,
    BlockCustomer,
    unBlockCustomer,
}