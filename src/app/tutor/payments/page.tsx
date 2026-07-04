import Link from "next/link";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/ui/PageShell";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatOrderMoney, formatShortOrderId } from "@/lib/orders";
import { getDashboardPath } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import {
  confirmTutorQrReceiptAction,
  rejectTutorQrReceiptAction,
} from "./actions";

type TutorPaymentsPageProps = {
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function TutorPaymentsPage({
  searchParams,
}: TutorPaymentsPageProps) {
  const user = await requireUser();
  if (!user) redirect("/login");
  if (user.role !== UserRole.TUTOR) redirect(getDashboardPath(user.role));

  const [query, orders] = await Promise.all([
    searchParams,
    prisma.order.findMany({
      where: {
        tutorId: user.id,
        status: "WAIT_TUTOR_CONFIRM",
        payment: { is: { provider: "QRCODE", status: "WAIT_TUTOR_CONFIRM" } },
      },
      include: {
        parent: { select: { name: true } },
        payment: true,
      },
      orderBy: { updatedAt: "asc" },
    }),
  ]);

  return (
    <PageShell compact>
      <section className="mb-7 rounded-[1.75rem] border border-[#dfe8e4] bg-[#fffdf8] p-6 shadow-[0_18px_55px_rgba(31,79,72,0.07)]">
        <p className="text-sm font-semibold text-[#117b7a]">扫码支付</p>
        <h1 className="mt-2 text-3xl font-bold text-[#172c2c]">待确认收款</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#60716c]">
          家长标记完成家教服务费付款后，请确认实际收到款项再点击确认。
        </p>
      </section>

      {query?.success ? (
        <div className="mb-6 rounded-xl border border-[#b9d8c5] bg-[#f0f8f3] px-4 py-3 text-sm text-[#27734d]">
          {query.success}
        </div>
      ) : null}
      {query?.error ? (
        <div className="mb-6 rounded-xl border border-[#e6b6b6] bg-[#fff1f1] px-4 py-3 text-sm text-[#a33b3b]">
          {query.error}
        </div>
      ) : null}

      <Card className="overflow-hidden">
        {orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="bg-[#eef3f5] text-xs font-semibold text-[#60727a]">
                <tr>
                  <th className="px-4 py-3">订单</th>
                  <th className="px-4 py-3">家长</th>
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
                        href={`/tutor/orders/${order.id}`}
                      >
                        {formatShortOrderId(order.id)}
                      </Link>
                      <div className="mt-1">
                        <Badge tone="yellow">等待你确认</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-4">{order.parent.name}</td>
                    <td className="px-4 py-4">
                      {formatOrderMoney(order.payment?.tutorAmountFen || order.tutorNetAmountFen)}
                    </td>
                    <td className="px-4 py-4">{formatDateTime(order.updatedAt)}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <form action={confirmTutorQrReceiptAction}>
                          <input name="orderId" type="hidden" value={order.id} />
                          <Button type="submit">确认收到</Button>
                        </form>
                        <form action={rejectTutorQrReceiptAction}>
                          <input name="orderId" type="hidden" value={order.id} />
                          <Button type="submit" variant="outline">
                            未收到
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
            description="当前没有等待你确认收款的扫码支付订单。"
            title="暂无待确认收款"
          />
        )}
      </Card>
    </PageShell>
  );
}
