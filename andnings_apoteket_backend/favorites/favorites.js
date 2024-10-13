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
      .json({ message: "List and its sessions deleted successfully" });
  } catch (error) {
    console.error("Failed to delete list:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/favorites/add-breathwork", verifyToken, async (req, res) => {
  const { sessionId, listId } = req.body;
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

    // Check if the session exists
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    await prisma.$transaction([
      prisma.trainingList.update({
        where: { id: listId },
        data: {
          Sessions: {
            connect: { id: sessionId },
          },
        },
      }),
      prisma.session.update({
        where: { id: sessionId },
        data: {
          savedNumberOfTimes: { increment: 1 },
        },
      }),
    ]);

    res.status(201).json({ message: "Session added to list successfully" });
  } catch (error) {
    console.error("Failed to add session to list:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/favorites", verifyToken, async (req, res) => {
  const { sessionId } = req.body;
  const userId = req.user.userId;

  try {
    const existingFavorite = await prisma.favoriteSession.findUnique({
      where: {
        userId_sessionId: {
          userId: userId,
          sessionId: sessionId,
        },
      },
    });

    if (existingFavorite) {
      await prisma.favoriteSession.delete({
        where: {
          id: existingFavorite.id,
        },
      });
      res.status(200).json({ message: "Favorite removed." });
    } else {
      const newFavorite = await prisma.favoriteSession.create({
        data: {
          userId: userId,
          sessionId: sessionId,
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
    const favorites = await prisma.favoriteSession.findMany({
      where: {
        userId: userId,
      },
      include: {
        session: {
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

    const favoriteSessions = favorites.map((favorite) => {
      return {
        ...favorite.session,
        likedByUser: favorite.session.likes.length > 0,
      };
    });

    res.status(200).json(favoriteSessions);
  } catch (error) {
    console.error("Error fetching favorite sessions:", error);
    res.status(500).json({ error: "Failed to fetch favorite sessions." });
  }
});

module.exports = router;
