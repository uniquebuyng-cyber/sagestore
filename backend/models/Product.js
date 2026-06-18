const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: {
    type: String,
    required: true,
    enum: ['engine_oil', 'gas_accessories', 'auto_accessories'],
  },
  brand: { type: String, trim: true },
  sku: { type: String, unique: true, sparse: true, trim: true },
  costPrice: { type: Number, required: true, min: 0 },
  sellingPrice: { type: Number, required: true, min: 0 },
  lowStockLevel: { type: Number, default: 5, min: 0 },
  image: { type: String, default: '' },
  cloudinaryId: { type: String, default: '' },
  description: { type: String, trim: true },
  unit: { type: String, default: 'piece', trim: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
