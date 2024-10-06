const express = require('express');
const { PrismaClient } = require("@prisma/client");
const sgMail = require('@sendgrid/mail');
const router = express.Router();
require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

router.post("/send-support-request", async (req, res) => {
  const { name, email, subject, message } = req.body;

  console.log("name, email, subject, message", req.body);

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const msg = {
      to: 'support@iconize-earth.com',
      from: 'support@iconize-earth.com',
      subject: `Support Request: ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage: ${message}`,
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong> ${message}</p>
      `,
    };

    await sgMail.send(msg);

    res.status(200).json({ message: "Support request sent successfully." });
  } catch (error) {
    console.error("Error sending support request:", error);
    res.status(500).json({ error: "Failed to send support request." });
  }
});

module.exports = router;
