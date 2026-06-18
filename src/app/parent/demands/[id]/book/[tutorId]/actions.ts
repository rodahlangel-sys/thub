"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, TeachMode, UserRole } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  calculateOrderAmounts,
  calculateServerHourlyPrice,
  parseScheduledTime,
} from "@/lib/orders";
import { buildNotificationDedupeKey, safelyCreateNotification } from "@/lib/notifications";
import { getDashboardPath } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { yuanToFen } from "@/lib/settlements";

const createOrderSchema = z
  .object({
    demandId: z.string().min(1),
    tutorProfileId: z.string().min(1),
    subject: z.string().trim().min(1, "请填写预约科目"),
    scheduledTime: z.string().trim().min(1, "请填写预约时间"),
    teachMode: z.nativeEnum(TeachMode),
    location: z.string().trim().min(1, "请填写上课地点"),
    hours: z.coerce
      .number()
      .refine((value) => Number.isFinite(value), "课时填写有误")
      .min(0.5, "课时至少 0.5 小时")
      .max(8, "单次课时不建议超过 8 小时"),
  })
  .refine((data) => Number.isInteger(data.hours * 2), {
    message: "课时请按 0.5 小时递增",
    path: ["hours"],
  });

function redirectWithError(demandId: string, tutorProfileId: string, message: string): never {
  redirect(
    `/parent/demands/${demandId}/book/${tutorProfileId}?error=${encodeURIComponent(
      message,
    )}`,
  );
}

export async function createOrderAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.PARENT) {
    redirect(getDashboardPath(user.role));
  }

  const result = createOrderSchema.safeParse({
    demandId: String(formData.get("demandId") ?? ""),
    tutorProfileId: String(formData.get("tutorProfileId") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    scheduledTime: String(formData.get("scheduledTime") ?? ""),
    teachMode: String(formData.get("teachMode") ?? ""),
    location: String(formData.get("location") ?? ""),
    hours: String(formData.get("hours") ?? ""),
  });

  if (!result.success) {
    const demandId = String(formData.get("demandId") ?? "");
    const tutorProfileId = String(formData.get("tutorProfileId") ?? "");

    redirectWithError(
      demandId,
      tutorProfileId,
      result.error.issues[0]?.message ?? "预约信息填写有误",
    );
  }

  const scheduledTime = parseScheduledTime(result.data.scheduledTime);

  if (!scheduledTime) {
    redirectWithError(
      result.data.demandId,
      result.data.tutorProfileId,
      "预约时间请按 2026-06-13 14:00 这样的格式填写",
    );
  }

  const [demand, tutorProfile] = await Promise.all([
    prisma.demand.findFirst({
      where: {
        id: result.data.demandId,
        parentId: user.id,
      },
      select: {
        id: true,
        status: true,
        budgetMin: true,
        budgetMax: true,
      },
    }),
    prisma.tutorProfile.findUnique({
      where: {
        id: result.data.tutorProfileId,
      },
      select: {
        id: true,
        userId: true,
        certificationStatus: true,
        priceMin: true,
        priceMax: true,
      },
    }),
  ]);

  if (!demand) {
    redirect("/parent/demands");
  }

  if (demand.status === "CLOSED") {
    redirectWithError(
      result.data.demandId,
      result.data.tutorProfileId,
      "该需求已关闭，不能创建预约订单。",
    );
  }

  if (!tutorProfile || tutorProfile.certificationStatus !== "APPROVED") {
    redirectWithError(
      result.data.demandId,
      result.data.tutorProfileId,
      "只能预约已通过认证的老师",
    );
  }

  let hourlyPrice: number;

  try {
    hourlyPrice = calculateServerHourlyPrice(demand, tutorProfile);
  } catch {
    redirectWithError(
      result.data.demandId,
      result.data.tutorProfileId,
      "订单金额规则异常，请刷新后重新提交。",
    );
  }

  const hourlyPriceFen = yuanToFen(hourlyPrice);
  const amounts = calculateOrderAmounts(result.data.hours, hourlyPriceFen);
  let order;

  try {
    order = await prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findFirst({
        where: {
          demandId: demand.id,
          tutorId: tutorProfile.userId,
        },
        select: { id: true },
      });

      if (existingOrder) {
        throw new Error("DUPLICATE_BOOKING");
      }

      return tx.order.create({
        data: {
          parentId: user.id,
          tutorId: tutorProfile.userId,
          demandId: demand.id,
          subject: result.data.subject,
          scheduledTime,
          teachMode: result.data.teachMode,
          location: result.data.location,
          hours: result.data.hours,
          hourlyPrice: hourlyPriceFen,
          totalAmount: amounts.totalAmount,
          serviceFee: amounts.serviceFee,
          platformFeeRateBps: amounts.platformFeeRateBps,
          platformFeeAmountFen: amounts.platformFeeAmountFen,
          tutorNetAmountFen: amounts.tutorNetAmountFen,
          status: "PENDING_TUTOR_CONFIRM",
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "DUPLICATE_BOOKING") {
      redirectWithError(
        result.data.demandId,
        result.data.tutorProfileId,
        "你已经向这位大学生提交过该需求的预约，请前往我的订单查看。",
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirectWithError(
        result.data.demandId,
        result.data.tutorProfileId,
        "该预约已经存在，请勿重复提交。",
      );
    }

    throw error;
  }

  await safelyCreateNotification({
    userId: tutorProfile.userId,
    title: "你收到一条新的预约",
    content: "家长预约了你的家教服务，请及时确认。",
    type: "ORDER",
    link: `/tutor/orders/${order.id}`,
    dedupeKey: buildNotificationDedupeKey(
      "order",
      order.id,
      "created",
      tutorProfile.userId,
    ),
  });

  revalidatePath("/parent");
  revalidatePath("/parent/orders");
  revalidatePath("/tutor");
  revalidatePath("/tutor/orders");
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  redirect(`/parent/orders/${order.id}`);
}
