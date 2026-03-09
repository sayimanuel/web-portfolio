const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });

  const stored = process.env.ADMIN_PASSWORD_HASH || '';
  // Support both bcrypt hash ($2a$...) and plain text (dev only)
  const valid = stored.startsWith('$2')
    ? await bcrypt.compare(password, stored)
    : password === stored;
  if (!valid) return res.status(401).json({ error: 'Wrong password' });

  const token = jwt.sign({ admin: true }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// POST /api/auth/hash  — dev helper, generate bcrypt hash
// Hapus endpoint ini setelah production
router.post('/hash', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  const hash = await bcrypt.hash(password, 10);
  res.json({ hash, note: 'Paste this into ADMIN_PASSWORD_HASH in .env' });
});

module.exports = router;
