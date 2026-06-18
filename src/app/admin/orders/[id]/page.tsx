import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import {
  formatDateTime,
  formatOrderMoney,
  formatShortOrderId,
  getOrderStatusDescription,
  getOrderStatusTone,
} from "@/lib/orders";
import {
  getDashboardPath,
  getOrderStatusLabel,
  getPaymentProviderLabel,
  getPaymentStatusLabel,
  getTeachModeLabel,
} from "@/lib/roles";
import { prisma } from "@/lib/prisma";

type AdminOrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.ADMIN) {
    redirect(getDashboardPath(user.role));
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      demand: true,
      payment: true,
      refunds: {
        orderBy: { createdAt: "desc" },
      },
      parent: {
        select: {
          name: true,
          email: true,
          phone: true,
          parentProfile: {
            select: {
              area: true,
            },
          },
        },
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
    redirect("/admin/orders");
  }

  const courseAmount = Math.round(order.hours * order.hourlyPrice);

  return (
    <main className="flex-1 bg-[#f4f7f8] py-10">
      <Container>
        <PageHeader
          actions={<ButtonLink href="/admin/orders" variant="outline">返回订单管理</ButtonLink>}
          description={`订单编号：${formatShortOrderId(order.id)}`}
          eyebrow="订单详情"
          title={`${order.subject} 预约订单`}
        />

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Badge tone={getOrderStatusTone(order.status)}>
            {getOrderStatusLabel(order.status)}
          </Badge>
          <span className="text-sm text-[#60727a]">{getOrderStatusDescription(order.status)}</span>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="grid gap-6">
            <Card className="p-6">
              <h2 className="font-semibold text-[#182f38]">家长信息</h2>
              <dl className="mt-5 space-y-4 text-sm">
                <div>
                  <dt className="text-[#708188]">姓名</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{order.parent.name}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">邮箱</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{order.parent.email}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">手机号</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{order.parent.phone}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">区域</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{order.parent.parentProfile?.area || "未填写"}</dd>
                </div>
              </dl>
            </Card>

            <Card className="p-6">
              <h2 className="font-semibold text-[#182f38]">老师信息</h2>
              <dl className="mt-5 space-y-4 text-sm">
                <div>
                  <dt className="text-[#708188]">姓名</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{order.tutor.name}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">邮箱</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{order.tutor.email}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">手机号</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{order.tutor.phone}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">学校与专业</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">
                    {order.tutor.tutorProfile
                      ? `${order.tutor.tutorProfile.school} · ${order.tutor.tutorProfile.major}`
                      : "未填写"}
                  </dd>
                </div>
              </dl>
            </Card>
          </div>

          <div className="grid gap-6">
            <Card className="p-6">
              <h2 className="font-semibold text-[#182f38]">预约与金额</h2>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-[#708188]">科目</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{order.subject}</dd>
                </div>
                <div>
                  <dt className="text-sm text-[#708188]">预约时间</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{formatDateTime(order.scheduledTime)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-[#708188]">上课方式</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{getTeachModeLabel(order.teachMode)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-[#708188]">上课地点</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{order.location}</dd>
                </div>
                <div>
                  <dt className="text-sm text-[#708188]">课时</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{order.hours} 小时</dd>
                </div>
                <div>
                  <dt className="text-sm text-[#708188]">每小时价格</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{formatOrderMoney(order.hourlyPrice)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-[#708188]">课时费</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{formatOrderMoney(courseAmount)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-[#708188]">服务费</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{formatOrderMoney(order.platformFeeAmountFen)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-[#708188]">总金额</dt>
                  <dd className="mt-1 text-lg font-bold text-[#182f38]">{formatOrderMoney(order.totalAmount)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-[#708188]">创建时间</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{formatDateTime(order.createdAt)}</dd>
                </div>
              </dl>
            </Card>

            <Card className="p-6">
              <h2 className="font-semibold text-[#182f38]">需求摘要</h2>
              {order.demand ? (
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm text-[#708188]">孩子年级</dt>
                    <dd className="mt-1 font-medium text-[#182f38]">{order.demand.childGrade}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-[#708188]">区域</dt>
                    <dd className="mt-1 font-medium text-[#182f38]">{order.demand.area}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm text-[#708188]">目标</dt>
                    <dd className="mt-1 leading-6 text-[#244b5b]">{order.demand.goal}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-3 text-sm text-[#60727a]">关联需求已不存在。</p>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="font-semibold text-[#182f38]">支付记录</h2>
              {order.payment ? (
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm text-[#708188]">支付方式</dt>
                    <dd className="mt-1 font-medium text-[#182f38]">{getPaymentProviderLabel(order.payment.provider)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-[#708188]">支付状态</dt>
                    <dd className="mt-1 font-medium text-[#182f38]">{getPaymentStatusLabel(order.payment.status)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-[#708188]">支付金额</dt>
                    <dd className="mt-1 font-medium text-[#182f38]">{formatOrderMoney(order.payment.amount)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-[#708188]">支付时间</dt>
                    <dd className="mt-1 font-medium text-[#182f38]">
                      {order.payment.paidAt ? formatDateTime(order.payment.paidAt) : "暂无"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm text-[#708188]">交易号</dt>
                    <dd className="mt-1 break-all font-medium text-[#182f38]">{order.payment.transactionNo || "暂无"}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-3 text-sm text-[#60727a]">暂无支付记录。</p>
              )}
            </Card>
          </div>
        </div>

        {order.refunds.length > 0 ? (
          <Card className="mt-6 p-6">
            <h2 className="font-semibold text-[#182f38]">退款记录</h2>
            <div className="mt-5 grid gap-4">
              {order.refunds.map((refund) => (
                <div
                  className="rounded-md border border-[#edf1f3] bg-[#fbfcfc] p-4"
                  key={refund.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#182f38]">
                        {formatShortOrderId(refund.id)}｜{refund.reason}
                      </p>
                      <p className="mt-1 text-xs text-[#708188]">
                        申请时间：{formatDateTime(refund.createdAt)}
                      </p>
                    </div>
                    <ButtonLink href={`/admin/refunds/${refund.id}`} variant="outline">
                      查看退款详情
                    </ButtonLink>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-[#708188]">退款状态</dt>
                      <dd className="mt-1 font-medium text-[#182f38]">
                        {refund.status === "PENDING"
                          ? "待审核"
                          : refund.status === "APPROVED"
                            ? "已通过"
                            : "已拒绝"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#708188]">申请金额</dt>
                      <dd className="mt-1 font-medium text-[#182f38]">{formatOrderMoney(refund.refundAmount)}</dd>
                    </div>
                    <div>
                      <dt className="text-[#708188]">管理员备注</dt>
                      <dd className="mt-1 font-medium text-[#182f38]">{refund.adminNote || "暂无"}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </Container>
    </main>
  );
}
