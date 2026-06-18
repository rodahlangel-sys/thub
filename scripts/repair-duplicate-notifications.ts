import { PrismaClient } from "@prisma/client";
import { analyzeDuplicateNotificationGroups } from "../src/lib/notification-history";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

// A group is added only after an audit proves every row belongs to one event.
// The current two legacy groups lack an event-instance identifier, so none are approved.
const confirmedDuplicateGroupIds = new Set<string>();

async function main() {
  const notifications = await prisma.notification.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const groups = analyzeDuplicateNotificationGroups(notifications);
  const confirmed = groups.filter((group) => confirmedDuplicateGroupIds.has(group.groupId));

  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        confirmedGroupCount: confirmed.length,
        retainedGroupCount: groups.length - confirmed.length,
        plan: confirmed.map((group) => ({
          groupId: group.groupId,
          keepId: group.records[0]?.id,
          deleteIds: group.records.slice(1).map((record) => record.id),
        })),
      },
      null,
      2,
    ),
  );

  if (!apply || confirmed.length === 0) return;

  await prisma.$transaction(async (tx) => {
    for (const group of confirmed) {
      const keep = group.records[0];
      if (!keep) continue;

      await tx.notification.update({
        where: { id: keep.id },
        data: { dedupeKey: `legacy:${group.groupId}:${group.userId}` },
      });
      await tx.notification.deleteMany({
        where: { id: { in: group.records.slice(1).map((record) => record.id) } },
      });
    }
  });
}

main()
  .catch((error) => {
    console.error("Duplicate notification repair failed", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
