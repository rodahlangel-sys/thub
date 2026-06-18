import Link from "next/link";
import { redirect } from "next/navigation";
import type { RefundStatus } from "@prisma/client";
import { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { AdminShell } from "@/components/layout/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatOrderMoney, formatShortOrderId } from "@/lib/orders";
import { getDashboardPath, getRefundStatusLabel } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

type AdminRefundsPageProps = {
  searchParams?: Promise<{
    status?: string;
    q?: string;
  }>;
};

const statusOptions: Array<{ value: "ALL" | RefundStatus; label: string }> = [
  { value: "ALL", label: "全部" },
  { value: "PENDING", label: "待审核" },
  { value: "APPROVED", label: "已通过" },
  { value: "REJECTED", label: "已拒绝" },
];

function isRefundStatus(value: string | undefined): value is RefundStatus {
  return value === "PENDING" || value === "APPROVED" || value === "REJECTED";
}

function getRefundTone(status: RefundStatus) {
  if (status === "APPROVED") {
    return "green" as const;
  }

  if (status === "REJECTED") {
    return "red" as const;
  }

  return "yellow" as const;
}

export default async function AdminRefundsPage({ searchParams }: AdminRefundsPageProps) {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.ADMIN) {
    redirect(getDashboardPath(user.role));
  }

  const query = (await searchParams) ?? {};
  const activeStatus = isRefundStatus(query.status) ? query.status : undefined;
  const keyword = query.q?.trim() ?? "";

  const refunds = await prisma.refund.findMany({
    where: {
      ...(activeStatus ? { status: activeStatus } : {}),
      ...(keyword
        ? {
            OR: [
              { reason: { contains: keyword } },
              { order: { is: { id: { contains: keyword } } } },
              { order: { is: { subject: { contains: keyword } } } },
              { order: { is: { parent: { is: { name: { contains: keyword } } } } } },
              { order: { is: { tutor: { is: { name: { contains: keyword } } } } } },
            ],
          }
        : {}),
    },
    include: {
      order: {
        include: {
          parent: { select: { name: true } },
          tutor: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AdminShell>
        <PageHeader
          description="查看和处理家长提交的退款申请。"
          eyebrow="后台管理"
          title="退款管理"
        />

        <div className="mt-6 rounded-lg border border-[#d9e3e6] bg-white p-4">
          <form className="grid gap-3 md:grid-cols-[1fr_auto]" method="get">
            {activeStatus ? <input name="status" type="hidden" value={activeStatus} /> : null}
            <input
              className="h-10 rounded-md border border-[#cbd9de] px-3 text-sm outline-none focus:border-[#176b87] focus:ring-2 focus:ring-[#d7ebf0]"
              defaultValue={keyword}
              name="q"
              placeholder="搜索订单编号、家长、老师、科目或退款原因"
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
                ? `/admin/refunds?${params.toString()}`
                : "/admin/refunds";
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
          {refunds.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-[1160px] w-full text-left text-sm">
                <thead className="bg-[#eef3f5] text-xs font-semibold text-[#60727a]">
                  <tr>
                    <th className="px-4 py-3">退款编号</th>
                    <th className="px-4 py-3">订单编号</th>
                    <th className="px-4 py-3">家长</th>
                    <th className="px-4 py-3">老师</th>
                    <th className="px-4 py-3">科目</th>
                    <th className="px-4 py-3">订单金额</th>
                    <th className="px-4 py-3">申请金额</th>
                    <th className="px-4 py-3">退款原因</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3">申请时间</th>
                    <th className="px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1f3]">
                  {refunds.map((refund) => (
                    <tr className="text-[#244b5b]" key={refund.id}>
                      <td className="px-4 py-4 font-medium text-[#182f38]">{formatShortOrderId(refund.id)}</td>
                      <td className="px-4 py-4">
                        <Link className="font-semibold text-[#176b87] hover:text-[#12566d]" href={`/admin/orders/${refund.orderId}`}>
                          {formatShortOrderId(refund.orderId)}
                        </Link>
                      </td>
                      <td className="px-4 py-4">{refund.order.parent.name}</td>
                      <td className="px-4 py-4">{refund.order.tutor.name}</td>
                      <td className="px-4 py-4">{refund.order.subject}</td>
                      <td className="px-4 py-4">{formatOrderMoney(refund.order.totalAmount)}</td>
                      <td className="px-4 py-4">{formatOrderMoney(refund.refundAmount)}</td>
                      <td className="px-4 py-4">{refund.reason}</td>
                      <td className="px-4 py-4">
                        <Badge tone={getRefundTone(refund.status)}>
                          {getRefundStatusLabel(refund.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">{formatDateTime(refund.createdAt)}</td>
                      <td className="px-4 py-4">
                        <Link className="font-semibold text-[#176b87] hover:text-[#12566d]" href={`/admin/refunds/${refund.id}`}>
                          查看处理
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              description="当前筛选条件下没有退款申请。"
              title="暂无退款申请"
            />
          )}
        </div>
      </AdminShell>
  );
}
