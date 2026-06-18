const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const OutletInventory = require('../models/OutletInventory');
const InventoryTransaction = require('../models/InventoryTransaction');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { log } = require('../utils/audit');

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

  await notifyOwners('sale_pending', 'New Sale Pending Approval', `A sale of ₦${totalAmount.toLocaleString()} requires your approval`, outlet, sale._id);
  await log({ action: 'SALE_CREATED', entity: 'Sale', entityId: sale._id, performedBy: req.user._id, outlet, details: { totalAmount, items: items.length } });

  res.status(201).json(sale);
});

// PATCH /api/sales/:id/approve — owner/manager
router.patch('/:id/approve', protect, authorize('owner', 'manager'), async (req, res) => {
  const sale = await Sale.findById(req.params.id).populate('items.product');
  if (!sale) return res.status(404).json({ message: 'Sale not found' });
  if (sale.status !== 'pending') return res.status(400).json({ message: `Sale is already ${sale.status}` });

  // Reduce inventory for each item
  for (const item of sale.items) {
    let inv = await OutletInventory.findOne({ outlet: sale.outlet, product: item.product._id });
    if (!inv) inv = await OutletInventory.create({ outlet: sale.outlet, product: item.product._id, quantity: 0 });

    const newQty = Math.max(0, inv.quantity - item.quantity);
    inv.quantity = newQty;
    await inv.save();

    await InventoryTransaction.create({
      outlet: sale.outlet, product: item.product._id,
      type: 'sale', quantity: item.quantity, balanceAfter: newQty,
      reference: 'sale', referenceId: sale._id,
      performedBy: req.user._id,
    });
  }

  sale.status = 'approved';
  sale.approvedBy = req.user._id;
  sale.approvedAt = new Date();
  await sale.save();

  // Notify worker
  await Notification.create({ recipient: sale.worker, type: 'sale_approved', title: 'Sale Approved', message: `Your sale of ₦${sale.totalAmount.toLocaleString()} has been approved`, outlet: sale.outlet, referenceId: sale._id });
  await log({ action: 'SALE_APPROVED', entity: 'Sale', entityId: sale._id, performedBy: req.user._id, outlet: sale.outlet });

  res.json({ message: 'Sale approved', sale });
});

// PATCH /api/sales/:id/reject — owner/manager
router.patch('/:id/reject', protect, authorize('owner', 'manager'), async (req, res) => {
  const { reason } = req.body;
  const sale = await Sale.findById(req.params.id);
  if (!sale) return res.status(404).json({ message: 'Sale not found' });
  if (sale.status !== 'pending') return res.status(400).json({ message: `Sale is already ${sale.status}` });

  sale.status = 'rejected';
  sale.rejectedReason = reason || '';
  await sale.save();

  await Notification.create({ recipient: sale.worker, type: 'sale_rejected', title: 'Sale Rejected', message: `Your sale of ₦${sale.totalAmount.toLocaleString()} was rejected${reason ? ': ' + reason : ''}`, outlet: sale.outlet, referenceId: sale._id });
  await log({ action: 'SALE_REJECTED', entity: 'Sale', entityId: sale._id, performedBy: req.user._id, outlet: sale.outlet, details: { reason } });

  res.json({ message: 'Sale rejected' });
});

module.exports = router;
