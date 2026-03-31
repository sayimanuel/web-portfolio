const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true, maxlength: 100 },
  phone:      { type: String, required: true, trim: true, maxlength: 25 },
  message:    { type: String, required: true, trim: true, maxlength: 1000 },
  answer:     { type: String, default: '', trim: true, maxlength: 2000 },
  isAnswered: { type: Boolean, default: false },
  answeredAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
