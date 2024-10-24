const express = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const sgMail = require("@sendgrid/mail");
require("dotenv").config();
const verifyToken = require("../authentication/verifyToken");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const router = express.Router();

router.post("/update-help-option-content", verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied. Admin privileges required." });
    }

    const { option, content } = req.body;

    console.log("option", option);
    console.log("content", content);
    if (!option || !content) {
      return res.status(400).json({ error: "Option and content are required." });
    }

    const updatedContent = await prisma.helpOptionContent.upsert({
      where: { option: option },
      update: { content: content },
      create: { option: option, content: content },
    });

    res.status(200).json({
      message: "Help option content updated successfully.",
      updatedContent: updatedContent
    });
  } catch (error) {
    console.error("Error updating help option content:", error);
    res.status(500).json({ error: "Failed to update help option content." });
  }
});

// New endpoint to fetch all help option contents
router.get("/help-option-contents", verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true },
    });

    console.log("user", user);

    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied. Admin privileges required." });
    }

    const helpOptionContents = await prisma.helpOptionContent.findMany({
      orderBy: {
        option: 'asc'
      }
    });

    res.status(200).json({
      message: "Help option contents fetched successfully.",
      contents: helpOptionContents
    });
  } catch (error) {
    console.error("Error fetching help option contents:", error);
    res.status(500).json({ error: "Failed to fetch help option contents." });
  }
});

module.exports = router;
