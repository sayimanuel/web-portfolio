const router   = require('express').Router();
const auth     = require('../middleware/auth');
const Settings = require('../models/Settings');
const { body, validationResult } = require('express-validator');
const { testSmtp } = require('../services/email');

const SMTP_KEY = 'smtp';

// GET /api/settings/smtp — admin only, password masked
router.get('/smtp', auth, async (req, res) => {
  try {
    const doc = await Settings.findOne({ key: SMTP_KEY });
    const v   = doc?.value || {};
    res.json({
      gmailUser:   v.gmailUser   || '',
      adminUrl:    v.adminUrl    || '',
      hasPassword: !!(v.gmailAppPassword),
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/settings/smtp — admin only
router.put('/smtp', auth, [
  body('gmailUser').optional({ nullable: true }).isEmail().normalizeEmail(),
  body('gmailAppPassword').optional({ nullable: true }).isString().isLength({ max: 100 }),
  body('adminUrl').optional({ nullable: true }).isURL().isLength({ max: 200 }),
], async (req, res) => {
  if (!validationResult(req).isEmpty())
    return res.status(400).json({ error: 'Invalid input' });
  try {
    const doc  = await Settings.findOne({ key: SMTP_KEY });
    const prev = doc?.value || {};

    const next = {
      gmailUser:       req.body.gmailUser       ?? prev.gmailUser       ?? '',
      gmailAppPassword: req.body.gmailAppPassword // empty string = clear, undefined = keep
        ?? (req.body.gmailAppPassword === '' ? '' : prev.gmailAppPassword ?? ''),
      adminUrl:        req.body.adminUrl        ?? prev.adminUrl        ?? '',
    };

    await Settings.findOneAndUpdate(
      { key: SMTP_KEY },
      { value: next },
      { upsert: true, new: true }
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/settings/smtp/test — send test email
router.post('/smtp/test', auth, async (req, res) => {
  try {
    await testSmtp();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
