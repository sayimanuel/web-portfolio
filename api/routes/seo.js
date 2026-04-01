const router   = require('express').Router();
const Seo      = require('../models/SeoSettings');
const auth     = require('../middleware/auth');
const { upload, cloudinary } = require('../middleware/upload');

// GET /api/seo — public
router.get('/', async (req, res) => {
  try {
    const s = await Seo.findOne();
    res.json(s || {});
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

// PUT /api/seo — admin (handles ogImage OR favicon via ?type=favicon)
router.put('/', auth, upload.single('image'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.noIndex !== undefined) data.noIndex = data.noIndex === 'true';

    if (req.file) {
      const old  = await Seo.findOne();
      const type = req.query.type; // 'favicon' or 'og'

      if (type === 'favicon') {
        if (old?.faviconId) await cloudinary.uploader.destroy(old.faviconId).catch(() => {});
        data.faviconUrl = req.file.path;
        data.faviconId  = req.file.filename;
      } else {
        if (old?.ogImageId) await cloudinary.uploader.destroy(old.ogImageId).catch(() => {});
        data.ogImage   = req.file.path;
        data.ogImageId = req.file.filename;
      }
    }
    const s = await Seo.findOneAndUpdate({}, data, { new: true, upsert: true });
    res.json(s);
  } catch { res.status(400).json({ error: 'Invalid request' }); }
});

module.exports = router;
