const mongoose = require('mongoose');

// Single-doc pattern: one settings document per key
const settingsSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
