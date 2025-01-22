const express = require('express')
const router = express.Router()
const { adminAuth } = require('../middlewares/auth')
const adminController = require('../controllers/admin/adminController')
const customerController = require('../controllers/admin/customerController')
const categoryController = require('../controllers/admin/categoryController')
const brandcontroller = require('../controllers/admin/brandcontroller')
const productController = require('../controllers/admin/productController')
const orderController = require('../controllers/admin/orderController')
const couponController = require('../controllers/admin/couponController')
const salesReportsController = require('../controllers/admin/salesReportsController')
const dashBoardController = require('../controllers/admin/dashBoardController')
const multer = require('multer')
const storage = require("../helpers/multer")
const uploads = multer({storage:storage})

//error managment 
router.get('/pageerror',adminController.pageerror)
//login managment

//dashboard routes
router.get('/',adminAuth,dashBoardController.loadDashboard)
router.get('/api/dashboard-data',adminAuth,dashBoardController.getDashboardData)
router.get('/sales-data',adminAuth,dashBoardController.getSalesData)
router.get('/category-distribution',adminAuth,dashBoardController.getCategoryDistribution)
router.get('/top-products',adminAuth,dashBoardController.getTopProducts)
router.get('/top-categories',adminAuth,dashBoardController.getTopCategories)
router.get('/top-brands',adminAuth,dashBoardController.getTopBrands)
router.get('/ledger-data',adminAuth,dashBoardController.getLedgerData)

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
router.delete ('/deleteBrand',adminAuth,brandcontroller.deleteBrand)

// product management
router.get('/addProducts',adminAuth,productController.getProductAddPage)
router.post('/addProducts',adminAuth,uploads.array("images",6),productController.addProducts)
router.get('/products',adminAuth,productController.getAllProducts)
router.get('/blockProduct',adminAuth,productController.blockProduct)
router.get('/unblockProduct',adminAuth,productController.unblockProduct)
router.get('/editProducts',adminAuth,productController.getEditProducts)
router.post('/editProducts/:id',adminAuth,uploads.array("images",6),productController.editProducts)
router.post('/addProductOffer',adminAuth,productController.addProductOffer)
router.post('/removeProductOffer',adminAuth,productController.removeProductOffer)

//order management
router.get('/orders',adminAuth,orderController.getOrderList)
router.get('/orderDetails',adminAuth,orderController.getOrderDetailsPage);  
router.post('/update-order-status',adminAuth,orderController.updateOrderStatus)
router.patch('/order/return/:orderId',adminAuth,orderController.processReturnRequest)

//coupon management
router.get('/coupon',adminAuth,couponController.getCouponList)
router.post('/createCoupon',adminAuth,couponController.createCoupon)
router.patch('/toggleCouponStatus/:id',adminAuth,couponController.toggleCouponStatus)
router.delete('/deleteCoupon/:id',adminAuth,couponController.deleteCoupon)

//salesReport management
router.get('/salesReport',adminAuth,salesReportsController.getSalesReports)
router.get('/salesReport/download/:format',adminAuth,salesReportsController.downloadReport)

module.exports=router;