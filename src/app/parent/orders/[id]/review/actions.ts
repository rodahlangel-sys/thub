"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { buildNotificationDedupeKey, safelyCreateNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getDashboardPath } from "@/lib/roles";

const scoreSchema = z.coerce.number().int().min(1).max(5);

const reviewSchema = z.object({
  orderId: z.string().min(1),
  scorePunctuality: scoreSchema,
  scoreClarity: scoreSchema,
  scoreCommunication: scoreSchema,
  scoreAcceptance: scoreSchema,
  comment: z.string().trim().min(1, "请填写文字评价").max(300, "文字评价请控制在 300 字以内"),
});

function redirectWithError(orderId: string, message: string): never {
  redirect(`/parent/orders/${orderId}/review?error=${encodeURIComponent(message)}`);
}

export async function submitReviewAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.PARENT) {
    redirect(getDashboardPath(user.role));
  }

  const result = reviewSchema.safeParse({
    orderId: String(formData.get("orderId") ?? ""),
    scorePunctuality: formData.get("scorePunctuality"),
    scoreClarity: formData.get("scoreClarity"),
    scoreCommunication: formData.get("scoreCommunication"),
    scoreAcceptance: formData.get("scoreAcceptance"),
    comment: String(formData.get("comment") ?? ""),
  });

  if (!result.success) {
    const orderId = String(formData.get("orderId") ?? "");
    redirectWithError(orderId, result.error.issues[0]?.message ?? "评价填写有误");
  }

  const data = result.data;
  const overallScore =
    Math.round(
      ((data.scorePunctuality +
        data.scoreClarity +
        data.scoreCommunication +
        data.scoreAcceptance) /
        4) *
        10,
    ) / 10;

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          id: data.orderId,
          parentId: user.id,
        },
        include: {
          review: true,
        },
      });

      if (!order) {
        throw new Error("未找到可评价的订单");
      }

      if (order.status !== "COMPLETED") {
        throw new Error("订单完成后才能评价");
      }

      if (order.review) {
        throw new Error("该订单已评价，请勿重复提交");
      }

      await tx.review.create({
        data: {
          orderId: order.id,
          parentId: user.id,
          tutorId: order.tutorId,
          scorePunctuality: data.scorePunctuality,
          scoreClarity: data.scoreClarity,
          scoreCommunication: data.scoreCommunication,
          scoreAcceptance: data.scoreAcceptance,
          overallScore,
          comment: data.comment,
        },
      });

      const scoreAggregate = await tx.review.aggregate({
        where: { tutorId: order.tutorId },
        _avg: { overallScore: true },
      });

      await tx.tutorProfile.update({
        where: { userId: order.tutorId },
        data: {
          orderCount: { increment: 1 },
          rating: Math.round((scoreAggregate._avg.overallScore ?? overallScore) * 10) / 10,
        },
      });

      await safelyCreateNotification(
        {
          userId: order.tutorId,
          title: "你收到一条新的评价",
          content: "家长已对本次服务进行评价。",
          type: "REVIEW",
          link: "/tutor/reviews",
          dedupeKey: buildNotificationDedupeKey(
            "order",
            order.id,
            "reviewed",
            order.tutorId,
          ),
        },
        tx,
      );
    });
  } catch (error) {
    redirectWithError(
      data.orderId,
      error instanceof Error ? error.message : "评价提交失败",
    );
  }

  revalidatePath("/parent");
  revalidatePath("/parent/orders");
  revalidatePath(`/parent/orders/${data.orderId}`);
  revalidatePath(`/parent/orders/${data.orderId}/review`);
  revalidatePath("/tutor");
  revalidatePath("/tutor/orders");
  revalidatePath("/tutor/reviews");
  revalidatePath("/tutors");
  revalidatePath("/admin");
  revalidatePath("/admin/reviews");
  redirect(`/parent/orders/${data.orderId}`);
}
