const mongoose = require('mongoose');

const experienceSchema = new mongoose.Schema({
  role:    { type: String, required: true },
  company: { type: String, required: true },
  period:  { type: String, required: true },
  order:   { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Experience', experienceSchema);
