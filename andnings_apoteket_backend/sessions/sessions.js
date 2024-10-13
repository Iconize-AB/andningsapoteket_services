const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const AWS = require('aws-sdk');
const router = require("express").Router();
const verifyToken = require("../authentication/verifyToken");
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
require('dotenv').config();

router.get("/recordings", verifyToken, async (req, res) => {
  console.log("category", req.query);
  try {
    const { category } = req.query;
    console.log("category", category);

    if (!category) {
      return res.status(400).json({ error: "Category is required." });
    }

    const sessions = await prisma.session.findMany({
      where: {
        category: category, // Matches the exact category
      },
    });

    // If no sessions are found, return an empty array
    if (!sessions.length) {
      return res
        .status(404)
        .json({ error: "No sessions found for the selected category." });
    }

    // Return the fetched sessions
    res.status(200).json({
        items: sessions,
        total: sessions.length,
      });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ error: "Failed to fetch sessions." });
  }
});

router.get("/recordings/by-condition", verifyToken, async (req, res) => {
  try {
    const { condition } = req.query;

    if (!condition) {
      return res.status(400).json({ error: "Condition is required." });
    }

    const sessions = await prisma.session.findMany({
      where: {
        categories: {
          array_contains: condition,
        },
      },
    });

    console.log('found sessions by condition:', sessions);

    if (!sessions.length) {
      return res.status(404).json({ error: "No sessions found with the selected condition." });
    }

    res.status(200).json({
      items: sessions,
      total: sessions.length,
    });
  } catch (error) {
    console.error("Error fetching sessions by condition:", error);
    res.status(500).json({ error: "Failed to fetch sessions by condition." });
  }
});

router.get("/most-watched", verifyToken, async (req, res) => {
  try {
    // Fetch the most-watched sessions, counting the number of watch events per session
    console.log('test');
    const mostWatchedSessions = await prisma.session.findMany({
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
    console.log('mostWatchedSessions', mostWatchedSessions);

    res.status(200).json({ sessions: mostWatchedSessions });
  } catch (error) {
    console.error("Error fetching most-watched sessions:", error);
    res.status(500).json({ error: "Failed to fetch most-watched sessions." });
  }
});

router.get('/unwatched-videos', verifyToken, async (req, res) => {
  const { userId } = req.user;

  try {
    const allSessions = await prisma.session.findMany({
      select: { id: true },
    });

    const watchedSessions = await prisma.sessionWatch.findMany({
      where: { userId: userId },
      select: { sessionId: true },
    });

    const allSessionIds = allSessions.map(session => session.id);
    const watchedSessionIds = watchedSessions.map(watch => watch.sessionId);

    const unwatchedSessionIds = allSessionIds.filter(id => !watchedSessionIds.includes(id));

    const unwatchedSessions = await prisma.session.findMany({
      where: {
        id: { in: unwatchedSessionIds }
      }
    });

    res.status(200).json({
      items: unwatchedSessions,
    });
  } catch (error) {
    console.error("Error fetching unwatched sessions:", error);
    res.status(500).json({ error: "Failed to fetch unwatched sessions." });
  }
});

router.get("/related-sessions", verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required." });
    }

    // Convert sessionId to an integer
    const sessionIdInt = parseInt(sessionId, 10);

    if (isNaN(sessionIdInt)) {
      return res.status(400).json({ error: "Invalid Session ID." });
    }

    // Fetch the original session to get its categories
    const originalSession = await prisma.session.findUnique({
      where: { id: sessionIdInt },
      select: { categories: true },
    });

    if (!originalSession) {
      return res.status(404).json({ error: "Session not found." });
    }

    // Find related sessions based on matching categories
    const relatedSessions = await prisma.session.findMany({
      where: {
        id: { not: sessionIdInt }, // Exclude the original session
        categories: {
          array_contains: originalSession.categories[0], // Match at least one category
        },
      },
      take: 5, // Limit the number of related sessions returned
    });

    res.status(200).json({
      items: relatedSessions,
      total: relatedSessions.length,
    });
  } catch (error) {
    console.error("Error fetching related sessions:", error);
    res.status(500).json({ error: "Failed to fetch related sessions." });
  }
});

router.get("/all", verifyToken, async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        categories: true,
      },
    });

    if (!sessions.length) {
      return res.status(404).json({ error: "No sessions found." });
    }

    res.status(200).json({
      items: sessions,
      total: sessions.length,
    });
  } catch (error) {
    console.error("Error fetching all sessions:", error);
    res.status(500).json({ error: "Failed to fetch sessions." });
  }
});

router.put("/update/:sessionId", verifyToken, async (req, res) => {
  const { sessionId } = req.params;
  const { title, categories } = req.body;

  try {
    // Convert sessionId to an integer
    const sessionIdInt = parseInt(sessionId, 10);

    // Check if the conversion resulted in a valid number
    if (isNaN(sessionIdInt)) {
      return res.status(400).json({ error: "Invalid session ID." });
    }

    // Prepare the update data
    const updateData = {};
    if (title !== undefined) {
      updateData.title = title;
    }
    if (categories !== undefined) {
      updateData.categories = Array.from(new Set(categories));
    }

    // Update the session
    const updatedSession = await prisma.session.update({
      where: { id: sessionIdInt },
      data: updateData,
    });

    res.status(200).json({
      message: "Session updated successfully",
      session: updatedSession,
    });
  } catch (error) {
    console.error("Error updating session:", error);
    res.status(500).json({ error: "Failed to update session." });
  }
});

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'eu-north-1'
});

const s3 = new AWS.S3();

router.post("/upload", verifyToken, upload.single('file'), async (req, res) => {
  try {
    const { title, description, category } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Upload file to S3
    const params = {
      Bucket: 'sessions',
      Key: `${category}/${Date.now()}-${file.originalname}`,
      Body: file.buffer,
      ContentType: file.mimetype
    };

    const s3UploadResult = await s3.upload(params).promise();

    // Create new session in database
    const newSession = await prisma.session.create({
      data: {
        title,
        description,
        category,
        fileUrl: s3UploadResult.Location,
        // Add other fields as necessary
      }
    });

    res.status(201).json({
      message: "Session uploaded successfully",
      session: newSession
    });

  } catch (error) {
    console.error("Error uploading session:", error);
    res.status(500).json({ error: "Failed to upload session" });
  }
});

module.exports = router;
