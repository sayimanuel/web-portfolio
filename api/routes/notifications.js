const router       = require('express').Router();
const Notification = require('../models/Notification');
const auth         = require('../middleware/auth');

// GET /api/notifications — admin only
// Returns list + unread count (for badge)
router.get('/', auth, async (req, res) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find().sort({ createdAt: -1 }).limit(50).lean(),
      Notification.countDocuments({ read: false }),
    ]);
    res.json({ notifications, unreadCount });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/notifications/count — lightweight badge poll
router.get('/count', auth, async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({ read: false });
    res.json({ unreadCount });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany({ read: false }, { $set: { read: true } });
    res.json({ message: 'All notifications marked as read' });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/notifications/:id/read — mark single as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { $set: { read: true } });
    res.json({ message: 'Marked as read' });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
