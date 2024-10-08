const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = require("express").Router();
const verifyToken = require("../authentication/verifyToken");

// Endpoint to add a video to the user's library
router.post("/add-video", verifyToken, async (req, res) => {
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

    // Check if the user already liked this video
    const existingLike = await prisma.videoLike.findUnique({
      where: {
        videoId_userId: {
          videoId: videoId,
          userId: userId,
        },
      },
    });

    // If the user hasn't liked the video yet, create a like and increment the counter
    if (!existingLike) {
      await prisma.videoLike.create({
        data: {
          userId: userId,
          videoId: videoId,
        },
      });

      // Increment the total like count on the video
      await prisma.video.update({
        where: {
          id: videoId,
        },
        data: {
          likes: {
            increment: 1,
          },
        },
      });
    }

    // Fetch the updated count of how many times this video has been added to libraries (likes)
    const likeCount = await prisma.libraryForVideo.count({
      where: {
        videoId: videoId,
      },
    });

    res.status(200).json({
      message: "Video added to library and liked successfully",
      library,
      videoInLibrary,
      likeCount, // Return the count of how many times the video has been added to libraries
    });
  } catch (error) {
    console.error("Error adding video to library and liking it:", error);
    res.status(500).json({ error: "Failed to add video to library and like." });
  }
});

// Endpoint to delete selected videos from the user's library
router.delete("/delete", verifyToken, async (req, res) => {
  const { sessionIds } = req.body;
  const userId = req.user.userId;

  if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
    return res
      .status(400)
      .json({ error: "An array of video IDs is required." });
  }

  try {
    // Fetch the user's library
    const library = await prisma.library.findUnique({
      where: {
        userId: userId,
      },
      include: {
        videos: true,  // Include all videos in the library for logging
      },
    });

    if (!library) {
      return res
        .status(404)
        .json({ error: "Library not found for this user." });
    }

    // Log the current videos in the library for debugging
    console.log("User's library videos:", library.videos);

    // Perform the delete operation
    const deleteSessions = await prisma.libraryForVideo.deleteMany({
      where: {
        libraryId: library.id,
        videoId: {
          in: sessionIds,
        },
      },
    });

    if (deleteSessions.count === 0) {
      return res
        .status(404)
        .json({ message: "No matching videos found in the library." });
    }

    res.status(200).json({
      message: "Selected videos deleted from the library successfully.",
      deletedCount: deleteSessions.count,
    });
  } catch (error) {
    console.error("Error deleting videos from library:", error);
    res
      .status(500)
      .json({ error: "Failed to delete videos from the library." });
  }
});

module.exports = router;
