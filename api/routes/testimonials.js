const router      = require('express').Router();
const Testimonial = require('../models/Testimonial');
const Notification = require('../models/Notification');
const auth        = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { sendTestimonialNotif } = require('../services/email');
const { uploadAvatar, cloudinary } = require('../middleware/upload');

const validateTesti = [
  body('name').isString().trim().isLength({ min: 1, max: 100 }),
  body('quote').isString().trim().isLength({ min: 1, max: 1000 }),
  body('role').optional().isString().trim().isLength({ max: 100 }),
  body('projectId').optional().isString().trim().isLength({ max: 100 }),
  body('projectTitle').optional().isString().trim().isLength({ max: 200 }),
];

// GET /api/testimonials  — public (hanya approved), admin bisa lihat semua
router.get('/', async (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    let isAdmin = false;
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        jwt.verify(token, process.env.JWT_SECRET);
        isAdmin = true;
      } catch { /* invalid token, treat as public */ }
    }
    const filter = isAdmin && req.query.all === 'true' ? {} : { approved: true };
    if (req.query.projectId) filter.projectId = String(req.query.projectId).replace(/\$|\{|\}/g, '').slice(0, 100);
    const items  = await Testimonial.find(filter).sort({ order: 1, createdAt: -1 });
    res.json(items);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/testimonials  — public (pending approval)
router.post('/', uploadAvatar.single('avatar'), validateTesti, async (req, res) => {
  if (!validationResult(req).isEmpty()) {
    if (req.file?.filename) cloudinary.uploader.destroy(req.file.filename).catch(() => {});
    return res.status(400).json({ error: 'Name and quote required' });
  }
  try {
    const { name, role, quote, projectId, projectTitle } = req.body;
    const testi = await Testimonial.create({
      name, role, quote,
      projectId:    projectId    || '',
      projectTitle: projectTitle || '',
      avatarUrl:    req.file?.path     || '',
      avatarId:     req.file?.filename || '',
      approved: false,
    });

    await Notification.create({
      type:     'testimonial',
      refId:    testi._id,
      refModel: 'Testimonial',
      title:    `New Testimonial from ${name}`,
      message:  `"${quote.slice(0, 80)}${quote.length > 80 ? '…' : ''}"`,
    });

    sendTestimonialNotif(testi).catch(err =>
      console.error('[email] testimonial notif failed:', err.message)
    );

    res.status(201).json({ message: 'Review submitted, pending approval. Thank you!' });
  } catch {
    res.status(400).json({ error: 'Invalid request' });
  }
});

// PATCH /api/testimonials/:id/approve  — admin
router.patch('/:id/approve', auth, async (req, res) => {
  try {
    const testi = await Testimonial.findByIdAndUpdate(
      req.params.id,
      { approved: true },
      { new: true }
    );
    if (!testi) return res.status(404).json({ error: 'Not found' });

    await Notification.updateMany({ refId: testi._id }, { read: true });

    res.json(testi);
  } catch {
    res.status(400).json({ error: 'Invalid request' });
  }
});

// DELETE /api/testimonials/:id  — admin
router.delete('/:id', auth, async (req, res) => {
  try {
    const testi = await Testimonial.findByIdAndDelete(req.params.id);
    if (testi?.avatarId) cloudinary.uploader.destroy(testi.avatarId).catch(() => {});
    res.json({ message: 'Deleted' });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
