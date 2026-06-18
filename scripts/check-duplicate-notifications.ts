import { PrismaClient } from "@prisma/client";
import { analyzeDuplicateNotificationGroups } from "../src/lib/notification-history";

const prisma = new PrismaClient();

async function main() {
  const notifications = await prisma.notification.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const groups = analyzeDuplicateNotificationGroups(notifications);

  console.log(JSON.stringify({ mode: "read-only", groupCount: groups.length, groups }, null, 2));
}

main()
  .catch((error) => {
    console.error("Duplicate notification check failed", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
