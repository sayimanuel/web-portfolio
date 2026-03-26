const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  event:     { type: String, required: true }, // pageview | project_view | cta_click | contact_click
  page:      { type: String, default: '' },
  projectId: { type: String, default: '' },
  referrer:  { type: String, default: '' },
  sessionId: { type: String, default: '' },
  isNew:     { type: Boolean, default: true },
}, { timestamps: true });

schema.index({ event: 1, createdAt: -1 });
schema.index({ projectId: 1, event: 1 });
schema.index({ sessionId: 1 });

module.exports = mongoose.model('Analytics', schema);
