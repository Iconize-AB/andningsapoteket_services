const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function createAdminUser() {
  try {
    const email = await askQuestion('Enter admin email: ');
    const firstName = await askQuestion('Enter admin first name: ');
    const lastName = await askQuestion('Enter admin last name: ');
    const password = await askQuestion('Enter admin password: ');
    const active = await askQuestion('Is the user active? (yes/no): ');

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        password: hashedPassword,
        role: 'ADMIN',
        active: active.toLowerCase() === 'yes',
        viewedOnBoarding: [],  // Assuming this is required and can be an empty array
      }
    });

    console.log(`Admin user created successfully:`);
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`First Name: ${user.firstName}`);
    console.log(`Last Name: ${user.lastName}`);
    console.log(`Full Name: ${user.fullName}`);
    console.log(`Role: ${user.role}`);
    console.log(`Active: ${user.active}`);
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

createAdminUser();