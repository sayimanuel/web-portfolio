const router              = require('express').Router();
const Project             = require('../models/Project');
const auth                = require('../middleware/auth');
const { upload, cloudinary } = require('../middleware/upload');

// GET /api/projects  — public (only published)
router.get('/', async (req, res) => {
  try {
    const filter = { status: 'published' };
    if (req.query.featured) filter.featured = req.query.featured === 'true';
    if (req.query.year)     filter.year     = req.query.year;
    if (req.query.cat)      filter.category = req.query.cat;
    if (req.query.type)     filter.type     = req.query.type;
    if (req.query.search)   filter.title    = { $regex: req.query.search, $options: 'i' };

    const limit    = parseInt(req.query.limit)  || 0;
    const projects = await Project.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .limit(limit);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/pending  — admin only
router.get('/pending', auth, async (req, res) => {
  try {
    const projects = await Project.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id  — public
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function parseCaseStudy(body) {
  if (!body.caseStudy) return undefined;
  try { return JSON.parse(body.caseStudy); }
  catch { return undefined; }
}

function applyGalleryFiles(files, cs) {
  if (!cs?.uiGallery) return;
  files.filter(f => /^gal_\d+$/.test(f.fieldname)).forEach(f => {
    const idx = parseInt(f.fieldname.split('_')[1]);
    if (cs.uiGallery[idx]) {
      if (!cs.uiGallery[idx].images) cs.uiGallery[idx].images = [];
      cs.uiGallery[idx].images.push(f.path);
    }
  });
}

// POST /api/projects/submit  — public collaborator submission
router.post('/submit', upload.single('image'), async (req, res) => {
  try {
    const { title, description, category, type, year, month,
            submitterName, submitterEmail, submitterNote } = req.body;

    if (!title || !category || !type || !year) {
      return res.status(400).json({ error: 'title, category, type, and year are required' });
    }

    const data = {
      title, description, category, type, year, month: month || '',
      featured: false,
      status: 'pending',
      submittedBy: {
        name:  submitterName  || '',
        email: submitterEmail || '',
        note:  submitterNote  || '',
      },
    };

    if (req.file) {
      data.image   = req.file.path;
      data.imageId = req.file.filename;
    }

    const project = new Project(data);
    await project.save();
    res.status(201).json({ message: 'Submission received! The owner will review it shortly.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/projects  — admin
router.post('/', auth, upload.any(), async (req, res) => {
  try {
    const data  = { ...req.body };
    const files = req.files || [];

    const heroFile = files.find(f => f.fieldname === 'image');
    if (heroFile) {
      data.image   = heroFile.path;
      data.imageId = heroFile.filename;
    }

    const cs = parseCaseStudy(req.body);
    delete data.caseStudy;
    if (cs) {
      const archFile = files.find(f => f.fieldname === 'archImage');
      if (archFile) {
        cs.architectureImage   = archFile.path;
        cs.architectureImageId = archFile.filename;
      }
      applyGalleryFiles(files, cs);
      data.caseStudy = cs;
    }

    data.status = 'published';
    const project = new Project(data);
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/projects/:id/approve  — admin
router.patch('/:id/approve', auth, async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id, { status: 'published' }, { new: true }
    );
    if (!project) return res.status(404).json({ error: 'Not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/projects/:id/reject  — admin
router.patch('/:id/reject', auth, async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ error: 'Not found' });
    if (project.imageId) await cloudinary.uploader.destroy(project.imageId).catch(() => {});
    res.json({ message: 'Rejected and removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:id  — admin
router.put('/:id', auth, upload.any(), async (req, res) => {
  try {
    const data  = { ...req.body };
    const files = req.files || [];
    const old   = await Project.findById(req.params.id);

    const heroFile = files.find(f => f.fieldname === 'image');
    if (heroFile) {
      if (old?.imageId) await cloudinary.uploader.destroy(old.imageId);
      data.image   = heroFile.path;
      data.imageId = heroFile.filename;
    }

    const cs = parseCaseStudy(req.body);
    if (cs) {
      const archFile = files.find(f => f.fieldname === 'archImage');
      if (archFile) {
        if (old?.caseStudy?.architectureImageId) {
          await cloudinary.uploader.destroy(old.caseStudy.architectureImageId).catch(() => {});
        }
        cs.architectureImage   = archFile.path;
        cs.architectureImageId = archFile.filename;
      }
      applyGalleryFiles(files, cs);
      data.caseStudy = cs;
    }

    if (typeof data.caseStudy === 'string') delete data.caseStudy;

    const project = await Project.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!project) return res.status(404).json({ error: 'Not found' });
    res.json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/projects/:id  — admin
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ error: 'Not found' });
    if (project.imageId) await cloudinary.uploader.destroy(project.imageId);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
