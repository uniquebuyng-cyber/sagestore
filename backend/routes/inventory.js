const express = require('express');
const router = express.Router();
const OutletInventory = require('../models/OutletInventory');
const InventoryTransaction = require('../models/InventoryTransaction');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { log } = require('../utils/audit');

async function notifyLowStock(outletId, product, quantity) {
  if (quantity <= product.lowStockLevel) {
    const owners = await User.find({ role: 'owner' });
    await Notification.insertMany(owners.map(o => ({
      recipient: o._id,
      type: 'low_stock',
      title: 'Low Stock Alert',
      message: `${product.name} at outlet is low (${quantity} remaining)`,
      outlet: outletId,
      referenceId: product._id,
    })));
  }
}

// GET /api/inventory?outletId=&productId=
router.get('/', protect, async (req, res) => {
  const { outletId, productId, lowStock } = req.query;
  const filter = {};

  if (req.user.role !== 'owner') {
    filter.outlet = req.user.outlet;
  } else if (outletId) {
    filter.outlet = outletId;
  }
  if (productId) filter.product = productId;

  let inventory = await OutletInventory.find(filter)
    .populate('product', 'name category brand sku sellingPrice costPrice lowStockLevel image unit')
    .populate('outlet', 'name');

  if (lowStock === 'true') {
    inventory = inventory.filter(i => i.quantity <= (i.product?.lowStockLevel || 5));
  }

  // Attach stock value
  const result = inventory.map(i => ({
    ...i.toObject(),
    stockValue: i.quantity * (i.product?.costPrice || 0),
    isLowStock: i.quantity <= (i.product?.lowStockLevel || 5),
  }));

  res.json(result);
});

// GET /api/inventory/transactions
router.get('/transactions', protect, async (req, res) => {
  const { outletId, productId, type, startDate, endDate, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (req.user.role !== 'owner') filter.outlet = req.user.outlet;
  else if (outletId) filter.outlet = outletId;
  if (productId) filter.product = productId;
  if (type) filter.type = type;
  if (startDate || endDate) {
    filter.transactionDate = {};
    if (startDate) filter.transactionDate.$gte = new Date(startDate);
    if (endDate) filter.transactionDate.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  }

  const total = await InventoryTransaction.countDocuments(filter);
  const transactions = await InventoryTransaction.find(filter)
    .populate('product', 'name category brand image unit')
    .populate('outlet', 'name')
    .populate('performedBy', 'name role')
    .sort({ transactionDate: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({ transactions, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// POST /api/inventory/adjust — owner/manager: stock in, adjustment, damaged, returned
router.post('/adjust', protect, authorize('owner', 'manager'), async (req, res) => {
  const { outletId, productId, type, quantity, notes, date } = req.body;
  if (!outletId || !productId || !type || quantity == null) {
    return res.status(400).json({ message: 'outletId, productId, type, and quantity required' });
  }

  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: 'Product not found' });

  const delta = ['stock_in', 'returned', 'adjustment'].includes(type) ? Number(quantity) : -Number(quantity);

  let inv = await OutletInventory.findOne({ outlet: outletId, product: productId });
  if (!inv) {
    inv = await OutletInventory.create({ outlet: outletId, product: productId, quantity: 0 });
  }

  const newQty = Math.max(0, inv.quantity + delta);
  inv.quantity = newQty;
  await inv.save();

  await InventoryTransaction.create({
    outlet: outletId,
    product: productId,
    type,
    quantity: Number(quantity),
    balanceAfter: newQty,
    notes,
    transactionDate: date ? new Date(date) : new Date(),
    performedBy: req.user._id,
  });

  await notifyLowStock(outletId, product, newQty);
  await log({ action: 'INVENTORY_ADJUSTED', entity: 'OutletInventory', performedBy: req.user._id, outlet: outletId, details: { productId, type, quantity, newQty } });

  res.json({ message: 'Inventory updated', quantity: newQty });
});

module.exports = router;
