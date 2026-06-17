const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Outlet = require('../models/Outlet');
const { protect, authorize } = require('../middleware/auth');
const { log } = require('../utils/audit');

// GET /api/workers
router.get('/', protect, authorize('owner', 'manager'), async (req, res) => {
  const { outletId, role } = req.query;
  const filter = { role: { $ne: 'owner' } };
  if (outletId) filter.outlet = outletId;
  if (req.user.role === 'manager') filter.outlet = req.user.outlet;
  if (role) filter.role = role;

  const workers = await User.find(filter).select('-password').populate('outlet', 'name address').sort({ name: 1 });
  res.json(workers);
});

// GET /api/workers/:id
router.get('/:id', protect, authorize('owner', 'manager'), async (req, res) => {
  const worker = await User.findById(req.params.id).select('-password').populate('outlet', 'name address');
  if (!worker) return res.status(404).json({ message: 'Worker not found' });
  res.json(worker);
});

// PUT /api/workers/:id — owner only
router.put('/:id', protect, authorize('owner'), async (req, res) => {
  const { name, email, role, outletId, phone, isActive } = req.body;
  const worker = await User.findById(req.params.id);
  if (!worker) return res.status(404).json({ message: 'Worker not found' });
  if (worker.role === 'owner') return res.status(403).json({ message: 'Cannot modify owner account this way' });

  if (name) worker.name = name;
  if (email) worker.email = email;
  if (role && role !== 'owner') worker.role = role;
  if (outletId !== undefined) worker.outlet = outletId || null;
  if (phone !== undefined) worker.phone = phone;
  if (isActive !== undefined) worker.isActive = isActive;

  await worker.save();
  await log({ action: 'WORKER_UPDATED', entity: 'User', entityId: worker._id, performedBy: req.user._id, details: { name, role, outletId, isActive } });

  res.json({ message: 'Worker updated', worker: { _id: worker._id, name: worker.name, email: worker.email, role: worker.role, outlet: worker.outlet, isActive: worker.isActive } });
});

// PATCH /api/workers/:id/reset-password — owner only
router.patch('/:id/reset-password', protect, authorize('owner'), async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

  const worker = await User.findById(req.params.id);
  if (!worker) return res.status(404).json({ message: 'Worker not found' });

  worker.password = newPassword;
  await worker.save();
  await log({ action: 'PASSWORD_RESET', entity: 'User', entityId: worker._id, performedBy: req.user._id });

  res.json({ message: 'Password reset successfully' });
});

// DELETE /api/workers/:id — soft delete
router.delete('/:id', protect, authorize('owner'), async (req, res) => {
  const worker = await User.findById(req.params.id);
  if (!worker) return res.status(404).json({ message: 'Worker not found' });
  if (worker.role === 'owner') return res.status(403).json({ message: 'Cannot deactivate owner account' });

  worker.isActive = false;
  await worker.save();
  await log({ action: 'WORKER_DEACTIVATED', entity: 'User', entityId: worker._id, performedBy: req.user._id });

  res.json({ message: 'Worker deactivated' });
});

module.exports = router;
