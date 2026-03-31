const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  token:     { type: String, required: true, unique: true },
  expiresAt: { type: Date,   required: true },
});

// MongoDB auto-delete dokumen setelah expiresAt lewat
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('TokenBlacklist', schema);
