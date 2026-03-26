const mongoose = require('mongoose');

const seoSchema = new mongoose.Schema({
  siteName:      { type: String, default: 'Imanuel Portfolio' },
  canonicalBase: { type: String, default: '' },
  gaId:          { type: String, default: '' },
  gscCode:       { type: String, default: '' },
  homeTitle:     { type: String, default: '' },
  homeDesc:      { type: String, default: '' },
  homeKeywords:  { type: String, default: '' },
  projectsTitle: { type: String, default: '' },
  projectsDesc:  { type: String, default: '' },
  ogImage:       { type: String, default: '' },
  ogImageId:     { type: String, default: '' },
  noIndex:       { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('SeoSettings', seoSchema);
