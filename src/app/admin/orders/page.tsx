import Link from "next/link";
import { redirect } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { AdminShell } from "@/components/layout/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import {
  formatDateTime,
  formatOrderMoney,
  formatShortOrderId,
  getOrderStatusTone,
} from "@/lib/orders";
import { getDashboardPath, getOrderStatusLabel, getTeachModeLabel } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

type AdminOrdersPageProps = {
  searchParams?: Promise<{
    status?: string;
    q?: string;
  }>;
};

const statusOptions: Array<{ value: "ALL" | OrderStatus; label: string }> = [
  { value: "ALL", label: "全部" },
  { value: "PENDING_TUTOR_CONFIRM", label: "待老师确认" },
  { value: "PENDING_PAYMENT", label: "待家长支付" },
  { value: "CANCELLED", label: "已取消" },
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

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.ADMIN) {
    redirect(getDashboardPath(user.role));
  }

  const query = (await searchParams) ?? {};
  const activeStatus = isOrderStatus(query.status) ? query.status : undefined;
  const keyword = query.q?.trim() ?? "";

  const orders = await prisma.order.findMany({
    where: {
      ...(activeStatus ? { status: activeStatus } : {}),
      ...(keyword
        ? {
            OR: [
              { id: { contains: keyword } },
              { subject: { contains: keyword } },
              { parent: { is: { name: { contains: keyword } } } },
              { tutor: { is: { name: { contains: keyword } } } },
            ],
          }
        : {}),
    },
    include: {
      parent: { select: { name: true } },
      tutor: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AdminShell>
        <PageHeader
          description="查看平台全部预约订单，按状态或关键词快速筛选。"
          eyebrow="后台管理"
          title="订单管理"
        />

        <div className="mt-6 rounded-lg border border-[#d9e3e6] bg-white p-4">
          <form className="grid gap-3 md:grid-cols-[1fr_auto]" method="get">
            {activeStatus ? <input name="status" type="hidden" value={activeStatus} /> : null}
            <input
              className="h-10 rounded-md border border-[#cbd9de] px-3 text-sm outline-none focus:border-[#176b87] focus:ring-2 focus:ring-[#d7ebf0]"
              defaultValue={keyword}
              name="q"
              placeholder="搜索家长、老师、科目或订单编号"
            />
            <Button type="submit">搜索</Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {statusOptions.map((option) => {
              const params = new URLSearchParams();
              if (option.value !== "ALL") {
                params.set("status", option.value);
              }
              if (keyword) {
                params.set("q", keyword);
              }
              const href = params.toString()
                ? `/admin/orders?${params.toString()}`
                : "/admin/orders";
              const isActive =
                option.value === "ALL" ? !activeStatus : activeStatus === option.value;

              return (
                <Link
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-[#176b87] bg-[#176b87] text-white"
                      : "border-[#cbd9de] bg-white text-[#244b5b] hover:border-[#176b87]"
                  }`}
                  href={href}
                  key={option.value}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-[#d9e3e6] bg-white">
          {orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-[1080px] w-full text-left text-sm">
                <thead className="bg-[#eef3f5] text-xs font-semibold text-[#60727a]">
                  <tr>
                    <th className="px-4 py-3">订单编号</th>
                    <th className="px-4 py-3">家长</th>
                    <th className="px-4 py-3">老师</th>
                    <th className="px-4 py-3">科目</th>
                    <th className="px-4 py-3">预约时间</th>
                    <th className="px-4 py-3">方式</th>
                    <th className="px-4 py-3">总金额</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3">创建时间</th>
                    <th className="px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1f3]">
                  {orders.map((order) => (
                    <tr className="text-[#244b5b]" key={order.id}>
                      <td className="px-4 py-4 font-medium text-[#182f38]">{formatShortOrderId(order.id)}</td>
                      <td className="px-4 py-4">{order.parent.name}</td>
                      <td className="px-4 py-4">{order.tutor.name}</td>
                      <td className="px-4 py-4">{order.subject}</td>
                      <td className="px-4 py-4">{formatDateTime(order.scheduledTime)}</td>
                      <td className="px-4 py-4">{getTeachModeLabel(order.teachMode)}</td>
                      <td className="px-4 py-4">{formatOrderMoney(order.totalAmount)}</td>
                      <td className="px-4 py-4">
                        <Badge tone={getOrderStatusTone(order.status)}>
                          {getOrderStatusLabel(order.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">{formatDateTime(order.createdAt)}</td>
                      <td className="px-4 py-4">
                        <Link className="font-semibold text-[#176b87] hover:text-[#12566d]" href={`/admin/orders/${order.id}`}>
                          查看详情
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              description="当前筛选条件下没有订单。"
              title="暂无订单"
            />
          )}
        </div>
      </AdminShell>
  );
}
