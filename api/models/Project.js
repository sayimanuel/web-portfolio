const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  image:       { type: String, default: '' },   // Cloudinary URL
  imageId:     { type: String, default: '' },   // Cloudinary public_id (for deletion)
  category:    { type: String, enum: ['web-dev', 'web-design'], required: true },
  type:        { type: String, enum: ['education', 'company', 'private'], required: true },
  year:        { type: String, required: true },
  month:       { type: String, default: '' },
  featured:    { type: Boolean, default: false },
  caseUrl:     { type: String, default: '' },
  order:       { type: Number, default: 0 },
  status:      { type: String, enum: ['published', 'pending', 'rejected'], default: 'published' },
  submittedBy: {
    name:  { type: String, default: '' },
    email: { type: String, default: '' },
    note:  { type: String, default: '' },
  },

  // ── Case Study ───────────────────────────────────────────────────────────
  caseStudy: {
    stack:    [String],
    role:     { type: String, default: '' },
    duration: { type: String, default: '' },
    platform: { type: String, default: '' },

    problems: [String],
    goals:    [String],
    features: [mongoose.Schema.Types.Mixed],   // String or { title, desc }

    architectureImage:   { type: String, default: '' },
    architectureImageId: { type: String, default: '' },
    architectureDesc:    { type: String, default: '' },

    uiGallery: [{
      label:   String,
      images:  [String],  // multiple images for carousel
      image:   String,    // backward compat (single image)
      imageId: String,
    }],

    timeline: [{
      phase:    String,
      desc:     String,
      duration: String,
    }],

    challenges: [{
      challenge: String,
      solution:  String,
    }],

    results: [{
      value:  String,   // e.g. "98%", "3x", "< 2s"
      metric: String,   // e.g. "Lighthouse Score"
      desc:   String,
    }],

    liveUrl: { type: String, default: '' },
  },
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
