const router       = require('express').Router();
const rateLimit    = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const EditRequest  = require('../models/EditRequest');
const Notification = require('../models/Notification');
const Project      = require('../models/Project');
const auth         = require('../middleware/auth');
const { sendEditRequestNotif } = require('../services/email');
const { upload }   = require('../middleware/upload');

// ── Rate limit: 2 requests per IP per hour ────────────────────────────────
const editReqLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 2,
  keyGenerator: req =>
    req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress,
  message: { error: 'Too many edit requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const validate = [
  body('requesterName').isString().trim().isLength({ min: 1, max: 100 }),
  body('requesterEmail').isEmail().normalizeEmail(),
  body('message').optional().isString().trim().isLength({ max: 1000 }),
  // Honeypot: must be empty
  body('_hp').custom(val => {
    if (val && String(val).length > 0) throw new Error('Bot detected');
    return true;
  }),
];

// POST /api/edit-requests — public
router.post('/', editReqLimiter, upload.array('newImages', 10), validate, async (req, res) => {
  if (!validationResult(req).isEmpty())
    return res.status(400).json({ error: 'Invalid request data' });

  // Timing check — form must take ≥ 3 seconds (anti-bot)
  const elapsed = Date.now() - parseInt(req.body._ts || '0');
  if (elapsed < 3000)
    return res.status(400).json({ error: 'Please take a moment to fill the form' });

  try {
    const { projectId, requesterName, requesterEmail, message } = req.body;

    const project = await Project.findById(projectId).lean();
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Parse partial field changes
    let fieldChanges = {};
    try { fieldChanges = JSON.parse(req.body.fieldChanges || '{}'); } catch {}

    // Uploaded new images (via Cloudinary via multer)
    const newImages = (req.files || []).map(f => ({
      url:     f.path,
      caption: '',
    }));

    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;

    const editReq = await EditRequest.create({
      projectId,
      projectTitle: project.title,
      requesterName,
      requesterEmail,
      message:      message || '',
      fieldChanges,
      newImages,
      ip,
      userAgent: (req.headers['user-agent'] || '').slice(0, 250),
    });

    // Create in-app notification
    await Notification.create({
      type:     'edit_request',
      refId:    editReq._id,
      refModel: 'EditRequest',
      title:    `Edit Request: ${project.title}`,
      message:  `${requesterName} submitted an edit request`,
    });

    // Send email (fire-and-forget — don't block response)
    sendEditRequestNotif(editReq).catch(err =>
      console.error('[email] edit request notif failed:', err.message)
    );

    res.status(201).json({ message: 'Edit request submitted. The owner will review it shortly.' });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/edit-requests — admin only
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const requests = await EditRequest.find(filter).sort({ createdAt: -1 });
    res.json(requests);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/edit-requests/:id — admin only
router.get('/:id', auth, async (req, res) => {
  try {
    const req_ = await EditRequest.findById(req.params.id);
    if (!req_) return res.status(404).json({ error: 'Not found' });
    res.json(req_);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/edit-requests/:id/approve — apply changes to project
router.patch('/:id/approve', auth, async (req, res) => {
  try {
    const editReq = await EditRequest.findById(req.params.id);
    if (!editReq) return res.status(404).json({ error: 'Not found' });
    if (editReq.status !== 'pending')
      return res.status(400).json({ error: 'Request already reviewed' });

    const { fieldChanges, newImages } = editReq;

    // Apply field changes
    if (fieldChanges && Object.keys(fieldChanges).length) {
      await Project.findByIdAndUpdate(editReq.projectId, { $set: fieldChanges });
    }

    // Append new images to slider
    if (newImages?.length) {
      await Project.findByIdAndUpdate(editReq.projectId, {
        $push: { images: { $each: newImages } },
      });
    }

    editReq.status     = 'approved';
    editReq.reviewedAt = new Date();
    editReq.adminNote  = req.body.adminNote || '';
    await editReq.save();

    // Mark related notification as read
    await Notification.updateMany({ refId: editReq._id }, { read: true });

    res.json({ message: 'Approved and applied to project' });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/edit-requests/:id/reject
router.patch('/:id/reject', auth, async (req, res) => {
  try {
    const editReq = await EditRequest.findById(req.params.id);
    if (!editReq) return res.status(404).json({ error: 'Not found' });

    editReq.status     = 'rejected';
    editReq.reviewedAt = new Date();
    editReq.adminNote  = req.body.adminNote || '';
    await editReq.save();

    await Notification.updateMany({ refId: editReq._id }, { read: true });

    res.json({ message: 'Edit request rejected' });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
