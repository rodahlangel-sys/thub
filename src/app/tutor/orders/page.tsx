import Link from "next/link";
import { redirect } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { UserRole } from "@prisma/client";
import { PageShell } from "@/components/ui/PageShell";
import { TutorBookingCard } from "@/components/tutor/TutorBookingCard";
import { TutorEmptyState } from "@/components/tutor/TutorEmptyState";
import { requireUser } from "@/lib/auth";
import { getDashboardPath } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import {
  getTutorOrderCategory,
  type TutorOrderCategory,
} from "@/lib/tutor-display";

type TutorOrdersPageProps = {
  searchParams?: Promise<{
    status?: string;
  }>;
};

const categoryLabels: Record<TutorOrderCategory, string> = {
  todo: "待处理",
  active: "服务中",
  done: "已结束",
};

const categoryDescriptions: Record<TutorOrderCategory, string> = {
  todo: "新的预约、等待家长付款或售后处理。",
  active: "已安排、正在辅导或等待家长确认。",
  done: "已完成、已取消或已退款的记录。",
};

function isOrderStatus(value: string | undefined): value is OrderStatus {
  return (
    value === "PENDING_TUTOR_CONFIRM" ||
    value === "PENDING_PAYMENT" ||
    value === "ESCROWED" ||
    value === "IN_PROGRESS" ||
    value === "PENDING_PARENT_CONFIRM" ||
    value === "COMPLETED" ||
    value === "REFUND_REQUESTED" ||
    value === "REFUNDED" ||
    value === "CANCELLED"
  );
}

function isCategory(value: string | undefined): value is TutorOrderCategory {
  return value === "todo" || value === "active" || value === "done";
}

export default async function TutorOrdersPage({ searchParams }: TutorOrdersPageProps) {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.TUTOR) {
    redirect(getDashboardPath(user.role));
  }

  const query = (await searchParams) ?? {};
  const rawStatus = isOrderStatus(query.status) ? query.status : undefined;
  const activeCategory: TutorOrderCategory = rawStatus
    ? getTutorOrderCategory(rawStatus)
    : isCategory(query.status)
      ? query.status
      : "todo";

  const orders = await prisma.order.findMany({
    where: { tutorId: user.id },
    include: {
      parent: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const categoryCounts = orders.reduce<Record<TutorOrderCategory, number>>(
    (acc, order) => {
      acc[getTutorOrderCategory(order.status)] += 1;
      return acc;
    },
    { todo: 0, active: 0, done: 0 },
  );

  const visibleOrders = orders.filter((order) => {
    if (rawStatus) return order.status === rawStatus;
    return getTutorOrderCategory(order.status) === activeCategory;
  });

  return (
    <PageShell>
      <section className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#117b7a]">预约管理</p>
          <h1 className="mt-2 text-3xl font-bold text-[#172c2c]">预约与辅导安排</h1>
          <p className="mt-3 text-sm text-[#60716c]">
            查看新的预约、进行中的辅导和已结束记录。
          </p>
        </div>
      </section>

      <nav className="mb-7 flex flex-wrap gap-2">
        {(Object.keys(categoryLabels) as TutorOrderCategory[]).map((category) => {
          const active = activeCategory === category && !rawStatus;

          return (
            <Link
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "border-[#117b7a] bg-[#e4f4ef] text-[#0f6f70]"
                  : "border-[#d9e5e1] bg-white text-[#526b66] hover:border-[#117b7a]"
              }`}
              href={`/tutor/orders?status=${category}`}
              key={category}
            >
              {categoryLabels[category]} {categoryCounts[category]}
            </Link>
          );
        })}
      </nav>

      <section className="rounded-[1.75rem] border border-[#dfe8e4] bg-[#fffdf8] p-5 shadow-[0_18px_55px_rgba(31,79,72,0.06)]">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-[#172c2c]">
            {rawStatus ? "筛选结果" : categoryLabels[activeCategory]}
          </h2>
          <p className="mt-1 text-sm text-[#60716c]">
            {rawStatus ? "按当前状态查看预约。" : categoryDescriptions[activeCategory]}
          </p>
        </div>

        <div className="grid gap-4">
          {visibleOrders.length > 0 ? (
            visibleOrders.map((order) => (
              <TutorBookingCard
                id={order.id}
                key={order.id}
                location={order.location}
                parentName={order.parent.name}
                scheduledTime={order.scheduledTime}
                status={order.status}
                subject={order.subject}
                teachMode={order.teachMode}
                totalAmount={order.totalAmount}
              />
            ))
          ) : (
            <TutorEmptyState
              description="新的预约和服务记录会按状态出现在这里。"
              title="当前没有相关预约"
            />
          )}
        </div>
      </section>
    </PageShell>
  );
}
