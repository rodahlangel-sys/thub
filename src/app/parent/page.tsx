import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarCheck,
  CreditCard,
  FileCheck2,
  MessageSquareText,
  SearchCheck,
  SquarePen,
  Star,
  UserRoundCog,
} from "lucide-react";
import { UserRole, type OrderStatus } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { ParentOrderCard } from "@/components/parent/ParentOrderCard";
import { ParentSection } from "@/components/parent/ParentSection";
import { PageShell } from "@/components/ui/PageShell";
import { requireUser } from "@/lib/auth";
import {
  formatCurrency,
  formatOrderCurrency,
  formatParentDate,
  formatParentDateTime,
  getParentDemandStatusLabel,
  getParentDemandStatusTone,
  safeText,
} from "@/lib/parent-display";
import { getDashboardPath, getTeachModeLabel } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

const priorityStatuses: OrderStatus[] = [
  "REFUND_REQUESTED",
  "PENDING_PAYMENT",
  "PENDING_TUTOR_CONFIRM",
  "PENDING_PARENT_CONFIRM",
  "COMPLETED",
  "ESCROWED",
  "IN_PROGRESS",
];

function isProfileIncomplete(profile: { area: string; childInfo: string } | null, phone: string) {
  return (
    !safeText(phone, "") ||
    !safeText(profile?.area, "") ||
    !safeText(profile?.childInfo, "")
  );
}

function firstOrderByStatus<T extends { status: OrderStatus }>(orders: T[], status: OrderStatus) {
  return orders.find((order) => order.status === status);
}

