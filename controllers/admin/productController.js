const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const product = require("../../models/productSchema");
 
const getProductAddPage = async (req, res) => {
  try {
    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });
    return res.render("product-add", {
      cat: category,
      brand: brand,
    });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const addProducts = async (req, res) => {
  try {
    const products = req.body;

    // Check if the product already exists
    const productExists = await Product.findOne({
      productName: products.productName,
    });
    if (productExists) {
      return res
        .status(400)
        .json("Product already exists, please try with another name");
    }

    const images = [];
    if (req.files && req.files.length > 0) {
      const uploadDir = path.join("public", "uploads", "product-images");

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Process each uploaded file
      for (let i = 0; i < req.files.length; i++) {
        const originalImagePath = req.files[i].path;
        const fileExt = path.extname(req.files[i].originalname);
        const uniqueName = `${Date.now()}-${i}${fileExt}`;
        const resizedImagePath = path.join(uploadDir, uniqueName);

        // Resize and save the image
        await sharp(originalImagePath)
          .resize({ width: 440, height: 440 })
          .toFile(resizedImagePath);

        images.push(uniqueName); // Save filename for database
      }
    }

    // Find the category by name
    const categoryId = await Category.findOne({ name: products.category });
    if (!categoryId) {
      return res.status(400).json("Invalid category name");
    }

    // Create and save the new product
    const newProduct = new Product({
      productName: products.productName,
      description: products.description,
      brand: products.brand,
      category: categoryId._id,
      regularPrice: products.regularPrice,
      createdOn: new Date(),
      quantity: products.quantity,
      productImage: images,
      status: "Available",
    });

    await newProduct.save();
    return res.redirect("/admin/addProducts");
  } catch (error) {
    console.error("Error saving product:", error);
    return res.redirect("/admin/pageerror");
  }
};

const getAllProducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = req.query.page || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const productQuery = {
      $or: [
        { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
        { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
      ],
    };

    const productData = await Product.find(productQuery)
      .limit(limit * 1)
      .skip(skip)
      .populate("category")
      .exec();

    const count = await Product.find(productQuery).countDocuments();

    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });

    res.render("products", {
      data: productData,
      currectPage: page,
      totalPages: Math.ceil(count / limit),
      cat: category,
      brand: brand,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.redirect("/pageerror");
  }
};

const blockProduct = async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      console.error("Error: No product ID provided for blocking.");
      return res.status(400).send("Product ID is required.");
    }

    const result = await Product.updateOne(
      { _id: id },
      { $set: { isBlocked: true } }
    );
    console.log(`Success: Product with ID ${id} has been blocked.`);

    return res.redirect("/admin/products");
  } catch (error) {
    console.error("Error in blockProduct:", error.message);
    res.status(500).redirect("/admin/pageerror");
  }
};

const unblockProduct = async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      console.error("Error: No product ID provided for unblocking.");
      return res.status(400).send("Product ID is required.");
    }

    const result = await Product.updateOne(
      { _id: id },
      { $set: { isBlocked: false } }
    );
    console.log(`Success: Product with ID ${id} has been unblocked.`);

    return res.redirect("/admin/products");
  } catch (error) {
    console.error("Error in unblockProduct:", error.message);
    res.status(500).redirect("/admin/pageerror");
  }
};

const getEditProducts = async (req, res) => {
  try {
    const id = req.query.id;
    const product = await Product.findById(id).populate("category");
    if (!product) {
      return res.status(404).send("Product not found");
    }
    const brand = await Brand.find();
    const category = await Category.find();
    console.log(product);
    return res.render("edit-Product", {
      product: product,
      cat: category,
      brand: brand,
    });
  } catch (error) {
    console.error("Error in getEditProduct:", error.message);
    res.status(500).redirect("/admin/pageerror");
  }
};

const editProducts = async (req, res) => {
  try {
    const id = req.params.id;
    const product = await Product.findOne({ _id: id });
    const data = req.body;
    const existingProduct = await Product.findOne({
      productName: data.productName,
      _id: { $ne: id },
    });

    if (existingProduct) {
      return res.status(400).json({
        error: "product with this name already exists.please try with another name",
      });
    }

    const images = [];

    if (req.files && req.files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        images.push(files[i].filename);
      }
    }
    const updateFields = {
      productName: data.productName,
      description: data.description,
      brand: data.brand,
      category: product.category,
      regularPrice: data.regularPrice,
      salePrice:data.salePrice,
      quantity:data.quantity
    };

    if(req.files.length>0){
        updateFields.$push= {productImage:{$each:images }}
    }

    await Product.findByIdAndUpdate(id,updateFields,{new:true})
    res.redirect('/admin/products')

  } catch (error) {

    console.error("Error in EditProduct:", error.message);
    res.status(500).redirect("/admin/pageerror");
  }
};


const deleteSingleImage = async (req,res)=>{
    try {
        const {imageNameToServer,productIdToServer} = req.body
        const product = await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}})
        const imagepath = path.join('public','uploads','re-image',imageNameToServer)

        if(fs.existsSync(imagepath)){
            await fs.unlinkSync(imagepath)
            console.log(`Image ${imageNameToServer} deleted successfully`)
        }else{
            console.log(`Image${imageNameToServer} not found`);
            
        }

    } catch (error) {
        res.redirect('/admin/pageerror')     
        console.error("Error in deleteSingleImage:", error.message);
        res.status(500).redirect("/admin/pageerror");
    }
}


module.exports = {
  getProductAddPage,
  addProducts,
  getAllProducts,
  blockProduct,
  unblockProduct,
  getEditProducts,
  editProducts,
  deleteSingleImage
};
