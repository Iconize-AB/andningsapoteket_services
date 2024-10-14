const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const sgMail = require('@sendgrid/mail');
require('dotenv').config();
const verifyAppleToken = require('../authentication/verifyApple');
const verifyToken = require('../authentication/verifyToken');
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
  console.log('email', email);
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    
    // Set expiration time to 5 minutes from now
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 5);
    console.log('expirationTime', expirationTime);

    await prisma.user.update({
      where: { email: email.toString() },
      data: {
        resetCode: verificationCode.toString(),
        resetCodeExpiry: expirationTime.toISOString(), // Ensure date is stored in ISO format
      },
    });

    const msg = {
      to: email,  // Use the correct email variable here
      from: 'support@iconize-earth.com',
      subject: 'Verify your email for Andningsapoteket',
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
  console.log('email', email, newPassword);
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

  console.log('email', email, code);

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    console.log('user', user);

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
    console.error('Verification error:', error);
    res.status(500).json({ error: "Verification failed." });
  }
});

router.post('/register', async (req, res) => {
  const { email, password, appleIdToken } = req.body;

  try {
    let emailFromApple;

    if (appleIdToken) {
      const applePayload = await verifyAppleToken(appleIdToken);
      console.log('applePayload', applePayload);
      if (!applePayload || !applePayload.email) {
        return res.status(400).json({ error: 'Invalid Apple ID token.' });
      }
      emailFromApple = applePayload.email;
    }

    const userEmail = appleIdToken ? emailFromApple : email.toLowerCase();

    console.log('appleIdToken', appleIdToken);

    // Check if the email already exists in the database
    const existingUser = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    console.log('existingUser', existingUser);

    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists.' });
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
    const token = jwt.sign({ userId: user.id }, 'secret', { expiresIn: '180d' });

    // Generate a random verification code (6-digit)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Update the user with the verification code
    await prisma.user.update({
      where: { id: user.id },
      data: { verificationCode },
    });

    // Send the verification code via email using SendGrid
    const msg = {
      to: userEmail,
      from: 'support@iconize-earth.com',
      subject: 'Verify your email for Andningsapoteket',
      text: `Your verification code is: ${verificationCode}`,
      html: `<strong>Your verification code is: ${verificationCode}</strong>`,
    };

    await sgMail.send(msg);

    return res.status(200).json({ message: 'Verification email sent.', token });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'User could not be created.' });
  }
});

router.delete("/delete-user", verifyToken, async (req, res) => {
  const { userId } = req.body;
  console.log('userId', userId);
  
  try {
    const userIdParsed = parseInt(userId);

    await prisma.batch.deleteMany({
      where: {
        OR: [
          { followedUserId: userIdParsed },
          { followingUserId: userIdParsed }
        ]
      },
    });
    console.log("Deleted related batches");

    try {
      await prisma.favoriteSession.deleteMany({
        where: { userId: userIdParsed },
      });
      console.log("Deleted favoriteSession");
    } catch (error) {
      console.log("No favorite sessions to delete or error:", error);
    }

    try {
      await prisma.userCategories.deleteMany({
        where: { userId: userIdParsed },
      });
      console.log("Deleted userCategories");
    } catch (error) {
      console.log("No user categories to delete or error:", error);
    }

    try {
      await prisma.savedSessionList.deleteMany({
        where: { userId: userIdParsed },
      });
      console.log("Deleted savedSessionList");
    } catch (error) {
      console.log("No saved session lists to delete or error:", error);
    }

    try {
      await prisma.diaryEntry.deleteMany({
        where: { userId: userIdParsed },
      });
      console.log("Deleted diaryEntry");
    } catch (error) {
      console.log("No diary entries to delete or error:", error);
    }

    try {
      await prisma.userSessionRating.deleteMany({
        where: { userId: userIdParsed },
      });
      console.log("Deleted userSessionRating");
    } catch (error) {
      console.log("No session ratings to delete or error:", error);
    }

    try {
      await prisma.sessionComment.deleteMany({
        where: { userId: userIdParsed },
      });
      console.log("Deleted sessionComment");
    } catch (error) {
      console.log("No session comments to delete or error:", error);
    }

    try {
      await prisma.breathworkList.deleteMany({
        where: { userId: userIdParsed },
      });
      console.log("Deleted breathworkList");
    } catch (error) {
      console.log("No breathwork lists to delete or error:", error);
    }

    try {
      await prisma.eventTracking.deleteMany({
        where: { userId: userIdParsed },
      });
      console.log("Deleted eventTracking");
    } catch (error) {
      console.log("No event tracking to delete or error:", error);
    }

    // Delete records from sessionWatch table
    try {
      await prisma.sessionWatch.deleteMany({
        where: { userId: userIdParsed },
      });
      console.log("Deleted sessionWatch records");
    } catch (error) {
      console.log("No session watch records to delete or error:", error);
    }

    try {
      await prisma.libraryForSession.deleteMany({
        where: {
          library: {
            userId: userIdParsed,
          },
        },
      });
      console.log("Deleted libraryForSession records");
    } catch (error) {
      console.log("No libraryForSession records to delete or error:", error);
    }

    // Delete records from Library table
    try {
      await prisma.library.delete({
        where: {
          userId: userIdParsed,
        },
      });
      console.log("Deleted Library records");
    } catch (error) {
      console.log("No Library records to delete or error:", error);
    }

    // Delete the user profile
    try {
      await prisma.profile.delete({
        where: { userId: userIdParsed },
      });
      console.log("Deleted user profile");
    } catch (error) {
      if (error.code === 'P2025') {
        console.log("Profile not found, skipping deletion");
      } else {
        console.log("Error deleting profile:", error);
      }
    }

    // Finally delete the user
    const deletedUser = await prisma.user.delete({
      where: { id: userIdParsed },
    });

    if (!deletedUser) {
      return res.status(404).json({ error: "User not found." });
    }

    res.status(200).json({ message: "User and all related data deleted successfully." });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user." });
  }
});

router.get('/all', verifyToken, async (req, res) => {
  try {    
    // Fetch the full user details from the database
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
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
      message: 'Users fetched successfully',
      users: users,
      total: users.length,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

module.exports = router;