const router              = require('express').Router();
const Project             = require('../models/Project');
const Notification        = require('../models/Notification');
const auth                = require('../middleware/auth');
const { upload, cloudinary } = require('../middleware/upload');
const { body, validationResult } = require('express-validator');
const { sendProjectSubmitNotif } = require('../services/email');

const validateSubmit = [
  body('title').isString().trim().isLength({ min: 1, max: 200 }),
  body('category').isString().trim().isLength({ min: 1, max: 100 }),
  body('type').isString().trim().isLength({ min: 1, max: 100 }),
  body('year').isString().trim().isLength({ min: 4, max: 4 }).matches(/^\d{4}$/),
  body('submitterName').optional().isString().trim().isLength({ max: 100 }),
  body('submitterEmail').optional().isEmail().normalizeEmail(),
  body('submitterNote').optional().isString().trim().isLength({ max: 500 }),
];

// JSON fields that may come as strings from multipart forms
const JSON_FIELDS = [
  'techStack', 'metrics', 'responsibilities',
  'implementFlow', 'implementDetails', 'keyLearnings',
  'links', 'projectTestimonial', 'process',
];

function parseJsonFields(data) {
  for (const key of JSON_FIELDS) {
    if (typeof data[key] === 'string') {
      try { data[key] = JSON.parse(data[key]); } catch { delete data[key]; }
    }
  }
}

// GET /api/projects  — public (only published)
router.get('/', async (req, res) => {
  try {
    const filter = { status: 'published' };
    // Sanitize: cast to string, strip MongoDB operators, limit length
    const safeStr = v => String(v ?? '').replace(/\$|\{|\}/g, '').slice(0, 100);

    if (req.query.featured !== undefined) filter.featured = req.query.featured === 'true';
    if (req.query.year)   filter.year     = safeStr(req.query.year);
    if (req.query.cat)    filter.category = safeStr(req.query.cat);
    if (req.query.type)   filter.type     = safeStr(req.query.type);
    if (req.query.search) filter.title    = { $regex: safeStr(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };

    const limit = Math.min(Math.max(parseInt(req.query.limit) || 0, 0), 100);
    const projects = await Project.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .limit(limit);
    res.json(projects);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/projects/pending  — admin only
router.get('/pending', auth, async (req, res) => {
  try {
    const projects = await Project.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.json(projects);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/projects/:id  — public
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Not found' });
    res.json(project);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects/submit  — public collaborator submission
router.post('/submit', upload.array('images', 20), validateSubmit, async (req, res) => {
  if (!validationResult(req).isEmpty())
    return res.status(400).json({ error: 'title, category, type, and year are required' });

  try {
    const { title, category, type, year, month,
            submitterName, submitterEmail, submitterNote } = req.body;

    const images = (req.files || []).map(f => ({ url: f.path, imageId: f.filename, caption: '' }));

    const data = {
      title, category, type, year,
      month:  month || '',
      images,
      featured: false,
      status: 'pending',
      submittedBy: {
        name:  submitterName  || '',
        email: submitterEmail || '',
        note:  submitterNote  || '',
      },
    };

    const project = await Project.create(data);

    await Notification.create({
      type:     'project_submit',
      refId:    project._id,
      refModel: 'Project',
      title:    `New Submission: ${project.title}`,
      message:  `${submitterName || 'Someone'} submitted a project for review`,
    });

    sendProjectSubmitNotif(project).catch(err =>
      console.error('[email] project submit notif failed:', err.message)
    );

    res.status(201).json({ message: 'Submission received! The owner will review it shortly.' });
  } catch {
    res.status(400).json({ error: 'Invalid submission data' });
  }
});

// POST /api/projects  — admin create
router.post('/', auth, upload.array('images', 20), async (req, res) => {
  try {
    const data  = { ...req.body };
    const files = req.files || [];

    data.images = files.map(f => ({ url: f.path, imageId: f.filename, caption: '' }));
    parseJsonFields(data);
    data.status = 'published';

    const project = await Project.create(data);
    res.status(201).json(project);
  } catch {
    res.status(400).json({ error: 'Invalid project data' });
  }
});

// PATCH /api/projects/:id/approve  — admin
router.patch('/:id/approve', auth, async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id, { status: 'published' }, { new: true }
    );
    if (!project) return res.status(404).json({ error: 'Not found' });

    await Notification.updateMany({ refId: project._id, refModel: 'Project' }, { read: true });

    res.json(project);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/projects/:id/reject  — admin (delete pending submission)
router.patch('/:id/reject', auth, async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ error: 'Not found' });

    // Delete all uploaded images from Cloudinary
    await Promise.all(
      (project.images || [])
        .filter(img => img.imageId)
        .map(img => cloudinary.uploader.destroy(img.imageId).catch(() => {}))
    );

    await Notification.updateMany({ refId: project._id, refModel: 'Project' }, { read: true });

    res.json({ message: 'Rejected and removed' });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/projects/:id  — admin update
router.put('/:id', auth, upload.array('newImages', 20), async (req, res) => {
  try {
    const data  = { ...req.body };
    const files = req.files || [];

    parseJsonFields(data);

    const updateOps = { $set: data };

    // Append new images to slider
    if (files.length) {
      const newImages = files.map(f => ({ url: f.path, imageId: f.filename, caption: '' }));
      updateOps.$push = { images: { $each: newImages } };
    }

    // Remove image by imageId (sent as removeImageId in body)
    if (data.removeImageId) {
      const imageIdToRemove = data.removeImageId;
      delete data.removeImageId;

      const project = await Project.findById(req.params.id).lean();
      const imgEntry = project?.images?.find(i => i.imageId === imageIdToRemove);
      if (imgEntry?.imageId) {
        await cloudinary.uploader.destroy(imgEntry.imageId).catch(() => {});
      }

      if (!updateOps.$pull) updateOps.$pull = {};
      updateOps.$pull.images = { imageId: imageIdToRemove };
    }

    const project = await Project.findByIdAndUpdate(req.params.id, updateOps, { new: true });
    if (!project) return res.status(404).json({ error: 'Not found' });
    res.json(project);
  } catch {
    res.status(400).json({ error: 'Invalid project data' });
  }
});

// DELETE /api/projects/:id  — admin
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ error: 'Not found' });

    await Promise.all(
      (project.images || [])
        .filter(img => img.imageId)
        .map(img => cloudinary.uploader.destroy(img.imageId).catch(() => {}))
    );

    res.json({ message: 'Deleted' });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
