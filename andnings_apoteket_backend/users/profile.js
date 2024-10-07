const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
require('dotenv').config();
const router = require('express').Router();
const verifyToken = require("../authentication/verifyToken");

router.get("/fetch-profile", verifyToken, async (req, res) => {
  try {
    const updatedUser = await prisma.user.update({
      where: {
        id: req.user.userId,
      },
      data: {
        lastActive: new Date(),
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

    if (!updatedUser) return res.status(404).json({ error: "User not found." });

    res.status(200).json({
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      id: updatedUser.id,
      lastName: updatedUser.lastName,
      fullName: updatedUser.fullName,
      lastActive: updatedUser.lastActive,
      subscriptionType: updatedUser.subscriptionType,
      language: updatedUser.language,
      phoneNumber: updatedUser.phoneNumber,
      role: updatedUser.role,
      userCategories: updatedUser.userCategories,
      batchesFollowingCount: updatedUser.batchesFollowing.length,
      savedSessionCount: updatedUser.savedSessionLists.length,
      profile: {
        pushNotifications: updatedUser.profile?.pushNotifications,
        emailNotifications: updatedUser.profile?.emailNotifications,
        acceptedTermsAndConditions: updatedUser.profile?.acceptedTermsAndConditions,
        profileImageUrl: updatedUser.profile?.profileImageUrl,
        ratingFunction: updatedUser.profile?.ratingFunction,
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
