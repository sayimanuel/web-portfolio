const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // Gmail App Password (16-char)
  },
});

const ADMIN_URL = process.env.ADMIN_URL || 'https://helloimanuel.netlify.app/admin.html';
const FROM      = `"Porto Notif" <${process.env.GMAIL_USER}>`;
const TO        = process.env.GMAIL_USER;

// ── Edit Request notification ─────────────────────────────────────────────
async function sendEditRequestNotif(editReq) {
  const fields = Object.keys(editReq.fieldChanges || {});
  const hasImages = editReq.newImages?.length > 0;

  await transporter.sendMail({
    from: FROM, to: TO,
    subject: `📝 Edit Request: ${editReq.projectTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#1a1a2e">New Edit Request</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#555">Project</td>
              <td style="padding:6px 0;font-weight:bold">${editReq.projectTitle}</td></tr>
          <tr><td style="padding:6px 0;color:#555">From</td>
              <td style="padding:6px 0">${editReq.requesterName} &lt;${editReq.requesterEmail}&gt;</td></tr>
          <tr><td style="padding:6px 0;color:#555">Fields</td>
              <td style="padding:6px 0">${fields.length ? fields.join(', ') : '—'}${hasImages ? ', + new images' : ''}</td></tr>
          <tr><td style="padding:6px 0;color:#555">Message</td>
              <td style="padding:6px 0">${editReq.message || '—'}</td></tr>
        </table>
        <a href="${ADMIN_URL}" style="display:inline-block;margin-top:16px;padding:10px 20px;
           background:#e8f55f;color:#111;font-weight:bold;text-decoration:none;border-radius:6px">
          Review in Dashboard →
        </a>
      </div>
    `,
  });
}

// ── Testimonial notification ───────────────────────────────────────────────
async function sendTestimonialNotif(testi) {
  await transporter.sendMail({
    from: FROM, to: TO,
    subject: `⭐ New Testimonial from ${testi.name}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#1a1a2e">New Testimonial</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#555">From</td>
              <td style="padding:6px 0;font-weight:bold">${testi.name} — ${testi.role || '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#555">Project</td>
              <td style="padding:6px 0">${testi.projectTitle || '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#555">Quote</td>
              <td style="padding:6px 0;font-style:italic">"${testi.quote}"</td></tr>
        </table>
        <a href="${ADMIN_URL}" style="display:inline-block;margin-top:16px;padding:10px 20px;
           background:#e8f55f;color:#111;font-weight:bold;text-decoration:none;border-radius:6px">
          Review in Dashboard →
        </a>
      </div>
    `,
  });
}

// ── Project submission notification ───────────────────────────────────────
async function sendProjectSubmitNotif(project) {
  await transporter.sendMail({
    from: FROM, to: TO,
    subject: `🚀 New Project Submission: ${project.title}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#1a1a2e">New Project Submission</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#555">Title</td>
              <td style="padding:6px 0;font-weight:bold">${project.title}</td></tr>
          <tr><td style="padding:6px 0;color:#555">From</td>
              <td style="padding:6px 0">${project.submittedBy?.name || '—'} &lt;${project.submittedBy?.email || '—'}&gt;</td></tr>
          <tr><td style="padding:6px 0;color:#555">Category</td>
              <td style="padding:6px 0">${project.category} / ${project.type}</td></tr>
        </table>
        <a href="${ADMIN_URL}" style="display:inline-block;margin-top:16px;padding:10px 20px;
           background:#e8f55f;color:#111;font-weight:bold;text-decoration:none;border-radius:6px">
          Review in Dashboard →
        </a>
      </div>
    `,
  });
}

module.exports = { sendEditRequestNotif, sendTestimonialNotif, sendProjectSubmitNotif };
