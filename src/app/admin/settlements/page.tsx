import Link from "next/link";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { AdminShell } from "@/components/layout/AdminShell";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatShortOrderId } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { getDashboardPath } from "@/lib/roles";
import { formatFen } from "@/lib/settlements";

function getSettlementStatusLabel(status: string) {
  if (status === "SETTLED") return "已完成";
  if (status === "FAILED") return "结算异常";
  if (status === "REVERSED") return "已冲正";
  return "待结算";
}

function getSettlementStatusTone(status: string) {
  if (status === "SETTLED") return "green" as const;
  if (status === "FAILED") return "red" as const;
  if (status === "REVERSED") return "yellow" as const;
  return "gray" as const;
}

export default async function AdminSettlementsPage() {
  const user = await requireUser();

  if (!user) redirect("/login");
  if (user.role !== UserRole.ADMIN) redirect(getDashboardPath(user.role));

  const [settlements, totals, pendingCount, failedCount] = await Promise.all([
    prisma.settlement.findMany({
      include: {
        order: {
          select: {
            id: true,
            subject: true,
            parent: { select: { name: true } },
          },
        },
        tutor: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.settlement.aggregate({
      where: { status: "SETTLED" },
      _sum: {
        grossAmountFen: true,
        platformFeeAmountFen: true,
        tutorNetAmountFen: true,
      },
    }),
    prisma.settlement.count({ where: { status: "PENDING" } }),
    prisma.settlement.count({ where: { status: "FAILED" } }),
  ]);

  const stats = [
    { label: "累计完成订单金额", value: formatFen(totals._sum.grossAmountFen ?? 0) },
    { label: "累计平台信息费", value: formatFen(totals._sum.platformFeeAmountFen ?? 0) },
    { label: "累计大学生结算金额", value: formatFen(totals._sum.tutorNetAmountFen ?? 0) },
    { label: "待结算", value: String(pendingCount) },
    { label: "结算异常", value: String(failedCount) },
  ];

  return (
    <AdminShell>
      <PageHeader
        description="查看订单完成后的平台信息服务费与大学生模拟结算记录。"
        eyebrow="资金记录"
        title="结算记录"
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <div className="rounded-lg border border-[#d9e3e6] bg-white p-4" key={stat.label}>
            <p className="text-xs text-[#60727a]">{stat.label}</p>
            <p className="mt-2 text-lg font-bold text-[#182f38]">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-[#d9e3e6] bg-white">
        {settlements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] text-left text-sm">
              <thead className="bg-[#eef3f5] text-xs font-semibold text-[#60727a]">
                <tr>
                  <th className="px-4 py-3">订单</th>
                  <th className="px-4 py-3">家长</th>
                  <th className="px-4 py-3">大学生家教</th>
                  <th className="px-4 py-3">订单总额</th>
                  <th className="px-4 py-3">费率</th>
                  <th className="px-4 py-3">平台信息费</th>
                  <th className="px-4 py-3">家教结算金额</th>
                  <th className="px-4 py-3">渠道</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">结算时间</th>
                  <th className="px-4 py-3">模拟流水号</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1f3]">
                {settlements.map((settlement) => (
                  <tr className="text-[#244b5b]" key={settlement.id}>
                    <td className="px-4 py-4">
                      <Link className="font-semibold text-[#176b87]" href={`/admin/orders/${settlement.orderId}`}>
                        {settlement.order.subject} · {formatShortOrderId(settlement.orderId)}
                      </Link>
                    </td>
                    <td className="px-4 py-4">{settlement.order.parent.name}</td>
                    <td className="px-4 py-4">{settlement.tutor.name}</td>
                    <td className="px-4 py-4">{formatFen(settlement.grossAmountFen)}</td>
                    <td className="px-4 py-4">{(settlement.platformFeeRateBps / 100).toFixed(0)}%</td>
                    <td className="px-4 py-4">{formatFen(settlement.platformFeeAmountFen)}</td>
                    <td className="px-4 py-4 font-semibold">{formatFen(settlement.tutorNetAmountFen)}</td>
                    <td className="px-4 py-4">{settlement.provider}</td>
                    <td className="px-4 py-4">
                      <Badge tone={getSettlementStatusTone(settlement.status)}>
                        {getSettlementStatusLabel(settlement.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      {settlement.settledAt ? formatDateTime(settlement.settledAt) : "暂无"}
                    </td>
                    <td className="max-w-72 break-all px-4 py-4">{settlement.transactionNo ?? "暂无"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState description="家长确认完成后，模拟结算记录会显示在这里。" title="暂无结算记录" />
        )}
      </div>
    </AdminShell>
  );
}
