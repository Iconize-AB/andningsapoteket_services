const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const sgMail = require("@sendgrid/mail");
require("dotenv").config();
const verifyAppleToken = require("../authentication/verifyApple");
const verifyToken = require("../authentication/verifyToken");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const router = express.Router();

router.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) return res.status(404).json({ error: "User not found." });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.status(400).json({ error: "Invalid password." });

    const token = jwt.sign({ userId: user.id }, "secret", {
      expiresIn: "180d",
    });

    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ error: "Authentication failed." });
  }
});

router.post("/request-reset", async (req, res) => {
  const { email } = req.body;
  console.log("email", email);
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    console.log("user", user);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000);

    // Set expiration time to 5 minutes from now
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 5);
    console.log("expirationTime", expirationTime);

    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: {
        resetCode: verificationCode.toString(),
        resetCodeExpiry: expirationTime.toISOString(), // Ensure date is stored in ISO format
      },
    });

    const msg = {
      to: email, // Use the correct email variable here
      from: "support@iconize-earth.com",
      subject: "Verify your email for Andningsapoteket",
      text: `Your verification code is: ${verificationCode}`,
      html: `<strong>Your verification code is: ${verificationCode}</strong>`,
    };

    await sgMail.send(msg);
    res.status(200).json({ message: "Verification code sent." });
  } catch (error) {
    console.error("Request reset error:", error);
    res.status(500).json({ error: "Failed to send verification code." });
  }
});

router.post("/set-new-password", async (req, res) => {
  const { email, newPassword } = req.body;
  console.log("email", email, newPassword);
  if (!newPassword || newPassword.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters long." });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email: email },
      data: { password: hashedPassword },
    });
    res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Failed to set new password:", error);
    res.status(500).json({ error: "Failed to update password." });
  }
});

router.post("/verify-reset-code", async (req, res) => {
  const { email, code } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (
      !user ||
      !user.resetCode ||
      new Date() > new Date(user.resetCodeExpiry)
    ) {
      return res.status(400).json({ error: "Invalid or expired code." });
    }

    if (user.resetCode !== code) {
      return res.status(400).json({ error: "Incorrect code." });
    }

    await prisma.user.update({
      where: { email: email },
      data: {
        resetCode: null,
        resetCodeExpiry: null,
      },
    });

    res.status(200).json({ message: "Code successful!" });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ error: "Failed to verify code." });
  }
});

router.post("/verify-code", async (req, res) => {
  const { email, code } = req.body;

  console.log("email", email, code);

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    console.log("user", user);

    if (!user) return res.status(404).json({ error: "User not found." });

    // Compare the entered code with the stored code
    if (user.verificationCode !== code) {
      return res.status(400).json({ error: "Invalid verification code." });
    }

    // Clear the verification code after successful login
    await prisma.user.update({
      where: { id: user.id },
      data: { verificationCode: null, active: true },
    });

    // Generate a JWT token for the user
    const token = jwt.sign({ userId: user.id }, "secret", {
      expiresIn: "180d",
    });

    res.status(200).json({ message: "Login successful.", token });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ error: "Verification failed." });
  }
});

router.post("/register", async (req, res) => {
  const { email, password, appleIdToken } = req.body;

  try {
    let emailFromApple;

    if (appleIdToken) {
      const applePayload = await verifyAppleToken(appleIdToken);
      console.log("applePayload", applePayload);
      if (!applePayload || !applePayload.email) {
        return res.status(400).json({ error: "Invalid Apple ID token." });
      }
      emailFromApple = applePayload.email;
    }

    const userEmail = appleIdToken ? emailFromApple : email.toLowerCase();

    console.log("appleIdToken", appleIdToken);

    // Check if the email already exists in the database
    const existingUser = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    console.log("existingUser", existingUser);

    if (existingUser) {
      return res.status(400).json({ error: "Email already exists." });
    }

    // If not Apple sign-in, hash the password before storing it in the database
    let hashedPassword = null;
    if (!appleIdToken && password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Create the user in the database
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        password: hashedPassword, // Will be null for Apple Sign-In users
        active: false,
        subscriptionType: "freemium",
        profile: {
          create: {
            pushNotifications: true,
            emailNotifications: true,
            acceptedTermsAndConditions: false,
            ratingFunction: false,
          },
        },
      },
      include: {
        profile: true, // Include profile data in the user object
      },
    });

    // Generate a JWT token for the user
    const token = jwt.sign({ userId: user.id }, "secret", {
      expiresIn: "180d",
    });

    // Generate a random verification code (6-digit)
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // Update the user with the verification code
    await prisma.user.update({
      where: { id: user.id },
      data: { verificationCode },
    });

    // Send the verification code via email using SendGrid
    const msg = {
      to: userEmail,
      from: "support@iconize-earth.com",
      subject: "Verify your email for Andningsapoteket",
      text: `Your verification code is: ${verificationCode}`,
      html: `<strong>Your verification code is: ${verificationCode}</strong>`,
    };

    await sgMail.send(msg);

    return res.status(200).json({ message: "Verification email sent.", token });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "User could not be created." });
  }
});

