const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  // ── Core ─────────────────────────────────────────────────────────────────
  title:    { type: String, required: true },
  category: { type: String, enum: ['web-dev', 'web-design'], required: true },
  type:     { type: String, enum: ['education', 'company', 'private'], required: true },
  year:     { type: String, required: true },
  month:    { type: String, default: '' },
  featured: { type: Boolean, default: false },
  order:    { type: Number, default: 0 },
  status:   { type: String, enum: ['published', 'pending', 'rejected'], default: 'published' },

  // ── Header meta ───────────────────────────────────────────────────────────
  tag:     { type: String, default: '' },   // "Redesign" | "MVP" | "New" | etc.
  period:  { type: String, default: '' },   // "Aug 2023 – Dec 2023"
  role:    { type: String, default: '' },   // "Frontend Developer, UI/UX Designer"
  liveUrl: { type: String, default: '' },

  // ── Image slider ──────────────────────────────────────────────────────────
  images: [{
    url:     { type: String, default: '' },
    imageId: { type: String, default: '' }, // Cloudinary public_id
    caption: { type: String, default: '' }, // caption shown bottom-left of slide
  }],

  // ── Tech stack (infinity scroll logos) ───────────────────────────────────
  techStack: [{
    name:    { type: String },              // e.g. "React" → Devicons CDN
    logoUrl: { type: String, default: '' }, // optional custom logo URL
  }],

  // ── Overview section ──────────────────────────────────────────────────────
  overview:      { type: String, default: '' },
  collaboration: { type: String, default: '' },

  // ── Metrics (impact numbers in overview) ──────────────────────────────────
  metrics: [{
    value: { type: String },
    label: { type: String },
  }],

  // ── Responsibilities accordion ────────────────────────────────────────────
  responsibilities: [{ type: String }],

  // ── Outcome accordion + proof-of-work links ───────────────────────────────
  outcome: { type: String, default: '' },
  links: {
    github:    { type: String, default: '' },
    figma:     { type: String, default: '' },
    prototype: { type: String, default: '' },
  },

  // ── Detailed Information ───────────────────────────────────────────────────
  detailedInfo:    { type: String, default: '' },
  problemSolution: { type: String, default: '' },
  appFlow:         { type: String, default: '' },
  technicalNotes:  { type: String, default: '' },

  // ── Implement Flow grid ───────────────────────────────────────────────────
  implementFlow: [{
    step: { type: String },
    desc: { type: String },
  }],

  // ── Implement Details bullet list ─────────────────────────────────────────
  implementDetails: [{ type: String }],

  // ── Process — Editor.js JSON ──────────────────────────────────────────────
  process: { type: mongoose.Schema.Types.Mixed, default: null },

  // ── Key Learnings ─────────────────────────────────────────────────────────
  keyLearnings: [{ type: String }],

  // ── Project testimonial ───────────────────────────────────────────────────
  projectTestimonial: {
    quote:      { type: String, default: '' },
    author:     { type: String, default: '' },
    authorRole: { type: String, default: '' },
  },

  // ── Submission tracking ───────────────────────────────────────────────────
  submittedBy: {
    name:  { type: String, default: '' },
    email: { type: String, default: '' },
    note:  { type: String, default: '' },
  },
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
