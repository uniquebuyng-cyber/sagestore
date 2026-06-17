const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

// GET /api/notifications
router.get('/', protect, async (req, res) => {
  const { unread } = req.query;
  const filter = { recipient: req.user._id };
  if (unread === 'true') filter.isRead = false;

  const notifications = await Notification.find(filter)
    .populate('outlet', 'name')
    .sort({ createdAt: -1 })
    .limit(100);

  const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
  res.json({ notifications, unreadCount });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', protect, async (req, res) => {
  await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.user._id }, { isRead: true });
  res.json({ message: 'Marked as read' });
});

// PATCH /api/notifications/read-all
router.patch('/read-all', protect, async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
  res.json({ message: 'All notifications marked as read' });
});

module.exports = router;
