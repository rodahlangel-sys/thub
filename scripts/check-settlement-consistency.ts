import { PrismaClient } from "@prisma/client";
import {
  evaluateHistoricalSettlementCandidate,
  type HistoricalSettlementCandidate,
} from "../src/lib/historical-settlements";
import {
  calculateSettlementAmounts,
  createMockSettlementTransactionNo,
} from "../src/lib/settlements";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

type OrderRecord = Awaited<ReturnType<typeof loadOrders>>[number];

function loadOrders() {
  return prisma.order.findMany({
    include: {
      parent: { select: { role: true } },
      tutor: { select: { role: true } },
      payment: true,
      settlement: true,
      refunds: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

function toCandidate(order: OrderRecord): HistoricalSettlementCandidate {
  return {
    orderId: order.id,
    status: order.status,
    totalAmountFen: order.totalAmount,
    platformFeeRateBps: order.platformFeeRateBps,
    platformFeeAmountFen: order.platformFeeAmountFen,
    tutorNetAmountFen: order.tutorNetAmountFen,
    parentRole: order.parent.role,
    tutorRole: order.tutor.role,
    paymentStatus: order.payment?.status ?? null,
    paymentAmountFen: order.payment?.amount ?? null,
    refundStatuses: order.refunds.map((refund) => refund.status),
    hasSettlement: Boolean(order.settlement),
  };
}

function validateExistingSettlement(order: OrderRecord) {
  if (!order.settlement) return [];
  const issues: string[] = [];
  const expected = calculateSettlementAmounts(
    order.settlement.grossAmountFen,
    order.settlement.platformFeeRateBps,
  );

  if (order.status !== "COMPLETED") issues.push("SETTLED_ORDER_NOT_COMPLETED");
  if (order.payment?.status !== "PAID") issues.push("SETTLED_ORDER_PAYMENT_NOT_PAID");
  if (order.payment?.amount !== order.settlement.grossAmountFen) {
    issues.push("SETTLEMENT_PAYMENT_AMOUNT_MISMATCH");
  }
  if (order.totalAmount !== order.settlement.grossAmountFen) {
    issues.push("SETTLEMENT_ORDER_AMOUNT_MISMATCH");
  }
  if (
    order.settlement.platformFeeRateBps !== 500 ||
    order.settlement.platformFeeAmountFen !== expected.platformFeeAmountFen ||
    order.settlement.tutorNetAmountFen !== expected.tutorNetAmountFen
  ) {
    issues.push("SETTLEMENT_FEE_MISMATCH");
  }
  if (order.refunds.some((refund) => refund.status === "APPROVED")) {
    issues.push("REFUNDED_ORDER_HAS_SETTLEMENT");
  }
  if (!order.settlement.transactionNo?.startsWith("MOCK-")) {
    issues.push("INVALID_MOCK_TRANSACTION_NUMBER");
  }

  return issues;
}

async function main() {
  const orders = await loadOrders();
  const missing = orders.filter(
    (order) => order.status === "COMPLETED" && !order.settlement,
  );
  const evaluated = missing.map((order) => ({
    order,
    result: evaluateHistoricalSettlementCandidate(toCandidate(order)),
  }));
  const eligible = evaluated.filter((item) => item.result.eligible);
  const skipped = evaluated.filter((item) => !item.result.eligible);
  const existingIssues = orders.flatMap((order) =>
    validateExistingSettlement(order).map((reason) => ({ orderId: order.id, reason })),
  );

  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        counts: {
          completedWithoutSettlement: missing.length,
          eligible: eligible.length,
          skipped: skipped.length,
          existingSettlementIssues: existingIssues.length,
        },
        eligible: eligible.map(({ order, result }) => ({
          orderId: order.id,
          grossAmountFen: result.amounts?.grossAmountFen,
          platformFeeRateBps: result.amounts?.platformFeeRateBps,
          platformFeeAmountFen: result.amounts?.platformFeeAmountFen,
          tutorNetAmountFen: result.amounts?.tutorNetAmountFen,
          settledAtRule: "ORDER_UPDATED_AT_AS_HISTORICAL_COMPLETION_TIME",
        })),
        skipped: skipped.map(({ order, result }) => ({
          orderId: order.id,
          reasons: result.reasons,
        })),
        existingSettlementIssues: existingIssues,
      },
      null,
      2,
    ),
  );

  if (existingIssues.length > 0) process.exitCode = 1;
  if (!apply) return;

  if (process.env.NODE_ENV === "production" || process.env.DATABASE_URL !== "file:./dev.db") {
    throw new Error("Historical settlement apply is restricted to the local development database");
  }

  let created = 0;
  const applySkips: Array<{ orderId: string; reasons: string[] }> = [];
  for (const item of eligible) {
    await prisma.$transaction(async (tx) => {
      const latest = await tx.order.findUnique({
        where: { id: item.order.id },
        include: {
          parent: { select: { role: true } },
          tutor: { select: { role: true } },
          payment: true,
          settlement: true,
          refunds: true,
        },
      });
      if (!latest) {
        applySkips.push({ orderId: item.order.id, reasons: ["ORDER_NOT_FOUND"] });
        return;
      }

      const result = evaluateHistoricalSettlementCandidate(toCandidate(latest));
      if (!result.eligible || !result.amounts) {
        applySkips.push({ orderId: latest.id, reasons: result.reasons });
        return;
      }

      await tx.settlement.create({
        data: {
          orderId: latest.id,
          tutorId: latest.tutorId,
          provider: "MOCK",
          status: "SETTLED",
          ...result.amounts,
          transactionNo: createMockSettlementTransactionNo(),
          settledAt: latest.updatedAt,
        },
      });
      created += 1;
    });
  }

  console.log(JSON.stringify({ applied: { created, skipped: applySkips.length, applySkips } }, null, 2));
}

main()
  .catch((error) => {
    console.error("Settlement consistency check failed", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
