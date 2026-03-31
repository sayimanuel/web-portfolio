const router  = require('express').Router();
const Message = require('../models/Message');
const protect = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');

// Strip MongoDB operators and HTML tags from a string
function sanitize(str) {
  return String(str ?? '')
    .replace(/[<>]/g, '')              // strip HTML tags
    .replace(/\$|\{|\}/g, '')         // strip MongoDB operators
    .trim();
}

const validateMessage = [
  body('name')
    .optional()
    .isString().withMessage('Invalid name')
    .isLength({ max: 100 }).withMessage('Name too long')
    .customSanitizer(v => sanitize(v)),
  body('phone')
    .optional()
    .isString()
    .isLength({ max: 50 }).withMessage('Contact too long')
    .customSanitizer(v => sanitize(v)),
  body('message')
    .isString().withMessage('Message is required')
    .isLength({ min: 1, max: 1000 }).withMessage('Message must be 1–1000 chars')
    .customSanitizer(v => sanitize(v)),
];

// Public — submit anonymous message
router.post('/', validateMessage, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  try {
    const name    = req.body.name    || 'Anonymous';
    const phone   = req.body.phone   || '-';
    const message = req.body.message;
    const msg = await Message.create({ name, phone, message });
    res.status(201).json({ success: true, id: msg._id });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Public — get answered messages only (for Q&A page)
router.get('/public', async (req, res) => {
  try {
    const msgs = await Message.find({ isAnswered: true })
      .select('name message answer answeredAt createdAt')
      .sort('-answeredAt')
      .lean();
    res.json(msgs);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin — get all messages
router.get('/', protect, async (req, res) => {
  try {
    const msgs = await Message.find().sort('-createdAt').lean();
    res.json(msgs);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin — reply to a message
router.put('/:id/answer', protect, [
  param('id').isMongoId().withMessage('Invalid ID'),
  body('answer').isString().isLength({ min: 1, max: 2000 }).withMessage('Answer required (max 2000 chars)')
    .customSanitizer(v => sanitize(v)),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  try {
    const msg = await Message.findByIdAndUpdate(
      req.params.id,
      { answer: req.body.answer.trim(), isAnswered: true, answeredAt: new Date() },
      { new: true }
    );
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    res.json(msg);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin — delete a message
router.delete('/:id', protect, [
  param('id').isMongoId().withMessage('Invalid ID'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
