const multer = require('multer')
const path = require('path')

const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/product-images');
    },
    filename: function (req, file, cb) {
        const ext = file.originalname.split('.').pop(); // Extract file extension
        cb(null, `${uuidv4()}.${ext}`); // Unique filename
    }
});


module.exports=storage;