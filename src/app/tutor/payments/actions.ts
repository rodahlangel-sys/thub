"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { buildNotificationDedupeKey, safelyCreateNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import {
  createQrCodeTransactionNo,
  validateQrCodePaymentTransition,
} from "@/lib/qrcode-payments";
import { getDashboardPath } from "@/lib/roles";

function redirectWithError(message: string): never {
  redirect(`/tutor/payments?error=${encodeURIComponent(message)}`);
}

async function requireTutor() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== UserRole.TUTOR) redirect(getDashboardPath(user.role));
  return user;
}

export async function confirmTutorQrReceiptAction(formData: FormData) {
  const user = await requireTutor();
  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.order.findFirst({
    where: { id: orderId, tutorId: user.id },
    include: { payment: true },
  });
  if (!order) redirectWithError("订单不存在。");

  const transition = validateQrCodePaymentTransition({
    actorRole: "TUTOR",
    action: "TUTOR_CONFIRMED_RECEIPT",
    orderStatus: order.status,
    paymentStatus: order.payment?.status,
    isOrderParent: false,
    isOrderTutor: order.tutorId === user.id,
  });
  if (!transition.ok) redirectWithError("当前订单不在家教收款确认阶段。");

  await prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: order.id, tutorId: user.id, status: "WAIT_TUTOR_CONFIRM" },
      data: { status: "ESCROWED" },
    });
    if (updated.count !== 1) throw new Error("ORDER_STATUS_CHANGED");
    await tx.payment.update({
      where: { orderId: order.id },
      data: {
        status: "PAID",
        transactionNo: createQrCodeTransactionNo(),
        paidAt: new Date(),
        tutorConfirmedAt: new Date(),
      },
    });
  });

  await safelyCreateNotification({
    userId: order.parentId,
    title: "家教已确认收款",
    content: "订单已进入已支付状态，请按约定时间上课。",
    type: "PAYMENT",
    link: `/parent/orders/${order.id}`,
    dedupeKey: buildNotificationDedupeKey(
      "order",
      order.id,
      "qrcode-paid",
      order.parentId,
    ),
  });

  revalidatePath("/tutor/payments");
  revalidatePath("/tutor/orders");
  revalidatePath(`/tutor/orders/${order.id}`);
  revalidatePath("/parent");
  revalidatePath("/parent/orders");
  revalidatePath(`/parent/orders/${order.id}`);
  revalidatePath(`/parent/orders/${order.id}/pay`);
  revalidatePath("/admin/payments");
  redirect(`/tutor/orders/${order.id}`);
}

export async function rejectTutorQrReceiptAction(formData: FormData) {
  const user = await requireTutor();
  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.order.findFirst({
    where: { id: orderId, tutorId: user.id },
    include: { payment: true },
  });
  if (!order) redirectWithError("订单不存在。");

  const transition = validateQrCodePaymentTransition({
    actorRole: "TUTOR",
    action: "TUTOR_REJECTED_RECEIPT",
    orderStatus: order.status,
    paymentStatus: order.payment?.status,
    isOrderParent: false,
    isOrderTutor: order.tutorId === user.id,
  });
  if (!transition.ok) redirectWithError("当前订单不在家教收款确认阶段。");

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: "WAIT_TUTOR_PAYMENT" },
    });
    await tx.payment.update({
      where: { orderId: order.id },
      data: {
        status: "WAIT_TUTOR_PAYMENT",
        tutorPaymentMarkedAt: null,
      },
    });
  });

  await safelyCreateNotification({
    userId: order.parentId,
    title: "家教暂未确认收款",
    content: "家教反馈尚未收到服务费，请核对后重新操作。",
    type: "PAYMENT",
    link: `/parent/orders/${order.id}/pay`,
    dedupeKey: buildNotificationDedupeKey(
      "order",
      order.id,
      "qrcode-tutor-rejected",
      order.parentId,
    ),
  });

  revalidatePath("/tutor/payments");
  revalidatePath(`/parent/orders/${order.id}/pay`);
  redirect("/tutor/payments?success=已反馈未收到款项。");
}
