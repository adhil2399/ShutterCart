const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const mongoose = require('mongoose')
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
    res.redirect("/admin/pageerror");
    console.log(error)
  }
};

const addProducts = async (req, res) => {
  try {
    const productData = req.body;

    
    const existingProduct = await Product.findOne({
      productName: productData.productName,
    });
    if (existingProduct) {
      return res.status(400).json("Product already exists, please try with another name");
    }

    const processedImages = [];
    if (req.files && req.files.length > 0) {
      const uploadDirectory = path.join("public", "uploads", "product-images");

      
      if (!fs.existsSync(uploadDirectory)) {
        fs.mkdirSync(uploadDirectory, { recursive: true });
      }

     
      for (let i = 0; i < req.files.length; i++) {
        const originalImagePath = req.files[i].path;
        const fileExtension = path.extname(req.files[i].originalname);
        const uniqueFileName =` ${Date.now()}-${i}${fileExtension}`;
        const resizedImagePath = path.join(uploadDirectory, uniqueFileName);

        await sharp(originalImagePath)
          .resize({ width: 440, height: 440, fit: sharp.fit.cover })
          .sharpen({ sigma: 1.5 })
          .jpeg({ quality: 95 })
          .toColourspace('srgb')
          .toFile(resizedImagePath);

        processedImages.push(`/uploads/product-images/${uniqueFileName}`);
      }
    }

   
    const category = await Category.findOne({ name: productData.category });
    if (!category) {
      return res.status(400).json("Invalid category name");
    }

   
    const newProduct = new Product({
      productName: productData.productName,
      description: productData.description,
      brand:productData.brand,
      category: category._id, 
      regularPrice: productData.regularPrice,
      salePrice: productData.salePrice,
      quantity: productData.quantity,
      productImage: processedImages,
      status: "Available", 
    });

    await newProduct.save();
    res.redirect("/admin/products");
  } catch (error) {
    console.error("Error while adding product:", error);
    res.redirect("/admin/pageerror");
  }
};





const getAllProducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = req.query.page || 1;
    const limit = 5;
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
      search: search,
      currectPage: page,
      totalPages: Math.ceil(count / limit),
      cat: category,
      brand: brand,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.redirect("/admin/pageerror");
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

// Get Edit Products Page
const getEditProducts = async (req, res) => {
  try {
    const id = req.query.id;
    const product = await Product.findById(id).populate("category");
    if (!product) {
      return res.status(404).send("Product not found");
    }

    const brand = await Brand.find();
    const category = await Category.find({ isListed: true });

    return res.render("edit-Product", {
      product,
      cat: category,
      brand,
    });
  } catch (error) {
    console.error("Error in getEditProduct:", error.message);
    res.status(500).redirect("/admin/pageerror");
  }
};
// Edit Product
const editProducts = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;

    // Fetch the existing product
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Validate the category
    const category = await Category.findOne({ name: data.category });
    if (!category) {
      return res.status(400).json({ message: "Invalid category" });
    }

    // Check for duplicate product names
    const existingProduct = await Product.findOne({
      productName: { $regex: `^${data.productName}$`, $options: "i" },
      _id: { $ne: id },
    });

    if (existingProduct) {
      return res.status(400).json({
        message: "Product with this name already exists. Please try another name.",
      });
    }

    // Process new cropped images
    let newImages = [];
    if (data.croppedImages && Array.isArray(data.croppedImages)) {
      const uploadDir = path.join("public", "uploads", "product-images");

      // Create the directory if it doesn't exist
      await fs.promises.mkdir(uploadDir, { recursive: true });

      for (let i = 0; i < data.croppedImages.length; i++) {
        const imageBuffer = Buffer.from(data.croppedImages[i], "base64");
        const uniqueName = `${Date.now()}-${i}.jpeg`;
        const resizedImagePath = path.join(uploadDir, uniqueName);

        // Save the image
        await sharp(imageBuffer)
          .resize({ width: 440, height: 440, fit: sharp.fit.cover })
          .sharpen({ sigma: 1.5 })
          .jpeg({ quality: 95 })
          .toColourspace("srgb")
          .toFile(resizedImagePath);

        newImages.push(`/uploads/product-images/${uniqueName}`);
      }
    }

    // Prepare fields to update
    const updateFields = {
      productName: data.productName,
      description: data.description,
      brand: data.brand,
      category: category._id,
      regularPrice: data.regularPrice,
      salePrice: data.salePrice,
      quantity: data.quantity,
      productImage: newImages.length > 0 ? newImages : product.productImage, // Replace images if new ones are provided
    };

    // Update the product
    const updatedProduct = await Product.findByIdAndUpdate(id, updateFields, {
      new: true,
    });

    if (!updatedProduct) {
      return res.status(500).json({ message: "Failed to update the product." });
    }

    res.redirect("/admin/products");
  } catch (error) {
    console.error("Error in EditProduct:", error.message);
    res.status(500).redirect("/admin/pageerror");
  }
};

 

// Delete Single Image
const deleteSingleImage = async (req, res) => {
  try {
    const { imageNameToServer, productIdToServer } = req.body;
    
    const product = await Product.findByIdAndUpdate(productIdToServer, {
      $pull: { productImage: imageNameToServer },
    });

    const imagePath = path.join("public", "uploads", "product-images", imageNameToServer);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      console.log(`Image ${imageNameToServer} deleted successfully.`);
    } else {
      console.log(`Image ${imageNameToServer} not found.`);
    }

    res.status(200).send("Image deleted successfully.");
  } catch (error) {
    console.error("Error in deleteSingleImage:", error.message);
    res.status(500).redirect("/admin/pageerror");
  }
};


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
