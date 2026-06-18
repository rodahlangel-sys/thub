import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import {
  formatOrderMoney,
  formatShortOrderId,
  getOrderStatusTone,
} from "@/lib/orders";
import {
  getDashboardPath,
  getOrderStatusLabel,
  getPaymentProviderLabel,
} from "@/lib/roles";
import { prisma } from "@/lib/prisma";

type PaySuccessPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PaySuccessPage({ params }: PaySuccessPageProps) {
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
      payment: true,
    },
  });

  if (!order) {
    redirect("/parent/orders");
  }

  if (!order.payment || order.payment.status !== "PAID") {
    redirect(`/parent/orders/${order.id}`);
  }

  return (
    <main className="flex-1 bg-[#f4f7f8] py-10">
      <Container>
        <PageHeader
          description="费用已进入平台担保状态。"
          eyebrow="支付成功"
          title="模拟支付已完成"
        />

        <Card className="mt-8 p-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="green">支付成功</Badge>
            <Badge tone={getOrderStatusTone(order.status)}>
              {getOrderStatusLabel(order.status)}
            </Badge>
          </div>

          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-[#708188]">订单编号</dt>
              <dd className="mt-1 font-medium text-[#182f38]">{formatShortOrderId(order.id)}</dd>
            </div>
            <div>
              <dt className="text-sm text-[#708188]">支付方式</dt>
              <dd className="mt-1 font-medium text-[#182f38]">{getPaymentProviderLabel(order.payment.provider)}</dd>
            </div>
            <div>
              <dt className="text-sm text-[#708188]">模拟交易号</dt>
              <dd className="mt-1 break-all font-medium text-[#182f38]">{order.payment.transactionNo}</dd>
            </div>
            <div>
              <dt className="text-sm text-[#708188]">支付金额</dt>
              <dd className="mt-1 text-xl font-bold text-[#182f38]">{formatOrderMoney(order.payment.amount)}</dd>
            </div>
          </dl>

          <p className="mt-6 rounded-md bg-[#eef8fa] px-4 py-3 text-sm leading-6 text-[#244b5b]">
            老师完成本次辅导后，家长可在订单详情中确认服务完成。
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href={`/parent/orders/${order.id}`}>返回订单详情</ButtonLink>
            <ButtonLink href="/parent/orders" variant="outline">查看我的订单</ButtonLink>
          </div>
        </Card>
      </Container>
    </main>
  );
}
