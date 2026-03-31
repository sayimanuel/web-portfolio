const router = require('express').Router();
const Skill  = require('../models/Skill');
const auth   = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const filter = req.query.cat ? { category: req.query.cat } : {};
    const items  = await Skill.find(filter).sort({ order: 1 });
    res.json(items);
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const item = new Skill(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err) { res.status(400).json({ error: 'Invalid request' }); }
});

// POST /api/skills/sync  — auto-add skills from project stack (no duplicates)
router.post('/sync', auth, async (req, res) => {
  try {
    const incoming = req.body; // [{ name, category }]
    if (!Array.isArray(incoming) || !incoming.length) return res.json({ added: 0 });

    // Fetch existing skill names (lowercase for comparison)
    const existing = await Skill.find({}, 'name');
    const existingNames = new Set(existing.map(s => s.name.toLowerCase()));

    const toAdd = incoming.filter(s => s.name && !existingNames.has(s.name.toLowerCase()));
    if (!toAdd.length) return res.json({ added: 0 });

    await Skill.insertMany(toAdd.map(s => ({ name: s.name, category: s.category })));
    res.json({ added: toAdd.length, names: toAdd.map(s => s.name) });
  } catch (err) { res.status(400).json({ error: 'Invalid request' }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await Skill.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { res.status(400).json({ error: 'Invalid request' }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Skill.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
