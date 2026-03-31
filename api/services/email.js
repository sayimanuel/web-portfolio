const nodemailer = require('nodemailer');

// Load SMTP config: DB first, env vars as fallback
async function getSmtpConfig() {
  try {
    const Settings = require('../models/Settings');
    const doc = await Settings.findOne({ key: 'smtp' });
    const v   = doc?.value || {};
    return {
      user:     v.gmailUser        || process.env.GMAIL_USER        || '',
      pass:     v.gmailAppPassword || process.env.GMAIL_APP_PASSWORD || '',
      adminUrl: v.adminUrl         || process.env.ADMIN_URL          || 'https://helloimanuel.netlify.app/admin.html',
    };
  } catch {
    return {
      user:     process.env.GMAIL_USER        || '',
      pass:     process.env.GMAIL_APP_PASSWORD || '',
      adminUrl: process.env.ADMIN_URL          || 'https://helloimanuel.netlify.app/admin.html',
    };
  }
}

function makeTransporter(user, pass) {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

// ── Edit Request notification ─────────────────────────────────────────────
async function sendEditRequestNotif(editReq) {
  const { user, pass, adminUrl } = await getSmtpConfig();
  if (!user || !pass) return;
  const fields    = Object.keys(editReq.fieldChanges || {});
  const hasImages = editReq.newImages?.length > 0;
  await makeTransporter(user, pass).sendMail({
    from: `"Porto Notif" <${user}>`, to: user,
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
        <a href="${adminUrl}" style="display:inline-block;margin-top:16px;padding:10px 20px;
           background:#e8f55f;color:#111;font-weight:bold;text-decoration:none;border-radius:6px">
          Review in Dashboard →
        </a>
      </div>
    `,
  });
}

// ── Testimonial notification ───────────────────────────────────────────────
async function sendTestimonialNotif(testi) {
  const { user, pass, adminUrl } = await getSmtpConfig();
  if (!user || !pass) return;
  await makeTransporter(user, pass).sendMail({
    from: `"Porto Notif" <${user}>`, to: user,
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
        <a href="${adminUrl}" style="display:inline-block;margin-top:16px;padding:10px 20px;
           background:#e8f55f;color:#111;font-weight:bold;text-decoration:none;border-radius:6px">
          Review in Dashboard →
        </a>
      </div>
    `,
  });
}

// ── Project submission notification ───────────────────────────────────────
async function sendProjectSubmitNotif(project) {
  const { user, pass, adminUrl } = await getSmtpConfig();
  if (!user || !pass) return;
  await makeTransporter(user, pass).sendMail({
    from: `"Porto Notif" <${user}>`, to: user,
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
        <a href="${adminUrl}" style="display:inline-block;margin-top:16px;padding:10px 20px;
           background:#e8f55f;color:#111;font-weight:bold;text-decoration:none;border-radius:6px">
          Review in Dashboard →
        </a>
      </div>
    `,
  });
}

// ── Test SMTP connection ──────────────────────────────────────────────────
async function testSmtp() {
  const { user, pass, adminUrl } = await getSmtpConfig();
  if (!user || !pass) throw new Error('SMTP not configured. Set Gmail User and App Password first.');
  const t = makeTransporter(user, pass);
  await t.verify();
  await t.sendMail({
    from: `"Porto Notif" <${user}>`, to: user,
    subject: '✅ SMTP Test — Porto Dashboard',
    html: `<div style="font-family:sans-serif;max-width:400px;margin:auto">
      <h2 style="color:#1a1a2e">SMTP is working!</h2>
      <p>This test email was sent from your portfolio dashboard.</p>
      <a href="${adminUrl}" style="display:inline-block;margin-top:12px;padding:10px 20px;
         background:#e8f55f;color:#111;font-weight:bold;text-decoration:none;border-radius:6px">
        Go to Dashboard →
      </a>
    </div>`,
  });
}

module.exports = { sendEditRequestNotif, sendTestimonialNotif, sendProjectSubmitNotif, testSmtp };
