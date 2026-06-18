const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const OutletInventory = require('../models/OutletInventory');
const { protect, authorize } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

function buildDateFilter(startDate, endDate, field = 'saleDate') {
  const filter = {};
  if (startDate || endDate) {
    filter[field] = {};
    if (startDate) filter[field].$gte = new Date(startDate);
    if (endDate) filter[field].$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  }
  return filter;
}

// GET /api/reports/sales
router.get('/sales', protect, authorize('owner', 'manager'), async (req, res) => {
  const { startDate, endDate, outletId, groupBy = 'day' } = req.query;
  const match = { status: 'approved', ...buildDateFilter(startDate, endDate) };
  if (req.user.role === 'manager') match.outlet = req.user.outlet;
  else if (outletId) match.outlet = require('mongoose').Types.ObjectId.createFromHexString(outletId);

  const groupFormat = groupBy === 'month' ? { year: { $year: '$saleDate' }, month: { $month: '$saleDate' } }
    : groupBy === 'week' ? { year: { $year: '$saleDate' }, week: { $week: '$saleDate' } }
    : { date: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } } };

  const data = await Sale.aggregate([
    { $match: match },
    { $group: { _id: groupFormat, revenue: { $sum: '$totalAmount' }, cost: { $sum: '$totalCost' }, profit: { $sum: '$totalProfit' }, count: { $sum: 1 } } },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.date': 1 } },
  ]);

  const totals = await Sale.aggregate([
    { $match: match },
    { $group: { _id: null, revenue: { $sum: '$totalAmount' }, cost: { $sum: '$totalCost' }, profit: { $sum: '$totalProfit' }, count: { $sum: 1 } } },
  ]);

  res.json({ data, totals: totals[0] || { revenue: 0, cost: 0, profit: 0, count: 0 } });
});

