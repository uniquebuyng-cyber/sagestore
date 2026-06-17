const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');
const { upload, cloudinary } = require('../config/cloudinary');
const { log } = require('../utils/audit');

// GET /api/products
router.get('/', protect, async (req, res) => {
  const { category, search, active } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (active !== 'false') filter.isActive = true;
  if (search) filter.$or = [
    { name: { $regex: search, $options: 'i' } },
    { brand: { $regex: search, $options: 'i' } },
    { sku: { $regex: search, $options: 'i' } },
  ];
  const products = await Product.find(filter).sort({ name: 1 });
  res.json(products);
});

// GET /api/products/:id
router.get('/:id', protect, async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
});

// POST /api/products — owner/manager
router.post('/', protect, authorize('owner', 'manager'), upload.single('image'), async (req, res) => {
  const { name, category, brand, sku, costPrice, sellingPrice, lowStockLevel, description, unit } = req.body;
  if (!name || !category || !costPrice || !sellingPrice) {
    return res.status(400).json({ message: 'Name, category, cost price, and selling price required' });
  }

  const productData = {
    name, category, brand, sku, description, unit,
    costPrice: Number(costPrice),
    sellingPrice: Number(sellingPrice),
    lowStockLevel: Number(lowStockLevel) || 5,
  };

  if (req.file) {
    productData.image = req.file.path;
    productData.cloudinaryId = req.file.filename;
  }

  const product = await Product.create(productData);
  await log({ action: 'PRODUCT_CREATED', entity: 'Product', entityId: product._id, performedBy: req.user._id, details: { name, category } });
  res.status(201).json(product);
});

// PUT /api/products/:id — owner/manager
router.put('/:id', protect, authorize('owner', 'manager'), upload.single('image'), async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });

  const { name, category, brand, sku, costPrice, sellingPrice, lowStockLevel, description, unit } = req.body;
  if (name) product.name = name;
  if (category) product.category = category;
  if (brand !== undefined) product.brand = brand;
  if (sku !== undefined) product.sku = sku;
  if (costPrice) product.costPrice = Number(costPrice);
  if (sellingPrice) product.sellingPrice = Number(sellingPrice);
  if (lowStockLevel !== undefined) product.lowStockLevel = Number(lowStockLevel);
  if (description !== undefined) product.description = description;
  if (unit) product.unit = unit;

  if (req.file) {
    if (product.cloudinaryId) {
      await cloudinary.uploader.destroy(product.cloudinaryId).catch(() => {});
    }
    product.image = req.file.path;
    product.cloudinaryId = req.file.filename;
  }

  await product.save();
  await log({ action: 'PRODUCT_UPDATED', entity: 'Product', entityId: product._id, performedBy: req.user._id });
  res.json(product);
});

// DELETE /api/products/:id — owner only (soft delete)
router.delete('/:id', protect, authorize('owner'), async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  await log({ action: 'PRODUCT_DEACTIVATED', entity: 'Product', entityId: product._id, performedBy: req.user._id });
  res.json({ message: 'Product deactivated' });
});

module.exports = router;
