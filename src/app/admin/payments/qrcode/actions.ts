"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { buildNotificationDedupeKey, safelyCreateNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { validateQrCodePaymentTransition } from "@/lib/qrcode-payments";
import { getDashboardPath } from "@/lib/roles";

function redirectWithError(message: string): never {
  redirect(`/admin/payments/qrcode?error=${encodeURIComponent(message)}`);
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== UserRole.ADMIN) redirect(getDashboardPath(user.role));
  return user;
}

export async function confirmPlatformQrPaymentAction(formData: FormData) {
  const user = await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true },
  });
  if (!order) redirectWithError("订单不存在。");

  const transition = validateQrCodePaymentTransition({
    actorRole: "ADMIN",
    action: "ADMIN_CONFIRMED_PLATFORM",
    orderStatus: order.status,
    paymentStatus: order.payment?.status,
    isOrderParent: false,
    isOrderTutor: false,
  });
  if (!transition.ok) redirectWithError("当前订单不在平台收款确认阶段。");

  await prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: order.id, status: "WAIT_PLATFORM_CONFIRM" },
      data: { status: "WAIT_TUTOR_PAYMENT" },
    });
    if (updated.count !== 1) throw new Error("ORDER_STATUS_CHANGED");
    await tx.payment.update({
      where: { orderId: order.id },
      data: {
        status: "WAIT_TUTOR_PAYMENT",
        platformConfirmedAt: new Date(),
        platformConfirmedById: user.id,
      },
    });
  });

  await safelyCreateNotification({
    userId: order.parentId,
    title: "平台信息费已确认",
    content: "管理员已确认收到平台信息服务费，请继续向家教支付服务费。",
    type: "PAYMENT",
    link: `/parent/orders/${order.id}/pay`,
    dedupeKey: buildNotificationDedupeKey(
      "order",
      order.id,
      "qrcode-platform-confirmed",
      order.parentId,
    ),
  });

  revalidatePath("/admin/payments/qrcode");
  revalidatePath("/admin/payments");
  revalidatePath(`/admin/orders/${order.id}`);
  revalidatePath(`/parent/orders/${order.id}/pay`);
  redirect("/admin/payments/qrcode?success=平台收款已确认。");
}

export async function rejectPlatformQrPaymentAction(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true },
  });
  if (!order) redirectWithError("订单不存在。");

  const transition = validateQrCodePaymentTransition({
    actorRole: "ADMIN",
    action: "ADMIN_REJECTED_PLATFORM",
    orderStatus: order.status,
    paymentStatus: order.payment?.status,
    isOrderParent: false,
    isOrderTutor: false,
  });
  if (!transition.ok) redirectWithError("当前订单不在平台收款确认阶段。");

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: "PENDING_PAYMENT" },
    });
    await tx.payment.update({
      where: { orderId: order.id },
      data: {
        status: "UNPAID",
        platformConfirmedAt: null,
        platformConfirmedById: null,
      },
    });
  });

  await safelyCreateNotification({
    userId: order.parentId,
    title: "平台信息费确认未通过",
    content: "管理员暂未确认收到平台信息服务费，请核对后重新支付。",
    type: "PAYMENT",
    link: `/parent/orders/${order.id}/pay`,
    dedupeKey: buildNotificationDedupeKey(
      "order",
      order.id,
      "qrcode-platform-rejected",
      order.parentId,
    ),
  });

  revalidatePath("/admin/payments/qrcode");
  revalidatePath("/admin/payments");
  revalidatePath(`/parent/orders/${order.id}/pay`);
  redirect("/admin/payments/qrcode?success=已驳回平台收款确认。");
}
