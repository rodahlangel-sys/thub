import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { Button, ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { ParentSection } from "@/components/parent/ParentSection";
import { NoticeStrip } from "@/components/ui/NoticeStrip";
import { PageShell } from "@/components/ui/PageShell";
import { requireUser } from "@/lib/auth";
import {
  canRequestPaidRefund,
  getRefundUnavailableReason,
  getSuggestedRefundAmount,
  refundReasonOptions,
} from "@/lib/refunds";
import {
  formatOrderCurrency,
  formatParentDateTime,
  getParentOrderStatusLabel,
  getParentOrderStatusTone,
  safeText,
} from "@/lib/parent-display";
import { getDashboardPath, getTeachModeLabel } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { submitRefundRequestAction } from "./actions";

type ParentRefundPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

const inputClass =
  "mt-2 h-12 w-full rounded-xl border border-[#d6e2df] bg-white px-4 text-sm text-[#1f2d2d] outline-none transition placeholder:text-[#a2b2ad] focus:border-[#116a6c] focus:ring-4 focus:ring-[#d7ebe6]";
const textareaClass =
  "mt-2 min-h-28 w-full rounded-xl border border-[#d6e2df] bg-white px-4 py-3 text-sm text-[#1f2d2d] outline-none transition placeholder:text-[#a2b2ad] focus:border-[#116a6c] focus:ring-4 focus:ring-[#d7ebe6]";

export default async function ParentRefundPage({
  params,
  searchParams,
}: ParentRefundPageProps) {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.PARENT) {
    redirect(getDashboardPath(user.role));
  }

  const { id } = await params;
  const query = (await searchParams) ?? {};
  const order = await prisma.order.findFirst({
    where: {
      id,
      parentId: user.id,
    },
    include: {
      payment: true,
      refunds: {
        orderBy: { createdAt: "desc" },
      },
      tutor: {
        select: {
          name: true,
          tutorProfile: {
            select: {
              school: true,
              major: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    redirect("/parent/orders");
  }

  const hasPendingRefund = order.refunds.some((refund) => refund.status === "PENDING");
  const hasPaidPayment = order.payment?.status === "PAID";
  const allowRefund = canRequestPaidRefund(order.status) && hasPaidPayment && !hasPendingRefund;
  const paidAmount = order.payment?.amount ?? order.totalAmount;
  const suggestedAmount = getSuggestedRefundAmount(order.status, paidAmount);
  const unavailableReason = hasPendingRefund
    ? "已有退款申请正在审核，请不要重复提交。"
    : !hasPaidPayment
      ? "订单没有可退款的支付记录。"
      : getRefundUnavailableReason(order.status);

  return (
    <PageShell className="bg-[#f7f4ee]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#b45309]">售后申请</p>
          <h1 className="mt-2 text-3xl font-bold text-[#172c2c]">申请退款</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#66736e]">
            说明原因并填写申请金额，平台会结合订单和支付记录进行处理。
          </p>
        </div>
        <ButtonLink href={`/parent/orders/${order.id}`} variant="outline">
          返回订单详情
        </ButtonLink>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-6 content-start">
          <ParentSection title="订单信息">
            <Card className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#1f2d2d]">
                    {safeText(order.subject, "科目信息待确认")} · {safeText(order.tutor.name, "老师信息待完善")}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#66736e]">
                    {formatParentDateTime(order.scheduledTime)} · {getTeachModeLabel(order.teachMode)}
                  </p>
                </div>
                <Badge tone={getParentOrderStatusTone(order.status)}>
                  {getParentOrderStatusLabel(order.status)}
                </Badge>
              </div>
            </Card>
          </ParentSection>

          <ParentSection title="金额参考">
            <Card className="p-6">
              <dl className="space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[#708188]">已支付金额</dt>
                  <dd className="font-semibold text-[#1f2d2d]">{formatOrderCurrency(paidAmount)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#708188]">建议申请金额</dt>
                  <dd className="font-semibold text-[#1f2d2d]">{formatOrderCurrency(suggestedAmount)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#708188]">最高可申请</dt>
                  <dd className="font-semibold text-[#1f2d2d]">{formatOrderCurrency(paidAmount)}</dd>
                </div>
              </dl>
            </Card>
          </ParentSection>
        </div>

        <ParentSection title="填写退款申请">
          <Card className="p-6">
            <div className="rounded-2xl border border-[#ead8a6] bg-[#fff8e5] px-4 py-3 text-sm leading-6 text-[#7a5a11]">
              提交申请前，请确认已了解平台退款规则。
              <div className="mt-3">
                <ButtonLink href="/refund-rules" variant="outline">
                  查看退款规则
                </ButtonLink>
              </div>
            </div>

            {!allowRefund ? (
              <div className="mt-5 rounded-2xl border border-[#ead8a6] bg-[#fff8e5] px-4 py-3 text-sm leading-6 text-[#7a5a11]">
                {unavailableReason || "当前订单暂时不能申请退款。"}
              </div>
            ) : (
              <form action={submitRefundRequestAction} className="mt-6 space-y-5">
                <input name="orderId" type="hidden" value={order.id} />
                {query.error ? (
                  <NoticeStrip tone="red">
                    {query.error}
                  </NoticeStrip>
                ) : null}

                <label className="block text-sm font-semibold text-[#244b5b]">
                  退款原因
                  <select className={inputClass} name="reason" required>
                    {refundReasonOptions.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-semibold text-[#244b5b]">
                  补充说明
                  <textarea
                    className={textareaClass}
                    maxLength={500}
                    name="description"
                    placeholder="可以补充沟通情况、取消原因或争议点"
                  />
                </label>

                <label className="block text-sm font-semibold text-[#244b5b]">
                  申请退款金额
                  <input
                    className={inputClass}
                    defaultValue={suggestedAmount}
                    max={paidAmount}
                    min={1}
                    name="refundAmount"
                    required
                    step={1}
                    type="number"
                  />
                </label>

                <Button className="h-12 w-full text-base" type="submit">
                  提交退款申请
                </Button>
              </form>
            )}
          </Card>
        </ParentSection>
      </div>
    </PageShell>
  );
}
