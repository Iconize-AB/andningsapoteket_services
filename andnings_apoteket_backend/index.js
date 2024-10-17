const express = require("express");
const cors = require("cors");
const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:3001',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true 
}));

app.use(express.json());
const PORT = process.env.PORT || 3000;

const userRouter = require("./users/users");
const profileRouter = require("./users/profile");
const onboardingRouter = require("./users/onboarding");
const settingsRouter = require("./users/settings");
const breathworkRouter = require("./sessions/sessions");
const statisticsRouter = require("./statistics/statistics");
const challengeRouter = require("./sessions/challenge/6_day_challenge");
const playlistsRouter = require("./playlists/playlists");
const libraryRouter = require("./library/library");
const supportRouter = require("./support/support");
const eventsRouter = require("./events/events");

// Add /v1 to all routes to indicate versioning
app.use("/v1/user", userRouter);
app.use("/v1/sessions", breathworkRouter);
app.use("/v1/profile", profileRouter);
app.use("/v1/challenge", challengeRouter);
app.use("/v1/settings", settingsRouter);
app.use("/v1/playlists", playlistsRouter);
app.use("/v1/library", libraryRouter);
app.use("/v1/support", supportRouter);
app.use("/v1/events", eventsRouter);
app.use("/v1/onboarding", onboardingRouter);
app.use("/v1/statistics", statisticsRouter);

app.get('/v1', (req, res) => {
  res.send('Hello, Andningsapoteket v1!');
});

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
