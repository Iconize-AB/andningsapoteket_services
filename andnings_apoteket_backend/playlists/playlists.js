const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = require("express").Router();
const verifyToken = require("../authentication/verifyToken");

router.post("/add-session", verifyToken, async (req, res) => {
  const { listId, listName, sessionId } = req.body;
  const userId = req.user.userId;

  if (!sessionId) {
    return res.status(400).json({ error: "Session ID is required." });
  }

  try {
    let list;

    if (listName && !listId) {
      list = await prisma.breathworkList.create({
        data: {
          name: listName,
          userId: userId,
        },
      });
      console.log("New list created:", list);
    } else if (listId) {
      list = await prisma.breathworkList.findFirst({
        where: {
          id: listId,
          userId: userId,
        },
      });

      if (!list) {
        return res
          .status(404)
          .json({ error: "List not found or does not belong to the user." });
      }
      console.log("Using existing list:", list);
    }

    if (!list) {
      return res
        .status(400)
        .json({ error: "Either listName or listId must be provided." });
    }

    const sessionInList = await prisma.breathworkListsForSession.create({
      data: {
        trainingListId: list.id,
        sessionId: sessionId,
      },
    });

    res.status(200).json({
      message: "Session added to list successfully",
      list,
      sessionInList,
    });
  } catch (error) {
    console.error("Error adding session to list:", error);
    res.status(500).json({ error: "Failed to add session to list." });
  }
});

router.get("/fetch", verifyToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const lists = await prisma.breathworkList.findMany({
      where: {
        userId: userId,
      },
      include: {
        sessions: {
          include: {
            session: true,
          },
        },
      },
    });

    res.status(200).json({
      message: "User's lists and their sessions fetched successfully",
      lists,
    });
  } catch (error) {
    console.error("Error fetching user's lists:", error);
    res.status(500).json({ error: "Failed to fetch lists." });
  }
});

router.delete("/delete/:id", verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  try {
    // Cast the id to an integer because Prisma expects it to be an Int
    const playlistId = parseInt(id, 10);

    // Check if the list exists and belongs to the user
    const list = await prisma.breathworkList.findFirst({
      where: {
        id: playlistId, // Use the integer id
        userId: userId, // Ensure that the playlist belongs to the user
      },
    });

    if (!list) {
      return res
        .status(404)
        .json({ error: "List not found or does not belong to the user." });
    }

    // Delete the associated sessions in the breathworkListsForVideo table
    await prisma.breathworkListsForSession.deleteMany({
      where: {
        trainingListId: list.id,
      },
    });

    // Delete the playlist
    await prisma.breathworkList.delete({
      where: {
        id: list.id,
      },
    });

    res.status(200).json({ message: "Playlist deleted successfully." });
  } catch (error) {
    console.error("Error deleting playlist:", error);
    res.status(500).json({ error: "Failed to delete playlist." });
  }
});

module.exports = router;
