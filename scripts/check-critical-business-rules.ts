import {
  CertificationStatus,
  PrismaClient,
  RefundStatus,
  TutorDocumentStatus,
  TutorDocumentType,
} from "@prisma/client";
import { privateFileStorage } from "../src/lib/storage";

const prisma = new PrismaClient();

const schoolProofTypes = new Set<TutorDocumentType>([
  TutorDocumentType.STUDENT_CARD,
  TutorDocumentType.ENROLLMENT_PROOF,
]);

function isSchoolProof(type: TutorDocumentType) {
  return schoolProofTypes.has(type);
}

async function main() {
  const issues: Array<{ rule: string; count: number; details?: unknown }> = [];

  const profiles = await prisma.tutorProfile.findMany({
    where: {
      certificationStatus: {
        in: [CertificationStatus.APPROVED, CertificationStatus.PENDING],
      },
    },
    include: {
      verificationDocuments: true,
    },
  });

  const missingProofProfiles = [];
  for (const profile of profiles) {
    const expectedStatus =
      profile.certificationStatus === CertificationStatus.APPROVED
        ? TutorDocumentStatus.APPROVED
        : TutorDocumentStatus.SUBMITTED;
    const proofs = profile.verificationDocuments.filter(
      (document) =>
        isSchoolProof(document.type) && document.status === expectedStatus,
    );
    const readable = [];

    for (const proof of proofs) {
      if (await privateFileStorage.exists(proof.storageKey)) {
        readable.push(proof.id);
      }
    }

    if (readable.length === 0) {
      missingProofProfiles.push({
        tutorProfileId: profile.id,
        certificationStatus: profile.certificationStatus,
      });
    }
  }

  if (missingProofProfiles.length > 0) {
    issues.push({
      rule: "approved_or_pending_tutor_missing_required_school_proof",
      count: missingProofProfiles.length,
      details: missingProofProfiles,
    });
  }

  const orders = await prisma.order.findMany({
    where: {
      demandId: { not: null },
    },
    select: {
      id: true,
      demandId: true,
      tutorId: true,
      status: true,
    },
  });
  const bookingGroups = new Map<string, typeof orders>();

  for (const order of orders) {
    if (!order.demandId) {
      continue;
    }

    const key = `${order.demandId}:${order.tutorId}`;
    const group = bookingGroups.get(key) ?? [];
    group.push(order);
    bookingGroups.set(key, group);
  }

  const duplicateBookings = Array.from(bookingGroups.values()).filter(
    (group) => group.length > 1,
  );

  if (duplicateBookings.length > 0) {
    issues.push({
      rule: "duplicate_demand_tutor_bookings",
      count: duplicateBookings.length,
      details: duplicateBookings.map((group) => ({
        demandId: group[0]?.demandId,
        tutorId: group[0]?.tutorId,
        orderIds: group.map((order) => order.id),
        statuses: group.map((order) => order.status),
      })),
    });
  }

  const pendingRefundsMissingPreviousStatus = await prisma.refund.findMany({
    where: {
      status: RefundStatus.PENDING,
      previousOrderStatus: null,
      order: {
        status: "REFUND_REQUESTED",
      },
    },
    select: {
      id: true,
      orderId: true,
    },
  });

  if (pendingRefundsMissingPreviousStatus.length > 0) {
    issues.push({
      rule: "pending_refund_missing_previous_order_status",
      count: pendingRefundsMissingPreviousStatus.length,
      details: pendingRefundsMissingPreviousStatus,
    });
  }

  const payments = await prisma.payment.findMany({
    include: {
      order: {
        select: {
          totalAmount: true,
        },
      },
    },
  });
  const paymentAmountMismatches = payments.filter(
    (payment) => payment.amount !== payment.order.totalAmount,
  );

  if (paymentAmountMismatches.length > 0) {
    issues.push({
      rule: "payment_amount_not_equal_order_total_amount",
      count: paymentAmountMismatches.length,
      details: paymentAmountMismatches.map((payment) => ({
        paymentId: payment.id,
        orderId: payment.orderId,
        paymentAmount: payment.amount,
        orderTotalAmount: payment.order.totalAmount,
      })),
    });
  }

  const refunds = await prisma.refund.findMany({
    include: {
      order: {
        include: {
          payment: true,
        },
      },
    },
  });
  const refundAmountOverPayments = refunds.filter(
    (refund) =>
      refund.order.payment && refund.refundAmount > refund.order.payment.amount,
  );

  if (refundAmountOverPayments.length > 0) {
    issues.push({
      rule: "refund_amount_exceeds_payment_amount",
      count: refundAmountOverPayments.length,
      details: refundAmountOverPayments.map((refund) => ({
        refundId: refund.id,
        orderId: refund.orderId,
        refundAmount: refund.refundAmount,
        paymentAmount: refund.order.payment?.amount,
      })),
    });
  }

  console.log(`Critical business rule issues: ${issues.length}`);
  for (const issue of issues) {
    console.log(JSON.stringify(issue, null, 2));
  }

  if (issues.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("Failed to check critical business rules", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
