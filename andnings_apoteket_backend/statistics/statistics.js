const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const verifyToken = require("../authentication/verifyToken");
const prisma = new PrismaClient();

router.get("/user-stats", verifyToken, async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const plusUsers = await prisma.user.count({
      where: {
        role: "plus",
      },
    });
    const regularUsers = totalUsers - plusUsers;

    res.status(200).json({
      totalUsers,
      plusUsers,
      regularUsers,
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ error: "Failed to fetch user statistics" });
  }
});

module.exports = router;
