import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { Button, ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import {
  formatDateTime,
  formatOrderMoney,
  formatShortOrderId,
  getOrderStatusTone,
} from "@/lib/orders";
import {
  getDashboardPath,
  getOrderStatusLabel,
  getPaymentProviderLabel,
  getPaymentStatusLabel,
  getRefundStatusLabel,
  getTeachModeLabel,
} from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { approveRefundAction, rejectRefundAction } from "./actions";

type AdminRefundDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

function getRefundTone(status: "PENDING" | "APPROVED" | "REJECTED") {
  if (status === "APPROVED") {
    return "green" as const;
  }

  if (status === "REJECTED") {
    return "red" as const;
  }

  return "yellow" as const;
}

export default async function AdminRefundDetailPage({
  params,
  searchParams,
}: AdminRefundDetailPageProps) {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.ADMIN) {
    redirect(getDashboardPath(user.role));
  }

  const { id } = await params;
  const query = (await searchParams) ?? {};
  const refund = await prisma.refund.findUnique({
    where: { id },
    include: {
      applicant: { select: { name: true, email: true, phone: true } },
      order: {
        include: {
          payment: true,
          parent: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
          tutor: {
            select: {
              name: true,
              email: true,
              phone: true,
              tutorProfile: {
                select: {
                  school: true,
                  major: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!refund) {
    redirect("/admin/refunds");
  }

  const canReview = refund.status === "PENDING";

  return (
    <main className="flex-1 bg-[#f4f7f8] py-10">
      <Container>
        <PageHeader
          actions={<ButtonLink href="/admin/refunds" variant="outline">返回退款管理</ButtonLink>}
          description={`退款编号：${formatShortOrderId(refund.id)}`}
          eyebrow="退款详情"
          title={`${refund.order.subject} 退款申请`}
        />

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Badge tone={getRefundTone(refund.status)}>
            {getRefundStatusLabel(refund.status)}
          </Badge>
          <Badge tone={getOrderStatusTone(refund.order.status)}>
            {getOrderStatusLabel(refund.order.status)}
          </Badge>
        </div>

        {query.error ? (
          <div className="mt-5 rounded-md bg-[#fff1f1] px-4 py-3 text-sm text-[#9f3333]">
            {query.error}
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-6">
            <Card className="p-6">
              <h2 className="font-semibold text-[#182f38]">退款申请信息</h2>
              <dl className="mt-5 space-y-4 text-sm">
                <div>
                  <dt className="text-[#708188]">申请原因</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{refund.reason}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">补充说明</dt>
                  <dd className="mt-1 leading-6 text-[#244b5b]">{refund.description || "暂无"}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">申请金额</dt>
                  <dd className="mt-1 text-lg font-bold text-[#182f38]">{formatOrderMoney(refund.refundAmount)}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">申请时间</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{formatDateTime(refund.createdAt)}</dd>
                </div>
                {refund.adminNote ? (
                  <div>
                    <dt className="text-[#708188]">管理员备注</dt>
                    <dd className="mt-1 leading-6 text-[#244b5b]">{refund.adminNote}</dd>
                  </div>
                ) : null}
              </dl>
            </Card>

            <Card className="p-6">
              <h2 className="font-semibold text-[#182f38]">家长与老师</h2>
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[#708188]">家长姓名</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{refund.order.parent.name}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">家长邮箱</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{refund.order.parent.email}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">家长手机</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{refund.order.parent.phone}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">老师姓名</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{refund.order.tutor.name}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">老师邮箱</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{refund.order.tutor.email}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">学校与专业</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">
                    {refund.order.tutor.tutorProfile
                      ? `${refund.order.tutor.tutorProfile.school}｜${refund.order.tutor.tutorProfile.major}`
                      : "未填写"}
                  </dd>
                </div>
              </dl>
            </Card>
          </div>

          <div className="grid gap-6">
            <Card className="p-6">
              <h2 className="font-semibold text-[#182f38]">订单信息</h2>
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[#708188]">订单编号</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{formatShortOrderId(refund.order.id)}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">科目</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{refund.order.subject}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">预约时间</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{formatDateTime(refund.order.scheduledTime)}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">上课方式</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{getTeachModeLabel(refund.order.teachMode)}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">课时</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{refund.order.hours} 小时</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">每小时价格</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{formatOrderMoney(refund.order.hourlyPrice)}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">总金额</dt>
                  <dd className="mt-1 text-lg font-bold text-[#182f38]">{formatOrderMoney(refund.order.totalAmount)}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">当前订单状态</dt>
                  <dd className="mt-1">
                    <Badge tone={getOrderStatusTone(refund.order.status)}>
                      {getOrderStatusLabel(refund.order.status)}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </Card>

            <Card className="p-6">
              <h2 className="font-semibold text-[#182f38]">支付信息</h2>
              {refund.order.payment ? (
                <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-[#708188]">支付方式</dt>
                    <dd className="mt-1 font-medium text-[#182f38]">{getPaymentProviderLabel(refund.order.payment.provider)}</dd>
                  </div>
                  <div>
                    <dt className="text-[#708188]">支付状态</dt>
                    <dd className="mt-1 font-medium text-[#182f38]">{getPaymentStatusLabel(refund.order.payment.status)}</dd>
                  </div>
                  <div>
                    <dt className="text-[#708188]">支付金额</dt>
                    <dd className="mt-1 font-medium text-[#182f38]">{formatOrderMoney(refund.order.payment.amount)}</dd>
                  </div>
                  <div>
                    <dt className="text-[#708188]">支付时间</dt>
                    <dd className="mt-1 font-medium text-[#182f38]">
                      {refund.order.payment.paidAt ? formatDateTime(refund.order.payment.paidAt) : "暂无"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[#708188]">交易号</dt>
                    <dd className="mt-1 break-all font-medium text-[#182f38]">{refund.order.payment.transactionNo || "暂无"}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-3 text-sm text-[#60727a]">暂无支付记录。</p>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="font-semibold text-[#182f38]">审核操作</h2>
              {canReview ? (
                <div className="mt-5 grid gap-5">
                  <form action={approveRefundAction} className="space-y-3">
                    <input name="refundId" type="hidden" value={refund.id} />
                    <label className="block text-sm font-medium text-[#244b5b]">
                      同意备注
                      <textarea
                        className="mt-2 min-h-20 w-full rounded-md border border-[#cbd9de] px-3 py-2 outline-none focus:border-[#176b87] focus:ring-2 focus:ring-[#d7ebf0]"
                        name="adminNote"
                        placeholder="可填写处理说明"
                      />
                    </label>
                    <Button type="submit">同意退款</Button>
                  </form>

                  <form action={rejectRefundAction} className="space-y-3 border-t border-[#edf1f3] pt-5">
                    <input name="refundId" type="hidden" value={refund.id} />
                    <label className="block text-sm font-medium text-[#244b5b]">
                      拒绝原因
                      <textarea
                        className="mt-2 min-h-20 w-full rounded-md border border-[#cbd9de] px-3 py-2 outline-none focus:border-[#176b87] focus:ring-2 focus:ring-[#d7ebf0]"
                        name="adminNote"
                        placeholder="请填写拒绝原因"
                        required
                      />
                    </label>
                    <Button type="submit" variant="danger">拒绝退款</Button>
                  </form>
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-[#60727a]">
                  该退款申请已处理，不能重复审核。
                </p>
              )}
            </Card>
          </div>
        </div>
      </Container>
    </main>
  );
}
