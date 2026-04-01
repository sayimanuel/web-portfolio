const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  role:         { type: String, default: '' },
  quote:        { type: String, required: true },
  projectId:    { type: String, default: '' },
  projectTitle: { type: String, default: '' },
  avatarUrl:    { type: String, default: '' },
  avatarId:     { type: String, default: '' },
  approved:     { type: Boolean, default: false },
  order:        { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Testimonial', testimonialSchema);