export default async function ParentDashboardPage() {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.PARENT) {
    redirect(getDashboardPath(user.role));
  }

  const [profile, openDemand, recentDemands, actionableOrders, recentOrders] = await Promise.all([
    prisma.parentProfile.findUnique({
      where: { userId: user.id },
      select: { area: true, childInfo: true, addressDetail: true },
    }),
    prisma.demand.findFirst({
      where: { parentId: user.id, status: "OPEN" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.demand.findMany({
      where: { parentId: user.id },
      orderBy: { createdAt: "desc" },
      take: 2,
    }),
    prisma.order.findMany({
      where: {
        parentId: user.id,
        status: { in: priorityStatuses },
      },
      include: {
        tutor: { select: { name: true } },
        demand: true,
        lessonFeedback: true,
        review: true,
        refunds: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.order.findMany({
      where: { parentId: user.id },
      include: {
        tutor: { select: { name: true } },
        review: true,
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  const profileIncomplete = isProfileIncomplete(profile, user.phone);
  const pendingPaymentOrder = firstOrderByStatus(actionableOrders, "PENDING_PAYMENT");
  const refundOrder = firstOrderByStatus(actionableOrders, "REFUND_REQUESTED");
  const pendingTutorOrder = firstOrderByStatus(actionableOrders, "PENDING_TUTOR_CONFIRM");
  const pendingConfirmOrder = firstOrderByStatus(actionableOrders, "PENDING_PARENT_CONFIRM");
  const completedWithoutReview = actionableOrders.find(
    (order) => order.status === "COMPLETED" && !order.review,
  );
  const activeOrder =
    firstOrderByStatus(actionableOrders, "ESCROWED") ||
    firstOrderByStatus(actionableOrders, "IN_PROGRESS");

  const primaryTask = (() => {
    if (profileIncomplete) {
      return {
        title: "先完善基础信息",
        description: "填写所在区域和孩子的学习情况，后续发布需求会更方便。",
        href: "/parent/profile",
        actionLabel: "完善家长资料",
        icon: UserRoundCog,
      };
    }

    if (pendingPaymentOrder) {
      return {
        title: "老师已确认，请完成付款",
        description: `${safeText(pendingPaymentOrder.tutor.name, "老师信息待完善")} 已确认 ${safeText(
          pendingPaymentOrder.subject,
          "本次辅导",
        )} 预约，应付金额 ${formatOrderCurrency(pendingPaymentOrder.totalAmount)}。`,
        href: `/parent/orders/${pendingPaymentOrder.id}/pay`,
        actionLabel: "去付款",
        icon: CreditCard,
      };
    }

    if (refundOrder) {
      return {
        title: "退款申请处理中",
        description: "退款申请已提交，平台正在处理。",
        href: `/parent/orders/${refundOrder.id}`,
        actionLabel: "查看处理进度",
        icon: MessageSquareText,
      };
    }

    if (pendingTutorOrder) {
      return {
        title: "预约已提交，等待老师确认",
        description: `${safeText(pendingTutorOrder.tutor.name, "老师")} 正在确认 ${safeText(
          pendingTutorOrder.subject,
          "本次辅导",
        )} 预约。`,
        href: `/parent/orders/${pendingTutorOrder.id}`,
        actionLabel: "查看预约",
        icon: CalendarCheck,
      };
    }

    if (pendingConfirmOrder) {
      return {
        title: "老师已提交课后反馈",
        description:
          pendingConfirmOrder.lessonFeedback?.content?.slice(0, 60) ||
          "请查看本次辅导反馈，并确认服务是否完成。",
        href: `/parent/orders/${pendingConfirmOrder.id}`,
        actionLabel: "查看反馈并确认",
        icon: FileCheck2,
      };
    }

    if (completedWithoutReview) {
      return {
        title: "本次辅导已完成",
        description: "你的评价会帮助其他家长了解老师的服务情况。",
        href: `/parent/orders/${completedWithoutReview.id}/review`,
        actionLabel: "评价本次辅导",
        icon: Star,
      };
    }

    if (activeOrder) {
      return {
        title: activeOrder.status === "IN_PROGRESS" ? "本次辅导进行中" : "辅导安排已确认",
        description: `${safeText(activeOrder.tutor.name, "老师")} · ${formatParentDateTime(
          activeOrder.scheduledTime,
        )} · ${getTeachModeLabel(activeOrder.teachMode)}`,
        href: `/parent/orders/${activeOrder.id}`,
        actionLabel: "查看本次辅导",
        icon: CalendarCheck,
      };
    }

    if (!openDemand) {
      return {
        title: "发布一条家教需求",
        description: "填写孩子的年级、科目、时间和预算，方便匹配合适的大学生家教。",
        href: "/parent/demands/new",
        actionLabel: "发布需求",
        icon: SquarePen,
      };
    }

    return {
      title: "已为你找到合适的大学生",
      description: `${safeText(openDemand.childGrade)} · ${safeText(openDemand.subject)} · ${safeText(
        openDemand.area,
      )}`,
      href: `/parent/demands/${openDemand.id}/recommend`,
      actionLabel: "查看匹配结果",
      icon: SearchCheck,
    };
  })();

  const currentOrder = pendingPaymentOrder || pendingTutorOrder || activeOrder || pendingConfirmOrder;
  const PrimaryIcon = primaryTask.icon;

  return (
    <PageShell className="bg-[#f7f4ee]">
      <section className="relative overflow-hidden rounded-[32px] border border-[#e2ded4] bg-[#fffdf8] p-6 shadow-[0_18px_55px_rgba(29,48,45,0.06)] sm:p-8">
        <div className="absolute -left-24 -top-24 size-56 rounded-full bg-[#dcefe9]/70 blur-3xl" />
        <div className="absolute -right-24 bottom-0 size-48 rounded-full bg-[#f4e4c8]/55 blur-3xl" />
        <div className="relative max-w-2xl">
          <Badge tone="green">家长首页</Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#172c2c] sm:text-4xl">
            欢迎回来，{safeText(user.name, "家长")}
          </h1>
          <div className="mt-6 rounded-3xl border border-[#d8e8e2] bg-white/72 p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-[#e1f2ed] text-[#117b7a]">
                <PrimaryIcon className="size-5" aria-hidden />
              </span>
              <p className="text-sm font-semibold text-[#117b7a]">当前最重要的一步</p>
            </div>
            <p className="mt-3 text-2xl font-bold text-[#172c2c]">{primaryTask.title}</p>
            <p className="mt-2 max-w-lg text-sm leading-6 text-[#66736e]">
              {primaryTask.description}
            </p>
            <div className="mt-5">
              <ButtonLink href={primaryTask.href}>{primaryTask.actionLabel}</ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
        <div className="grid gap-6">
          {currentOrder ? (
            <ParentSection title="当前辅导">
              <ParentOrderCard
                id={currentOrder.id}
                status={currentOrder.status}
                subject={currentOrder.subject}
                tutorName={currentOrder.tutor.name}
                scheduledTime={currentOrder.scheduledTime}
                teachMode={currentOrder.teachMode}
                location={currentOrder.location}
                totalAmount={currentOrder.totalAmount}
                hasReview={Boolean(currentOrder.review)}
              />
            </ParentSection>
          ) : openDemand ? (
            <ParentSection title="当前需求">
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-[#1f2d2d]">
                      {safeText(openDemand.childGrade)} · {safeText(openDemand.subject)}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#66736e]">
                      {safeText(openDemand.area)} · {getTeachModeLabel(openDemand.teachMode)} ·{" "}
                      {formatCurrency(openDemand.budgetMin)} - {formatCurrency(openDemand.budgetMax)} / 小时
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#536861]">
                      {safeText(openDemand.goal, "学习目标待补充")}
                    </p>
                  </div>
                  <Badge tone={getParentDemandStatusTone(openDemand.status)}>
                    {getParentDemandStatusLabel(openDemand.status)}
                  </Badge>
                </div>
                <div className="mt-5">
                  <ButtonLink href={`/parent/demands/${openDemand.id}/recommend`}>
                    查看本次需求的推荐老师
                  </ButtonLink>
                </div>
              </Card>
            </ParentSection>
          ) : null}
        </div>

        <div className="grid content-start gap-6">
          <ParentSection title="最近预约">
            <Card className="divide-y divide-[#edf2ef] overflow-hidden">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <Link
                    className="block px-5 py-4 transition hover:bg-[#f8fbfa]"
                    href={`/parent/orders/${order.id}`}
                    key={order.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#1f2d2d]">
                          {safeText(order.subject, "科目信息待确认")} ·{" "}
                          {safeText(order.tutor.name, "老师信息待完善")}
                        </p>
                        <p className="mt-1 text-sm text-[#66736e]">
                          {formatParentDateTime(order.scheduledTime)}
                        </p>
                      </div>
                      <span className="whitespace-nowrap text-sm font-semibold text-[#116a6c]">
                        {formatOrderCurrency(order.totalAmount)}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="px-5 py-6 text-sm text-[#66736e]">暂时还没有预约记录。</div>
              )}
            </Card>
          </ParentSection>
        </div>
      </div>

      {!openDemand && recentDemands.length > 0 ? (
        <ParentSection
          className="mt-6"
          title="近期需求"
          action={
            <ButtonLink href="/parent/demands" variant="outline">
              查看我的需求
            </ButtonLink>
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            {recentDemands.map((demand) => (
              <Card className="p-4" key={demand.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#1f2d2d]">
                      {safeText(demand.childGrade)} · {safeText(demand.subject)}
                    </p>
                    <p className="mt-1 text-sm text-[#66736e]">
                      {safeText(demand.area)} · {formatParentDate(demand.createdAt)}
                    </p>
                  </div>
                  <Badge tone={getParentDemandStatusTone(demand.status)}>
                    {getParentDemandStatusLabel(demand.status)}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </ParentSection>
      ) : null}
    </PageShell>
  );
}
