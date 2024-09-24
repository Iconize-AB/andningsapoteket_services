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
      lastName: user.lastName,
      fullName: user.fullName,
      active: user.active,
      subscriptionType: user.subscriptionType,
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

module.exports = router;
