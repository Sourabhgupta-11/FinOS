const { google } = require("googleapis");
const logger = require("../utils/logger");

const APP_URL = process.env.APP_URL || "http://localhost:5173";
const GMAIL_USER = "finos.support@gmail.com";
const FROM = process.env.EMAIL_FROM || `FinOS <${GMAIL_USER}>`;

// ─── Gmail REST API sender (no SMTP, no blocked ports) ───────────────────────
function makeRawEmail({ to, subject, html }) {
  const boundary = "finos_boundary_" + Date.now();
  const lines = [
    `From: ${FROM}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    html,
    `--${boundary}--`,
  ];
  const raw = lines.join("\r\n");
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

async function sendEmail({ to, subject, html }) {
  if (!process.env.GMAIL_REFRESH_TOKEN) {
    logger.warn(`Email skipped (no GMAIL_REFRESH_TOKEN): ${subject} → ${to}`);
    return;
  }
  try {
    const gmail = await getGmailClient();
    const raw = makeRawEmail({ to, subject, html });
    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });
    logger.info(`Email sent: ${subject} → ${to} (messageId: ${res.data.id})`);
  } catch (err) {
    const detail = err?.response?.data?.error || err.message || JSON.stringify(err);
    logger.error("Email send failed", { message: detail, code: err.code, to, subject });
    throw err;
  }
}

// ─── Templates ────────────────────────────────────────────────────────────────
function baseTemplate(title, body) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body{font-family:Inter,sans-serif;background:#f9fafb;margin:0;padding:40px 20px}
  .card{background:#fff;border-radius:16px;max-width:480px;margin:0 auto;padding:40px;border:1px solid #e5e7eb}
  .logo{font-size:24px;font-weight:700;color:#2563eb;margin-bottom:8px}
  h2{color:#111827;margin:24px 0 12px}
  p{color:#6b7280;line-height:1.6;margin:8px 0}
  .btn{display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:20px 0}
  .footer{text-align:center;color:#9ca3af;font-size:12px;margin-top:32px}
</style></head><body>
<div class="card">
  <div class="logo">₹ Financial OS</div>
  <h2>${title}</h2>
  ${body}
  <div class="footer">Financial OS · AI-powered personal finance for India<br/>If you didn't request this, ignore this email.</div>
</div></body></html>`;
}

// ─── Email functions ──────────────────────────────────────────────────────────
async function sendVerificationEmail(user, token) {
  const url = `${APP_URL}/verify-email?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: "Verify your Financial OS account",
    html: baseTemplate("Verify your email", `
      <p>Hi ${user.name},</p>
      <p>Welcome to Financial OS! Click the button below to verify your email and get started.</p>
      <a href="${url}" class="btn">Verify Email</a>
      <p>This link expires in 24 hours.</p>
    `),
  });
}

async function sendPasswordResetEmail(user, token) {
  const url = `${APP_URL}/reset-password?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your Financial OS password",
    html: baseTemplate("Reset your password", `
      <p>Hi ${user.name},</p>
      <p>We received a request to reset your password. Click the button below:</p>
      <a href="${url}" class="btn">Reset Password</a>
      <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    `),
  });
}

async function sendSubscriptionConfirmEmail(user, plan) {
  await sendEmail({
    to: user.email,
    subject: "🎉 Welcome to Financial OS Premium!",
    html: baseTemplate("Premium activated!", `
      <p>Hi ${user.name},</p>
      <p>Your <strong>Premium subscription</strong> is now active at ₹199/month.</p>
      <p>You now have access to:</p>
      <ul style="color:#6b7280;line-height:2">
        <li>AI Advisor (unlimited conversations)</li>
        <li>Decision Simulator</li>
        <li>Portfolio Tracker</li>
        <li>Bank Account linking</li>
        <li>Tax Calculator</li>
        <li>Budget Manager</li>
      </ul>
      <a href="${APP_URL}" class="btn">Open Financial OS</a>
    `),
  });
}

async function sendProSubscriptionConfirmEmail(user, plan) {
  await sendEmail({
    to: user.email,
    subject: "👑 Welcome to Financial OS Pro!",
    html: baseTemplate("Pro subscription activated!", `
      <p>Hi ${user.name},</p>
      <p>Your <strong>Pro subscription</strong> is now active at ₹499/month.</p>
      <p>You now have access to all Pro features:</p>
      <ul style="color:#6b7280;line-height:2">
        <li>✨ AI Advisor (unlimited conversations)</li>
        <li>🎯 Advanced Decision Simulator</li>
        <li>📊 Portfolio Tracker with Analytics</li>
        <li>🏦 Bank Account linking & Sync</li>
        <li>💰 Advanced Tax Calculator</li>
        <li>💳 Budget Manager with Insights</li>
        <li>📈 Investment Strategy Builder</li>
        <li>🤖 Personalized Financial Recommendations</li>
        <li>📞 Priority Support</li>
      </ul>
      <a href="${APP_URL}" class="btn">Open Financial OS Pro</a>
    `),
  });
}

