const mongoose = require('mongoose');

const accountTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['deposit', 'withdrawal', 'transfer_in', 'transfer_out'],
  },
  amount: { type: Number, required: true },
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  linkedAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  description: { type: String, trim: true },
  reference: { type: String, trim: true },
  date: { type: Date, default: Date.now },
  balanceAfter: { type: Number },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('AccountTransaction', accountTransactionSchema);
