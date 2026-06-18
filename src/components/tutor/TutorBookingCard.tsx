import type { OrderStatus, TeachMode } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/Button";
import { formatDateTime } from "@/lib/orders";
import {
  formatTutorMoney,
  formatTutorParentName,
  getTutorOrderAction,
  getTutorOrderStatusLabel,
  getTutorTeachModeLabel,
  safeTutorText,
} from "@/lib/tutor-display";

type TutorBookingCardProps = {
  id: string;
  parentName?: string | null;
  subject: string;
  scheduledTime: Date;
  teachMode: TeachMode;
  location: string;
  totalAmount: number;
  status: OrderStatus;
};

export function TutorBookingCard({
  id,
  parentName,
  subject,
  scheduledTime,
  teachMode,
  location,
  totalAmount,
  status,
}: TutorBookingCardProps) {
  const action = getTutorOrderAction(status);

  return (
    <article className="rounded-3xl border border-[#dfe8e4] bg-white p-5 shadow-[0_16px_42px_rgba(31,79,72,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-[#172c2c]">
              {safeTutorText(subject, "科目待确认")}
            </h3>
            <Badge tone={status === "PENDING_TUTOR_CONFIRM" ? "yellow" : "blue"}>
              {getTutorOrderStatusLabel(status)}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-[#66736e]">
            {formatTutorParentName(parentName)} · {formatDateTime(scheduledTime)}
          </p>
        </div>
        <p className="text-xl font-bold text-[#0f6f70]">
          {formatTutorMoney(totalAmount)}
        </p>
      </div>
      <div className="mt-5 grid gap-3 text-sm text-[#536861] sm:grid-cols-2">
        <p>上课方式：{getTutorTeachModeLabel(teachMode)}</p>
        <p>地点：{safeTutorText(location, "地点待确认")}</p>
      </div>
      <div className="mt-5">
        <ButtonLink
          href={`/tutor/orders/${id}`}
          variant={action.tone === "primary" ? "primary" : "outline"}
        >
          {action.label}
        </ButtonLink>
      </div>
    </article>
  );
}
