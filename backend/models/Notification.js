const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['low_stock', 'sale_pending', 'expense_pending', 'transfer_pending', 'sale_approved', 'sale_rejected', 'expense_approved', 'expense_rejected'],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String },
  isRead: { type: Boolean, default: false },
  outlet: { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet' },
  referenceId: { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
