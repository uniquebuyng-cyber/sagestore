const mongoose = require('mongoose');

const transferItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String },
  quantity: { type: Number, required: true, min: 1 },
}, { _id: false });

const stockTransferSchema = new mongoose.Schema({
  fromOutlet: { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet', required: true },
  toOutlet: { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet', required: true },
  items: [transferItemSchema],
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'pending' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date },
  completedAt: { type: Date },
  notes: { type: String, trim: true },
  rejectedReason: { type: String, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('StockTransfer', stockTransferSchema);
