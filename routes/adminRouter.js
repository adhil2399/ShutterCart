const express= require('express')
const router= express.Router()
const adminController= require('../controllers/adminController')
const {adminAuth,userAuth}= require('../middlewares/auth')

router.get('/pageerror',adminController.pageerror)
router.get('/',adminAuth,adminController.loadDashboard)
router.get('/login',adminController.loadlogin)
router.post('/login',adminController.login)
router.get('/logout',adminController.logout)
module.exports=router;