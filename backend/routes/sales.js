const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const OutletInventory = require('../models/OutletInventory');
const InventoryTransaction = require('../models/InventoryTransaction');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Account = require('../models/Account');
const AccountTransaction = require('../models/AccountTransaction');
const StoreSettings = require('../models/StoreSettings');
const { protect, authorize } = require('../middleware/auth');
const { log } = require('../utils/audit');

async function runAutoRouting(sale, approverId, approverRole) {
  try {
    const ownerId = approverRole === 'owner'
      ? approverId
      : (await User.findOne({ role: 'owner' }).select('_id'))?._id;
    if (!ownerId) return;

    const settings = await StoreSettings.findOne({ owner: ownerId });
    if (!settings?.autoRouting?.enabled) return;

    const { revenueAccountId, profitAccountId } = settings.autoRouting;
    const now = sale.approvedAt || new Date();
    const ref = `Sale-${sale._id.toString().slice(-6)}`;

    if (revenueAccountId) {
      // Deposit full revenue to revenue account (e.g. Zenith)
      const revAcc = await Account.findByIdAndUpdate(
        revenueAccountId,
        { $inc: { balance: sale.totalAmount } },
        { new: true }
      );
      await AccountTransaction.create({
        type: 'deposit',
        amount: sale.totalAmount,
        account: revenueAccountId,
        description: `Sale approved — revenue`,
        reference: ref,
        date: now,
        balanceAfter: revAcc.balance,
        performedBy: ownerId,
      });

      // If a separate profit account is set, transfer profit out of revenue account into it
      if (profitAccountId && String(profitAccountId) !== String(revenueAccountId) && sale.totalProfit > 0) {
        const [fromAcc, toAcc] = await Promise.all([
          Account.findByIdAndUpdate(revenueAccountId, { $inc: { balance: -sale.totalProfit } }, { new: true }),
          Account.findByIdAndUpdate(profitAccountId, { $inc: { balance: sale.totalProfit } }, { new: true }),
        ]);
        await AccountTransaction.create([
          {
            type: 'transfer_out', amount: sale.totalProfit,
            account: revenueAccountId, linkedAccount: profitAccountId,
            description: `Profit split from sale`, reference: ref,
            date: now, balanceAfter: fromAcc.balance, performedBy: ownerId,
          },
          {
            type: 'transfer_in', amount: sale.totalProfit,
            account: profitAccountId, linkedAccount: revenueAccountId,
            description: `Profit split from sale`, reference: ref,
            date: now, balanceAfter: toAcc.balance, performedBy: ownerId,
          },
        ]);
      }
    } else if (profitAccountId) {
      // Only profit account configured — deposit profit only
      const profAcc = await Account.findByIdAndUpdate(
        profitAccountId,
        { $inc: { balance: sale.totalProfit } },
        { new: true }
      );
      await AccountTransaction.create({
        type: 'deposit',
        amount: sale.totalProfit,
        account: profitAccountId,
        description: `Sale approved — profit`,
        reference: ref,
        date: now,
        balanceAfter: profAcc.balance,
        performedBy: ownerId,
      });
    }
  } catch (err) {
    console.error('Auto-routing error:', err.message);
  }
}

async function notifyOwners(type, title, message, outletId, refId) {
  const owners = await User.find({ role: 'owner' });
  await Notification.insertMany(owners.map(o => ({
    recipient: o._id, type, title, message, outlet: outletId, referenceId: refId,
  })));
}

