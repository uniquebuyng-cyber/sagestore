const express = require('express');
const router = express.Router();
const StoreSettings = require('../models/StoreSettings');
const { protect, authorize } = require('../middleware/auth');

// GET /api/settings
router.get('/', protect, authorize('owner'), async (req, res) => {
  const settings = await StoreSettings.findOne({ owner: req.user._id });
  res.json(settings || { autoRouting: { enabled: false, revenueAccountId: null, profitAccountId: null } });
});

// PUT /api/settings
router.put('/', protect, authorize('owner'), async (req, res) => {
  const { autoRouting } = req.body;
  const settings = await StoreSettings.findOneAndUpdate(
    { owner: req.user._id },
    { $set: { autoRouting } },
    { upsert: true, new: true }
  );
  res.json(settings);
});

module.exports = router;