router.delete("/delete-user", verifyToken, async (req, res) => {
  const { userId } = req.body;
  console.log("userId", userId);

  try {
    const userIdParsed = parseInt(userId);

    await prisma.$transaction(async (prisma) => {
      // Delete related records first
      await prisma.sessionLike.deleteMany({ where: { userId: userIdParsed } });
      await prisma.batch.deleteMany({
        where: {
          OR: [
            { followedUserId: userIdParsed },
            { followingUserId: userIdParsed },
          ],
        },
      });
      await prisma.savedSessionList.deleteMany({
        where: { userId: userIdParsed },
      });
      await prisma.diaryEntry.deleteMany({ where: { userId: userIdParsed } });
      await prisma.userSessionRating.deleteMany({
        where: { userId: userIdParsed },
      });
      await prisma.sessionComment.deleteMany({
        where: { userId: userIdParsed },
      });
      await prisma.eventTracking.deleteMany({
        where: { userId: userIdParsed },
      });
      await prisma.sessionWatch.deleteMany({ where: { userId: userIdParsed } });

      // Delete favoriteSession and userCategories if they exist
      if (prisma.favoriteSession) {
        await prisma.favoriteSession.deleteMany({
          where: { userId: userIdParsed },
        });
      }
      if (prisma.userCategories) {
        await prisma.userCategories.deleteMany({
          where: { userId: userIdParsed },
        });
      }

      // Delete BreathworkListsForSession records
      await prisma.breathworkListsForSession.deleteMany({
        where: {
          trainingList: {
            userId: userIdParsed,
          },
        },
      });

      // Delete BreathworkList
      await prisma.breathworkList.deleteMany({
        where: { userId: userIdParsed },
      });

      // Delete Library and related records
      const library = await prisma.library.findUnique({
        where: { userId: userIdParsed },
      });

      if (library) {
        await prisma.libraryForSession.deleteMany({
          where: { libraryId: library.id },
        });
        await prisma.library.delete({
          where: { id: library.id },
        });
      }

      // Delete user profile
      try {
        await prisma.profile.delete({
          where: { userId: userIdParsed },
        });
      } catch (error) {
        if (error.code !== "P2025") {
          throw error;
        }
      }

      // Finally delete the user
      await prisma.user.delete({
        where: { id: userIdParsed },
      });
    });

    res
      .status(200)
      .json({ message: "User and all related data deleted successfully." });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user." });
  }
});

router.get("/all", verifyToken, async (req, res) => {
  try {
    // Fetch the full user details from the database
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Access denied. Admin privileges required." });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
        fullName: true,
        active: true,
        subscriptionType: true,
        language: true,
        phoneNumber: true,
        lastActive: true,
      },
    });

    res.status(200).json({
      message: "Users fetched successfully",
      users: users,
      total: users.length,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

router.post("/update-help-options", verifyToken, async (req, res) => {
  const { userId } = req.user;
  const { selectedOptions } = req.body;

  try {
    if (!Array.isArray(selectedOptions) || selectedOptions.length > 3 || selectedOptions.length === 0) {
      return res.status(400).json({ error: "Please provide 1-3 valid options." });
    }

    // Update user's help options
    await prisma.user.update({
      where: { id: userId },
      data: { helpOptions: selectedOptions },
    });

    // Generate content based on selected options
    const content = generateContentForOptions(selectedOptions);

    res.status(200).json({ 
      message: "Help options updated successfully.", 
      content: content 
    });
  } catch (error) {
    console.error("Error updating help options:", error);
    res.status(500).json({ error: "Failed to update help options." });
  }
});

function generateContentForOptions(options) {
  const contentMap = {
    'Minska ångest': "Andningsövningar kan hjälpa dig att minska ångest genom att aktivera ditt parasympatiska nervsystem, vilket lugnar kroppen och sinnet.",
    'Minska stress': "Regelbunden andningsträning kan sänka stressnivåerna i kroppen genom att minska produktionen av stresshormoner som kortisol.",
    'Slappna av': "Djupandning är en effektiv teknik för att slappna av, då det sänker hjärtfrekvensen och blodtrycket.",
    'Sluta övertänka': "Fokuserad andning kan hjälpa dig att bryta cykeln av överdrivet tänkande genom att förankra dig i nuet.",
    'Hantera ilska': "Andningsövningar kan ge dig tid att lugna ner dig och tänka klarare när du känner dig arg, vilket förbättrar din emotionella kontroll.",
    'Bli fokuserad': "Kontrollerad andning ökar syretillförseln till hjärnan, vilket kan förbättra din koncentration och mentala skärpa.",
    'Hantera oro': "Andningstekniker kan hjälpa dig att hantera oro genom att skifta ditt fokus från oroande tankar till din andning.",
    'Bli piggare': "Vissa andningsövningar kan öka din energinivå genom att stimulera ditt sympatiska nervsystem och förbättra syresättningen i kroppen."
  };

  return options.map(option => ({
    option: option,
    content: contentMap[option]
  }));
}

module.exports = router;