// GET /api/sales
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
    filter.saleDate = {};
    if (startDate) filter.saleDate.$gte = new Date(startDate);
    if (endDate) filter.saleDate.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  }

  const total = await Sale.countDocuments(filter);
  const sales = await Sale.find(filter)
    .populate('outlet', 'name')
    .populate('worker', 'name role')
    .populate('approvedBy', 'name')
    .populate('items.product', 'name category brand image')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({ sales, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// GET /api/sales/:id
router.get('/:id', protect, async (req, res) => {
  const sale = await Sale.findById(req.params.id)
    .populate('outlet', 'name address')
    .populate('worker', 'name email role')
    .populate('approvedBy', 'name')
    .populate('items.product', 'name category brand image');
  if (!sale) return res.status(404).json({ message: 'Sale not found' });
  res.json(sale);
});

// POST /api/sales — worker/manager
router.post('/', protect, async (req, res) => {
  const { outletId, items, paymentMethod, customerName, notes } = req.body;

  const outlet = outletId || req.user.outlet?._id || req.user.outlet;
  if (!outlet) return res.status(400).json({ message: 'Outlet required' });
  if (!items || !items.length) return res.status(400).json({ message: 'At least one item required' });
  if (!paymentMethod) return res.status(400).json({ message: 'Payment method required' });

  let totalAmount = 0, totalCost = 0, totalProfit = 0;
  const saleItems = [];

  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product || !product.isActive) return res.status(400).json({ message: `Product not found: ${item.productId}` });

    // Stock availability check
    const inv = await OutletInventory.findOne({ outlet, product: item.productId });
    const available = inv?.quantity || 0;
    if (available === 0) {
      return res.status(400).json({ message: `"${product.name}" is out of stock at this outlet` });
    }
    if (item.quantity > available) {
      return res.status(400).json({ message: `Only ${available} ${product.unit}(s) of "${product.name}" available in stock` });
    }

    const subtotal = product.sellingPrice * item.quantity;
    const cost = product.costPrice * item.quantity;
    const profit = subtotal - cost;

    totalAmount += subtotal;
    totalCost += cost;
    totalProfit += profit;

    saleItems.push({
      product: product._id,
      productName: product.name,
      quantity: item.quantity,
      costPrice: product.costPrice,
      sellingPrice: item.sellingPrice || product.sellingPrice,
      subtotal,
      profit,
    });
  }

  const sale = await Sale.create({
    outlet,
    worker: req.user._id,
    items: saleItems,
    totalAmount,
    totalCost,
    totalProfit,
    paymentMethod,
    customerName: customerName || '',
    notes: notes || '',
    status: 'pending',
  });

  // Deduct stock immediately on submission
  for (const item of saleItems) {
    let inv = await OutletInventory.findOne({ outlet, product: item.product });
    if (!inv) inv = await OutletInventory.create({ outlet, product: item.product, quantity: 0 });
    const newQty = Math.max(0, inv.quantity - item.quantity);
    inv.quantity = newQty;
    await inv.save();

    await InventoryTransaction.create({
      outlet, product: item.product,
      type: 'sale', quantity: item.quantity, balanceAfter: newQty,
      reference: 'sale', referenceId: sale._id,
      performedBy: req.user._id,
    });
  }

  await notifyOwners('sale_pending', 'New Sale — Confirm Payment', `${req.user.name} recorded a sale of ₦${totalAmount.toLocaleString()}. Please confirm payment received.`, outlet, sale._id);
  await log({ action: 'SALE_CREATED', entity: 'Sale', entityId: sale._id, performedBy: req.user._id, outlet, details: { totalAmount, items: items.length } });

  res.status(201).json(sale);
});

// PATCH /api/sales/:id/approve — confirms payment received (stock already deducted)
router.patch('/:id/approve', protect, authorize('owner', 'manager'), async (req, res) => {
  const sale = await Sale.findById(req.params.id);
  if (!sale) return res.status(404).json({ message: 'Sale not found' });
  if (sale.status !== 'pending') return res.status(400).json({ message: `Sale is already ${sale.status}` });

  sale.status = 'approved';
  sale.approvedBy = req.user._id;
  sale.approvedAt = new Date();
  await sale.save();

  await runAutoRouting(sale, req.user._id, req.user.role);
  await Notification.create({ recipient: sale.worker, type: 'sale_approved', title: 'Payment Confirmed', message: `Your sale of ₦${sale.totalAmount.toLocaleString()} payment has been confirmed`, outlet: sale.outlet, referenceId: sale._id });
  await log({ action: 'SALE_APPROVED', entity: 'Sale', entityId: sale._id, performedBy: req.user._id, outlet: sale.outlet });

  res.json({ message: 'Payment confirmed', sale });
});

// PATCH /api/sales/:id/reject — rejects and RESTORES stock
router.patch('/:id/reject', protect, authorize('owner', 'manager'), async (req, res) => {
  const { reason } = req.body;
  const sale = await Sale.findById(req.params.id).populate('items.product');
  if (!sale) return res.status(404).json({ message: 'Sale not found' });
  if (sale.status !== 'pending') return res.status(400).json({ message: `Sale is already ${sale.status}` });

  // Restore stock since sale is being rejected
  for (const item of sale.items) {
    const inv = await OutletInventory.findOne({ outlet: sale.outlet, product: item.product._id });
    if (inv) {
      inv.quantity += item.quantity;
      await inv.save();

      await InventoryTransaction.create({
        outlet: sale.outlet, product: item.product._id,
        type: 'returned', quantity: item.quantity, balanceAfter: inv.quantity,
        reference: 'sale_rejected', referenceId: sale._id,
        performedBy: req.user._id,
      });
    }
  }

  sale.status = 'rejected';
  sale.rejectedReason = reason || '';
  await sale.save();

  await Notification.create({ recipient: sale.worker, type: 'sale_rejected', title: 'Sale Rejected', message: `Your sale of ₦${sale.totalAmount.toLocaleString()} was rejected${reason ? ': ' + reason : ''}. Stock has been restored.`, outlet: sale.outlet, referenceId: sale._id });
  await log({ action: 'SALE_REJECTED', entity: 'Sale', entityId: sale._id, performedBy: req.user._id, outlet: sale.outlet, details: { reason } });

  res.json({ message: 'Sale rejected and stock restored' });
});

module.exports = router;
