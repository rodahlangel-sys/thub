"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { buildNotificationDedupeKey, safelyCreateNotification } from "@/lib/notifications";
import { currentPaymentProvider } from "@/lib/payments";
import { getDashboardPath } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

function redirectWithError(orderId: string, message: string): never {
  redirect(
    `/parent/orders/${orderId}/pay?error=${encodeURIComponent(message)}`,
  );
}

export async function payOrderAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.PARENT) {
    redirect(getDashboardPath(user.role));
  }

  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      parentId: user.id,
    },
    include: {
      payment: true,
    },
  });

  if (!order) {
    redirect("/parent/orders");
  }

  if (order.payment?.status === "PAID" || order.status === "ESCROWED") {
    redirectWithError(order.id, "该订单已完成支付，不能重复支付");
  }

  if (order.status === "CANCELLED") {
    redirectWithError(order.id, "已取消订单不能支付");
  }

  if (order.status !== "PENDING_PAYMENT") {
    redirectWithError(order.id, "当前订单状态暂不能支付");
  }

  const paymentResult = await currentPaymentProvider.createPayment({
    id: order.id,
    amount: order.totalAmount,
    subject: order.subject,
  });

  if (
    !paymentResult.success ||
    !paymentResult.amount ||
    !paymentResult.status ||
    !paymentResult.transactionNo ||
    !paymentResult.paidAt
  ) {
    redirectWithError(
      order.id,
      paymentResult.message ?? "支付方式暂不可用，请稍后再试",
    );
  }

  const paidAmount = paymentResult.amount;
  const paymentStatus = paymentResult.status;
  const transactionNo = paymentResult.transactionNo;
  const paidAt = paymentResult.paidAt;

  if (paidAmount !== order.totalAmount) {
    redirectWithError(order.id, "订单金额发生变化，请刷新后重新提交。");
  }

  await prisma.$transaction(async (tx) => {
    const latestOrder = await tx.order.findFirst({
      where: {
        id: order.id,
        parentId: user.id,
      },
      include: {
        payment: true,
      },
    });

    if (!latestOrder) {
      throw new Error("订单不存在");
    }

    if (latestOrder.payment?.status === "PAID" || latestOrder.status === "ESCROWED") {
      throw new Error("该订单已完成支付");
    }

    if (latestOrder.status !== "PENDING_PAYMENT") {
      throw new Error("当前订单状态暂不能支付");
    }

    await tx.order.update({
      where: { id: latestOrder.id },
      data: { status: "ESCROWED" },
    });

    await tx.payment.upsert({
      where: { orderId: latestOrder.id },
      create: {
        orderId: latestOrder.id,
        amount: latestOrder.totalAmount,
        provider: paymentResult.provider,
        status: paymentStatus,
        transactionNo,
        paidAt,
      },
      update: {
        amount: latestOrder.totalAmount,
        provider: paymentResult.provider,
        status: paymentStatus,
        transactionNo,
        paidAt,
      },
    });
  });

  await safelyCreateNotification({
    userId: order.tutorId,
    title: "家长已完成支付",
    content: "订单费用已进入担保状态，请按约定时间完成辅导。",
    type: "PAYMENT",
    link: `/tutor/orders/${order.id}`,
    dedupeKey: buildNotificationDedupeKey("order", order.id, "paid", order.tutorId),
  });

  revalidatePath("/parent");
  revalidatePath("/parent/orders");
  revalidatePath(`/parent/orders/${order.id}`);
  revalidatePath(`/parent/orders/${order.id}/pay`);
  revalidatePath(`/parent/orders/${order.id}/pay/success`);
  revalidatePath("/tutor");
  revalidatePath("/tutor/orders");
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/payments");
  redirect(`/parent/orders/${order.id}/pay/success`);
}
