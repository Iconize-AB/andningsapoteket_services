const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = require("express").Router();
const verifyToken = require("../authentication/verifyToken");

router.get("/videos", verifyToken, async (req, res) => {
  console.log("category", req.query);
  try {
    const { category } = req.query;
    console.log("category", category);

    if (!category) {
      return res.status(400).json({ error: "Category is required." });
    }

    const videos = await prisma.video.findMany({
      where: {
        category: category, // Matches the exact category
      },
    });

    console.log("videos", videos);

    // If no videos are found, return an empty array
    if (!videos.length) {
      return res
        .status(404)
        .json({ error: "No videos found for the selected category." });
    }

    // Return the fetched videos
    res.status(200).json({
        items: videos,
        total: videos.length,
      });
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ error: "Failed to fetch videos." });
  }
});

module.exports = router;
