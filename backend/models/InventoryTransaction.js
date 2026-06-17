const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema({
  outlet: { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  type: {
    type: String,
    required: true,
    enum: ['stock_in', 'stock_out', 'damaged', 'returned', 'transfer_in', 'transfer_out', 'sale', 'adjustment'],
  },
  quantity: { type: Number, required: true },
  balanceAfter: { type: Number, default: 0 },
  reference: { type: String, trim: true },
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  notes: { type: String, trim: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
