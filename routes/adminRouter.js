const express= require('express')
const router= express.Router()
const adminController= require('../controllers/admin/adminController')
const customerController = require('../controllers/admin/customerController')
const categoryController = require('../controllers/admin/categoryController')
const brandcontroller = require('../controllers/admin/brandcontroller')
const productController = require('../controllers/admin/productController')
const {adminAuth,userAuth}= require('../middlewares/auth')
const multer = require('multer')
const storage = require("../helpers/multer")
const uploads = multer({storage:storage})

//error managment 
router.get('/pageerror',adminController.pageerror)
//login managment

router.get('/',adminAuth,adminController.loadDashboard)
router.get('/login',adminController.loadlogin)
router.post('/login',adminController.login)
router.get('/logout',adminController.logout)

//costomer management

router.get('/users',adminAuth,customerController.customerInfo)
router.get('/BlockCustomer',adminAuth,customerController.BlockCustomer)
router.get('/unBlockCustomer',adminAuth,customerController.unBlockCustomer)

//category Management

router.get('/category',adminAuth,categoryController.categoryinfo);
router.post('/addcategory',adminAuth,categoryController.addcategory);
router.post('/addcategoryOffer',adminAuth,categoryController.addcategoryOffer);
router.post('/removecategoryOffer',adminAuth,categoryController.removecategoryOffer);
router.get('/listcategory',adminAuth,categoryController.getListcategory)
router.get('/unListcategory',adminAuth,categoryController.getUnListcategory)
router.get('/editcategory',adminAuth,categoryController.geteditcategory)
router.post('/editcategory/:id',adminAuth,categoryController.editcategory)

//brand Management
router.get('/brands',adminAuth,brandcontroller.getBrandpage)
router.post('/addBrand',adminAuth,uploads.single('image'),brandcontroller.addBrand)
router.get('/blockBrand',adminAuth,brandcontroller.blockBrand)
router.get('/unBlockBrand',adminAuth,brandcontroller.unBlockBrand)
router.get('/deleteBrand',adminAuth,brandcontroller.deleteBrand)

// product management
router.get('/addProducts',adminAuth,productController.getProductAddPage)
router.post('/addProducts',adminAuth,uploads.array("images",10),productController.addProducts)
router.get('/products',adminAuth,productController.getAllProducts)
router.get('/blockProduct',adminAuth,productController.blockProduct)
router.get('/unblockProduct',adminAuth,productController.unblockProduct)
router.get('/editProducts',adminAuth,productController.getEditProducts)
router.post('/editProducts/:id',adminAuth,uploads.array("images",10),productController.editProducts)
router.post('/deleteImage',adminAuth,productController.deleteSingleImage)


module.exports=router; 