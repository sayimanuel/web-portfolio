const router   = require('express').Router();
const Seo      = require('../models/SeoSettings');
const auth     = require('../middleware/auth');
const { upload, cloudinary } = require('../middleware/upload');

// GET /api/seo — public
router.get('/', async (req, res) => {
  try {
    const s = await Seo.findOne();
    res.json(s || {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/seo — admin
router.put('/', auth, upload.single('ogImage'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.noIndex !== undefined) data.noIndex = data.noIndex === 'true';
    if (req.file) {
      const old = await Seo.findOne();
      if (old?.ogImageId) await cloudinary.uploader.destroy(old.ogImageId).catch(() => {});
      data.ogImage   = req.file.path;
      data.ogImageId = req.file.filename;
    }
    const s = await Seo.findOneAndUpdate({}, data, { new: true, upsert: true });
    res.json(s);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
