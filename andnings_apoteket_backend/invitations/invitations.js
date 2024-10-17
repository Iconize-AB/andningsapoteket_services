const express = require("express");
const { PrismaClient } = require("@prisma/client");
const sgMail = require("@sendgrid/mail");
const verifyToken = require("../authentication/verifyToken");
require("dotenv").config();

const prisma = new PrismaClient();
const router = express.Router();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function generateInviteCode() {
  return "FREETRIAL" + Math.random().toString(36).substring(2, 7).toUpperCase();
}

router.post("/invite-friends", verifyToken, async (req, res) => {
  const { userId } = req.user;
  const { emails } = req.body;

  if (!Array.isArray(emails) || emails.length === 0) {
    return res
      .status(400)
      .json({ error: "Please provide a list of email addresses." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, inviteCode: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    let inviteCode = user.inviteCode;
    if (!inviteCode) {
      inviteCode = generateInviteCode();
      await prisma.user.update({
        where: { id: userId },
        data: { inviteCode: inviteCode },
      });
    }

    const invitationPromises = emails.map(async (email) => {
      const msg = {
        to: email,
        from: "support@iconize-earth.com",
        subject: "You've been invited to Andningsapoteket!",
        text: `Your friend ${user.email} has invited you to join Andningsapoteket! Use the code ${inviteCode} to get a 2-month free trial when you sign up.`,
        html: `<strong>Your friend ${user.email} has invited you to join Andningsapoteket!</strong><br><br>Use the code <strong>${inviteCode}</strong> to get a 2-month free trial when you sign up.`,
      };

      return sgMail.send(msg);
    });

    await Promise.all(invitationPromises);

    res.status(200).json({
      message: "Invitations sent successfully.",
      inviteCode: inviteCode,
    });
  } catch (error) {
    console.error("Error sending invitations:", error);
    res.status(500).json({ error: "Failed to send invitations." });
  }
});

router.post("/validate-invite-code", async (req, res) => {
  const { inviteCode } = req.body;

  if (!inviteCode) {
    return res.status(400).json({ error: "Invite code is required." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { inviteCode: inviteCode },
      select: { id: true, inviteCodeUses: true },
    });

    if (!user) {
      return res.status(404).json({ error: "Invalid invite code." });
    }

    if (user.inviteCodeUses >= 5) {
      // Limit to 5 uses per code
      return res
        .status(400)
        .json({ error: "This invite code has reached its usage limit." });
    }

    res.status(200).json({
      message: "Valid invite code.",
      trialPeriod: 60, // 60 days free trial
    });
  } catch (error) {
    console.error("Error validating invite code:", error);
    res.status(500).json({ error: "Failed to validate invite code." });
  }
});

module.exports = router;
