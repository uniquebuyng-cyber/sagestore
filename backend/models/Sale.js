const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String },
  quantity: { type: Number, required: true, min: 1 },
  costPrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  profit: { type: Number, required: true },
}, { _id: false });

const saleSchema = new mongoose.Schema({
  outlet: { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet', required: true },
  worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [saleItemSchema],
  totalAmount: { type: Number, required: true },
  totalCost: { type: Number, required: true },
  totalProfit: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'pos', 'transfer'], required: true },
  customerName: { type: String, trim: true, default: '' },
  notes: { type: String, trim: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date },
  rejectedReason: { type: String, trim: true },
  saleDate: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);
