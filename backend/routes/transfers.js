const express = require('express');
const router = express.Router();
const StockTransfer = require('../models/StockTransfer');
const OutletInventory = require('../models/OutletInventory');
const InventoryTransaction = require('../models/InventoryTransaction');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { log } = require('../utils/audit');

// GET /api/transfers
router.get('/', protect, async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (req.user.role === 'manager') {
    filter.$or = [{ fromOutlet: req.user.outlet }, { toOutlet: req.user.outlet }];
  }

  const total = await StockTransfer.countDocuments(filter);
  const transfers = await StockTransfer.find(filter)
    .populate('fromOutlet', 'name')
    .populate('toOutlet', 'name')
    .populate('requestedBy', 'name role')
    .populate('approvedBy', 'name')
    .populate('items.product', 'name category brand image')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({ transfers, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// POST /api/transfers — owner/manager
router.post('/', protect, authorize('owner', 'manager'), async (req, res) => {
  const { fromOutletId, toOutletId, items, notes } = req.body;
  if (!fromOutletId || !toOutletId || !items?.length) {
    return res.status(400).json({ message: 'fromOutletId, toOutletId, and items required' });
  }
  if (fromOutletId === toOutletId) return res.status(400).json({ message: 'Cannot transfer to same outlet' });

  const transferItems = await Promise.all(items.map(async (item) => {
    const product = await Product.findById(item.productId);
    if (!product) throw new Error(`Product not found: ${item.productId}`);
    return { product: product._id, productName: product.name, quantity: item.quantity };
  }));

  const transfer = await StockTransfer.create({
    fromOutlet: fromOutletId, toOutlet: toOutletId,
    items: transferItems, notes: notes || '', requestedBy: req.user._id,
  });

  const owners = await User.find({ role: 'owner' });
  await Notification.insertMany(owners.map(o => ({
    recipient: o._id, type: 'transfer_pending', title: 'Stock Transfer Pending',
    message: `Transfer of ${items.length} product(s) requested between outlets`,
    referenceId: transfer._id,
  })));

  await log({ action: 'TRANSFER_REQUESTED', entity: 'StockTransfer', entityId: transfer._id, performedBy: req.user._id, details: { fromOutletId, toOutletId, items: items.length } });
  res.status(201).json(transfer);
});

// PATCH /api/transfers/:id/approve — owner
router.patch('/:id/approve', protect, authorize('owner'), async (req, res) => {
  const transfer = await StockTransfer.findById(req.params.id).populate('items.product');
  if (!transfer) return res.status(404).json({ message: 'Transfer not found' });
  if (transfer.status !== 'pending') return res.status(400).json({ message: `Transfer is already ${transfer.status}` });

  // Move stock between outlets
  for (const item of transfer.items) {
    // Deduct from source
    let srcInv = await OutletInventory.findOne({ outlet: transfer.fromOutlet, product: item.product._id });
    if (!srcInv) srcInv = await OutletInventory.create({ outlet: transfer.fromOutlet, product: item.product._id, quantity: 0 });
    const srcQty = Math.max(0, srcInv.quantity - item.quantity);
    srcInv.quantity = srcQty;
    await srcInv.save();
    await InventoryTransaction.create({ outlet: transfer.fromOutlet, product: item.product._id, type: 'transfer_out', quantity: item.quantity, balanceAfter: srcQty, reference: 'transfer', referenceId: transfer._id, performedBy: req.user._id });

    // Add to destination
    let dstInv = await OutletInventory.findOne({ outlet: transfer.toOutlet, product: item.product._id });
    if (!dstInv) dstInv = await OutletInventory.create({ outlet: transfer.toOutlet, product: item.product._id, quantity: 0 });
    const dstQty = dstInv.quantity + item.quantity;
    dstInv.quantity = dstQty;
    await dstInv.save();
    await InventoryTransaction.create({ outlet: transfer.toOutlet, product: item.product._id, type: 'transfer_in', quantity: item.quantity, balanceAfter: dstQty, reference: 'transfer', referenceId: transfer._id, performedBy: req.user._id });
  }

  transfer.status = 'completed';
  transfer.approvedBy = req.user._id;
  transfer.approvedAt = new Date();
  transfer.completedAt = new Date();
  await transfer.save();

  await log({ action: 'TRANSFER_APPROVED', entity: 'StockTransfer', entityId: transfer._id, performedBy: req.user._id });
  res.json({ message: 'Transfer approved and completed', transfer });
});

// PATCH /api/transfers/:id/reject — owner
router.patch('/:id/reject', protect, authorize('owner'), async (req, res) => {
  const { reason } = req.body;
  const transfer = await StockTransfer.findById(req.params.id);
  if (!transfer) return res.status(404).json({ message: 'Transfer not found' });
  if (transfer.status !== 'pending') return res.status(400).json({ message: `Transfer is already ${transfer.status}` });

  transfer.status = 'rejected';
  transfer.rejectedReason = reason || '';
  await transfer.save();

  await log({ action: 'TRANSFER_REJECTED', entity: 'StockTransfer', entityId: transfer._id, performedBy: req.user._id, details: { reason } });
  res.json({ message: 'Transfer rejected' });
});

module.exports = router;
