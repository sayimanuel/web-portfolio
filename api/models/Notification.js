const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['edit_request', 'testimonial', 'project_submit'],
    required: true,
  },
  refId:    { type: mongoose.Schema.Types.ObjectId },
  refModel: { type: String }, // 'EditRequest' | 'Testimonial' | 'Project'
  title:    { type: String, required: true },
  message:  { type: String, default: '' },
  read:     { type: Boolean, default: false },
}, { timestamps: true });

// Auto-delete read notifications after 90 days
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60, partialFilterExpression: { read: true } }
);

module.exports = mongoose.model('Notification', notificationSchema);