async function sendSIPReminderEmail(user, sipAmount) {
  await sendEmail({
    to: user.email,
    subject: `⏰ SIP Reminder — ₹${sipAmount.toLocaleString("en-IN")} due today`,
    html: baseTemplate("Your SIP is due today", `
      <p>Hi ${user.name},</p>
      <p>This is your monthly SIP reminder. Your scheduled investment of <strong>₹${sipAmount.toLocaleString("en-IN")}</strong> is due today.</p>
      <p>Consistent SIP investing is the most reliable path to long-term wealth. Don't skip today!</p>
      <a href="${APP_URL}/allocator" class="btn">View your allocation</a>
    `),
  });
}

async function sendBudgetAlertEmail(user, categoryName, spent, budget, pct) {
  await sendEmail({
    to: user.email,
    subject: `⚠️ Budget alert: ${categoryName} at ${pct}%`,
    html: baseTemplate(`Budget alert: ${categoryName}`, `
      <p>Hi ${user.name},</p>
      <p>You've spent <strong>₹${spent.toLocaleString("en-IN")}</strong> of your ₹${budget.toLocaleString("en-IN")} budget for <strong>${categoryName}</strong> this month.</p>
      <p>That's <strong>${pct}%</strong> of your budget.</p>
      <a href="${APP_URL}/expenses" class="btn">Review your expenses</a>
    `),
  });
}

async function sendWelcomeEmail(user) {
  await sendEmail({
    to: user.email,
    subject: "🎉 Welcome to FinOS — your account is ready!",
    html: baseTemplate("Your account is activated!", `
      <p>Hi ${user.name},</p>
      <p>Your FinOS account is now active. You can start managing your finances with AI-powered tools.</p>
      <ul style="color:#6b7280;line-height:2">
        <li>📊 Track expenses & budgets</li>
        <li>💰 Portfolio & Net Worth tracker</li>
        <li>🤖 AI Financial Advisor</li>
        <li>📈 Investment Allocator</li>
      </ul>
      <a href="${APP_URL}" class="btn">Open FinOS Dashboard</a>
    `),
  });
}

async function sendPasswordChangedEmail(user) {
  await sendEmail({
    to: user.email,
    subject: "🔐 Your FinOS password was changed",
    html: baseTemplate("Password changed", `
      <p>Hi ${user.name},</p>
      <p>Your FinOS account password was successfully changed.</p>
      <p>If you did not make this change, please <a href="${APP_URL}/forgot-password" style="color:#2563eb">reset your password immediately</a> and contact support.</p>
      <p style="color:#9ca3af;font-size:13px">This notification was sent for your security.</p>
    `),
  });
}

async function sendLoginAlertEmail(user, { ip, time } = {}) {
  await sendEmail({
    to: user.email,
    subject: "🔔 New sign-in to your FinOS account",
    html: baseTemplate("New sign-in detected", `
      <p>Hi ${user.name},</p>
      <p>A new sign-in to your account was detected${time ? ` at ${time}` : ""}${ip ? ` from IP ${ip}` : ""}.</p>
      <p>If this was you, no action is needed. If not, please <a href="${APP_URL}/forgot-password" style="color:#2563eb">reset your password</a> immediately.</p>
    `),
  });
}

async function sendWaitlistConfirmationEmail(email, name) {
  await sendEmail({
    to: email,
    subject: "🎉 You're on the FinOS waitlist!",
    html: baseTemplate("Welcome to the waitlist!", `
      <p>Hi ${name},</p>
      <p>Thank you for joining the FinOS waitlist! 🚀</p>
      <p>We're excited to bring you an AI-powered financial operating system designed for India. You'll be among the first to get access when we launch.</p>
      <p>Keep an eye on your inbox — we'll notify you the moment FinOS goes live with exclusive early-access benefits for waitlist members.</p>
      <p style="margin-top:24px;padding-top:24px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:13px">You're on the VIP list. We can't wait to help you take control of your finances!</p>
    `),
  });
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendSubscriptionConfirmEmail,
  sendProSubscriptionConfirmEmail,
  sendSIPReminderEmail,
  sendBudgetAlertEmail,
  sendWelcomeEmail,
  sendPasswordChangedEmail,
  sendLoginAlertEmail,
  sendWaitlistConfirmationEmail,
};