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
      const products = req.body;

      // Validate product name
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

          for (let i = 0; i < req.files.length; i++) {
              const originalImagePath = req.files[i].path;
              const fileExt = path.extname(req.files[i].originalname);
              const uniqueName = `${Date.now()}-${i}${fileExt}`;
              const resizedImagePath = path.join(uploadDir, uniqueName);
              await sharp(originalImagePath)
              .resize({ width: 440, height: 440, fit: sharp.fit.cover })
              .sharpen({ sigma: 1.5 }) // Enhances edges and details
              .jpeg({ quality: 95 })   // Adjust quality to near-perfect
              .toColourspace('srgb')   // Standard color space
              .toFile(resizedImagePath);
          
            

              images.push(`/uploads/product-images/${uniqueName}`); // Use full path
          }
      }

      const categoryId = await Category.findOne({ name: products.category });
      if (!categoryId) {
          return res.status(400).json("Invalid category name");
      }

      const newProduct = new Product({
          productName: products.productName,
          description: products.description,
          brand: products.brand,
          category: categoryId._id,
          regularPrice: products.regularPrice,
          salePrice: products.salePrice,
          createdOn: new Date(),
          quantity: products.quantity,
          productImage: images,
          status: "Available",
      });

      await newProduct.save();
      res.redirect("/admin/products");
  } catch (error) {
      console.error("Error saving product:", error);
      res.redirect("/admin/pageerror");
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
      search: search,
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

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).send("Product not found");
    }

    const category = await Category.findOne({ name: data.category });
    if (!category) {
      return res.status(400).json({ error: "Invalid category" });
    }

    const existingProduct = await Product.findOne({
      productName: { $regex: `^${data.productName}$`, $options: "i" },
      _id: { $ne: id },
    });

    if (existingProduct) {
      return res.status(400).json({
        error: "Product with this name already exists. Please try another name.",
      });
    }

    // Remove selected images
    const removedImages = JSON.parse(data.removedImages || "[]");
    removedImages.forEach((index) => {
      const imagePath = product.productImage[index];
      if (imagePath) {
        const fullPath = path.join(__dirname, "..", "public", imagePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
    });

    product.productImage = product.productImage.filter((_, i) => !removedImages.includes(i));

    // Handle new cropped images
    const images = [];
    if (req.body.croppedImages && req.body.croppedImages.length > 0) {
      const uploadDir = path.join("public", "uploads", "product-images");

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      for (let i = 0; i < req.body.croppedImages.length; i++) {
        const imageBuffer = Buffer.from(req.body.croppedImages[i], "base64");
        const uniqueName = `${Date.now()}-${i}.jpeg`;
        const resizedImagePath = path.join(uploadDir, uniqueName);

        await sharp(imageBuffer)
          .resize({ width: 440, height: 440, fit: sharp.fit.inside })
          .jpeg({ quality: 90 })
          .toFile(resizedImagePath);

        images.push(`/uploads/product-images/${uniqueName}`);
      }
    }
   console.log(data)
    const updateFields = {
      productName: data.productName,
      description: data.description,
      brand: data.brand,
      category: category._id,
      regularPrice: data.regularPrice,
      salePrice: data.salePrice,
      quantity: data.quantity,
    };

    if (images.length > 0) {
      updateFile.$push = { productImage: { $each: images } };
    }
    await Product.findByIdAndUpdate(id, updateFields, { new: true });

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