// GET /api/reports/profit
router.get('/profit', protect, authorize('owner', 'manager'), async (req, res) => {
  const { startDate, endDate, outletId } = req.query;
  const saleMatch = { status: 'approved', ...buildDateFilter(startDate, endDate) };
  const expenseMatch = { status: 'approved', ...buildDateFilter(startDate, endDate, 'expenseDate') };

  if (req.user.role === 'manager') { saleMatch.outlet = req.user.outlet; expenseMatch.outlet = req.user.outlet; }
  else if (outletId) {
    const oid = require('mongoose').Types.ObjectId.createFromHexString(outletId);
    saleMatch.outlet = oid; expenseMatch.outlet = oid;
  }

  const salesData = await Sale.aggregate([
    { $match: saleMatch },
    { $group: { _id: null, revenue: { $sum: '$totalAmount' }, cost: { $sum: '$totalCost' }, grossProfit: { $sum: '$totalProfit' } } },
  ]);

  const expenseData = await Expense.aggregate([
    { $match: expenseMatch },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  // Profit by product
  const productProfit = await Sale.aggregate([
    { $match: saleMatch },
    { $unwind: '$items' },
    { $group: { _id: '$items.product', name: { $first: '$items.productName' }, revenue: { $sum: '$items.subtotal' }, profit: { $sum: '$items.profit' }, qty: { $sum: '$items.quantity' } } },
    { $sort: { profit: -1 } },
    { $limit: 20 },
  ]);

  // Profit by outlet
  const outletProfit = await Sale.aggregate([
    { $match: saleMatch },
    { $group: { _id: '$outlet', revenue: { $sum: '$totalAmount' }, grossProfit: { $sum: '$totalProfit' } } },
    { $lookup: { from: 'outlets', localField: '_id', foreignField: '_id', as: 'outlet' } },
    { $unwind: { path: '$outlet', preserveNullAndEmptyArrays: true } },
    { $project: { outletName: '$outlet.name', revenue: 1, grossProfit: 1 } },
  ]);

  const revenue = salesData[0]?.revenue || 0;
  const cost = salesData[0]?.cost || 0;
  const grossProfit = salesData[0]?.grossProfit || 0;
  const totalExpenses = expenseData[0]?.total || 0;
  const netProfit = grossProfit - totalExpenses;

  res.json({ revenue, cost, grossProfit, totalExpenses, netProfit, productProfit, outletProfit });
});

// GET /api/reports/expenses
router.get('/expenses', protect, authorize('owner', 'manager'), async (req, res) => {
  const { startDate, endDate, outletId } = req.query;
  const match = { status: 'approved', ...buildDateFilter(startDate, endDate, 'expenseDate') };
  if (req.user.role === 'manager') match.outlet = req.user.outlet;
  else if (outletId) match.outlet = require('mongoose').Types.ObjectId.createFromHexString(outletId);

  const byCategory = await Expense.aggregate([
    { $match: match },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);

  const byOutlet = await Expense.aggregate([
    { $match: match },
    { $group: { _id: '$outlet', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $lookup: { from: 'outlets', localField: '_id', foreignField: '_id', as: 'outlet' } },
    { $unwind: { path: '$outlet', preserveNullAndEmptyArrays: true } },
    { $project: { outletName: '$outlet.name', total: 1, count: 1 } },
  ]);

  const totals = await Expense.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);

  const recentExpenses = await Expense.find(match).populate('outlet', 'name').populate('worker', 'name').sort({ createdAt: -1 }).limit(50);

  res.json({ byCategory, byOutlet, totals: totals[0] || { total: 0, count: 0 }, recentExpenses });
});

// GET /api/reports/inventory
router.get('/inventory', protect, authorize('owner', 'manager'), async (req, res) => {
  const outletFilter = req.user.role === 'manager' ? { outlet: req.user.outlet } : req.query.outletId ? { outlet: req.query.outletId } : {};

  const inventory = await OutletInventory.find(outletFilter)
    .populate('product', 'name category brand sku costPrice sellingPrice lowStockLevel unit')
    .populate('outlet', 'name');

  const result = inventory.map(i => ({
    outlet: i.outlet?.name,
    product: i.product?.name,
    category: i.product?.category,
    brand: i.product?.brand,
    sku: i.product?.sku,
    quantity: i.quantity,
    unit: i.product?.unit,
    costPrice: i.product?.costPrice,
    sellingPrice: i.product?.sellingPrice,
    stockValue: i.quantity * (i.product?.costPrice || 0),
    isLowStock: i.quantity <= (i.product?.lowStockLevel || 5),
    lowStockLevel: i.product?.lowStockLevel,
  }));

  const totalValue = result.reduce((s, i) => s + i.stockValue, 0);
  const lowStockCount = result.filter(i => i.isLowStock).length;

  res.json({ inventory: result, totalValue, lowStockCount, totalItems: result.length });
});

// GET /api/reports/export/sales?format=pdf|excel
router.get('/export/sales', protect, authorize('owner', 'manager'), async (req, res) => {
  const { startDate, endDate, outletId, format = 'excel' } = req.query;
  const match = { status: 'approved', ...buildDateFilter(startDate, endDate) };
  if (outletId) match.outlet = require('mongoose').Types.ObjectId.createFromHexString(outletId);

  const sales = await Sale.find(match)
    .populate('outlet', 'name')
    .populate('worker', 'name')
    .sort({ saleDate: -1 })
    .limit(1000);

  if (format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);
    doc.fontSize(18).text('Sales Report', { align: 'center' });
    doc.moveDown();
    if (startDate || endDate) doc.fontSize(10).text(`Period: ${startDate || 'All'} to ${endDate || 'All'}`, { align: 'center' });
    doc.moveDown();
    sales.forEach((sale, i) => {
      doc.fontSize(9).text(`${i + 1}. ${new Date(sale.saleDate).toLocaleDateString()} | ${sale.outlet?.name} | ${sale.worker?.name} | ₦${sale.totalAmount.toLocaleString()} | ${sale.paymentMethod.toUpperCase()}`);
    });
    doc.end();
  } else {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Sales Report');
    ws.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Outlet', key: 'outlet', width: 20 },
      { header: 'Worker', key: 'worker', width: 20 },
      { header: 'Amount (₦)', key: 'amount', width: 15 },
      { header: 'Cost (₦)', key: 'cost', width: 15 },
      { header: 'Profit (₦)', key: 'profit', width: 15 },
      { header: 'Payment', key: 'payment', width: 12 },
      { header: 'Customer', key: 'customer', width: 20 },
    ];
    ws.getRow(1).font = { bold: true };
    sales.forEach(s => ws.addRow({ date: new Date(s.saleDate).toLocaleDateString(), outlet: s.outlet?.name, worker: s.worker?.name, amount: s.totalAmount, cost: s.totalCost, profit: s.totalProfit, payment: s.paymentMethod.toUpperCase(), customer: s.customerName || '' }));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');
    await wb.xlsx.write(res);
    res.end();
  }
});

// GET /api/reports/stock-profit — potential profit from current stock
router.get('/stock-profit', protect, authorize('owner', 'manager'), async (req, res) => {
  const { outletId } = req.query;
  const filter = {};
  if (req.user.role === 'manager') filter.outlet = req.user.outlet;
  else if (outletId) filter.outlet = outletId;

  const inventory = await OutletInventory.find(filter)
    .populate('product', 'name category brand sku costPrice sellingPrice unit')
    .populate('outlet', 'name');

  const items = inventory
    .filter(i => i.product && i.quantity > 0)
    .map(i => ({
      product: i.product.name,
      brand: i.product.brand || '',
      category: i.product.category,
      sku: i.product.sku || '',
      outlet: i.outlet?.name || '',
      unit: i.product.unit,
      quantity: i.quantity,
      costPrice: i.product.costPrice,
      sellingPrice: i.product.sellingPrice,
      totalCost: i.quantity * i.product.costPrice,
      totalRevenue: i.quantity * i.product.sellingPrice,
      potentialProfit: i.quantity * (i.product.sellingPrice - i.product.costPrice),
      margin: i.product.sellingPrice > 0
        ? (((i.product.sellingPrice - i.product.costPrice) / i.product.sellingPrice) * 100).toFixed(1)
        : '0',
    }))
    .sort((a, b) => b.potentialProfit - a.potentialProfit);

  // Group by outlet
  const byOutlet = {};
  items.forEach(i => {
    if (!byOutlet[i.outlet]) byOutlet[i.outlet] = { outlet: i.outlet, totalCost: 0, totalRevenue: 0, potentialProfit: 0, items: 0 };
    byOutlet[i.outlet].totalCost += i.totalCost;
    byOutlet[i.outlet].totalRevenue += i.totalRevenue;
    byOutlet[i.outlet].potentialProfit += i.potentialProfit;
    byOutlet[i.outlet].items += 1;
  });

  // Group by category
  const byCategory = {};
  items.forEach(i => {
    if (!byCategory[i.category]) byCategory[i.category] = { category: i.category, totalCost: 0, totalRevenue: 0, potentialProfit: 0 };
    byCategory[i.category].totalCost += i.totalCost;
    byCategory[i.category].totalRevenue += i.totalRevenue;
    byCategory[i.category].potentialProfit += i.potentialProfit;
  });

  const totalCost = items.reduce((s, i) => s + i.totalCost, 0);
  const totalRevenue = items.reduce((s, i) => s + i.totalRevenue, 0);
  const totalProfit = items.reduce((s, i) => s + i.potentialProfit, 0);
  const overallMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';

  res.json({
    summary: { totalCost, totalRevenue, totalProfit, overallMargin },
    items,
    byOutlet: Object.values(byOutlet),
    byCategory: Object.values(byCategory),
  });
});

module.exports = router;
