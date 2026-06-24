const prisma = require('./src/prisma');

async function main() {
  const prob = await prisma.problem.findFirst({
    where: { slug: 'two-sum-problem' },
    include: { testCases: true }
  });
  console.log("TWO SUM PROBLEM DETAILS:");
  console.log(JSON.stringify(prob, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
