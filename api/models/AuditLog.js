const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  method: String,
  path:   String,
  ip:     String,
}, { timestamps: true });

schema.index({ createdAt: -1 });
// Auto-delete log setelah 90 hari
schema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('AuditLog', schema);
