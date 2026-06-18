"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { buildNotificationDedupeKey, safelyCreateNotification } from "@/lib/notifications";
import { canSubmitLessonFeedback } from "@/lib/order-status";
import { getDashboardPath } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

const feedbackSchema = z.object({
  orderId: z.string().min(1),
  content: z.string().trim().min(1, "请填写本次辅导内容").max(500, "本次辅导内容请控制在 500 字以内"),
  studentPerformance: z.string().trim().min(1, "请填写学生掌握情况").max(500, "学生掌握情况请控制在 500 字以内"),
  problems: z.string().trim().max(500, "存在问题请控制在 500 字以内"),
  nextSuggestion: z.string().trim().max(500, "下次建议请控制在 500 字以内"),
});

function redirectWithError(orderId: string, message: string): never {
  redirect(`/tutor/orders/${orderId}/feedback?error=${encodeURIComponent(message)}`);
}

export async function submitLessonFeedbackAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.TUTOR) {
    redirect(getDashboardPath(user.role));
  }

  const result = feedbackSchema.safeParse({
    orderId: String(formData.get("orderId") ?? ""),
    content: String(formData.get("content") ?? ""),
    studentPerformance: String(formData.get("studentPerformance") ?? ""),
    problems: String(formData.get("problems") ?? ""),
    nextSuggestion: String(formData.get("nextSuggestion") ?? ""),
  });

  if (!result.success) {
    const orderId = String(formData.get("orderId") ?? "");

    redirectWithError(orderId, result.error.issues[0]?.message ?? "课后反馈填写有误");
  }

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: result.data.orderId,
        tutorId: user.id,
      },
      include: {
        lessonFeedback: true,
      },
    });

    if (!order) {
      throw new Error("订单不存在");
    }

    if (order.lessonFeedback) {
      throw new Error("课后反馈已提交");
    }

    if (!canSubmitLessonFeedback(order.status)) {
      throw new Error("当前订单状态不能提交课后反馈");
    }

    await tx.lessonFeedback.create({
      data: {
        orderId: order.id,
        tutorId: user.id,
        content: result.data.content,
        studentPerformance: result.data.studentPerformance,
        problems: result.data.problems,
        nextSuggestion: result.data.nextSuggestion,
      },
    });

    await tx.order.update({
      where: { id: order.id },
      data: { status: "PENDING_PARENT_CONFIRM" },
    });

    await safelyCreateNotification(
      {
        userId: order.parentId,
        title: "老师已提交课后反馈",
        content: "请查看本次辅导反馈，并确认服务是否完成。",
        type: "FEEDBACK",
        link: `/parent/orders/${order.id}`,
        dedupeKey: buildNotificationDedupeKey(
          "order",
          order.id,
          "feedback-submitted",
          order.parentId,
        ),
      },
      tx,
    );
  }).catch((error: unknown) => {
    redirectWithError(
      result.data.orderId,
      error instanceof Error ? error.message : "课后反馈提交失败",
    );
  });

  revalidatePath("/tutor");
  revalidatePath("/tutor/orders");
  revalidatePath(`/tutor/orders/${result.data.orderId}`);
  revalidatePath(`/tutor/orders/${result.data.orderId}/feedback`);
  revalidatePath("/parent");
  revalidatePath("/parent/orders");
  revalidatePath(`/parent/orders/${result.data.orderId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/feedbacks");
  redirect(`/tutor/orders/${result.data.orderId}`);
}
