/* eslint-disable @next/next/no-img-element */
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { ParentSection } from "@/components/parent/ParentSection";
import { NoticeStrip } from "@/components/ui/NoticeStrip";
import { PageShell } from "@/components/ui/PageShell";
import { StepTimeline } from "@/components/ui/StepTimeline";
import { requireUser } from "@/lib/auth";
import {
  formatOrderCurrency,
  formatParentDateTime,
  getParentOrderStatusLabel,
  getParentOrderStatusTone,
  safeText,
} from "@/lib/parent-display";
import { paymentQrTypeLabels, paymentQrTypes } from "@/lib/payment-qrcodes";
import { getQrCodePaymentStage } from "@/lib/qrcode-payments";
import { getDashboardPath, getTeachModeLabel } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { markTutorQrPaymentCompletedAction, payOrderAction } from "./actions";

type PayPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

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
          tutorProfile: {
            include: {
              paymentQrCodes: {
                orderBy: { type: "asc" },
              },
            },
          },
        },
      },
      payment: true,
    },
  });

  if (!order) {
    redirect("/parent/orders");
  }

  const platformQrCodes = await prisma.platformPaymentQrCode.findMany({
    orderBy: { type: "asc" },
  });
  const platformQrByType = new Map(platformQrCodes.map((qr) => [qr.type, qr]));
  const tutorQrCodes = order.tutor.tutorProfile?.paymentQrCodes ?? [];
  const tutorQrByType = new Map(tutorQrCodes.map((qr) => [qr.type, qr]));
  const tutorProfileId = order.tutor.tutorProfile?.id ?? "";

  const qrStage = getQrCodePaymentStage({
    orderStatus: order.status,
    paymentStatus: order.payment?.status,
    hasPlatformQr: platformQrCodes.length > 0,
    hasTutorQr: tutorQrCodes.length > 0,
  });

  // 历史已支付订单（Mock 时代遗留的 ESCROWED 状态）兼容显示
  const isLegacyPaidOrder =
    order.status === "ESCROWED" &&
    order.payment?.status === "PAID" &&
    order.payment?.provider !== "QRCODE";

  return (
    <PageShell className="bg-[#f7f4ee]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#116a6c]">确认付款</p>
          <h1 className="mt-2 text-3xl font-bold text-[#172c2c]">
            本次应付 {formatOrderCurrency(order.totalAmount)}
          </h1>
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

      {isLegacyPaidOrder ? (
        // 历史 Mock 订单已支付：兼容显示完成状态，不展示二维码流程
        <ParentSection title="支付完成">
          <Card className="p-6">
            <NoticeStrip tone="green">
              该订单已完成支付，费用进入担保状态。
            </NoticeStrip>
            <div className="mt-5">
              <ButtonLink href={`/parent/orders/${order.id}`}>
                查看订单详情
              </ButtonLink>
            </div>
          </Card>
        </ParentSection>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <ParentSection title="支付进度">
            <Card className="p-6">
              <StepTimeline
                steps={[
                  {
                    title: "步骤① 支付平台信息费",
                    description: `平台信息服务费 ${formatOrderCurrency(order.platformFeeAmountFen)}，扫描管理员收款码完成付款。`,
                    active: qrStage === "PAY_PLATFORM_FEE",
                  },
                  {
                    title: "等待管理员确认",
                    description: "管理员确认收到平台信息服务费后，才会展示家教收款码。",
                    active: qrStage === "WAIT_PLATFORM_CONFIRM",
                  },
                  {
                    title: "步骤② 支付家教费用",
                    description: `家教服务费 ${formatOrderCurrency(order.tutorNetAmountFen)}，扫描家教收款码完成付款。`,
                    active: qrStage === "PAY_TUTOR",
                  },
                  {
                    title: "等待家教确认",
                    description: "家教确认收到服务费后，订单进入已支付状态。",
                    active: qrStage === "WAIT_TUTOR_CONFIRM",
                  },
                  {
                    title: "支付完成",
                    description: "费用进入担保状态，按约定时间上课。",
                    active: qrStage === "PAID",
                  },
                ]}
              />
              <div className="mt-5 rounded-xl bg-[#f8fbfa] px-4 py-3 text-sm leading-6 text-[#536861]">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={getParentOrderStatusTone(order.status)}>
                    {getParentOrderStatusLabel(order.status)}
                  </Badge>
                  <span>
                    · {formatParentDateTime(order.scheduledTime)} ·{" "}
                    {getTeachModeLabel(order.teachMode)}
                  </span>
                </div>
                <p className="mt-2">
                  订单金额 {formatOrderCurrency(order.totalAmount)}
                  ，平台信息服务费{" "}
                  {formatOrderCurrency(order.platformFeeAmountFen)}
                  ，家教服务费{" "}
                  {formatOrderCurrency(order.tutorNetAmountFen)}。
                </p>
                <p className="mt-2">
                  科目：{safeText(order.subject, "待确认")} · 老师：
                  {safeText(order.tutor.name, "待确认")}
                </p>
              </div>
            </Card>
          </ParentSection>

          <div className="grid content-start gap-6">
            {qrStage === "UNAVAILABLE" ? (
              <ParentSection title="扫码支付">
                <Card className="p-6">
                  <NoticeStrip tone="yellow">
                    {platformQrCodes.length === 0
                      ? "平台收款二维码尚未配置，请联系管理员。"
                      : "家教尚未配置收款二维码，请联系家教上传后再继续。"}
                  </NoticeStrip>
                </Card>
              </ParentSection>
            ) : null}

            {qrStage === "PAY_PLATFORM_FEE" ? (
              <ParentSection title="步骤① 支付平台信息费">
                <Card className="p-6">
                  <p className="text-sm leading-6 text-[#60716c]">
                    请使用微信或支付宝扫描下方管理员收款码，支付平台信息服务费{" "}
                    <span className="font-semibold text-[#116a6c]">
                      {formatOrderCurrency(order.platformFeeAmountFen)}
                    </span>
                    。
                  </p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {paymentQrTypes.map((type) => {
                      const qr = platformQrByType.get(type);
                      if (!qr) return null;
                      return (
                        <div
                          className="rounded-2xl border border-[#dbe7e4] bg-[#f8fbfa] p-4"
                          key={type}
                        >
                          <p className="text-sm font-semibold text-[#172c2c]">
                            {paymentQrTypeLabels[type]}
                          </p>
                          <img
                            alt={`${paymentQrTypeLabels[type]}平台收款码`}
                            className="mt-3 h-60 w-full rounded-xl border border-[#e1ebe8] bg-white object-contain"
                            src={`/api/payment-qrcodes/platform/default/${type}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <form action={payOrderAction} className="mt-6">
                    <input name="orderId" type="hidden" value={order.id} />
                    <button
                      className="h-12 w-full rounded-xl bg-[#116a6c] text-base font-semibold text-white transition hover:bg-[#0d5556]"
                      type="submit"
                    >
                      我已完成平台信息费支付
                    </button>
                  </form>
                  <p className="mt-3 text-xs leading-5 text-[#60716c]">
                    点击按钮后订单进入“等待管理员确认”，管理员确认收款前不会展示家教收款码。
                  </p>
                </Card>
              </ParentSection>
            ) : null}

            {qrStage === "WAIT_PLATFORM_CONFIRM" ? (
              <ParentSection title="等待管理员确认">
                <Card className="p-6">
                  <NoticeStrip tone="yellow">
                    已标记完成平台信息服务费付款，请等待管理员确认收款。确认后会自动展示家教收款码。
                  </NoticeStrip>
                  <p className="mt-4 text-sm leading-6 text-[#60716c]">
                    在管理员确认前，家教收款码不会展示。如长时间未确认，请联系平台客服。
                  </p>
                </Card>
              </ParentSection>
            ) : null}

            {qrStage === "PAY_TUTOR" ? (
              <ParentSection title="步骤② 支付家教费用">
                <Card className="p-6">
                  <p className="text-sm leading-6 text-[#60716c]">
                    管理员已确认收到平台信息服务费。请使用微信或支付宝扫描下方家教收款码，支付家教服务费{" "}
                    <span className="font-semibold text-[#116a6c]">
                      {formatOrderCurrency(order.tutorNetAmountFen)}
                    </span>
                    。
                  </p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {paymentQrTypes.map((type) => {
                      const qr = tutorQrByType.get(type);
                      if (!qr) return null;
                      return (
                        <div
                          className="rounded-2xl border border-[#dbe7e4] bg-[#f8fbfa] p-4"
                          key={type}
                        >
                          <p className="text-sm font-semibold text-[#172c2c]">
                            {paymentQrTypeLabels[type]}
                          </p>
                          <img
                            alt={`${paymentQrTypeLabels[type]}家教收款码`}
                            className="mt-3 h-60 w-full rounded-xl border border-[#e1ebe8] bg-white object-contain"
                            src={`/api/payment-qrcodes/tutor/${tutorProfileId}/${type}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <form action={markTutorQrPaymentCompletedAction} className="mt-6">
                    <input name="orderId" type="hidden" value={order.id} />
                    <button
                      className="h-12 w-full rounded-xl bg-[#116a6c] text-base font-semibold text-white transition hover:bg-[#0d5556]"
                      type="submit"
                    >
                      我已完成家教课酬支付
                    </button>
                  </form>
                  <p className="mt-3 text-xs leading-5 text-[#60716c]">
                    点击按钮后订单进入“等待家教确认收款”，家教确认后订单完成支付。
                  </p>
                </Card>
              </ParentSection>
            ) : null}

            {qrStage === "WAIT_TUTOR_CONFIRM" ? (
              <ParentSection title="等待家教确认">
                <Card className="p-6">
                  <NoticeStrip tone="yellow">
                    已标记完成家教服务费付款，请等待家教确认收款。确认后订单进入已支付状态。
                  </NoticeStrip>
                  <p className="mt-4 text-sm leading-6 text-[#60716c]">
                    如家教反馈未收到款项，订单会退回到家教付款阶段，请重新确认。
                  </p>
                </Card>
              </ParentSection>
            ) : null}

            {qrStage === "PAID" ? (
              <ParentSection title="支付完成">
                <Card className="p-6">
                  <NoticeStrip tone="green">支付已完成，费用进入担保状态。</NoticeStrip>
                  <div className="mt-5">
                    <ButtonLink href={`/parent/orders/${order.id}`}>
                      查看订单详情
                    </ButtonLink>
                  </div>
                </Card>
              </ParentSection>
            ) : null}
          </div>
        </div>
      )}
    </PageShell>
  );
}
