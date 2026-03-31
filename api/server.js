require('dotenv').config();
const express      = require('express');
const mongoose     = require('mongoose');
const cors         = require('cors');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security headers ────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin:      allowedOrigins.length ? allowedOrigins : false,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true, // wajib untuk HttpOnly cookie
}));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Skip rate limits for local development
const isLocalhost = (req) => {
  const ip = req.ip || req.connection?.remoteAddress || '';
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip);
};

// ── Global rate limit — semua endpoint ───────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  skip: isLocalhost,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
}));

// ── Rate limit ketat untuk public write endpoints ────
const publicWriteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 jam
  max: 5,
  skip: isLocalhost,
  message: { error: 'Submission limit reached, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 60,
  skip: isLocalhost,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Audit log untuk semua admin action ───────────────
app.use(require('./middleware/audit'));

// ── Strip MongoDB operators ($, .) from all user input ───
function sanitizeObj(obj) {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) { delete obj[key]; continue; }
    if (typeof obj[key] === 'object') sanitizeObj(obj[key]);
  }
}
app.use((req, _res, next) => {
  sanitizeObj(req.body);
  sanitizeObj(req.query);
  next();
});

// ── Rate limit pada public write endpoints (harus sebelum route) ─
app.post('/api/projects/submit', publicWriteLimiter);
app.post('/api/testimonials',    publicWriteLimiter);
app.post('/api/messages',        publicWriteLimiter);
app.post('/api/analytics/track', analyticsLimiter);

// ── Routes ─────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/projects',      require('./routes/projects'));
app.use('/api/testimonials',  require('./routes/testimonials'));
app.use('/api/edit-requests', require('./routes/editRequests'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/experience',    require('./routes/experience'));
app.use('/api/skills',        require('./routes/skills'));
app.use('/api/profile',       require('./routes/profile'));
app.use('/api/seo',           require('./routes/seo'));
app.use('/api/analytics',     require('./routes/analytics'));
app.use('/api/messages',      require('./routes/messages'));

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// ── MongoDB connection caching (serverless-friendly) ──
let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 20000,
  });
  isConnected = true;
  console.log('✓ MongoDB connected');
}

module.exports = { app, connectDB };

// ── Start server only when run directly (local dev) ──
if (require.main === module) {
  connectDB()
    .then(() => app.listen(PORT, '0.0.0.0', () => console.log(`✓ API running → http://localhost:${PORT}`)))
    .catch(err => { console.error('✗ MongoDB connection error:', err.message); process.exit(1); });
}
