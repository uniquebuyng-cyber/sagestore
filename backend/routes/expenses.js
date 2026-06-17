const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { log } = require('../utils/audit');

// GET /api/expenses
router.get('/', protect, async (req, res) => {
  const { status, outletId, startDate, endDate, page = 1, limit = 50 } = req.query;
  const filter = {};

  if (req.user.role === 'worker') {
    filter.worker = req.user._id;
    filter.outlet = req.user.outlet;
  } else if (req.user.role === 'manager') {
    filter.outlet = req.user.outlet;
  } else if (outletId) {
    filter.outlet = outletId;
  }

  if (status) filter.status = status;
  if (startDate || endDate) {
    filter.expenseDate = {};
    if (startDate) filter.expenseDate.$gte = new Date(startDate);
    if (endDate) filter.expenseDate.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  }

  const total = await Expense.countDocuments(filter);
  const expenses = await Expense.find(filter)
    .populate('outlet', 'name')
    .populate('worker', 'name role')
    .populate('approvedBy', 'name')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({ expenses, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// POST /api/expenses
router.post('/', protect, async (req, res) => {
  const { category, amount, description, expenseDate } = req.body;
  const outlet = req.user.outlet?._id || req.user.outlet;
  if (!outlet) return res.status(400).json({ message: 'Worker must be assigned to an outlet' });
  if (!category || !amount || !description) return res.status(400).json({ message: 'Category, amount, and description required' });

  const expense = await Expense.create({
    outlet,
    worker: req.user._id,
    category,
    amount: Number(amount),
    description,
    expenseDate: expenseDate || new Date(),
  });

  const owners = await User.find({ role: 'owner' });
  await Notification.insertMany(owners.map(o => ({
    recipient: o._id, type: 'expense_pending', title: 'Expense Pending Approval',
    message: `${req.user.name} submitted ₦${Number(amount).toLocaleString()} expense (${category})`,
    outlet, referenceId: expense._id,
  })));

  await log({ action: 'EXPENSE_CREATED', entity: 'Expense', entityId: expense._id, performedBy: req.user._id, outlet, details: { category, amount } });
  res.status(201).json(expense);
});

// PATCH /api/expenses/:id/approve
router.patch('/:id/approve', protect, authorize('owner', 'manager'), async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) return res.status(404).json({ message: 'Expense not found' });
  if (expense.status !== 'pending') return res.status(400).json({ message: `Expense is already ${expense.status}` });

  expense.status = 'approved';
  expense.approvedBy = req.user._id;
  expense.approvedAt = new Date();
  await expense.save();

  await Notification.create({ recipient: expense.worker, type: 'expense_approved', title: 'Expense Approved', message: `Your ₦${expense.amount.toLocaleString()} expense has been approved`, outlet: expense.outlet, referenceId: expense._id });
  await log({ action: 'EXPENSE_APPROVED', entity: 'Expense', entityId: expense._id, performedBy: req.user._id, outlet: expense.outlet });

  res.json({ message: 'Expense approved', expense });
});

// PATCH /api/expenses/:id/reject
router.patch('/:id/reject', protect, authorize('owner', 'manager'), async (req, res) => {
  const { reason } = req.body;
  const expense = await Expense.findById(req.params.id);
  if (!expense) return res.status(404).json({ message: 'Expense not found' });
  if (expense.status !== 'pending') return res.status(400).json({ message: `Expense is already ${expense.status}` });

  expense.status = 'rejected';
  expense.rejectedReason = reason || '';
  await expense.save();

  await Notification.create({ recipient: expense.worker, type: 'expense_rejected', title: 'Expense Rejected', message: `Your ₦${expense.amount.toLocaleString()} expense was rejected${reason ? ': ' + reason : ''}`, outlet: expense.outlet, referenceId: expense._id });
  await log({ action: 'EXPENSE_REJECTED', entity: 'Expense', entityId: expense._id, performedBy: req.user._id, outlet: expense.outlet, details: { reason } });

  res.json({ message: 'Expense rejected' });
});

module.exports = router;
