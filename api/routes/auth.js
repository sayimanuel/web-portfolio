const router         = require('express').Router();
const bcrypt         = require('bcryptjs');
const jwt            = require('jsonwebtoken');
const rateLimit      = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const TokenBlacklist = require('../models/TokenBlacklist');
const auth           = require('../middleware/auth');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const COOKIE_OPTS = {
  httpOnly:  true,
  secure:    process.env.NODE_ENV === 'production',
  sameSite:  process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge:    7 * 24 * 60 * 60 * 1000, // 7 hari
};

// POST /api/auth/login
router.post('/login', loginLimiter, body('password').isString().isLength({ min: 1, max: 200 }), async (req, res) => {
  if (!validationResult(req).isEmpty()) return res.status(400).json({ error: 'Password required' });
  const { password } = req.body;

  const stored = process.env.ADMIN_PASSWORD_HASH || '';
  if (!stored.startsWith('$2')) return res.status(500).json({ error: 'Server misconfigured' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
  const valid = await bcrypt.compare(password, stored);
  if (!valid) {
    console.warn(`[AUTH] Failed login — IP: ${ip} — ${new Date().toISOString()}`);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  console.info(`[AUTH] Login success — IP: ${ip} — ${new Date().toISOString()}`);
  const token = jwt.sign({ admin: true }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('porto_token', token, COOKIE_OPTS);
  res.json({ ok: true, token }); // token juga dikirim untuk fallback local dev
});

// POST /api/auth/logout
router.post('/logout', auth, async (req, res) => {
  const token = req.token;
  if (token) {
    try {
      const decoded = jwt.decode(token);
      const expiresAt = new Date(decoded.exp * 1000);
      await TokenBlacklist.create({ token, expiresAt });
    } catch { /* ignore jika sudah ada di blacklist */ }
    res.clearCookie('porto_token', COOKIE_OPTS);
  }
  res.json({ ok: true });
});

// GET /api/auth/check — cek apakah session masih valid
router.get('/check', auth, (req, res) => res.json({ ok: true }));

module.exports = router;
