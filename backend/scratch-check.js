const prisma = require('./src/prisma');

async function run() {
  const users = await prisma.user.findMany();
  console.log("USERS:", JSON.stringify(users, null, 2));
  process.exit(0);
}
run().catch(console.error);
