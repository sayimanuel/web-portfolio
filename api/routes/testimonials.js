const router      = require('express').Router();
const Testimonial = require('../models/Testimonial');
const auth        = require('../middleware/auth');

// GET /api/testimonials  — public (hanya approved)
router.get('/', async (req, res) => {
  try {
    const filter = req.query.all === 'true' ? {} : { approved: true };
    const items  = await Testimonial.find(filter).sort({ order: 1, createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/testimonials  — public (pending approval)
router.post('/', async (req, res) => {
  try {
    const { name, role, quote } = req.body;
    if (!name || !quote) return res.status(400).json({ error: 'Name and quote required' });
    const testi = new Testimonial({ name, role, quote, approved: false });
    await testi.save();
    res.status(201).json({ message: 'Review submitted, pending approval. Thank you!' });
  } catch (err) {
    res.status(400).json({ error: err.message });
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
    res.json(testi);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/testimonials/:id  — admin
router.delete('/:id', auth, async (req, res) => {
  try {
    await Testimonial.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
