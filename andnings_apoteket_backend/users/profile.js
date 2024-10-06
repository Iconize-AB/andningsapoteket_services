const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
require('dotenv').config();
const router = require('express').Router();
const verifyToken = require("../authentication/verifyToken");

router.get("/fetch-profile", verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.userId,
      },
      include: {
        profile: true,
        userCategories: {
          select: {
            id: true,
          },
        },
        batchesFollowing: {
          select: {
            id: true,
          },
        },
        savedSessionLists: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!user) return res.status(404).json({ error: "User not found." });

    res.status(200).json({
      email: user.email,
      firstName: user.firstName,
      id: user.id,
      lastName: user.lastName,
      fullName: user.fullName,
      active: user.active,
      subscriptionType: user.subscriptionType,
      language: user.language,
      phoneNumber: user.phoneNumber,
      role: user.role,
      userCategories: user.userCategories,
      batchesFollowingCount: user.batchesFollowing.length,
      savedSessionCount: user.savedSessionLists.length,

      profile: {
        pushNotifications: user.profile?.pushNotifications,
        emailNotifications: user.profile?.emailNotifications,
        acceptedTermsAndConditions: user.profile?.acceptedTermsAndConditions,
        profileImageUrl: user.profile?.profileImageUrl,
        ratingFunction: user.profile?.ratingFunction,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch user profile." });
  }
});

router.put("/update/user", verifyToken, async (req, res) => {
  const { fullName, email } = req.body;
  try {
    // Retrieve the current user profile to compare emails
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!currentUser) return res.status(404).json({ error: "User not found." });

    if (currentUser.email === email) {
      const updatedUser = await prisma.user.update({
        where: { id: req.user.userId },
        data: { fullName },
      });
      return res.status(200).json({
        message: "Profile updated successfully.",
        user: { fullName: updatedUser.fullName, email: updatedUser.email },
      });
    }

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { email, verificationCode, isActivated: false },
    });

    const msg = {
      to: userEmail,
      from: 'support@iconize-earth.com',
      subject: 'Verify your email for Andningsapoteket',
      text: `Your verification code is: ${verificationCode}`,
      html: `<strong>Your verification code is: ${verificationCode}</strong>`,
    };

    await sgMail.send(msg);

    res.status(200).json({
      message:
        "Profile updated successfully. Verification email sent to " + email,
      emailUpdated: true,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Failed to update profile." });
  }
});

module.exports = router;
