const express = require("express");
const app = express();

app.use(express.json());
const PORT = process.env.PORT || 3000;
const userRouter = require("./users/users");
const profileRouter = require("./users/profile");
const onboardingRouter = require("./users/onboarding");
const settingsRouter = require("./users/settings");
const breathworkRouter = require("./breathwork/breathwork");
const playlistsRouter = require("./playlists/playlists");
const eventsRouter = require("./events/events");

app.use("/userRoute", userRouter);
app.use("/breathworkRoute", breathworkRouter);
app.use("/profileRoute", profileRouter);
app.use("/settingsRoute", settingsRouter);
app.use("/playlistsRoute", playlistsRouter);
app.use("/eventsRoute", eventsRouter);
app.use("/onboardingRoute", onboardingRouter);

app.get('/', (req, res) => {
  res.send('Hello, Andningsapoteket!');
});

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
