import type { OrderStatus, TeachMode } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/Button";
import {
  formatOrderCurrency,
  formatParentDateTime,
  getParentOrderAction,
  getParentOrderStatusHint,
  getParentOrderStatusLabel,
  getParentOrderStatusTone,
  safeText,
} from "@/lib/parent-display";
import { getTeachModeLabel } from "@/lib/roles";

type ParentOrderCardProps = {
  id: string;
  status: OrderStatus;
  subject: string;
  tutorName: string;
  scheduledTime: Date;
  teachMode: TeachMode;
  location?: string | null;
  totalAmount: number;
  hasReview?: boolean;
};

export function ParentOrderCard({
  id,
  status,
  subject,
  tutorName,
  scheduledTime,
  teachMode,
  location,
  totalAmount,
  hasReview,
}: ParentOrderCardProps) {
  const action = getParentOrderAction(status, id, hasReview);

  return (
    <article className="rounded-[24px] border border-[#dbe7e3] bg-white p-5 shadow-[0_12px_30px_rgba(18,45,42,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-[#1f2d2d]">
              {safeText(subject, "科目信息待确认")}
            </h3>
            <Badge tone={getParentOrderStatusTone(status)}>
              {getParentOrderStatusLabel(status)}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-[#66736e]">
            {safeText(tutorName, "老师信息待完善")} · {formatParentDateTime(scheduledTime)}
          </p>
        </div>
        <p className="whitespace-nowrap text-lg font-bold text-[#116a6c]">
          {formatOrderCurrency(totalAmount)}
        </p>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-[#536861] sm:grid-cols-2">
        <p>上课方式：{getTeachModeLabel(teachMode)}</p>
        <p>地点：{safeText(location, "地点待确认")}</p>
      </div>

      <div className="mt-4 rounded-xl bg-[#f4f8f6] px-4 py-3 text-sm leading-6 text-[#536861]">
        {getParentOrderStatusHint(status)}
      </div>

      <div className="mt-5">
        <ButtonLink href={action.href}>{action.label}</ButtonLink>
      </div>
    </article>
  );
}
