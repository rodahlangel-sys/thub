import Link from "next/link";
import { redirect } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { UserRole } from "@prisma/client";
import { ButtonLink } from "@/components/Button";
import { ParentEmptyState } from "@/components/parent/ParentEmptyState";
import { ParentOrderCard } from "@/components/parent/ParentOrderCard";
import { PageShell } from "@/components/ui/PageShell";
import { requireUser } from "@/lib/auth";
import { getParentOrderGroup, type ParentOrderGroup } from "@/lib/parent-display";
import { getDashboardPath } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

type ParentOrdersPageProps = {
  searchParams?: Promise<{
    status?: string;
    group?: string;
  }>;
};

const groupOptions: Array<{ value: ParentOrderGroup; label: string }> = [
  { value: "pending", label: "待处理" },
  { value: "active", label: "进行中" },
  { value: "done", label: "已结束" },
];

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

function parseGroup(value: string | undefined): ParentOrderGroup {
  if (value === "active" || value === "done" || value === "pending") return value;
  return "pending";
}

export default async function ParentOrdersPage({ searchParams }: ParentOrdersPageProps) {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.PARENT) {
    redirect(getDashboardPath(user.role));
  }

  const query = (await searchParams) ?? {};
  const activeStatus = isOrderStatus(query.status) ? query.status : undefined;
  const activeGroup = activeStatus ? getParentOrderGroup(activeStatus) : parseGroup(query.group);
  const orders = await prisma.order.findMany({
    where: { parentId: user.id },
    include: {
      tutor: {
        select: {
          name: true,
        },
      },
      review: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const visibleOrders = orders.filter((order) => {
    if (activeStatus) return order.status === activeStatus;
    return getParentOrderGroup(order.status) === activeGroup;
  });

  const groupCounts = groupOptions.reduce(
    (acc, option) => {
      acc[option.value] = orders.filter(
        (order) => getParentOrderGroup(order.status) === option.value,
      ).length;
      return acc;
    },
    {} as Record<ParentOrderGroup, number>,
  );

  return (
    <PageShell className="bg-[#f7f4ee]">
      <div className="mb-6">
        <p className="text-sm font-semibold text-[#116a6c]">我的订单</p>
        <h1 className="mt-2 text-3xl font-bold text-[#172c2c]">预约与辅导记录</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#66736e]">
          查看当前预约和历史辅导。
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-[#dbe7e3] bg-white/78 p-2 shadow-[0_10px_28px_rgba(18,45,42,0.04)]">
        {groupOptions.map((option) => {
          const isActive = activeGroup === option.value && !activeStatus;

          return (
            <Link
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-[#e4f4ef] text-[#0f6868]"
                  : "text-[#5d6f6b] hover:bg-[#f5faf8] hover:text-[#0f6868]"
              }`}
              href={`/parent/orders?group=${option.value}`}
              key={option.value}
            >
              {option.label}
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  isActive ? "bg-white text-[#0f6868]" : "bg-[#eef3f1] text-[#6b7f7b]"
                }`}
              >
                {groupCounts[option.value]}
              </span>
            </Link>
          );
        })}
      </div>

      {activeStatus ? (
        <div className="mb-4">
          <ButtonLink href={`/parent/orders?group=${activeGroup}`} variant="outline">
            返回{groupOptions.find((group) => group.value === activeGroup)?.label}
          </ButtonLink>
        </div>
      ) : null}

      {visibleOrders.length > 0 ? (
        <div className="grid gap-4">
          {visibleOrders.map((order) => (
            <ParentOrderCard
              hasReview={Boolean(order.review)}
              id={order.id}
              key={order.id}
              location={order.location}
              scheduledTime={order.scheduledTime}
              status={order.status}
              subject={order.subject}
              teachMode={order.teachMode}
              totalAmount={order.totalAmount}
              tutorName={order.tutor.name}
            />
          ))}
        </div>
      ) : (
        <ParentEmptyState
          action={<ButtonLink href="/parent/demands/new">去发布需求</ButtonLink>}
          description="暂时还没有相关预约。你可以先发布一条需求。"
          title="暂无相关订单"
        />
      )}
    </PageShell>
  );
}
