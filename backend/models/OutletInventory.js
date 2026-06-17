const mongoose = require('mongoose');

// Tracks per-outlet stock quantity for each product
const outletInventorySchema = new mongoose.Schema({
  outlet: { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

outletInventorySchema.index({ outlet: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('OutletInventory', outletInventorySchema);
