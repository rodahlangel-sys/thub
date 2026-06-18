import type { OrderStatus } from "@prisma/client";
import { CheckCircle2 } from "lucide-react";
import { getOrderStatusLabel } from "@/lib/roles";

const orderSteps: OrderStatus[] = [
  "PENDING_TUTOR_CONFIRM",
  "PENDING_PAYMENT",
  "ESCROWED",
  "IN_PROGRESS",
  "PENDING_PARENT_CONFIRM",
  "COMPLETED",
];

type OrderStatusTimelineProps = {
  status: OrderStatus;
};

export function OrderStatusTimeline({ status }: OrderStatusTimelineProps) {
  const currentIndex = orderSteps.indexOf(status);
  const specialStatus =
    status === "CANCELLED" ||
    status === "REFUND_REQUESTED" ||
    status === "REFUNDED";

  return (
    <div className="rounded-2xl border border-[#d9ded6] bg-white p-5 shadow-[0_1px_2px_rgba(18,45,42,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#1f2d2d]">订单进度</h2>
        <span className="text-sm font-semibold text-[#116a6c]">
          {getOrderStatusLabel(status)}
        </span>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {orderSteps.map((step, index) => {
          const reached = !specialStatus && currentIndex >= index;
          const active = status === step;

          return (
            <div
              className={`rounded-xl border p-3 ${
                active
                  ? "border-[#116a6c] bg-[#e8f3ef]"
                  : reached
                    ? "border-[#cfe1dc] bg-[#f7fbf8]"
                    : "border-[#ebe6dc] bg-[#fffdf8]"
              }`}
              key={step}
            >
              <CheckCircle2
                className={`size-4 ${reached || active ? "text-[#116a6c]" : "text-[#b2bab5]"}`}
                aria-hidden
              />
              <p className="mt-2 text-xs font-semibold text-[#1f2d2d]">
                {getOrderStatusLabel(step)}
              </p>
            </div>
          );
        })}
      </div>
      {specialStatus ? (
        <p className="mt-4 rounded-lg bg-[#fff8e5] px-3 py-2 text-sm text-[#8a650e]">
          当前订单处于{getOrderStatusLabel(status)}状态，后续以订单详情和平台处理结果为准。
        </p>
      ) : null}
    </div>
  );
}
