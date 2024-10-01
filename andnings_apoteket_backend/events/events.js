const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = require("express").Router();
const verifyToken = require("../authentication/verifyToken");

router.post("/videos/watch", verifyToken, async (req, res) => {
    const { videoId } = req.body;
    const userId = req.user.userId;
  
    if (!videoId) {
      return res.status(400).json({ error: "Video ID is required." });
    }
  
    try {
      // Create a new watch event
      await prisma.videoWatch.create({
        data: {
          userId: userId,
          videoId: videoId,
        },
      });
  
      // Fetch the total number of times the video has been watched
      const watchCount = await prisma.videoWatch.count({
        where: {
          videoId: videoId,
        },
      });
  
      res.status(200).json({ 
        message: "Watch event recorded successfully.",
        totalWatches: watchCount  // Return the total watch count
      });
    } catch (error) {
      console.error("Error recording watch event:", error);
      res.status(500).json({ error: "Failed to record watch event." });
    }
  });
  
module.exports = router;  