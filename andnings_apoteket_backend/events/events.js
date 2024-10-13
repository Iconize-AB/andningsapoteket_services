const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = require("express").Router();
const verifyToken = require("../authentication/verifyToken");

router.post("/session/watch", verifyToken, async (req, res) => {
  const { sessionId } = req.body;
  const userId = req.user.userId;

  if (!sessionId) {
    return res.status(400).json({ error: "Session ID is required." });
  }

  try {
    // Create a new watch event
    await prisma.sessionWatch.create({
      data: {
        userId: userId,
        sessionId: sessionId,
      },
    });

    // Fetch the total number of times the session has been watched
    const watchCount = await prisma.sessionWatch.count({
      where: {
        sessionId: sessionId,
      },
    });

    res.status(200).json({
      message: "Watch event recorded successfully.",
      totalWatches: watchCount, // Return the total watch count
    });
  } catch (error) {
    console.error("Error recording watch event:", error);
    res.status(500).json({ error: "Failed to record watch event." });
  }
});

module.exports = router;