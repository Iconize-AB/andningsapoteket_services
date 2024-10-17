const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = require("express").Router();
const verifyToken = require("../authentication/verifyToken");

// Endpoint to add a session to the user's library
router.post("/add-video", verifyToken, async (req, res) => {
  const { sessionId } = req.body;
  const userId = req.user.userId;

  if (!sessionId) {
    return res.status(400).json({ error: "Session ID is required." });
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
    }

    // Add the session to the user's library
    const sessionInLibrary = await prisma.libraryForSession.create({
      data: {
        libraryId: library.id,
        sessionId: sessionId,
      },
    });

    // Check if the user already liked this session
    const existingLike = await prisma.sessionLike.findUnique({
      where: {
        sessionId_userId: {
          sessionId: sessionId,
          userId: userId,
        },
      },
    });

    // If the user hasn't liked the session yet, create a like and increment the counter
    if (!existingLike) {
      await prisma.sessionLike.create({
        data: {
          userId: userId,
          sessionId: sessionId,
        },
      });

      // Increment the total like count on the session
      await prisma.session.update({
        where: {
          id: sessionId,
        },
        data: {
          likes: {
            increment: 1,
          },
        },
      });
    }

    // Fetch the updated count of how many times this session has been added to libraries (likes)
    const likeCount = await prisma.libraryForSession.count({
      where: {
        sessionId: sessionId,
      },
    });

    res.status(200).json({
      message: "Session added to library and liked successfully",
      library,
      sessionInLibrary,
      likeCount, // Return the count of how many times the session has been added to libraries
    });
  } catch (error) {
    console.error("Error adding session to library and liking it:", error);
    res.status(500).json({ error: "Failed to add session to library and like." });
  }
});

router.get("/fetch", verifyToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    // Fetch the user's library with all associated videos
    const library = await prisma.library.findUnique({
      where: {
        userId: userId,
      },
      include: {
        sessions: {
          include: {
            session: true, // Include the full video details
          },
        },
      },
    });
    res.status(200).json({
      message: "Library and videos fetched successfully",
      library,
    });
  } catch (error) {
    console.error("Error fetching library:", error);
    res.status(500).json({ error: "Failed to fetch library." });
  }
});

// Endpoint to delete selected sessions from the user's library
router.delete("/delete", verifyToken, async (req, res) => {
  const { sessionIds } = req.body;
  const userId = req.user.userId;

  if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
    return res
      .status(400)
      .json({ error: "An array of session IDs is required." });
  }

  try {
    // Fetch the user's library
    const library = await prisma.library.findUnique({
      where: {
        userId: userId,
      },
      include: {
        sessions: true,  // Include all sessions in the library for logging
      },
    });

    if (!library) {
      return res
        .status(404)
        .json({ error: "Library not found for this user." });
    }

    // Perform the delete operation
    const deleteSessions = await prisma.libraryForSession.deleteMany({
      where: {
        libraryId: library.id,
        sessionId: {
          in: sessionIds,
        },
      },
    });

    if (deleteSessions.count === 0) {
      return res
        .status(404)
        .json({ message: "No matching sessions found in the library." });
    }

    res.status(200).json({
      message: "Selected sessions deleted from the library successfully.",
      deletedCount: deleteSessions.count,
    });
  } catch (error) {
    console.error("Error deleting sessions from library:", error);
    res
      .status(500)
      .json({ error: "Failed to delete sessions from the library." });
  }
});

module.exports = router;
