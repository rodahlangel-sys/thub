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
  formatOrderCurrency,
  formatParentDateTime,
  getParentOrderStatusLabel,
  getParentOrderStatusTone,
  safeText,
} from "@/lib/parent-display";
import { getPaymentMethodAvailability, getPaymentConfig } from "@/lib/payments/config";
import { getDashboardPath, getTeachModeLabel } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { payOrderAction } from "./actions";

type PayPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

function disabledPayHref(orderId: string) {
  return `/parent/orders/${orderId}/pay?error=${encodeURIComponent(
    "该支付方式尚未启用，当前可使用模拟支付完成流程。",
  )}`;
}

export default async function PayPage({ params, searchParams }: PayPageProps) {
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
      tutor: {
        select: {
          name: true,
          tutorProfile: true,
        },
      },
      payment: true,
    },
  });

  if (!order) {
    redirect("/parent/orders");
  }

  const paymentConfig = getPaymentConfig();
  const availability = getPaymentMethodAvailability();
  const canPay = order.status === "PENDING_PAYMENT" && order.payment?.status !== "PAID";
  const alipayEnabled = paymentConfig.provider === "ALIPAY" && availability.alipay;
  const wechatEnabled = paymentConfig.provider === "WECHAT" && availability.wechat;

  return (
    <PageShell className="bg-[#f7f4ee]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#116a6c]">确认付款</p>
          <h1 className="mt-2 text-3xl font-bold text-[#172c2c]">本次应付 {formatOrderCurrency(order.totalAmount)}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#66736e]">
            支付后费用将进入平台担保状态。课程完成并由家长确认后，订单进入后续结算流程。
          </p>
        </div>
        <ButtonLink href={`/parent/orders/${order.id}`} variant="outline">
          返回订单详情
        </ButtonLink>
      </div>

      {query.error ? (
        <NoticeStrip className="mb-6" tone="red">
          {query.error}
        </NoticeStrip>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <div className="grid gap-6">
          <ParentSection title="本次辅导">
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

          <ParentSection title="金额明细">
            <Card className="p-6">
              <dl className="space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[#708188]">课时</dt>
                  <dd className="font-semibold text-[#1f2d2d]">{order.hours} 小时</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#708188]">每小时价格</dt>
                  <dd className="font-semibold text-[#1f2d2d]">{formatOrderCurrency(order.hourlyPrice)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#708188]">订单金额</dt>
                  <dd className="font-semibold text-[#1f2d2d]">{formatOrderCurrency(order.totalAmount)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#708188]">本次支付</dt>
                  <dd className="font-semibold text-[#1f2d2d]">{formatOrderCurrency(order.totalAmount)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-[#edf2ef] pt-4">
                  <dt className="font-semibold text-[#1f2d2d]">应付总额</dt>
                  <dd className="text-2xl font-bold text-[#116a6c]">{formatOrderCurrency(order.totalAmount)}</dd>
                </div>
              </dl>
              <p className="mt-4 rounded-lg bg-[#f3f8f6] px-4 py-3 text-sm leading-6 text-[#60716c]">
                款项支付后由平台担保。辅导完成并确认后，平台将从订单金额中向大学生家教侧收取5%的信息服务费，不会额外增加家长本次支付金额。
              </p>
            </Card>
          </ParentSection>
        </div>

        <div className="grid gap-6 content-start">
          <ParentSection title="支付方式">
            <Card className="p-6">
              <div className="grid gap-3">
                <div className="rounded-2xl border border-[#116a6c] bg-[#eaf6f1] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-[#1f2d2d]">模拟支付</span>
                    <Badge tone="blue">可用</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#536861]">
                    当前可使用模拟支付完成流程，费用会进入担保状态。
                  </p>
                </div>

                <div className="rounded-2xl border border-[#dbe7e3] bg-white p-4 text-[#708188]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">支付宝</span>
                    <Badge tone={alipayEnabled ? "green" : "gray"}>
                      {alipayEnabled ? "可用" : "未启用"}
                    </Badge>
                  </div>
                  {!alipayEnabled ? (
                    <ButtonLink className="mt-3" href={disabledPayHref(order.id)} variant="outline">
                      查看提示
                    </ButtonLink>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-[#dbe7e3] bg-white p-4 text-[#708188]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">微信支付</span>
                    <Badge tone={wechatEnabled ? "green" : "gray"}>
                      {wechatEnabled ? "可用" : "未启用"}
                    </Badge>
                  </div>
                  {!wechatEnabled ? (
                    <ButtonLink className="mt-3" href={disabledPayHref(order.id)} variant="outline">
                      查看提示
                    </ButtonLink>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 rounded-xl bg-[#f8fbfa] px-4 py-3 text-sm leading-6 text-[#536861]">
                支付前请确认预约信息。对服务或退款有疑问，可以先查看服务规则和退款规则。
                <div className="mt-3 flex flex-wrap gap-3">
                  <ButtonLink href="/service-rules" variant="outline">
                    服务规则
                  </ButtonLink>
                  <ButtonLink href="/refund-rules" variant="outline">
                    退款规则
                  </ButtonLink>
                </div>
              </div>

              {canPay ? (
                <form action={payOrderAction} className="mt-6">
                  <input name="orderId" type="hidden" value={order.id} />
                  <Button className="h-12 w-full text-base" type="submit">
                    确认支付 {formatOrderCurrency(order.totalAmount)}
                  </Button>
                </form>
              ) : (
                <div className="mt-6 rounded-xl bg-[#f6f7f8] px-4 py-3 text-sm text-[#60727a]">
                  当前订单不能发起支付。
                </div>
              )}
            </Card>
          </ParentSection>
        </div>
      </div>
    </PageShell>
  );
}
