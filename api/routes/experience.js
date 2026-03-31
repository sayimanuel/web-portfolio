const router     = require('express').Router();
const Experience = require('../models/Experience');
const auth       = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const items = await Experience.find().sort({ order: 1, createdAt: -1 });
    res.json(items);
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const item = new Experience(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err) { res.status(400).json({ error: 'Invalid request' }); }
});

// POST /api/experience/sync — auto-add from projects (no duplicates)
router.post('/sync', auth, async (req, res) => {
  try {
    const incoming = req.body; // [{ role, company, period }]
    if (!Array.isArray(incoming) || !incoming.length) return res.json({ added: 0 });

    const existing = await Experience.find({}, 'role company');
    const existingKeys = new Set(existing.map(e => `${e.role.toLowerCase()}|${e.company.toLowerCase()}`));

    const toAdd = incoming.filter(e =>
      e.role && e.company &&
      !existingKeys.has(`${e.role.toLowerCase()}|${e.company.toLowerCase()}`)
    );
    if (!toAdd.length) return res.json({ added: 0 });

    await Experience.insertMany(toAdd);
    res.json({ added: toAdd.length });
  } catch (err) { res.status(400).json({ error: 'Invalid request' }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await Experience.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { res.status(400).json({ error: 'Invalid request' }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Experience.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
