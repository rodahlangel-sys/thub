import { ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { formatDateTime } from "@/lib/orders";
import { getNotificationTypeLabel } from "@/lib/roles";

type NotificationSummaryItem = {
  id: string;
  title: string;
  type: string;
  readAt: Date | null;
  createdAt: Date;
};

type NotificationSummaryProps = {
  unreadCount: number;
  notifications: NotificationSummaryItem[];
  title?: string;
};

export function NotificationSummary({
  unreadCount,
  notifications,
  title = "消息提醒",
}: NotificationSummaryProps) {
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-[#182f38]">{title}</h2>
          <p className="mt-1 text-sm text-[#60727a]">
            当前有 {unreadCount} 条未读消息
          </p>
        </div>
        <ButtonLink href="/notifications" variant="outline">
          查看全部消息
        </ButtonLink>
      </div>

      <div className="mt-5 grid gap-3">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <div
              className={`rounded-md border px-4 py-3 ${
                notification.readAt
                  ? "border-[#edf1f3] bg-[#fbfcfc]"
                  : "border-[#b8d7e0] bg-[#f3fbfd]"
              }`}
              key={notification.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium text-[#182f38]">{notification.title}</p>
                <span className="text-xs text-[#176b87]">
                  {getNotificationTypeLabel(notification.type)}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#8a9aa1]">
                {formatDateTime(notification.createdAt)}
              </p>
            </div>
          ))
        ) : (
          <EmptyState
            description="新的预约、审核、支付和退款提醒会出现在这里。"
            title="暂无消息"
          />
        )}
      </div>
    </Card>
  );
}
