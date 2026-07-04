import Link from "next/link";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { AdminShell } from "@/components/layout/AdminShell";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatOrderMoney, formatShortOrderId } from "@/lib/orders";
import { getDashboardPath } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import {
  confirmPlatformQrPaymentAction,
  rejectPlatformQrPaymentAction,
} from "./actions";

type PageProps = {
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function AdminQrPaymentConfirmPage({
  searchParams,
}: PageProps) {
  const user = await requireUser();
  if (!user) redirect("/login");
  if (user.role !== UserRole.ADMIN) redirect(getDashboardPath(user.role));

  const [query, orders] = await Promise.all([
    searchParams,
    prisma.order.findMany({
      where: {
        status: "WAIT_PLATFORM_CONFIRM",
        payment: { is: { provider: "QRCODE", status: "WAIT_PLATFORM_CONFIRM" } },
      },
      include: {
        parent: { select: { name: true } },
        tutor: { select: { name: true } },
        payment: true,
      },
      orderBy: { updatedAt: "asc" },
    }),
  ]);

  return (
    <AdminShell>
      <PageHeader
        description="确认家长是否已经完成平台信息服务费扫码支付。确认后才会向家长展示家教收款二维码。"
        eyebrow="扫码支付"
        title="待确认平台收款"
      />

      {query?.success ? (
        <div className="mt-6 rounded-xl border border-[#b9d8c5] bg-[#f0f8f3] px-4 py-3 text-sm text-[#27734d]">
          {query.success}
        </div>
      ) : null}
      {query?.error ? (
        <div className="mt-6 rounded-xl border border-[#e6b6b6] bg-[#fff1f1] px-4 py-3 text-sm text-[#a33b3b]">
          {query.error}
        </div>
      ) : null}

      <Card className="mt-8 overflow-hidden">
        {orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-[#eef3f5] text-xs font-semibold text-[#60727a]">
                <tr>
                  <th className="px-4 py-3">订单</th>
                  <th className="px-4 py-3">家长</th>
                  <th className="px-4 py-3">家教</th>
                  <th className="px-4 py-3">平台信息费</th>
                  <th className="px-4 py-3">家教服务费</th>
                  <th className="px-4 py-3">提交时间</th>
                  <th className="px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1f3]">
                {orders.map((order) => (
                  <tr className="text-[#244b5b]" key={order.id}>
                    <td className="px-4 py-4">
                      <Link
                        className="font-semibold text-[#176b87] hover:text-[#12566d]"
                        href={`/admin/orders/${order.id}`}
                      >
                        {formatShortOrderId(order.id)}
                      </Link>
                      <div className="mt-1">
                        <Badge tone="yellow">等待平台确认</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-4">{order.parent.name}</td>
                    <td className="px-4 py-4">{order.tutor.name}</td>
                    <td className="px-4 py-4">
                      {formatOrderMoney(order.payment?.platformAmountFen || order.platformFeeAmountFen)}
                    </td>
                    <td className="px-4 py-4">
                      {formatOrderMoney(order.payment?.tutorAmountFen || order.tutorNetAmountFen)}
                    </td>
                    <td className="px-4 py-4">{formatDateTime(order.updatedAt)}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <form action={confirmPlatformQrPaymentAction}>
                          <input name="orderId" type="hidden" value={order.id} />
                          <Button type="submit">确认收到</Button>
                        </form>
                        <form action={rejectPlatformQrPaymentAction}>
                          <input name="orderId" type="hidden" value={order.id} />
                          <Button type="submit" variant="outline">
                            驳回
                          </Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            description="当前没有等待管理员确认的平台信息服务费。"
            title="暂无待确认收款"
          />
        )}
      </Card>
    </AdminShell>
  );
}
