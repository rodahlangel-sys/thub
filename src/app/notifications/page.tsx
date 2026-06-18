import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { Button, ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { PageShell } from "@/components/ui/PageShell";
import { TutorEmptyState } from "@/components/tutor/TutorEmptyState";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "./actions";

type NotificationsPageProps = {
  searchParams?: Promise<{
    status?: string;
  }>;
};

const statusTabs = [
  { value: "ALL", label: "全部", href: "/notifications" },
  { value: "UNREAD", label: "未读", href: "/notifications?status=UNREAD" },
];

function safeNotificationText(value: string | null | undefined, fallback = "消息内容待确认") {
  const text = value?.trim();
  if (!text || text === "????" || text === "undefined" || text === "null") {
    return fallback;
  }
  return text;
}

function getTypeTone(type: string) {
  if (type === "REFUND") return "red" as const;
  if (type === "AUDIT") return "yellow" as const;
  if (type === "PAYMENT" || type === "REVIEW") return "green" as const;
  return "blue" as const;
}

function getNotificationTypeLabel(type: string) {
  const labels: Record<string, string> = {
    SYSTEM: "系统",
    AUDIT: "审核",
    ORDER: "订单",
    PAYMENT: "支付",
    FEEDBACK: "课后反馈",
    REVIEW: "评价",
    REFUND: "退款",
  };

  return labels[type] ?? "消息";
}

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  const query = (await searchParams) ?? {};
  const activeStatus = query.status === "UNREAD" ? "UNREAD" : "ALL";

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId: user.id,
        ...(activeStatus === "UNREAD" ? { readAt: null } : {}),
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.count({
      where: {
        userId: user.id,
        readAt: null,
      },
    }),
  ]);

  return (
    <PageShell className="bg-[#f7f4ee]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#116a6c]">站内消息</p>
          <h1 className="mt-2 text-3xl font-bold text-[#172c2c]">消息</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#66736e]">
            查看预约、支付、课后反馈和售后提醒。
          </p>
        </div>
        {unreadCount > 0 ? (
          <form action={markAllNotificationsReadAction}>
            <Button type="submit" variant="outline">
              全部已读
            </Button>
          </form>
        ) : null}
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {statusTabs.map((tab) => {
            const active = activeStatus === tab.value;

            return (
              <Link
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-[#116a6c] bg-[#116a6c] text-white"
                    : "border-[#d6e2df] bg-white text-[#536861] hover:border-[#116a6c]"
                }`}
                href={tab.href}
                key={tab.value}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
        <p className="text-sm text-[#66736e]">
          {unreadCount > 0 ? `${unreadCount} 条未读` : "暂无未读"}
        </p>
      </div>

      <section className="grid gap-3">
        {notifications.length > 0 ? (
          notifications.map((notification) => {
            const unread = !notification.readAt;

            return (
              <Card
                className={`relative overflow-hidden p-5 ${
                  unread ? "border-[#9ccbc4] bg-[#fbfffd]" : "bg-white"
                }`}
                key={notification.id}
              >
                {unread ? <span className="absolute inset-y-0 left-0 w-1 bg-[#116a6c]" /> : null}
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-[#182f38]">
                        {safeNotificationText(notification.title, "消息提醒")}
                      </h2>
                      <Badge tone={getTypeTone(notification.type)}>
                        {getNotificationTypeLabel(notification.type)}
                      </Badge>
                      {unread ? <Badge tone="blue">未读</Badge> : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#60727a]">
                      {safeNotificationText(notification.content)}
                    </p>
                    <p className="mt-3 text-xs text-[#8a9aa1]">
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {notification.link ? (
                      <ButtonLink href={notification.link} variant="secondary">
                        查看
                      </ButtonLink>
                    ) : null}
                    {unread ? (
                      <form action={markNotificationReadAction}>
                        <input name="notificationId" type="hidden" value={notification.id} />
                        <Button type="submit" variant="outline">
                          标记已读
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <TutorEmptyState
            description={activeStatus === "UNREAD" ? "当前没有未读消息。" : "当前还没有站内消息。"}
            title="暂无消息"
          />
        )}
      </section>
    </PageShell>
  );
}
