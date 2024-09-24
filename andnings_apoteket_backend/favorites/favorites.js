const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const verifyToken = require('../authentication/verifyToken'); // JWT middleware to verify users

// POST: Create a new favorite list
router.post("/favorites/create", verifyToken, async (req, res) => {
  const { name } = req.body;
  const userId = req.user.userId;

  try {
    const userListsCount = await prisma.trainingList.count({
      where: { userId },
    });

    const newList = await prisma.trainingList.create({
      data: {
        name,
        userId,
      },
    });

    if (userListsCount === 0) {
      // This is the user's first training list
      await createBatchForUser(
        userId,
        "First List",
        "You have created you first training list",
        "#FFD700"
      );
    }

    res.status(201).json(newList);
  } catch (error) {
    console.error("Failed to create list:", error);
    res.status(500).json({ error: "Failed to create list" });
  }
});

router.delete("/favorites/delete", verifyToken, async (req, res) => {
  const { listId } = req.body;
  const userId = req.user.userId;

  try {
    const list = await prisma.trainingList.findFirst({
      where: {
        id: listId,
        userId: userId,
      },
    });

    if (!list) {
      return res
        .status(404)
        .json({ message: "List not found or not accessible by you." });
    }

    await prisma.trainingList.delete({
      where: { id: listId },
    });

    res
      .status(200)
      .json({ message: "List and its videos deleted successfully" });
  } catch (error) {
    console.error("Failed to delete list:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/favorites/add-breathwork", verifyToken, async (req, res) => {
  const { videoId, listId } = req.body;
  const userId = req.user.userId;

  try {
    // Verify the list and ensure it belongs to the user
    const list = await prisma.trainingList.findFirst({
      where: {
        id: listId,
        userId: userId,
      },
    });

    if (!list) {
      return res
        .status(404)
        .json({ message: "List not found or not accessible by you." });
    }

    // Check if the video exists
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    await prisma.$transaction([
      prisma.trainingList.update({
        where: { id: listId },
        data: {
          Videos: {
            connect: { id: videoId },
          },
        },
      }),
      prisma.video.update({
        where: { id: videoId },
        data: {
          savedNumberOfTimes: { increment: 1 },
        },
      }),
    ]);

    res.status(201).json({ message: "Video added to list successfully" });
  } catch (error) {
    console.error("Failed to add video to list:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/favorites", verifyToken, async (req, res) => {
  const { videoId } = req.body;
  const userId = req.user.userId;

  try {
    const existingFavorite = await prisma.favoriteVideo.findUnique({
      where: {
        userId_videoId: {
          userId: userId,
          videoId: videoId,
        },
      },
    });

    if (existingFavorite) {
      await prisma.favoriteVideo.delete({
        where: {
          id: existingFavorite.id,
        },
      });
      res.status(200).json({ message: "Favorite removed." });
    } else {
      const newFavorite = await prisma.favoriteVideo.create({
        data: {
          userId: userId,
          videoId: videoId,
        },
      });
      res
        .status(201)
        .json({ message: "Favorite added.", favorite: newFavorite });
    }
  } catch (error) {
    console.error("Error toggling favorite:", error);
    res.status(500).json({ error: "Failed to toggle favorite" });
  }
});

router.get("/user/all/favorites", verifyToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const favorites = await prisma.favoriteVideo.findMany({
      where: {
        userId: userId,
      },
      include: {
        video: {
          include: {
            likes: {
              where: {
                userId: userId,
              },
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    const favoriteVideos = favorites.map((favorite) => {
      return {
        ...favorite.video,
        likedByUser: favorite.video.likes.length > 0,
      };
    });

    res.status(200).json(favoriteVideos);
  } catch (error) {
    console.error("Error fetching favorite videos:", error);
    res.status(500).json({ error: "Failed to fetch favorite videos." });
  }
});

module.exports = router;
