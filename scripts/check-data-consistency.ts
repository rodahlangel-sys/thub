import {
  PrismaClient,
  TutorDocumentStatus,
  TutorDocumentType,
} from "@prisma/client";
import {
  hasBlockingConsistencyIssues,
  type DataConsistencyReport,
} from "../src/lib/data-consistency";

const prisma = new PrismaClient();
const schoolProofTypes = new Set<TutorDocumentType>([
  TutorDocumentType.STUDENT_CARD,
  TutorDocumentType.ENROLLMENT_PROOF,
]);
const activeProofStatuses = new Set<TutorDocumentStatus>([
  TutorDocumentStatus.DRAFT,
  TutorDocumentStatus.SUBMITTED,
  TutorDocumentStatus.APPROVED,
]);

function countDuplicateGroups(keys: string[]) {
  const counts = new Map<string, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return Array.from(counts.values()).filter((count) => count > 1).length;
}

async function main() {
  const [orders, refunds, payments, documents, notifications] = await Promise.all([
    prisma.order.findMany({
      where: { demandId: { not: null } },
      select: { demandId: true, tutorId: true },
    }),
    prisma.refund.findMany({
      where: { status: "PENDING", order: { status: "REFUND_REQUESTED" } },
      select: { previousOrderStatus: true },
    }),
    prisma.payment.findMany({
      include: { order: { select: { totalAmount: true } } },
    }),
    prisma.tutorVerificationDocument.findMany({
      select: { tutorProfileId: true, type: true, status: true },
    }),
    prisma.notification.findMany({
      select: {
        userId: true,
        title: true,
        content: true,
        type: true,
        link: true,
        dedupeKey: true,
      },
    }),
  ]);

  const activeSchoolProofCounts = new Map<string, number>();
  const optionalProofCounts = new Map<string, number>();
  for (const document of documents) {
    if (schoolProofTypes.has(document.type)) {
      if (activeProofStatuses.has(document.status)) {
        activeSchoolProofCounts.set(
          document.tutorProfileId,
          (activeSchoolProofCounts.get(document.tutorProfileId) ?? 0) + 1,
        );
      }
    } else {
      optionalProofCounts.set(
        document.tutorProfileId,
        (optionalProofCounts.get(document.tutorProfileId) ?? 0) + 1,
      );
    }
  }

  const notificationDedupeKeys = notifications.flatMap((notification) =>
    notification.dedupeKey ? [notification.dedupeKey] : [],
  );
  const legacyPayloadKeys = notifications.map((notification) =>
    JSON.stringify([
      notification.userId,
      notification.title,
      notification.content,
      notification.type,
      notification.link,
    ]),
  );

  const report: DataConsistencyReport = {
    duplicateBookings: countDuplicateGroups(
      orders.map((order) => `${order.demandId}:${order.tutorId}`),
    ),
    pendingRefundsMissingPreviousStatus: refunds.filter(
      (refund) => !refund.previousOrderStatus,
    ).length,
    paymentAmountMismatches: payments.filter(
      (payment) => payment.amount !== payment.order.totalAmount,
    ).length,
    profilesWithMultipleActiveSchoolProofs: Array.from(
      activeSchoolProofCounts.values(),
    ).filter((count) => count > 1).length,
    profilesOverOptionalDocumentLimit: Array.from(optionalProofCounts.values()).filter(
      (count) => count > 5,
    ).length,
    duplicateNotificationDedupeKeys: countDuplicateGroups(notificationDedupeKeys),
    duplicateLegacyNotificationPayloads: countDuplicateGroups(legacyPayloadKeys),
  };

  console.log(JSON.stringify({ mode: "read-only", report }, null, 2));
  if (report.duplicateLegacyNotificationPayloads > 0) {
    console.warn(
      "Warning: identical legacy notification payload groups remain; review them before any deletion.",
    );
  }

  if (hasBlockingConsistencyIssues(report)) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("Data consistency check failed", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
