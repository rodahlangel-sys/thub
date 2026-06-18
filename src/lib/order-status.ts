import type { OrderStatus } from "@prisma/client";

export function canSubmitLessonFeedback(status: OrderStatus) {
  return status === "IN_PROGRESS";
}
