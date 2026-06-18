import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type DuplicateGroup = {
  demandId: string;
  tutorId: string;
  orders: Array<{
    id: string;
    status: string;
    paymentStatus: string | null;
    createdAt: Date;
  }>;
};

const statusRank: Record<string, number> = {
  COMPLETED: 90,
  REFUNDED: 80,
  PENDING_PARENT_CONFIRM: 70,
  IN_PROGRESS: 60,
  ESCROWED: 50,
  PENDING_PAYMENT: 40,
  PENDING_TUTOR_CONFIRM: 30,
  REFUND_REQUESTED: 20,
  CANCELLED: 10,
};

function isApplyRun() {
  return process.argv.includes("--apply");
}

function canCancelAsDuplicate(order: { status: string; paymentStatus: string | null }) {
  return (
    (order.status === "PENDING_TUTOR_CONFIRM" ||
      order.status === "PENDING_PAYMENT" ||
      order.status === "CANCELLED") &&
    order.paymentStatus !== "PAID" &&
    order.paymentStatus !== "REFUNDED"
  );
}

function chooseOrderToKeep(group: DuplicateGroup) {
  return [...group.orders].sort((a, b) => {
    const rankDiff = (statusRank[b.status] ?? 0) - (statusRank[a.status] ?? 0);
    if (rankDiff !== 0) {
      return rankDiff;
    }

    return a.createdAt.getTime() - b.createdAt.getTime();
  })[0];
}

async function main() {
  const apply = isApplyRun();
  const orders = await prisma.order.findMany({
    where: {
      demandId: { not: null },
    },
    select: {
      id: true,
      demandId: true,
      tutorId: true,
      status: true,
      createdAt: true,
      payment: {
        select: {
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const groups = new Map<string, DuplicateGroup>();

  for (const order of orders) {
    if (!order.demandId) {
      continue;
    }

    const key = `${order.demandId}:${order.tutorId}`;
    const group =
      groups.get(key) ??
      {
        demandId: order.demandId,
        tutorId: order.tutorId,
        orders: [],
      };

    group.orders.push({
      id: order.id,
      status: order.status,
      paymentStatus: order.payment?.status ?? null,
      createdAt: order.createdAt,
    });
    groups.set(key, group);
  }

  const duplicates = Array.from(groups.values()).filter(
    (group) => group.orders.length > 1,
  );

  console.log(`Duplicate demand+tutor booking groups: ${duplicates.length}`);
  console.log(`Apply mode: ${apply ? "yes" : "no (dry-run)"}`);

  const cancelIds: string[] = [];
  let unsafeGroups = 0;

  for (const group of duplicates) {
    const keep = chooseOrderToKeep(group);
    const candidates = group.orders.filter((order) => order.id !== keep.id);
    const unsafe = candidates.filter((order) => !canCancelAsDuplicate(order));

    if (unsafe.length > 0) {
      unsafeGroups += 1;
    } else {
      cancelIds.push(...candidates.map((order) => order.id));
    }

    console.log(
      JSON.stringify(
        {
          demandId: group.demandId,
          tutorId: group.tutorId,
          count: group.orders.length,
          keepOrderId: keep.id,
          safeToCancelIds: unsafe.length > 0 ? [] : candidates.map((order) => order.id),
          unsafeOrderIds: unsafe.map((order) => order.id),
          orders: group.orders.map((order) => ({
            id: order.id,
            status: order.status,
            paymentStatus: order.paymentStatus,
            createdAt: order.createdAt.toISOString(),
          })),
        },
        null,
        2,
      ),
    );
  }

  if (apply && unsafeGroups === 0 && cancelIds.length > 0) {
    const result = await prisma.order.updateMany({
      where: {
        id: { in: cancelIds },
      },
      data: {
        status: "CANCELLED",
        demandId: null,
      },
    });

    console.log(`Cancelled and detached duplicate pending orders: ${result.count}`);
  }

  if (duplicates.length > 0 && (!apply || unsafeGroups > 0)) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("Failed to check duplicate bookings", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
