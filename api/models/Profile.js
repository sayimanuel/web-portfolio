const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  tagline:   { type: String, default: '' },
  bio:       { type: String, default: '' },
  email:     { type: String, default: '' },
  photo:     { type: String, default: '' },  // Cloudinary URL
  photoId:   { type: String, default: '' },
  linkedin:  { type: String, default: '' },
  instagram: { type: String, default: '' },
  whatsapp:  { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Profile', profileSchema);
