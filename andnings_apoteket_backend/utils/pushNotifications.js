const { Expo } = require('expo-server-sdk');

const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
});

async function sendPushNotification(
  pushToken,
  title,
  message,
  additionalData = {}
) {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`Push token ${pushToken} is not a valid Expo push token`);
    return;
  }

  const messages = [
    {
      to: pushToken,
      sound: "default",
      title: title,
      body: message,
      data: { ...additionalData },
      _displayInForeground: true, // Ensure the notification is displayed in the foreground
    },
  ];

  console.log("messages", messages);

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];
  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log(ticketChunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error(error);
    }
  }

  return tickets;
}

module.exports = { sendPushNotification };
