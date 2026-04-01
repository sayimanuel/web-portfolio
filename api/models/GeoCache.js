const mongoose = require('mongoose');
const crypto   = require('crypto');

// Cache geolocation result per IP hash — 1 lookup per unique IP
const geoCacheSchema = new mongoose.Schema({
  ipHash:  { type: String, required: true, unique: true }, // sha256(ip) — never store raw IP
  country: { type: String, default: '' },
  city:    { type: String, default: '' },
  region:  { type: String, default: '' },
  isp:     { type: String, default: '' },
  lat:     { type: Number, default: null },
  lon:     { type: Number, default: null },
}, { timestamps: true });

geoCacheSchema.index({ ipHash: 1 });

geoCacheSchema.statics.hashIp = function (ip) {
  return crypto.createHash('sha256').update(ip || '').digest('hex');
};

module.exports = mongoose.model('GeoCache', geoCacheSchema);
