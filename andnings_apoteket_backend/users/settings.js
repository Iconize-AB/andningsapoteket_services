const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
require('dotenv').config();
const router = require('express').Router();
const verifyToken = require("../authentication/verifyToken");

router.put("/user/toggle-push-notification", verifyToken, async (req, res) => {
    const { pushNotification } = req.body;
    const userId = req.user.userId;

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

router.put("/user/toggle-email-notification", verifyToken, async (req, res) => {
    const { emailNotifications } = req.body;
    const userId = req.user.userId;

    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          profile: {
            update: {
              emailNotifications: emailNotifications,
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
