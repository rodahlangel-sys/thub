"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { buildNotificationDedupeKey, safelyCreateNotification } from "@/lib/notifications";
import { getDashboardPath } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

async function updateTutorOrderStatus(orderId: string, status: "PENDING_PAYMENT" | "CANCELLED") {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.TUTOR) {
    redirect(getDashboardPath(user.role));
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      tutorId: user.id,
    },
    select: {
      id: true,
      status: true,
      parentId: true,
    },
  });

  if (!order) {
    redirect("/tutor/orders");
  }

  if (order.status !== "PENDING_TUTOR_CONFIRM") {
    redirect(`/tutor/orders/${order.id}`);
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status },
  });

  await safelyCreateNotification({
    userId: order.parentId,
    title: status === "PENDING_PAYMENT" ? "老师已确认接单" : "老师已拒绝本次预约",
    content:
      status === "PENDING_PAYMENT"
        ? "老师已确认本次预约，请完成支付。"
        : "本次预约已取消，你可以重新选择其他老师。",
    type: "ORDER",
    link: `/parent/orders/${order.id}`,
    dedupeKey: buildNotificationDedupeKey("order", order.id, status, order.parentId),
  });

  revalidatePath("/tutor");
  revalidatePath("/tutor/orders");
  revalidatePath(`/tutor/orders/${order.id}`);
  revalidatePath("/parent");
  revalidatePath("/parent/orders");
  revalidatePath(`/parent/orders/${order.id}`);
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  redirect(`/tutor/orders/${order.id}`);
}

export async function confirmTutorOrderAction(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");

  await updateTutorOrderStatus(orderId, "PENDING_PAYMENT");
}

export async function rejectTutorOrderAction(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");

  await updateTutorOrderStatus(orderId, "CANCELLED");
}

export async function startTutorOrderAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.TUTOR) {
    redirect(getDashboardPath(user.role));
  }

  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      tutorId: user.id,
    },
    select: {
      id: true,
      status: true,
      parentId: true,
    },
  });

  if (!order) {
    redirect("/tutor/orders");
  }

  if (order.status !== "ESCROWED") {
    redirect(`/tutor/orders/${order.id}`);
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: "IN_PROGRESS" },
  });

  await safelyCreateNotification({
    userId: order.parentId,
    title: "老师已开始服务",
    content: "老师已标记开始本次辅导服务。",
    type: "ORDER",
    link: `/parent/orders/${order.id}`,
    dedupeKey: buildNotificationDedupeKey("order", order.id, "started", order.parentId),
  });

  revalidatePath("/tutor");
  revalidatePath("/tutor/orders");
  revalidatePath(`/tutor/orders/${order.id}`);
  revalidatePath("/parent");
  revalidatePath("/parent/orders");
  revalidatePath(`/parent/orders/${order.id}`);
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  redirect(`/tutor/orders/${order.id}`);
}
