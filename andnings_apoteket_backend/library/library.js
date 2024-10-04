const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = require("express").Router();
const verifyToken = require("../authentication/verifyToken");

// Endpoint to add a video to the user's library
router.post("/library/add-video", verifyToken, async (req, res) => {
  const { videoId } = req.body;
  const userId = req.user.userId;

  if (!videoId) {
    return res.status(400).json({ error: "Video ID is required." });
  }

  try {
    // Check if the user already has a library
    let library = await prisma.library.findUnique({
      where: {
        userId: userId,
      },
    });

    // If no library exists, create a new one for the user
    if (!library) {
      library = await prisma.library.create({
        data: {
          userId: userId,
        },
      });
      console.log("New library created for user:", library);
    }

    // Add the video to the user's library
    const videoInLibrary = await prisma.libraryForVideo.create({
      data: {
        libraryId: library.id,
        videoId: videoId,
      },
    });

    res.status(200).json({
      message: "Video added to library successfully",
      library,
      videoInLibrary,
    });
  } catch (error) {
    console.error("Error adding video to library:", error);
    res.status(500).json({ error: "Failed to add video to library." });
  }
});

router.get("/library", verifyToken, async (req, res) => {
    const userId = req.user.userId;
  
    try {
      // Fetch the user's library with all associated videos
      const library = await prisma.library.findUnique({
        where: {
          userId: userId,
        },
        include: {
          videos: {
            include: {
              video: true, // Include the full video details
            },
          },
        },
      });
  
      if (!library || !library.videos.length) {
        return res.status(404).json({ message: "No videos found in the library." });
      }
  
      res.status(200).json({
        message: "Library and videos fetched successfully",
        library,
      });
    } catch (error) {
      console.error("Error fetching library:", error);
      res.status(500).json({ error: "Failed to fetch library." });
    }
  });

module.exports = router;
