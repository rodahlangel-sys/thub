import Link from "next/link";
import { redirect } from "next/navigation";
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
} from "@/lib/orders";
import {
  getDashboardPath,
  getPaymentProviderLabel,
  getPaymentStatusLabel,
} from "@/lib/roles";
import { prisma } from "@/lib/prisma";

type AdminPaymentsPageProps = {
  searchParams?: Promise<{
    status?: string;
    q?: string;
  }>;
};

const statusOptions = [
  { value: "ALL", label: "全部" },
  { value: "UNPAID", label: "未支付" },
  { value: "WAIT_PLATFORM_CONFIRM", label: "待确认平台收款" },
  { value: "WAIT_TUTOR_PAYMENT", label: "待支付家教费用" },
  { value: "WAIT_TUTOR_CONFIRM", label: "待家教确认" },
  { value: "PAID", label: "已支付" },
  { value: "REFUNDED", label: "已退款" },
];

function getPaymentStatusTone(status: string) {
  if (status === "PAID") return "green" as const;
  if (status === "REFUNDED") return "red" as const;
  if (
    status === "WAIT_PLATFORM_CONFIRM" ||
    status === "WAIT_TUTOR_PAYMENT" ||
    status === "WAIT_TUTOR_CONFIRM"
  ) {
    return "yellow" as const;
  }
  return "gray" as const;
}

const validStatuses = new Set(statusOptions.map((s) => s.value).filter((v) => v !== "ALL"));

function isPaymentStatus(value: string | undefined) {
  return value ? validStatuses.has(value) : false;
}

export default async function AdminPaymentsPage({
  searchParams,
}: AdminPaymentsPageProps) {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.ADMIN) {
    redirect(getDashboardPath(user.role));
  }

  const query = (await searchParams) ?? {};
  const activeStatus = isPaymentStatus(query.status) ? query.status : undefined;
  const keyword = query.q?.trim() ?? "";
  const payments = await prisma.payment.findMany({
    where: {
      ...(activeStatus ? { status: activeStatus } : {}),
      ...(keyword
        ? {
            OR: [
              { transactionNo: { contains: keyword } },
              { order: { is: { id: { contains: keyword } } } },
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
        description="查看平台支付记录、完整支付轨迹和对应订单。"
        eyebrow="后台管理"
        title="支付记录"
      />

      <div className="mt-6 rounded-lg border border-[#d9e3e6] bg-white p-4">
        <form className="grid gap-3 md:grid-cols-[1fr_auto]" method="get">
          {activeStatus ? <input name="status" type="hidden" value={activeStatus} /> : null}
          <input
            className="h-10 rounded-md border border-[#cbd9de] px-3 text-sm outline-none focus:border-[#176b87] focus:ring-2 focus:ring-[#d7ebf0]"
            defaultValue={keyword}
            name="q"
            placeholder="搜索订单编号、交易号、家长或老师"
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
              ? `/admin/payments?${params.toString()}`
              : "/admin/payments";
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
        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[1400px] w-full text-left text-sm">
              <thead className="bg-[#eef3f5] text-xs font-semibold text-[#60727a]">
                <tr>
                  <th className="px-4 py-3">支付编号</th>
                  <th className="px-4 py-3">订单编号</th>
                  <th className="px-4 py-3">家长</th>
                  <th className="px-4 py-3">老师</th>
                  <th className="px-4 py-3">支付方式</th>
                  <th className="px-4 py-3">订单金额</th>
                  <th className="px-4 py-3">平台信息费(5%)</th>
                  <th className="px-4 py-3">平台费状态</th>
                  <th className="px-4 py-3">平台确认时间</th>
                  <th className="px-4 py-3">家教课酬(95%)</th>
                  <th className="px-4 py-3">课酬状态</th>
                  <th className="px-4 py-3">家教确认时间</th>
                  <th className="px-4 py-3">订单状态</th>
                  <th className="px-4 py-3">交易号</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1f3]">
                {payments.map((payment) => (
                  <tr className="align-top text-[#244b5b]" key={payment.id}>
                    <td className="px-4 py-4 font-medium text-[#182f38]">
                      {formatShortOrderId(payment.id)}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        className="font-semibold text-[#176b87] hover:text-[#12566d]"
                        href={`/admin/orders/${payment.orderId}`}
                      >
                        {formatShortOrderId(payment.orderId)}
                      </Link>
                    </td>
                    <td className="px-4 py-4">{payment.order.parent.name}</td>
                    <td className="px-4 py-4">{payment.order.tutor.name}</td>
                    <td className="px-4 py-4">
                      <Badge tone={payment.provider === "QRCODE" ? "blue" : "gray"}>
                        {getPaymentProviderLabel(payment.provider)}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 font-semibold text-[#182f38]">
                      {formatOrderMoney(payment.amount)}
                    </td>
                    <td className="px-4 py-4">
                      {payment.platformAmountFen
                        ? formatOrderMoney(payment.platformAmountFen)
                        : "—"}
                    </td>
                    <td className="px-4 py-4">
                      <Badge
                        tone={
                          payment.platformConfirmedAt
                            ? "green"
                            : payment.status === "WAIT_PLATFORM_CONFIRM"
                              ? "yellow"
                              : "gray"
                        }
                      >
                        {payment.platformConfirmedAt
                          ? "已确认"
                          : payment.status === "WAIT_PLATFORM_CONFIRM"
                            ? "待确认"
                            : "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-xs">
                      {payment.platformConfirmedAt
                        ? formatDateTime(payment.platformConfirmedAt)
                        : "—"}
                    </td>
                    <td className="px-4 py-4">
                      {payment.tutorAmountFen
                        ? formatOrderMoney(payment.tutorAmountFen)
                        : "—"}
                    </td>
                    <td className="px-4 py-4">
                      <Badge
                        tone={
                          payment.tutorConfirmedAt
                            ? "green"
                            : payment.status === "WAIT_TUTOR_CONFIRM"
                              ? "yellow"
                              : "gray"
                        }
                      >
                        {payment.tutorConfirmedAt
                          ? "已确认"
                          : payment.status === "WAIT_TUTOR_CONFIRM"
                            ? "待确认"
                            : "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-xs">
                      {payment.tutorConfirmedAt
                        ? formatDateTime(payment.tutorConfirmedAt)
                        : "—"}
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone={getPaymentStatusTone(payment.status)}>
                        {getPaymentStatusLabel(payment.status)}
                      </Badge>
                    </td>
                    <td className="max-w-48 break-all px-4 py-4 text-xs">
                      {payment.transactionNo || "暂无"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            description="当前筛选条件下没有支付记录。"
            title="暂无支付记录"
          />
        )}
      </div>
    </AdminShell>
  );
}
