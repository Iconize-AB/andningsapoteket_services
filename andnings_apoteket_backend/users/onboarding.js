const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient;
const verifyToken = require('../authentication/verifyToken'); // JWT middleware to verify users

// Onboarding Flow Completion Endpoint
router.put("/complete-onboarding-step", verifyToken, async (req, res) => {
  const { step } = req.body; // Step type sent from frontend, e.g., "welcome", "goals", "focus"

  const validSteps = [
    "welcome",
    "goals",
    "focus",
    "customize_practice",
    "personalize_experience",
    "customize_settings",
    "premium_upgrade",
    "ready_to_begin"
  ];

  // Check if the provided step is valid
  if (!validSteps.includes(step)) {
    return res.status(400).json({ error: "Invalid onboarding step." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // If the step is already completed, return without adding it again
    if (user.viewedOnBoarding.includes(step)) {
      return res.status(200).json({
        message: `${step} step is already marked as completed.`,
        viewedOnBoarding: user.viewedOnBoarding,
      });
    }

    // Update the viewedOnBoarding array by adding the new step
    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        viewedOnBoarding: {
          set: [...user.viewedOnBoarding, step], // Append the step to the array
        },
      },
    });

    res.status(200).json({
      message: `${step} step has been marked as completed.`,
      viewedOnBoarding: updatedUser.viewedOnBoarding,
    });
  } catch (error) {
    console.error("Failed to update onboarding step:", error);
    res.status(500).json({ error: "Failed to update onboarding step." });
  }
});

module.exports = router;
