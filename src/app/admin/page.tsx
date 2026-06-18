import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ClipboardList,
  CreditCard,
  FileCheck2,
  MessageSquareText,
  ReceiptText,
  Settings,
  Star,
  Users,
} from "lucide-react";
import { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { AdminShell } from "@/components/layout/AdminShell";
import { NotificationSummary } from "@/components/NotificationSummary";
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
  getRefundStatusLabel,
} from "@/lib/roles";
import { prisma } from "@/lib/prisma";

const adminEntries = [
  {
    title: "用户管理",
    description: "查看账号、角色和启用状态。",
    icon: Users,
    href: "/admin/users",
  },
  {
    title: "家教认证审核",
    description: "处理大学生家教资料认证。",
    icon: FileCheck2,
    href: "/admin/tutors",
  },
  {
    title: "需求管理",
    description: "查看家长发布的家教需求。",
    icon: ClipboardList,
    href: "/admin/demands",
  },
  {
    title: "订单管理",
    description: "跟进预约、支付和完成状态。",
    icon: ReceiptText,
    href: "/admin/orders",
  },
  {
    title: "支付记录",
    description: "查看支付方式、金额和交易号。",
    icon: CreditCard,
    href: "/admin/payments",
  },
  {
    title: "结算记录",
    description: "查看平台信息服务费和大学生模拟结算。",
    icon: ReceiptText,
    href: "/admin/settlements",
  },
  {
    title: "支付配置",
    description: "检查模拟支付和第三方支付接入配置。",
    icon: Settings,
    href: "/admin/payment-settings",
  },
  {
    title: "退款管理",
    description: "审核退款申请并同步状态。",
    icon: ReceiptText,
    href: "/admin/refunds",
  },
  {
    title: "评价管理",
    description: "查看家长评分和文字评价。",
    icon: Star,
    href: "/admin/reviews",
  },
  {
    title: "课后反馈",
    description: "查看老师提交的课后记录。",
    icon: MessageSquareText,
    href: "/admin/feedbacks",
  },
];

const todoItems = [
  { label: "待审核家教", href: "/admin/tutors?status=PENDING", key: "pendingTutors" },
  { label: "待处理退款", href: "/admin/refunds?status=PENDING", key: "pendingRefunds" },
  { label: "待老师确认订单", href: "/admin/orders?status=PENDING_TUTOR_CONFIRM", key: "pendingTutorOrders" },
  { label: "待家长确认订单", href: "/admin/orders?status=PENDING_PARENT_CONFIRM", key: "pendingParentOrders" },
];

