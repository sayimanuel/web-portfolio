const router                 = require('express').Router();
const Profile                = require('../models/Profile');
const auth                   = require('../middleware/auth');
const { upload, cloudinary } = require('../middleware/upload');

// GET /api/profile  — public
router.get('/', async (req, res) => {
  try {
    const profile = await Profile.findOne();
    res.json(profile || {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/profile  — admin (upsert)
router.put('/', auth, upload.single('photo'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) {
      const old = await Profile.findOne();
      if (old?.photoId) await cloudinary.uploader.destroy(old.photoId);
      data.photo   = req.file.path;
      data.photoId = req.file.filename;
    }
    const profile = await Profile.findOneAndUpdate({}, data, { new: true, upsert: true });
    res.json(profile);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
