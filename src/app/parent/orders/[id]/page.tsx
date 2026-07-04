import { redirect } from "next/navigation";
import { UserRole, type OrderStatus, type RefundStatus } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { Button, ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { ParentSection } from "@/components/parent/ParentSection";
import { PageShell } from "@/components/ui/PageShell";
import { requireUser } from "@/lib/auth";
import { canRequestPaidRefund } from "@/lib/refunds";
import { formatShortOrderId } from "@/lib/orders";
import {
  formatOrderCurrency,
  formatParentDateTime,
  getParentOrderStatusHint,
  getParentOrderStatusLabel,
  getParentOrderStatusTone,
  safeText,
} from "@/lib/parent-display";
import {
  getDashboardPath,
  getPaymentProviderLabel,
  getTeachModeLabel,
} from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { cancelParentOrderAction, confirmParentOrderCompletedAction } from "./actions";
import { startOrderConversationAction } from "@/app/messages/actions";

type ParentOrderDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

function getTopTitle(status: OrderStatus) {
  const titles: Record<OrderStatus, string> = {
    PENDING_TUTOR_CONFIRM: "预约已提交，等待老师确认",
    PENDING_PAYMENT: "老师已确认，请完成付款",
    WAIT_PLATFORM_CONFIRM: "等待平台确认收款",
    WAIT_TUTOR_PAYMENT: "请向家教支付服务费",
    WAIT_TUTOR_CONFIRM: "等待家教确认收款",
    ESCROWED: "辅导安排已确认",
    IN_PROGRESS: "本次辅导进行中",
    PENDING_PARENT_CONFIRM: "老师已提交课后反馈",
    COMPLETED: "本次辅导已完成",
    REFUND_REQUESTED: "退款申请处理中",
    REFUNDED: "退款已完成",
    CANCELLED: "预约已取消",
  };

  return titles[status];
}

function getPaymentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    UNPAID: "未支付",
    WAIT_PLATFORM_CONFIRM: "待确认平台收款",
    WAIT_TUTOR_PAYMENT: "待支付家教费用",
    WAIT_TUTOR_CONFIRM: "待家教确认收款",
    PAID: "已支付",
    REFUNDED: "已退款",
  };

  return labels[status] ?? status;
}

function getRefundStatusLabel(status: RefundStatus) {
  const labels: Record<RefundStatus, string> = {
    PENDING: "待审核",
    APPROVED: "已通过",
    REJECTED: "已拒绝",
  };

  return labels[status];
}

function getRefundTone(status: RefundStatus) {
  if (status === "APPROVED") return "green" as const;
  if (status === "REJECTED") return "red" as const;
  return "yellow" as const;
}

