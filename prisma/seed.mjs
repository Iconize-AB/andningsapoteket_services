import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const sixDayChallenge = {
  title: "6-Day Breathing Challenge",
  description: "Improve your breathing techniques over 6 days with guided sessions.",
  sessions: [
    {
      title: "Day 1: Introduction to Breathwork",
      description: "Learn the basics of breathwork and its benefits.",
      longDescription: "In this introductory session, we'll cover the fundamentals of breathwork, its numerous health benefits, and prepare you for the journey ahead. You'll learn about the importance of proper breathing and how it affects your overall well-being.",
      sessionUrl: "https://example.com/day1-video",
      audioUrl: "https://example.com/day1-audio",
      duration: 1800, // 30 minutes
      day: 1
    },
    {
      title: "Day 2: Diaphragmatic Breathing",
      description: "Master the technique of diaphragmatic breathing.",
      longDescription: "Today we focus on diaphragmatic breathing, also known as belly breathing. This technique helps you use your diaphragm correctly while breathing, leading to more efficient oxygen exchange and reduced stress. We'll practice this technique and discuss its applications in daily life.",
      sessionUrl: "https://example.com/day2-video",
      audioUrl: "https://example.com/day2-audio",
      duration: 2400, // 40 minutes
      day: 2
    },
    {
      title: "Day 3: Box Breathing for Stress Relief",
      description: "Learn and practice box breathing to manage stress.",
      longDescription: "On day 3, we introduce box breathing, a powerful technique for stress relief and improved focus. You'll learn how to inhale, hold, exhale, and hold again in equal counts, creating a 'box' pattern. We'll explore how this technique can be used in various situations to promote calmness and clarity.",
      sessionUrl: "https://example.com/day3-video",
      audioUrl: "https://example.com/day3-audio",
      duration: 2700, // 45 minutes
      day: 3
    },
    {
      title: "Day 4: Alternate Nostril Breathing",
      description: "Explore alternate nostril breathing for balance and harmony.",
      longDescription: "Today's session focuses on alternate nostril breathing, a technique that helps balance the left and right hemispheres of the brain. You'll learn how to perform this practice safely and effectively, and we'll discuss its benefits for mental clarity, stress reduction, and overall well-being.",
      sessionUrl: "https://example.com/day4-video",
      audioUrl: "https://example.com/day4-audio",
      duration: 3000, // 50 minutes
      day: 4
    },
    {
      title: "Day 5: Breath Retention and CO2 Tolerance",
      description: "Practice breath retention to increase CO2 tolerance.",
      longDescription: "On day 5, we delve into more advanced techniques with breath retention exercises. You'll learn how to safely hold your breath to increase CO2 tolerance, which can lead to improved breathing efficiency and reduced anxiety. We'll also discuss the science behind this practice and its potential benefits.",
      sessionUrl: "https://example.com/day5-video",
      audioUrl: "https://example.com/day5-audio",
      duration: 3300, // 55 minutes
      day: 5
    },
    {
      title: "Day 6: Integrating Breathwork into Daily Life",
      description: "Learn how to incorporate breathwork techniques into your daily routine.",
      longDescription: "In our final session, we'll recap all the techniques learned throughout the challenge and focus on how to integrate them into your daily life. You'll create a personalized breathwork plan and learn strategies for maintaining your practice. We'll also explore how breathwork can support various aspects of your life, from sleep to exercise to emotional regulation.",
      sessionUrl: "https://example.com/day6-video",
      audioUrl: "https://example.com/day6-audio",
      duration: 3600, // 60 minutes
      day: 6
    },
  ]
};

async function main() {  
  console.log(`Start seeding 6-Day Challenge...`);
  const challenge = await prisma.sixDayChallenge.create({
    data: {
      title: sixDayChallenge.title,
      description: sixDayChallenge.description,
    }
  });

  for (const sessionData of sixDayChallenge.sessions) {
    const session = await prisma.challengeSession.create({
      data: {
        ...sessionData,
        challengeId: challenge.id
      }
    });
    console.log(`Session for Day ${session.day} added with id: ${session.id}`);
  }
  console.log(`6-Day Challenge with id: ${challenge.id} titled '${challenge.title}' added.`);
  console.log(`Seeding 6-Day Challenge finished.`);
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
