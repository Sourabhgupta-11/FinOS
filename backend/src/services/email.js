const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

const APP_URL = process.env.APP_URL || "http://localhost:5173";
const FROM = process.env.EMAIL_FROM || "Financial OS <no-reply@financialos.in>";

async function sendEmail({ to, subject, html, text }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn(`Email skipped (no SMTP config): ${subject} → ${to}`);
    return;
  }
  try {
    const info = await getTransporter().sendMail({
      from: FROM,
      to,
      subject,
      html,
      text,
    });
    logger.info(`Email sent: ${subject} → ${to} (${info.messageId})`);
  } catch (err) {
    logger.error("Email send failed:", err.message);
    throw err;
  }
}

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

async function sendVerificationEmail(user, token) {
  const url = `${APP_URL}/verify-email?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: "Verify your Financial OS account",
    html: baseTemplate(
      "Verify your email",
      `
      <p>Hi ${user.name},</p>
      <p>Welcome to Financial OS! Click the button below to verify your email and get started.</p>
      <a href="${url}" class="btn">Verify Email</a>
      <p>This link expires in 24 hours.</p>
    `,
    ),
  });
}

async function sendPasswordResetEmail(user, token) {
  const url = `${APP_URL}/reset-password?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your Financial OS password",
    html: baseTemplate(
      "Reset your password",
      `
      <p>Hi ${user.name},</p>
      <p>We received a request to reset your password. Click the button below:</p>
      <a href="${url}" class="btn">Reset Password</a>
      <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    `,
    ),
  });
}

async function sendSubscriptionConfirmEmail(user, plan) {
  await sendEmail({
    to: user.email,
    subject: "🎉 Welcome to Financial OS Premium!",
    html: baseTemplate(
      "Premium activated!",
      `
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
    `,
    ),
  });
}

async function sendProSubscriptionConfirmEmail(user, plan) {
  await sendEmail({
    to: user.email,
    subject: "👑 Welcome to Financial OS Pro!",
    html: baseTemplate(
      "Pro subscription activated!",
      `
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
    `,
    ),
  });
}

async function sendSIPReminderEmail(user, sipAmount) {
  await sendEmail({
    to: user.email,
    subject: `⏰ SIP Reminder — ₹${sipAmount.toLocaleString("en-IN")} due today`,
    html: baseTemplate(
      "Your SIP is due today",
      `
      <p>Hi ${user.name},</p>
      <p>This is your monthly SIP reminder. Your scheduled investment of <strong>₹${sipAmount.toLocaleString("en-IN")}</strong> is due today.</p>
      <p>Consistent SIP investing is the most reliable path to long-term wealth. Don't skip today!</p>
      <a href="${APP_URL}/allocator" class="btn">View your allocation</a>
    `,
    ),
  });
}

async function sendBudgetAlertEmail(user, categoryName, spent, budget, pct) {
  await sendEmail({
    to: user.email,
    subject: `⚠️ Budget alert: ${categoryName} at ${pct}%`,
    html: baseTemplate(
      `Budget alert: ${categoryName}`,
      `
      <p>Hi ${user.name},</p>
      <p>You've spent <strong>₹${spent.toLocaleString("en-IN")}</strong> of your ₹${budget.toLocaleString("en-IN")} budget for <strong>${categoryName}</strong> this month.</p>
      <p>That's <strong>${pct}%</strong> of your budget.</p>
      <a href="${APP_URL}/expenses" class="btn">Review your expenses</a>
    `,
    ),
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
};

// ─── New account created notification ────────────────────────────────────────
async function sendWelcomeEmail(user) {
  await sendEmail({
    to: user.email,
    subject: "🎉 Welcome to FinOS — your account is ready!",
    html: baseTemplate(
      "Your account is activated!",
      `
      <p>Hi ${user.name},</p>
      <p>Your FinOS account is now active. You can start managing your finances with AI-powered tools.</p>
      <ul style="color:#6b7280;line-height:2">
        <li>📊 Track expenses & budgets</li>
        <li>💰 Portfolio & Net Worth tracker</li>
        <li>🤖 AI Financial Advisor</li>
        <li>📈 Investment Allocator</li>
      </ul>
      <a href="${APP_URL}" class="btn">Open FinOS Dashboard</a>
    `,
    ),
  });
}

// ─── Password changed notification ───────────────────────────────────────────
async function sendPasswordChangedEmail(user) {
  await sendEmail({
    to: user.email,
    subject: "🔐 Your FinOS password was changed",
    html: baseTemplate(
      "Password changed",
      `
      <p>Hi ${user.name},</p>
      <p>Your FinOS account password was successfully changed.</p>
      <p>If you did not make this change, please <a href="${APP_URL}/forgot-password" style="color:#2563eb">reset your password immediately</a> and contact support.</p>
      <p style="color:#9ca3af;font-size:13px">This notification was sent for your security.</p>
    `,
    ),
  });
}

// ─── Login from new device (optional future use) ──────────────────────────────
async function sendLoginAlertEmail(user, { ip, time } = {}) {
  await sendEmail({
    to: user.email,
    subject: "🔔 New sign-in to your FinOS account",
    html: baseTemplate(
      "New sign-in detected",
      `
      <p>Hi ${user.name},</p>
      <p>A new sign-in to your account was detected${time ? ` at ${time}` : ""}${ip ? ` from IP ${ip}` : ""}.</p>
      <p>If this was you, no action is needed. If not, please <a href="${APP_URL}/forgot-password" style="color:#2563eb">reset your password</a> immediately.</p>
    `,
    ),
  });
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendSubscriptionConfirmEmail,
  sendSIPReminderEmail,
  sendBudgetAlertEmail,
  sendWelcomeEmail,
  sendPasswordChangedEmail,
  sendLoginAlertEmail,
};
