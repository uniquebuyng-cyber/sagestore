const express = require('express');
const router = express.Router();
const Outlet = require('../models/Outlet');
const User = require('../models/User');
const OutletInventory = require('../models/OutletInventory');
const { protect, authorize } = require('../middleware/auth');
const { log } = require('../utils/audit');

// GET /api/outlets
router.get('/', protect, async (req, res) => {
  const outlets = await Outlet.find({ isActive: true }).populate('manager', 'name email');
  // Attach worker count
  const withWorkers = await Promise.all(outlets.map(async (o) => {
    const workerCount = await User.countDocuments({ outlet: o._id, isActive: true });
    return { ...o.toObject(), workerCount };
  }));
  res.json(withWorkers);
});

// GET /api/outlets/:id
router.get('/:id', protect, async (req, res) => {
  const outlet = await Outlet.findById(req.params.id).populate('manager', 'name email phone');
  if (!outlet) return res.status(404).json({ message: 'Outlet not found' });
  const workers = await User.find({ outlet: outlet._id, isActive: true }).select('name email role phone');
  res.json({ ...outlet.toObject(), workers });
});

// POST /api/outlets — owner only
router.post('/', protect, authorize('owner'), async (req, res) => {
  const { name, address, phone, managerId } = req.body;
  if (!name || !address) return res.status(400).json({ message: 'Name and address required' });

  const outlet = await Outlet.create({ name, address, phone, manager: managerId || null });
  await log({ action: 'OUTLET_CREATED', entity: 'Outlet', entityId: outlet._id, performedBy: req.user._id, details: { name } });
  res.status(201).json(outlet);
});

// PUT /api/outlets/:id — owner only
router.put('/:id', protect, authorize('owner'), async (req, res) => {
  const { name, address, phone, managerId } = req.body;
  const outlet = await Outlet.findByIdAndUpdate(
    req.params.id,
    { name, address, phone, manager: managerId || null },
    { new: true, runValidators: true }
  ).populate('manager', 'name email');
  if (!outlet) return res.status(404).json({ message: 'Outlet not found' });
  await log({ action: 'OUTLET_UPDATED', entity: 'Outlet', entityId: outlet._id, performedBy: req.user._id });
  res.json(outlet);
});

// DELETE /api/outlets/:id — owner only (soft delete)
router.delete('/:id', protect, authorize('owner'), async (req, res) => {
  const outlet = await Outlet.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!outlet) return res.status(404).json({ message: 'Outlet not found' });
  await log({ action: 'OUTLET_DEACTIVATED', entity: 'Outlet', entityId: outlet._id, performedBy: req.user._id });
  res.json({ message: 'Outlet deactivated' });
});

module.exports = router;
