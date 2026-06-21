const { query } = require("../db/pool");
const emailService = require("../services/email");

async function sendContactMessage(req, res, next) {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        error: "All fields are required",
      });
    }

    // Save to database
    await query(
      `
      INSERT INTO contact_messages
      (name, email, subject, message)
      VALUES ($1, $2, $3, $4)
      `,
      [name, email, subject, message]
    );

    // Send email
    await emailService.sendEmail({
      to: "finos.support@gmail.com",
      subject: `Contact Form: ${subject}`,
      html: `
        <h2>New Contact Message</h2>

        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>

        <hr />

        <p>${message}</p>
      `,
    });

    res.json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  sendContactMessage,
};