export default async function ParentOrderDetailPage({
  params,
  searchParams,
}: ParentOrderDetailPageProps) {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.PARENT) {
    redirect(getDashboardPath(user.role));
  }

  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: {
      id,
      parentId: user.id,
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
      tutor: {
        select: {
          name: true,
          email: true,
          phone: true,
          tutorProfile: true,
        },
      },
    },
  });

  if (!order) {
    redirect("/parent/orders");
  }

  const query = (await searchParams) ?? {};
  const latestRefund = order.refunds[0];
  const canShowRefundButton =
    canRequestPaidRefund(order.status) &&
    order.payment?.status === "PAID" &&
    !order.refunds.some((refund) => refund.status === "PENDING");

  return (
    <PageShell className="bg-[#f7f4ee]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#116a6c]">订单详情</p>
          <h1 className="mt-2 text-3xl font-bold text-[#172c2c]">{getTopTitle(order.status)}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#66736e]">
            {getParentOrderStatusHint(order.status)}
          </p>
        </div>
        <ButtonLink href="/parent/orders" variant="outline">
          返回我的订单
        </ButtonLink>
      </div>

      {query.error ? (
        <div className="mb-6 rounded-lg border border-[#efc8c8] bg-[#fff5f5] px-4 py-3 text-sm text-[#9f3030]">
          {query.error}
        </div>
      ) : null}

      <Card className="mb-6 overflow-hidden border-[#cfe6e0] bg-[#eaf6f1]">
        <div className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <Badge tone={getParentOrderStatusTone(order.status)}>
              {getParentOrderStatusLabel(order.status)}
            </Badge>
            <h2 className="mt-4 text-2xl font-bold text-[#172c2c]">
              {safeText(order.subject, "科目信息待确认")} · {safeText(order.tutor.name, "老师信息待完善")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#536861]">
              {formatParentDateTime(order.scheduledTime)} · {getTeachModeLabel(order.teachMode)} ·{" "}
              {safeText(order.location, "地点待确认")}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 lg:justify-end">
            {order.status === "PENDING_TUTOR_CONFIRM" ? (
              <form action={cancelParentOrderAction}>
                <input name="orderId" type="hidden" value={order.id} />
                <Button type="submit" variant="danger">
                  取消预约
                </Button>
              </form>
            ) : null}
            {order.status === "PENDING_PAYMENT" ? (
              <ButtonLink href={`/parent/orders/${order.id}/pay`}>去付款</ButtonLink>
            ) : null}
            {order.status === "PENDING_PARENT_CONFIRM" ? (
              <form action={confirmParentOrderCompletedAction}>
                <input name="orderId" type="hidden" value={order.id} />
                <Button type="submit">确认本次辅导已完成</Button>
              </form>
            ) : null}
            {order.status === "COMPLETED" && !order.review ? (
              <ButtonLink href={`/parent/orders/${order.id}/review`}>评价本次辅导</ButtonLink>
            ) : null}
            {canShowRefundButton ? (
              <ButtonLink href={`/parent/orders/${order.id}/refund`} variant="outline">
                申请退款
              </ButtonLink>
            ) : null}
            {order.demandId ? (
              <form action={startOrderConversationAction}>
                <input name="orderId" type="hidden" value={order.id} />
                <Button type="submit" variant="outline">
                  与家教沟通
                </Button>
              </form>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-6">
          <ParentSection title="本次辅导">
            <Card className="p-6">
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[#708188]">老师</dt>
                  <dd className="mt-1 font-semibold text-[#1f2d2d]">
                    {safeText(order.tutor.name, "老师信息待完善")}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#708188]">科目</dt>
                  <dd className="mt-1 font-semibold text-[#1f2d2d]">
                    {safeText(order.subject, "科目信息待确认")}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#708188]">时间</dt>
                  <dd className="mt-1 font-semibold text-[#1f2d2d]">
                    {formatParentDateTime(order.scheduledTime)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#708188]">方式</dt>
                  <dd className="mt-1 font-semibold text-[#1f2d2d]">
                    {getTeachModeLabel(order.teachMode)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#708188]">地点</dt>
                  <dd className="mt-1 font-semibold text-[#1f2d2d]">
                    {safeText(order.location, "地点待确认")}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#708188]">课时</dt>
                  <dd className="mt-1 font-semibold text-[#1f2d2d]">{order.hours} 小时</dd>
                </div>
              </dl>
            </Card>
          </ParentSection>

          {order.lessonFeedback ? (
            <ParentSection title="课后反馈" description="老师提交的本次辅导记录。">
              <Card className="p-6">
                <dl className="grid gap-5 text-sm">
                  <div>
                    <dt className="font-semibold text-[#244b5b]">本次辅导内容</dt>
                    <dd className="mt-2 leading-6 text-[#536861]">{safeText(order.lessonFeedback.content)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#244b5b]">孩子掌握情况</dt>
                    <dd className="mt-2 leading-6 text-[#536861]">
                      {safeText(order.lessonFeedback.studentPerformance)}
                    </dd>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold text-[#244b5b]">存在的问题</dt>
                      <dd className="mt-2 leading-6 text-[#536861]">
                        {safeText(order.lessonFeedback.problems, "老师暂未补充")}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#244b5b]">下次建议</dt>
                      <dd className="mt-2 leading-6 text-[#536861]">
                        {safeText(order.lessonFeedback.nextSuggestion, "老师暂未补充")}
                      </dd>
                    </div>
                  </div>
                </dl>
              </Card>
            </ParentSection>
          ) : null}

          {order.review ? (
            <ParentSection title="我的评价">
              <Card className="p-6">
                <p className="text-3xl font-bold text-[#116a6c]">
                  {order.review.overallScore.toFixed(1)} 分
                </p>
                <p className="mt-3 leading-6 text-[#536861]">{safeText(order.review.comment)}</p>
              </Card>
            </ParentSection>
          ) : null}

          {latestRefund ? (
            <ParentSection title="售后进度">
              <Card className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#1f2d2d]">{safeText(latestRefund.reason)}</p>
                    <p className="mt-1 text-sm text-[#66736e]">
                      申请金额 {formatOrderCurrency(latestRefund.refundAmount)}
                    </p>
                  </div>
                  <Badge tone={getRefundTone(latestRefund.status)}>
                    {getRefundStatusLabel(latestRefund.status)}
                  </Badge>
                </div>
                {latestRefund.adminNote ? (
                  <p className="mt-4 rounded-xl bg-[#f8fbfa] px-4 py-3 text-sm leading-6 text-[#536861]">
                    {latestRefund.adminNote}
                  </p>
                ) : null}
              </Card>
            </ParentSection>
          ) : null}
        </div>

        <div className="grid gap-6 content-start">
          <ParentSection title="费用">
            <Card className="p-6">
              <dl className="space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[#708188]">订单金额</dt>
                  <dd className="font-semibold text-[#1f2d2d]">{formatOrderCurrency(order.totalAmount)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#708188]">本次支付</dt>
                  <dd className="font-semibold text-[#1f2d2d]">{formatOrderCurrency(order.payment?.amount ?? order.totalAmount)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-[#edf2ef] pt-4">
                  <dt className="font-semibold text-[#1f2d2d]">订单总额</dt>
                  <dd className="text-xl font-bold text-[#116a6c]">{formatOrderCurrency(order.totalAmount)}</dd>
                </div>
              </dl>
              <p className="mt-4 rounded-lg bg-[#f3f8f6] px-4 py-3 text-sm leading-6 text-[#60716c]">
                平台信息服务费从订单金额中向大学生家教侧扣取，不会在本次订单金额之外向家长重复收费。
              </p>
              {order.settlement?.status === "SETTLED" ? (
                <p className="mt-3 text-sm font-semibold text-[#116a6c]">平台已完成本单结算</p>
              ) : null}
            </Card>
          </ParentSection>

          {order.payment ? (
            <ParentSection title="支付信息">
              <Card className="p-6">
                <dl className="space-y-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#708188]">方式</dt>
                    <dd className="font-semibold text-[#1f2d2d]">
                      {getPaymentProviderLabel(order.payment.provider)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#708188]">状态</dt>
                    <dd className="font-semibold text-[#1f2d2d]">
                      {getPaymentStatusLabel(order.payment.status)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#708188]">金额</dt>
                    <dd className="font-semibold text-[#1f2d2d]">{formatOrderCurrency(order.payment.amount)}</dd>
                  </div>
                </dl>
              </Card>
            </ParentSection>
          ) : null}

          <ParentSection title="老师信息">
            <Card className="p-6">
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-[#708188]">姓名</dt>
                  <dd className="mt-1 font-semibold text-[#1f2d2d]">
                    {safeText(order.tutor.name, "老师信息待完善")}
                  </dd>
                </div>
                {order.tutor.tutorProfile ? (
                  <div>
                    <dt className="text-[#708188]">学校与专业</dt>
                    <dd className="mt-1 font-semibold text-[#1f2d2d]">
                      {safeText(order.tutor.tutorProfile.school, "学校待完善")} ·{" "}
                      {safeText(order.tutor.tutorProfile.major, "专业待完善")}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-[#708188]">联系电话</dt>
                  <dd className="mt-1 font-semibold text-[#1f2d2d]">
                    {safeText(order.tutor.phone, "电话待确认")}
                  </dd>
                </div>
              </dl>
            </Card>
          </ParentSection>

          <ParentSection title="订单信息">
            <Card className="p-6">
              <dl className="space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[#708188]">订单编号</dt>
                  <dd className="font-semibold text-[#1f2d2d]">{formatShortOrderId(order.id)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#708188]">创建时间</dt>
                  <dd className="font-semibold text-[#1f2d2d]">
                    {formatParentDateTime(order.createdAt)}
                  </dd>
                </div>
              </dl>
            </Card>
          </ParentSection>

          <ParentSection title="相关规则">
            <Card className="p-6">
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/service-rules" variant="outline">
                  服务规则
                </ButtonLink>
                <ButtonLink href="/refund-rules" variant="outline">
                  退款规则
                </ButtonLink>
                <ButtonLink href="/safety" variant="outline">
                  安全提示
                </ButtonLink>
              </div>
            </Card>
          </ParentSection>
        </div>
      </div>
    </PageShell>
  );
}
