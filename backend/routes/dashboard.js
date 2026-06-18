const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const OutletInventory = require('../models/OutletInventory');
const Product = require('../models/Product');
const Outlet = require('../models/Outlet');
const { protect, authorize } = require('../middleware/auth');

// GET /api/dashboard
router.get('/', protect, authorize('owner', 'manager'), async (req, res) => {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const outletFilter = req.user.role === 'manager' ? { outlet: req.user.outlet } : {};

  // Today's approved sales
  const todaySales = await Sale.aggregate([
    { $match: { ...outletFilter, status: 'approved', saleDate: { $gte: startOfDay, $lte: endOfDay } } },
    { $group: { _id: null, revenue: { $sum: '$totalAmount' }, profit: { $sum: '$totalProfit' }, count: { $sum: 1 } } },
  ]);

  // Monthly approved sales
  const monthlySales = await Sale.aggregate([
    { $match: { ...outletFilter, status: 'approved', saleDate: { $gte: startOfMonth } } },
    { $group: { _id: null, revenue: { $sum: '$totalAmount' }, profit: { $sum: '$totalProfit' }, count: { $sum: 1 } } },
  ]);

  // Monthly approved expenses
  const monthlyExpenses = await Expense.aggregate([
    { $match: { ...outletFilter, status: 'approved', expenseDate: { $gte: startOfMonth } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  // Pending counts
  const pendingSales = await Sale.countDocuments({ ...outletFilter, status: 'pending' });
  const pendingExpenses = await Expense.countDocuments({ ...outletFilter, status: 'pending' });

  // Total stock value & low stock
  const inventoryFilter = req.user.role === 'manager' ? { outlet: req.user.outlet } : {};
  const inventory = await OutletInventory.find(inventoryFilter).populate('product', 'costPrice lowStockLevel name category image');
  const stockValue = inventory.reduce((acc, i) => acc + (i.quantity * (i.product?.costPrice || 0)), 0);
  const lowStockItems = inventory.filter(i => i.quantity <= (i.product?.lowStockLevel || 5));

  // Top selling products (this month)
  const topProducts = await Sale.aggregate([
    { $match: { ...outletFilter, status: 'approved', saleDate: { $gte: startOfMonth } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.product', name: { $first: '$items.productName' }, totalQty: { $sum: '$items.quantity' }, totalRevenue: { $sum: '$items.subtotal' } } },
    { $sort: { totalQty: -1 } },
    { $limit: 5 },
  ]);

  // Sales by outlet this month (owner only)
  let outletPerformance = [];
  if (req.user.role === 'owner') {
    outletPerformance = await Sale.aggregate([
      { $match: { status: 'approved', saleDate: { $gte: startOfMonth } } },
      { $group: { _id: '$outlet', revenue: { $sum: '$totalAmount' }, profit: { $sum: '$totalProfit' }, count: { $sum: 1 } } },
      { $lookup: { from: 'outlets', localField: '_id', foreignField: '_id', as: 'outlet' } },
      { $unwind: { path: '$outlet', preserveNullAndEmptyArrays: true } },
      { $project: { outletName: '$outlet.name', revenue: 1, profit: 1, count: 1 } },
    ]);
  }

  // Sales chart (last 7 days)
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push(new Date(d.setHours(0, 0, 0, 0)));
  }
  const salesChart = await Promise.all(last7Days.map(async (day) => {
    const nextDay = new Date(day); nextDay.setDate(nextDay.getDate() + 1);
    const result = await Sale.aggregate([
      { $match: { ...outletFilter, status: 'approved', saleDate: { $gte: day, $lt: nextDay } } },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' }, profit: { $sum: '$totalProfit' } } },
    ]);
    return { date: day.toISOString().split('T')[0], revenue: result[0]?.revenue || 0, profit: result[0]?.profit || 0 };
  }));

  const monthlyExpenseTotal = monthlyExpenses[0]?.total || 0;
  const monthlyGrossProfit = monthlySales[0]?.profit || 0;
  const monthlyNetProfit = monthlyGrossProfit - monthlyExpenseTotal;

  res.json({
    today: {
      revenue: todaySales[0]?.revenue || 0,
      profit: todaySales[0]?.profit || 0,
      salesCount: todaySales[0]?.count || 0,
    },
    monthly: {
      revenue: monthlySales[0]?.revenue || 0,
      grossProfit: monthlyGrossProfit,
      expenses: monthlyExpenseTotal,
      netProfit: monthlyNetProfit,
      salesCount: monthlySales[0]?.count || 0,
    },
    pending: { sales: pendingSales, expenses: pendingExpenses },
    stockValue,
    lowStockCount: lowStockItems.length,
    lowStockItems: lowStockItems.slice(0, 10).map(i => ({ product: i.product, quantity: i.quantity, outlet: i.outlet })),
    topProducts,
    outletPerformance,
    salesChart,
  });
});

module.exports = router;
