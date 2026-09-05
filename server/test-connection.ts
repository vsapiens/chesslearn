import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.game.count();
  console.log("Connection OK. Game count:", count);

  // Test insert
  const game = await prisma.game.create({
    data: {
      token: "test-" + Date.now(),
      mode: "bot",
      status: "waiting",
      botDifficulty: "medium",
      playerColor: "white",
      updatedAt: new Date(),
    },
  });
  console.log("Created test game:", game.id, "token:", game.token);

  // Test read
  const found = await prisma.game.findUnique({ where: { token: game.token } });
  console.log("Read back game:", found?.id, "status:", found?.status);

  // Clean up
  await prisma.game.delete({ where: { id: game.id } });
  console.log("Cleaned up test game");

  await prisma.$disconnect();
  console.log("All tests passed!");
}

main().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
