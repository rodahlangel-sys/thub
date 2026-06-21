import { prisma } from "../src/lib/prisma";

const expected = {
  User: 33,
  ParentProfile: 8,
  TutorProfile: 24,
  TutorVerificationDocument: 2,
  Demand: 16,
  Order: 19,
  Payment: 14,
  Refund: 4,
  LessonFeedback: 6,
  Review: 5,
  Settlement: 5,
  Notification: 18,
} as const;

async function main() {
  const counts = {
    User: await prisma.user.count(),
    ParentProfile: await prisma.parentProfile.count(),
    TutorProfile: await prisma.tutorProfile.count(),
    TutorVerificationDocument: await prisma.tutorVerificationDocument.count(),
    Demand: await prisma.demand.count(),
    Order: await prisma.order.count(),
    Payment: await prisma.payment.count(),
    Refund: await prisma.refund.count(),
    LessonFeedback: await prisma.lessonFeedback.count(),
    Review: await prisma.review.count(),
    Settlement: await prisma.settlement.count(),
    Notification: await prisma.notification.count(),
  };
  const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const matchesExpected = Object.entries(expected).every(
    ([table, count]) => counts[table as keyof typeof counts] === count,
  );
  console.log(
    JSON.stringify({
      mode: "prisma-client-read-only",
      matchesExpected,
      totalRecords,
      counts,
    }),
  );
  if (!matchesExpected || totalRecords !== 154) process.exitCode = 1;
}

main()
  .catch(() => {
    console.error(JSON.stringify({ ok: false, category: "prisma-read-check" }));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
