import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const videos = [
  {
    title: "Shoulder flex",
    url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    category: "Mobility",
    description: "A mobility exercise for the shoulders.",
    likes: 0,
    color: "#FF5733", // Optional, adjust as needed
  },
  {
    title: "Leg raises",
    url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    category: "Core",
    description: "Strengthen your core with leg raises.",
    likes: 0,
    color: "#33FF57", // Optional, adjust as needed
  },
  {
    title: "Chest pump",
    url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    category: "Strength",
    description: "A powerful chest workout.",
    likes: 0,
    color: "#3357FF", // Optional, adjust as needed
  },
  {
    title: "100 pull ups",
    url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    category: "Challenges",
    description: "A challenging 100 pull-ups workout.",
    likes: 0,
    color: "#FF33A1", // Optional, adjust as needed
  },
  {
    title: "Special Bruce",
    url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    category: "Bruce Lee",
    description: "Special workout inspired by Bruce Lee.",
    likes: 0,
    color: "#A133FF", // Optional, adjust as needed
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
