const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Outlet = require('../models/Outlet');
const { protect, authorize } = require('../middleware/auth');
const { log } = require('../utils/audit');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  const user = await User.findOne({ email }).populate('outlet', 'name address');
  if (!user || !user.isActive) return res.status(401).json({ message: 'Invalid credentials' });

  const match = await user.matchPassword(password);
  if (!match) return res.status(401).json({ message: 'Invalid credentials' });

  await log({ action: 'USER_LOGIN', entity: 'User', entityId: user._id, performedBy: user._id, outlet: user.outlet?._id });

  res.json({
    token: signToken(user._id),
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      outlet: user.outlet,
      phone: user.phone,
      hasPin: !!user.pin,
    },
  });
});

// POST /api/auth/register — owner only (first user, or owner creating workers)
router.post('/register', protect, authorize('owner'), async (req, res) => {
  const { name, email, password, role, outletId, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password required' });
  if (role === 'owner') return res.status(400).json({ message: 'Cannot create another owner' });

  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: 'Email already registered' });

  let outlet = null;
  if (outletId) {
    outlet = await Outlet.findById(outletId);
    if (!outlet) return res.status(400).json({ message: 'Outlet not found' });
  }

  const user = await User.create({ name, email, password, role: role || 'worker', outlet: outletId || null, phone });

  await log({ action: 'USER_CREATED', entity: 'User', entityId: user._id, performedBy: req.user._id, details: { name, email, role } });

  res.status(201).json({
    message: 'User created successfully',
    user: { _id: user._id, name: user.name, email: user.email, role: user.role, outlet: user.outlet },
  });
});

// POST /api/auth/setup — create first owner (only if no users exist)
router.post('/setup', async (req, res) => {
  const count = await User.countDocuments();
  if (count > 0) return res.status(400).json({ message: 'Setup already completed' });

  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password required' });

  const user = await User.create({ name, email, password, role: 'owner', phone });
  res.status(201).json({
    message: 'Owner account created',
    token: signToken(user._id),
    user: { _id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

// POST /api/auth/pin-login
router.post('/pin-login', async (req, res) => {
  const { email, pin } = req.body;
  if (!email || !pin) return res.status(400).json({ message: 'Email and PIN required' });
  if (!/^\d{4}$/.test(pin)) return res.status(400).json({ message: 'PIN must be 4 digits' });

  const user = await User.findOne({ email }).populate('outlet', 'name address');
  if (!user || !user.isActive) return res.status(401).json({ message: 'Invalid credentials' });
  if (!user.pin) return res.status(400).json({ message: 'No PIN set. Please log in with your password first.' });

  const match = await user.matchPin(pin);
  if (!match) return res.status(401).json({ message: 'Incorrect PIN' });

  await log({ action: 'USER_PIN_LOGIN', entity: 'User', entityId: user._id, performedBy: user._id, outlet: user.outlet?._id });

  res.json({
    token: signToken(user._id),
    user: { _id: user._id, name: user.name, email: user.email, role: user.role, outlet: user.outlet, phone: user.phone, hasPin: !!user.pin },
  });
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user._id).populate('outlet', 'name address');
  if (!user) return res.status(404).json({ message: 'User not found' });
  const { password, pin, ...rest } = user.toObject();
  res.json({ ...rest, hasPin: !!pin });
});

// PUT /api/auth/me — update own profile
router.put('/me', protect, async (req, res) => {
  const { name, phone, password } = req.body;
  const user = await User.findById(req.user._id);
  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (password) user.password = password;
  await user.save();
  res.json({ message: 'Profile updated', user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
});

// PUT /api/auth/set-pin — set or change own PIN
router.put('/set-pin', protect, async (req, res) => {
  const { pin } = req.body;
  if (!pin || !/^\d{4}$/.test(pin)) return res.status(400).json({ message: 'PIN must be exactly 4 digits' });
  const user = await User.findById(req.user._id);
  user.pin = pin;
  await user.save();
  res.json({ message: 'PIN set successfully' });
});

// DELETE /api/auth/remove-pin — remove PIN
router.delete('/remove-pin', protect, async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { pin: null });
  res.json({ message: 'PIN removed' });
});

module.exports = router;
