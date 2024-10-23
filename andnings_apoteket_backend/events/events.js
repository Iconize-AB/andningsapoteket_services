const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = require("express").Router();
const verifyToken = require("../authentication/verifyToken");

// Existing watch event endpoint
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

// New endpoint for starting a session
router.post("/session/start", verifyToken, async (req, res) => {
  const { sessionId } = req.body;
  const userId = req.user.userId;

  if (!sessionId) {
    return res.status(400).json({ error: "Session ID is required." });
  }

  try {
    await prisma.sessionStartEvent.create({
      data: {
        userId: userId,
        sessionId: parseInt(sessionId),
        startTime: new Date(),
      },
    });

    res.status(200).json({
      message: "Session start event recorded successfully.",
    });
  } catch (error) {
    console.error("Error recording session start event:", error);
    res.status(500).json({ error: "Failed to record session start event." });
  }
});

// New endpoint for ending a session
router.post("/session/end", verifyToken, async (req, res) => {
  const { sessionId, durationWatched } = req.body;
  const userId = req.user.userId;

  if (!sessionId || durationWatched === undefined) {
    return res.status(400).json({ error: "Session ID and duration watched are required." });
  }

  try {
    await prisma.sessionEndEvent.create({
      data: {
        userId: userId,
        sessionId: parseInt(sessionId),
        endTime: new Date(),
        durationWatched: parseFloat(durationWatched),
      },
    });

    res.status(200).json({
      message: "Session end event recorded successfully.",
    });
  } catch (error) {
    console.error("Error recording session end event:", error);
    res.status(500).json({ error: "Failed to record session end event." });
  }
});

module.exports = router;