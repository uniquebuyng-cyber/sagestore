const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  outlet: { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet', required: true },
  worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: {
    type: String,
    required: true,
    enum: ['transportation', 'generator_fuel', 'repairs', 'maintenance', 'miscellaneous', 'rent', 'utilities', 'supplies'],
  },
  amount: { type: Number, required: true, min: 0 },
  description: { type: String, required: true, trim: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date },
  rejectedReason: { type: String, trim: true },
  expenseDate: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
