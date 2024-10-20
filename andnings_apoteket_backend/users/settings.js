const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
require("dotenv").config();
const router = require("express").Router();
const verifyToken = require("../authentication/verifyToken");

router.put("/user/toggle-push-notification", verifyToken, async (req, res) => {
  const { pushNotification } = req.body;
  const userId = req.user.userId;

  console.log('pushNotification', pushNotification);

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        profile: {
          update: {
            pushNotifications: pushNotification,
          },
        },
      },
    });

    res
      .status(200)
      .json({ message: "Push notification setting updated.", updatedUser });
  } catch (error) {
    console.error("Error updating push notification setting:", error);
    res
      .status(500)
      .json({ error: "Failed to update push notification setting." });
  }
});

router.put("/user/change-language-setting", verifyToken, async (req, res) => {
  const { language } = req.body;
  const userId = req.user.userId;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        language: language,
      },
    });

    res
      .status(200)
      .json({ message: "Language setting was updated.", updatedUser });
  } catch (error) {
    console.error("Error updating language setting:", error);
    res.status(500).json({ error: "Failed to update language setting." });
  }
});

router.put("/user/toggle-email-notification", verifyToken, async (req, res) => {
  const { emailNotification } = req.body;
  const userId = req.user.userId;

  console.log('emailNotification', emailNotification);

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        profile: {
          update: {
            emailNotifications: emailNotification,
          },
        },
      },
    });

    res
      .status(200)
      .json({ message: "Push notification setting updated.", updatedUser });
  } catch (error) {
    console.error("Error updating push notification setting:", error);
    res
      .status(500)
      .json({ error: "Failed to update push notification setting." });
  }
});

module.exports = router;
