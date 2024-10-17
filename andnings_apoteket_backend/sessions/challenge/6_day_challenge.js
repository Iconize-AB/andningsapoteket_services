const { PrismaClient } = require("@prisma/client");
const verifyToken = require("../../authentication/verifyToken");
const prisma = new PrismaClient();
const router = require("express").Router();
require('dotenv').config();

router.get("/six-day-challenge", verifyToken, async (req, res) => {
  try {
    const challengeSessions = await prisma.challengeSession.findMany({
      include: {
        challenge: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
      },
      orderBy: [
        { challengeId: 'asc' },
        { day: 'asc' },
      ],
    });

    if (!challengeSessions.length) {
      return res.status(404).json({ error: "No challenge sessions found." });
    }

    // Group sessions by challenge
    const groupedSessions = challengeSessions.reduce((acc, session) => {
      if (!acc[session.challengeId]) {
        acc[session.challengeId] = {
          id: session.challenge.id,
          title: session.challenge.title,
          description: session.challenge.description,
          sessions: [],
        };
      }
      acc[session.challengeId].sessions.push({
        id: session.id,
        title: session.title,
        description: session.description,
        longDescription: session.longDescription,
        sessionUrl: session.sessionUrl,
        audioUrl: session.audioUrl,
        duration: session.duration,
        day: session.day,
      });
      return acc;
    }, {});

    const challenges = Object.values(groupedSessions);

    res.status(200).json({
      challenges: challenges,
      total: challenges.length,
    });
  } catch (error) {
    console.error("Error fetching 6-day challenge sessions:", error);
    res.status(500).json({ error: "Failed to fetch 6-day challenge sessions." });
  }
});

module.exports = router;
