import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const videos = [
  {
    title: "Release anger",
    url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    category: "Fire",
    description: "To help manage feelings of irritation, frustration, or anger.",
    likes: 0,
    categories: ["Angry", "Stressed"],
  },
  {
    title: "Fighting depressed",
    url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    category: "Wind",
    description: "For those feeling downhearted or sorrowful.",
    likes: 0,
    categories: ["Depressed", "Sad"],
  },
  {
    title: "Anxious release",
    url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    category: "Water",
    description: "For those feeling nervous, worried, or experiencing anxiety.",
    likes: 0,
    categories: ["Anxious", "Unfocused"],
  },
  {
    title: "Evening breathwork",
    url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    category: "Earth",
    description: "Aimed at individuals under mental or emotional pressure.",
    likes: 0,
    categories: ["Tired", "Restless"],
  },
  {
    title: "Morning breathwork",
    url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    category: "Fire",
    description: "Designed for individuals feeling fatigued or lacking energy.",
    likes: 0,
    categories: ["Tired", "Stressed"],
  },
];

async function main() {
  console.log(`Start seeding videos...`);
  for (const video of videos) {
    const videoRecord = await prisma.video.create({
      data: video,
    });
    console.log(
      `Video with id: ${videoRecord.id} titled '${videoRecord.title}' added in '${videoRecord.category}' category.`
    );
  }
  console.log(`Seeding videos finished.`);
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
