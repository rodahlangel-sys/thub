import { redirect } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { Button, ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { PageShell } from "@/components/ui/PageShell";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/orders";
import { getDashboardPath } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import {
  formatTutorMoney,
  formatTutorParentName,
  getTutorOrderStatusLabel,
  getTutorTeachModeLabel,
  safeTutorText,
} from "@/lib/tutor-display";
import {
  confirmTutorOrderAction,
  rejectTutorOrderAction,
  startTutorOrderAction,
} from "./actions";
import { startOrderConversationAction } from "@/app/messages/actions";

type TutorOrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

const statusTone: Record<OrderStatus, "blue" | "green" | "yellow" | "red" | "gray"> = {
  PENDING_TUTOR_CONFIRM: "yellow",
  PENDING_PAYMENT: "blue",
  ESCROWED: "green",
  IN_PROGRESS: "blue",
  PENDING_PARENT_CONFIRM: "yellow",
  COMPLETED: "green",
  REFUND_REQUESTED: "yellow",
  REFUNDED: "gray",
  CANCELLED: "gray",
};

function getOrderStage(status: OrderStatus) {
  if (status === "PENDING_TUTOR_CONFIRM") {
    return {
      title: "你收到一条新的预约",
      description: "查看家长需求、上课时间和地点后，再决定是否接单。",
    };
  }

  if (status === "PENDING_PAYMENT") {
    return {
      title: "已确认预约，等待家长付款",
      description: "付款完成后，订单会进入担保状态，你再按约定时间完成辅导。",
    };
  }

  if (status === "ESCROWED") {
    return {
      title: "本次辅导已安排",
      description: "家长已完成担保支付，请按预约时间准备上课。",
    };
  }

  if (status === "IN_PROGRESS") {
    return {
      title: "辅导完成后提交反馈",
      description: "记录本次辅导内容、孩子掌握情况和下次建议。",
    };
  }

  if (status === "PENDING_PARENT_CONFIRM") {
    return {
      title: "课后反馈已提交",
      description: "等待家长确认本次辅导完成。",
    };
  }

  if (status === "COMPLETED") {
    return {
      title: "本次订单已完成",
      description: "评价和服务记录会保留在你的服务评价中。",
    };
  }

  if (status === "REFUND_REQUESTED") {
    return {
      title: "该订单正在处理退款申请",
      description: "平台会审核退款申请，请关注处理结果。",
    };
  }

  if (status === "REFUNDED") {
    return {
      title: "该订单已退款",
      description: "退款处理已完成，订单已结束。",
    };
  }

  return {
    title: "该预约已取消",
    description: "本次预约没有继续进行。",
  };
}

function getPaymentStatusLabel(status: string) {
  if (status === "PAID") return "已支付";
  if (status === "REFUNDED") return "已退款";
  return "未支付";
}

function getPaymentProviderLabel(provider: string) {
  if (provider === "ALIPAY") return "支付宝";
  if (provider === "WECHAT") return "微信支付";
  return "模拟支付";
}

export default async function TutorOrderDetailPage({ params }: TutorOrderDetailPageProps) {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.TUTOR) {
    redirect(getDashboardPath(user.role));
  }

  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: {
      id,
      tutorId: user.id,
    },
    include: {
      demand: true,
      payment: true,
      lessonFeedback: true,
      review: true,
      settlement: true,
      refunds: {
        orderBy: { createdAt: "desc" },
      },
      parent: {
        select: {
          name: true,
          phone: true,
          parentProfile: {
            select: {
              area: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    redirect("/tutor/orders");
  }

  const latestRefund = order.refunds[0];
  const stage = getOrderStage(order.status);

  return (
    <PageShell>
      <section className="rounded-[1.75rem] border border-[#dfe8e4] bg-[#fffdf8] p-6 shadow-[0_18px_55px_rgba(31,79,72,0.08)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={statusTone[order.status]}>
                {getTutorOrderStatusLabel(order.status)}
              </Badge>
              <span className="text-sm text-[#66736e]">预约详情</span>
            </div>
            <h1 className="mt-4 text-3xl font-bold text-[#172c2c]">{stage.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#60716c]">
              {stage.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {order.status === "PENDING_TUTOR_CONFIRM" ? (
              <>
                <form action={confirmTutorOrderAction}>
                  <input name="orderId" type="hidden" value={order.id} />
                  <Button type="submit">确认接单</Button>
                </form>
                <form action={rejectTutorOrderAction}>
                  <input name="orderId" type="hidden" value={order.id} />
                  <Button type="submit" variant="danger">
                    拒绝预约
                  </Button>
                </form>
              </>
            ) : null}
            {order.status === "ESCROWED" ? (
              <form action={startTutorOrderAction}>
                <input name="orderId" type="hidden" value={order.id} />
                <Button type="submit">开始服务</Button>
              </form>
            ) : null}
            {order.status === "IN_PROGRESS" ? (
              <ButtonLink href={`/tutor/orders/${order.id}/feedback`}>
                提交课后反馈
              </ButtonLink>
            ) : null}
            {order.demandId ? (
              <form action={startOrderConversationAction}>
                <input name="orderId" type="hidden" value={order.id} />
                <Button type="submit" variant="outline">
                  与家长沟通
                </Button>
              </form>
            ) : null}
            <ButtonLink href="/tutor/orders" variant="outline">
              返回预约管理
            </ButtonLink>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-6">
          <h2 className="text-lg font-bold text-[#172c2c]">本次辅导</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-[#708188]">家长</dt>
              <dd className="mt-1 font-medium text-[#182f38]">
                {formatTutorParentName(order.parent.name)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[#708188]">孩子年级</dt>
              <dd className="mt-1 font-medium text-[#182f38]">
                {safeTutorText(order.demand?.childGrade, "年级待确认")}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[#708188]">辅导科目</dt>
              <dd className="mt-1 font-medium text-[#182f38]">
                {safeTutorText(order.subject, "科目待确认")}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[#708188]">上课时间</dt>
              <dd className="mt-1 font-medium text-[#182f38]">
                {formatDateTime(order.scheduledTime)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[#708188]">上课方式</dt>
              <dd className="mt-1 font-medium text-[#182f38]">
                {getTutorTeachModeLabel(order.teachMode)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[#708188]">地点</dt>
              <dd className="mt-1 font-medium text-[#182f38]">
                {safeTutorText(order.location, "地点待确认")}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[#708188]">课时</dt>
              <dd className="mt-1 font-medium text-[#182f38]">{order.hours} 小时</dd>
            </div>
            <div>
              <dt className="text-sm text-[#708188]">家长区域</dt>
              <dd className="mt-1 font-medium text-[#182f38]">
                {safeTutorText(order.parent.parentProfile?.area, "区域待确认")}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold text-[#172c2c]">费用与支付</h2>
          <dl className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm text-[#708188]">每小时价格</dt>
              <dd className="font-medium text-[#182f38]">
                {formatTutorMoney(order.hourlyPrice)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm text-[#708188]">本单服务金额</dt>
              <dd className="text-xl font-bold text-[#0f6f70]">
                {formatTutorMoney(order.totalAmount)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm text-[#708188]">
                {order.settlement ? "平台信息服务费" : "预计平台信息服务费"}
              </dt>
              <dd className="font-medium text-[#182f38]">
                -{formatTutorMoney(order.settlement?.platformFeeAmountFen ?? order.platformFeeAmountFen)}（{(order.platformFeeRateBps / 100).toFixed(0)}%）
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-[#edf2ef] pt-4">
              <dt className="text-sm font-semibold text-[#182f38]">
                {order.settlement ? "实际结算金额" : "预计结算金额"}
              </dt>
              <dd className="text-lg font-bold text-[#0f6f70]">
                {formatTutorMoney(order.settlement?.tutorNetAmountFen ?? order.tutorNetAmountFen)}
              </dd>
            </div>
            {order.settlement ? (
              <>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-sm text-[#708188]">结算状态</dt>
                  <dd className="font-medium text-[#182f38]">
                    {order.settlement.status === "SETTLED" ? "已完成" : "结算处理中"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-sm text-[#708188]">结算时间</dt>
                  <dd className="font-medium text-[#182f38]">
                    {order.settlement.settledAt
                      ? formatDateTime(order.settlement.settledAt)
                      : "暂未完成"}
                  </dd>
                </div>
              </>
            ) : null}
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm text-[#708188]">支付状态</dt>
              <dd className="font-medium text-[#182f38]">
                {order.payment
                  ? `${getPaymentProviderLabel(order.payment.provider)} · ${getPaymentStatusLabel(order.payment.status)}`
                  : "暂无支付记录"}
              </dd>
            </div>
          </dl>
          <p className="mt-4 rounded-lg bg-[#f3f8f6] px-4 py-3 text-sm leading-6 text-[#60716c]">
            订单完成并由家长确认后，平台将按订单金额收取5%的信息服务费。当前为平台模拟结算记录。
          </p>
        </Card>
      </div>

      {order.lessonFeedback || order.review ? (
        <Card className="mt-6 p-6">
          <h2 className="text-lg font-bold text-[#172c2c]">课后记录</h2>
          {order.lessonFeedback ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-[#f6faf8] p-4">
                <p className="text-sm font-semibold text-[#172c2c]">本次辅导内容</p>
                <p className="mt-2 text-sm leading-6 text-[#60716c]">
                  {order.lessonFeedback.content}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f6faf8] p-4">
                <p className="text-sm font-semibold text-[#172c2c]">学生掌握情况</p>
                <p className="mt-2 text-sm leading-6 text-[#60716c]">
                  {order.lessonFeedback.studentPerformance}
                </p>
              </div>
            </div>
          ) : null}
          {order.review ? (
            <div className="mt-5 rounded-2xl border border-[#e4e2d8] bg-white p-4">
              <p className="font-semibold text-[#172c2c]">
                家长评价：{order.review.overallScore.toFixed(1)} 分
              </p>
              <p className="mt-2 text-sm leading-6 text-[#60716c]">{order.review.comment}</p>
            </div>
          ) : null}
        </Card>
      ) : null}

      {latestRefund ? (
        <Card className="mt-6 p-6">
          <h2 className="text-lg font-bold text-[#172c2c]">售后状态</h2>
          <dl className="mt-5 grid gap-4 text-sm md:grid-cols-3">
            <div>
              <dt className="text-[#708188]">退款原因</dt>
              <dd className="mt-1 font-medium text-[#182f38]">{latestRefund.reason}</dd>
            </div>
            <div>
              <dt className="text-[#708188]">申请金额</dt>
              <dd className="mt-1 font-medium text-[#182f38]">
                {formatTutorMoney(latestRefund.refundAmount)}
              </dd>
            </div>
            <div>
              <dt className="text-[#708188]">申请时间</dt>
              <dd className="mt-1 font-medium text-[#182f38]">
                {formatDateTime(latestRefund.createdAt)}
              </dd>
            </div>
          </dl>
        </Card>
      ) : null}

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-bold text-[#172c2c]">相关规则</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <ButtonLink href="/service-rules" variant="outline">
            服务规则
          </ButtonLink>
          <ButtonLink href="/safety" variant="outline">
            安全提示
          </ButtonLink>
        </div>
      </Card>
    </PageShell>
  );
}
