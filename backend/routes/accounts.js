const express = require('express');
const router = express.Router();
const Account = require('../models/Account');
const AccountTransaction = require('../models/AccountTransaction');
const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const { protect, authorize } = require('../middleware/auth');

// GET /api/accounts
router.get('/', protect, authorize('owner'), async (req, res) => {
  const accounts = await Account.find({ owner: req.user._id, isActive: true }).sort({ createdAt: 1 });
  res.json(accounts);
});

// GET /api/accounts/summary — reconciliation
router.get('/summary', protect, authorize('owner'), async (req, res) => {
  const { period = 'month' } = req.query;

  const now = new Date();
  let start;
  if (period === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'week') {
    start = new Date(now);
    start.setDate(start.getDate() - 7);
  } else if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'year') {
    start = new Date(now.getFullYear(), 0, 1);
  }

  const saleFilter = { status: 'approved' };
  const expenseFilter = { status: 'approved' };
  if (start) {
    saleFilter.saleDate = { $gte: start, $lte: now };
    expenseFilter.expenseDate = { $gte: start, $lte: now };
  }

  const [salesAgg, expenseAgg, accounts] = await Promise.all([
    Sale.aggregate([
      { $match: saleFilter },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' }, profit: { $sum: '$totalProfit' }, cost: { $sum: '$totalCost' }, count: { $sum: 1 } } },
    ]),
    Expense.aggregate([
      { $match: expenseFilter },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Account.find({ owner: req.user._id, isActive: true }),
  ]);

  const revenue = salesAgg[0]?.revenue || 0;
  const profit = salesAgg[0]?.profit || 0;
  const cost = salesAgg[0]?.cost || 0;
  const salesCount = salesAgg[0]?.count || 0;
  const totalExpenses = expenseAgg[0]?.total || 0;
  const netCash = revenue - totalExpenses;
  const totalAccountBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const difference = totalAccountBalance - netCash;

  res.json({
    period,
    revenue,
    cost,
    profit,
    salesCount,
    totalExpenses,
    netCash,
    totalAccountBalance,
    difference,
    accountCount: accounts.length,
  });
});

// GET /api/accounts/transactions — all transactions across all accounts
router.get('/transactions', protect, authorize('owner'), async (req, res) => {
  const { accountId, type, startDate, endDate, page = 1, limit = 30 } = req.query;

  const ownAccounts = await Account.find({ owner: req.user._id }).select('_id');
  const ownIds = ownAccounts.map(a => a._id);

  const filter = { account: { $in: ownIds } };
  if (accountId) filter.account = accountId;
  if (type) filter.type = type;
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  }

  const total = await AccountTransaction.countDocuments(filter);
  const transactions = await AccountTransaction.find(filter)
    .populate('account', 'name type')
    .populate('linkedAccount', 'name type')
    .populate('performedBy', 'name')
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({ transactions, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// POST /api/accounts
router.post('/', protect, authorize('owner'), async (req, res) => {
  const { name, type, accountNumber, openingBalance } = req.body;
  if (!name) return res.status(400).json({ message: 'Account name is required' });

  const account = await Account.create({
    name: name.trim(),
    type: type || 'bank',
    accountNumber: accountNumber?.trim() || '',
    balance: 0,
    owner: req.user._id,
  });

  if (openingBalance && Number(openingBalance) > 0) {
    account.balance = Number(openingBalance);
    await account.save();
    await AccountTransaction.create({
      type: 'deposit',
      amount: Number(openingBalance),
      account: account._id,
      description: 'Opening balance',
      date: new Date(),
      balanceAfter: Number(openingBalance),
      performedBy: req.user._id,
    });
  }

  res.status(201).json(account);
});

// PUT /api/accounts/:id
router.put('/:id', protect, authorize('owner'), async (req, res) => {
  const account = await Account.findOne({ _id: req.params.id, owner: req.user._id });
  if (!account) return res.status(404).json({ message: 'Account not found' });

  const { name, type, accountNumber } = req.body;
  if (name) account.name = name.trim();
  if (type) account.type = type;
  if (accountNumber !== undefined) account.accountNumber = accountNumber?.trim() || '';
  await account.save();

  res.json(account);
});

// DELETE /api/accounts/:id
router.delete('/:id', protect, authorize('owner'), async (req, res) => {
  const account = await Account.findOne({ _id: req.params.id, owner: req.user._id });
  if (!account) return res.status(404).json({ message: 'Account not found' });
  account.isActive = false;
  await account.save();
  res.json({ message: 'Account removed' });
});

// GET /api/accounts/:id/transactions
router.get('/:id/transactions', protect, authorize('owner'), async (req, res) => {
  const account = await Account.findOne({ _id: req.params.id, owner: req.user._id });
  if (!account) return res.status(404).json({ message: 'Account not found' });

  const { page = 1, limit = 20 } = req.query;
  const filter = { account: account._id };
  const total = await AccountTransaction.countDocuments(filter);
  const transactions = await AccountTransaction.find(filter)
    .populate('linkedAccount', 'name')
    .populate('performedBy', 'name')
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({ account, transactions, total, pages: Math.ceil(total / limit) });
});

// POST /api/accounts/deposit
router.post('/deposit', protect, authorize('owner'), async (req, res) => {
  const { accountId, amount, description, reference, date } = req.body;
  if (!accountId || !amount) return res.status(400).json({ message: 'Account and amount are required' });

  const account = await Account.findOne({ _id: accountId, owner: req.user._id, isActive: true });
  if (!account) return res.status(404).json({ message: 'Account not found' });

  const balanceAfter = account.balance + Number(amount);
  account.balance = balanceAfter;
  await account.save();

  await AccountTransaction.create({
    type: 'deposit', amount: Number(amount), account: accountId,
    description, reference, date: date ? new Date(date) : new Date(),
    balanceAfter, performedBy: req.user._id,
  });

  res.json({ message: 'Deposit recorded', account });
});

// POST /api/accounts/withdraw
router.post('/withdraw', protect, authorize('owner'), async (req, res) => {
  const { accountId, amount, description, reference, date } = req.body;
  if (!accountId || !amount) return res.status(400).json({ message: 'Account and amount are required' });

  const account = await Account.findOne({ _id: accountId, owner: req.user._id, isActive: true });
  if (!account) return res.status(404).json({ message: 'Account not found' });

  if (account.balance < Number(amount)) {
    return res.status(400).json({ message: `Insufficient balance. Available: ₦${account.balance.toLocaleString()}` });
  }

  const balanceAfter = account.balance - Number(amount);
  account.balance = balanceAfter;
  await account.save();

  await AccountTransaction.create({
    type: 'withdrawal', amount: Number(amount), account: accountId,
    description, reference, date: date ? new Date(date) : new Date(),
    balanceAfter, performedBy: req.user._id,
  });

  res.json({ message: 'Withdrawal recorded', account });
});

// POST /api/accounts/transfer
router.post('/transfer', protect, authorize('owner'), async (req, res) => {
  const { fromAccountId, toAccountId, amount, description, reference, date } = req.body;
  if (!fromAccountId || !toAccountId || !amount) {
    return res.status(400).json({ message: 'From account, to account, and amount are required' });
  }
  if (String(fromAccountId) === String(toAccountId)) {
    return res.status(400).json({ message: 'Cannot transfer to the same account' });
  }

  const [from, to] = await Promise.all([
    Account.findOne({ _id: fromAccountId, owner: req.user._id, isActive: true }),
    Account.findOne({ _id: toAccountId, owner: req.user._id, isActive: true }),
  ]);

  if (!from || !to) return res.status(404).json({ message: 'Account not found' });
  if (from.balance < Number(amount)) {
    return res.status(400).json({ message: `Insufficient balance in ${from.name}. Available: ₦${from.balance.toLocaleString()}` });
  }

  const txDate = date ? new Date(date) : new Date();
  const fromBalanceAfter = from.balance - Number(amount);
  const toBalanceAfter = to.balance + Number(amount);

  from.balance = fromBalanceAfter;
  to.balance = toBalanceAfter;
  await Promise.all([from.save(), to.save()]);

  await AccountTransaction.create([
    {
      type: 'transfer_out', amount: Number(amount), account: fromAccountId,
      linkedAccount: toAccountId, description: description || `Transfer to ${to.name}`,
      reference, date: txDate, balanceAfter: fromBalanceAfter, performedBy: req.user._id,
    },
    {
      type: 'transfer_in', amount: Number(amount), account: toAccountId,
      linkedAccount: fromAccountId, description: description || `Transfer from ${from.name}`,
      reference, date: txDate, balanceAfter: toBalanceAfter, performedBy: req.user._id,
    },
  ]);

  res.json({ message: 'Transfer successful', fromAccount: from, toAccount: to });
});

module.exports = router;
