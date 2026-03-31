const jwt            = require('jsonwebtoken');
const TokenBlacklist = require('../models/TokenBlacklist');

module.exports = async (req, res, next) => {
  // Cek cookie dulu (production), fallback ke Authorization header (local dev)
  const auth  = req.headers.authorization || '';
  const token = req.cookies?.porto_token || (auth.startsWith('Bearer ') ? auth.slice(7) : null);

  if (!token) return res.status(401).json({ error: 'No token provided' });

  // Cek blacklist (token sudah di-logout)
  try {
    const revoked = await TokenBlacklist.findOne({ token }).lean();
    if (revoked) return res.status(401).json({ error: 'Token revoked' });
  } catch { /* DB error, lanjut verifikasi */ }

  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    req.token = token;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
