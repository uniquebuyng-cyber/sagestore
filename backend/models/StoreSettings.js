const mongoose = require('mongoose');

const storeSettingsSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  autoRouting: {
    enabled: { type: Boolean, default: false },
    revenueAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
    profitAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
  },
}, { timestamps: true });

module.exports = mongoose.model('StoreSettings', storeSettingsSchema);