export default async function AdminDashboardPage() {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.ADMIN) {
    redirect(getDashboardPath(user.role));
  }

  const [
    userCount,
    parentCount,
    tutorCount,
    approvedTutorCount,
    openDemandCount,
    orderCount,
    completedOrderCount,
    paidAmountSum,
    refundCount,
    reviewScoreAggregate,
    pendingTutorCount,
    pendingRefundCount,
    pendingTutorOrderCount,
    pendingParentOrderCount,
    recentOrders,
    recentRefunds,
    unreadNotificationCount,
    recentNotifications,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "PARENT" } }),
    prisma.tutorProfile.count(),
    prisma.tutorProfile.count({ where: { certificationStatus: "APPROVED" } }),
    prisma.demand.count({ where: { status: "OPEN" } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "COMPLETED" } }),
    prisma.payment.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.refund.count(),
    prisma.review.aggregate({ _avg: { overallScore: true } }),
    prisma.tutorProfile.count({ where: { certificationStatus: "PENDING" } }),
    prisma.refund.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: "PENDING_TUTOR_CONFIRM" } }),
    prisma.order.count({ where: { status: "PENDING_PARENT_CONFIRM" } }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        parent: { select: { name: true } },
        tutor: { select: { name: true } },
      },
    }),
    prisma.refund.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: {
            id: true,
            subject: true,
            parent: { select: { name: true } },
            tutor: { select: { name: true } },
          },
        },
      },
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  const todoValues = {
    pendingTutors: pendingTutorCount,
    pendingRefunds: pendingRefundCount,
    pendingTutorOrders: pendingTutorOrderCount,
    pendingParentOrders: pendingParentOrderCount,
  };

  const overviewStats = [
    { label: "用户总数", value: userCount },
    { label: "家长", value: parentCount },
    { label: "大学生家教", value: tutorCount },
    { label: "已认证家教", value: approvedTutorCount },
    { label: "开放需求", value: openDemandCount },
    { label: "订单总数", value: orderCount },
    { label: "已完成订单", value: completedOrderCount },
    { label: "已支付金额", value: formatOrderMoney(paidAmountSum._sum.amount ?? 0) },
    { label: "退款申请", value: refundCount },
    {
      label: "平均评分",
      value: reviewScoreAggregate._avg.overallScore
        ? `${reviewScoreAggregate._avg.overallScore.toFixed(1)} 分`
        : "暂无",
    },
  ];

  return (
    <AdminShell>
      <section className="overflow-hidden rounded-2xl border border-[#d4dee2] bg-[#1f3f49] text-white shadow-[0_18px_55px_rgba(31,63,73,0.16)]">
        <div className="grid gap-8 p-7 lg:grid-cols-[1fr_1.25fr] lg:p-8">
          <div>
            <Badge tone="blue">管理员</Badge>
            <p className="mt-5 text-sm font-semibold text-[#b9d8df]">
              运营管理首页
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight">
              {user.name}，今天先看待处理事项
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[#d8e8ec]">
              这里汇总用户、家教审核、订单、支付、退款和评价情况。优先处理红黄状态，再查看近期业务动态。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/admin/tutors?status=PENDING" variant="secondary">
                处理家教审核
              </ButtonLink>
              <ButtonLink href="/admin/refunds?status=PENDING" variant="outline">
                查看退款申请
              </ButtonLink>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {overviewStats.map((stat) => (
              <div
                className="rounded-xl border border-white/20 bg-white/10 p-4"
                key={stat.label}
              >
                <p className="text-xs text-[#b9d8df]">{stat.label}</p>
                <p className="mt-2 text-xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#116a6c]">待处理事项</p>
              <h2 className="mt-1 text-xl font-bold text-[#1f2d2d]">
                需要尽快跟进的业务
              </h2>
            </div>
            <ButtonLink href="/admin/orders" variant="outline">
              查看订单
            </ButtonLink>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {todoItems.map((item) => (
              <Link
                className="group rounded-xl border border-[#d9ded6] bg-[#fffdf8] p-4 transition hover:-translate-y-0.5 hover:border-[#116a6c] hover:bg-[#f7fbfa]"
                href={item.href}
                key={item.key}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-[#60706b]">{item.label}</p>
                    <p className="mt-3 text-3xl font-bold text-[#1f2d2d]">
                      {todoValues[item.key as keyof typeof todoValues]}
                    </p>
                  </div>
                  <ArrowRight
                    className="mt-1 size-4 text-[#8aa09b] transition group-hover:translate-x-0.5 group-hover:text-[#116a6c]"
                    aria-hidden
                  />
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <div>
          <NotificationSummary
            notifications={recentNotifications}
            title="待处理提醒"
            unreadCount={unreadNotificationCount}
          />
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#116a6c]">快捷管理入口</p>
            <h2 className="mt-1 text-2xl font-bold text-[#1f2d2d]">
              常用运营工具
            </h2>
          </div>
          <ButtonLink href="/admin/users" variant="outline">
            用户管理
          </ButtonLink>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {adminEntries.map((entry) => {
            const Icon = entry.icon;

            return (
              <Link
                className="group rounded-2xl border border-[#d9ded6] bg-white p-5 shadow-[0_1px_2px_rgba(18,45,42,0.04)] transition hover:-translate-y-0.5 hover:border-[#116a6c]"
                href={entry.href}
                key={entry.title}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-[#e8f3ef] text-[#116a6c]">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <ArrowRight
                    className="size-4 text-[#9aacaa] transition group-hover:translate-x-0.5 group-hover:text-[#116a6c]"
                    aria-hidden
                  />
                </div>
                <h3 className="mt-4 font-semibold text-[#1f2d2d]">
                  {entry.title}
                </h3>
                <p className="mt-2 min-h-12 text-sm leading-6 text-[#60706b]">
                  {entry.description}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#116a6c]">近期订单</p>
              <h2 className="mt-1 text-xl font-bold text-[#1f2d2d]">
                最近发生的预约
              </h2>
            </div>
            <ButtonLink href="/admin/orders" variant="outline">查看全部</ButtonLink>
          </div>
          <div className="mt-5 grid gap-4">
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <Link
                  className="rounded-xl border border-[#ebe6dc] bg-[#fffdf8] p-4 transition hover:border-[#116a6c] hover:bg-[#f7fbfa]"
                  href={`/admin/orders/${order.id}`}
                  key={order.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-[#182f38]">
                      {order.subject}｜{formatShortOrderId(order.id)}
                    </p>
                    <Badge tone={getOrderStatusTone(order.status)}>
                      {getOrderStatusLabel(order.status)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-[#60727a]">
                    {order.parent.name} 预约 {order.tutor.name}｜{formatDateTime(order.createdAt)}
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-[#60706b]">暂无订单动态。</p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#b45309]">近期退款</p>
              <h2 className="mt-1 text-xl font-bold text-[#1f2d2d]">
                售后处理记录
              </h2>
            </div>
            <ButtonLink href="/admin/refunds" variant="outline">查看全部</ButtonLink>
          </div>
          <div className="mt-5 grid gap-4">
              {recentRefunds.length > 0 ? (
                recentRefunds.map((refund) => (
                  <Link
                    className="rounded-xl border border-[#ebe6dc] bg-[#fffdf8] p-4 transition hover:border-[#b45309] hover:bg-[#fffaf0]"
                    href={`/admin/refunds/${refund.id}`}
                    key={refund.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-[#182f38]">
                        {refund.order.subject}｜{formatOrderMoney(refund.refundAmount)}
                      </p>
                      <Badge
                        tone={
                          refund.status === "APPROVED"
                            ? "green"
                            : refund.status === "REJECTED"
                              ? "red"
                              : "yellow"
                        }
                      >
                        {getRefundStatusLabel(refund.status)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-[#60727a]">
                      {refund.order.parent.name} / {refund.order.tutor.name}｜{formatDateTime(refund.createdAt)}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-[#60727a]">暂无退款申请。</p>
              )}
          </div>
        </Card>
      </section>
    </AdminShell>
  );
}
