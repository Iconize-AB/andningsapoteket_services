const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = require("express").Router();
const verifyToken = require("../authentication/verifyToken");

router.get("/recordings", verifyToken, async (req, res) => {
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

router.get("/recordings/by-condition", verifyToken, async (req, res) => {
  try {
    const { condition } = req.query;

    if (!condition) {
      return res.status(400).json({ error: "Condition is required." });
    }

    const videos = await prisma.video.findMany({
      where: {
        categories: {
          array_contains: condition,
        },
      },
    });

    console.log('found videos by condition:', videos);

    if (!videos.length) {
      return res.status(404).json({ error: "No videos found with the selected condition." });
    }

    res.status(200).json({
      items: videos,
      total: videos.length,
    });
  } catch (error) {
    console.error("Error fetching videos by condition:", error);
    res.status(500).json({ error: "Failed to fetch videos by condition." });
  }
});

router.get("/most-watched", verifyToken, async (req, res) => {
  try {
    // Fetch the most-watched videos, counting the number of watch events per video
    console.log('test');
    const mostWatchedVideos = await prisma.video.findMany({
      orderBy: {
        watches: {
          _count: "desc",
        },
      },
      take: 5,
      include: {
        _count: {
          select: { watches: true },
        },
      },
    });

    res.status(200).json({ videos: mostWatchedVideos });
  } catch (error) {
    console.error("Error fetching most-watched videos:", error);
    res.status(500).json({ error: "Failed to fetch most-watched videos." });
  }
});

router.get('/unwatched-videos', verifyToken, async (req, res) => {
  const { userId } = req.user;

  try {
    const allVideos = await prisma.video.findMany({
      select: { id: true },
    });

    const watchedVideos = await prisma.videoWatch.findMany({
      where: { userId: userId },
      select: { videoId: true },
    });

    const allVideoIds = allVideos.map(video => video.id);
    const watchedVideoIds = watchedVideos.map(watch => watch.videoId);

    const unwatchedVideoIds = allVideoIds.filter(id => !watchedVideoIds.includes(id));

    const unwatchedVideos = await prisma.video.findMany({
      where: {
        id: { in: unwatchedVideoIds }
      }
    });

    res.status(200).json({
      items: unwatchedVideos,
    });
  } catch (error) {
    console.error("Error fetching unwatched videos:", error);
    res.status(500).json({ error: "Failed to fetch unwatched videos." });
  }
});

module.exports = router;
