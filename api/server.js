require('dotenv').config();
const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ─────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ─────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/projects',     require('./routes/projects'));
app.use('/api/testimonials', require('./routes/testimonials'));
app.use('/api/experience',   require('./routes/experience'));
app.use('/api/skills',       require('./routes/skills'));
app.use('/api/profile',      require('./routes/profile'));

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// ── MongoDB connection caching (serverless-friendly) ──
let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI);
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
