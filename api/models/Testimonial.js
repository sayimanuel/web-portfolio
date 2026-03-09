const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  role:     { type: String, default: '' },
  quote:    { type: String, required: true },
  approved: { type: Boolean, default: false }, // admin harus approve sebelum tampil
  order:    { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Testimonial', testimonialSchema);
