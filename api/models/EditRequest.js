const mongoose = require('mongoose');

const editRequestSchema = new mongoose.Schema({
  projectId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  projectTitle: { type: String, default: '' },

  // ── Requester ─────────────────────────────────────────────────────────────
  requesterName:  { type: String, required: true },
  requesterEmail: { type: String, required: true },
  message:        { type: String, default: '' }, // reason / context

  // ── Requested changes ─────────────────────────────────────────────────────
  // Partial — only fields the requester wants to change
  fieldChanges: { type: mongoose.Schema.Types.Mixed, default: {} },
  // New images to add to the slider
  newImages: [{
    url:     { type: String },
    caption: { type: String, default: '' },
  }],

  // ── Status ────────────────────────────────────────────────────────────────
  status:     { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminNote:  { type: String, default: '' },
  reviewedAt: { type: Date },

  // ── Security tracking ─────────────────────────────────────────────────────
  ip:        { type: String, default: '' },
  userAgent: { type: String, default: '' },
}, { timestamps: true });

// Auto-delete rejected requests after 30 days
editRequestSchema.index(
  { updatedAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { status: 'rejected' } }
);

module.exports = mongoose.model('EditRequest', editRequestSchema);
