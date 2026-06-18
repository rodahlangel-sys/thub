"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { TeachMode, UserRole } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { buildNotificationDedupeKey, safelyNotifyAdmins } from "@/lib/notifications";
import { getDashboardPath } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

const demandSchema = z
  .object({
    childGrade: z.string().trim().min(1, "请填写孩子年级"),
    subject: z.string().trim().min(1, "请填写辅导科目"),
    goal: z.string().trim().min(1, "请填写辅导目标"),
    area: z.string().trim().min(1, "请填写服务区域"),
    teachMode: z.nativeEnum(TeachMode),
    expectedTime: z.string().trim().min(1, "请填写期望上课时间"),
    budgetMin: z.coerce.number().int().min(1, "最低预算需大于 0"),
    budgetMax: z.coerce.number().int().min(1, "最高预算需大于 0"),
    description: z.string().trim().max(500, "补充说明请控制在 500 字以内"),
  })
  .refine((data) => data.budgetMin <= data.budgetMax, {
    message: "最低预算不能高于最高预算",
    path: ["budgetMax"],
  });

function redirectWithError(message: string): never {
  redirect(`/parent/demands/new?error=${encodeURIComponent(message)}`);
}

export async function createDemandAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.PARENT) {
    redirect(getDashboardPath(user.role));
  }

  const result = demandSchema.safeParse({
    childGrade: String(formData.get("childGrade") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    goal: String(formData.get("goal") ?? ""),
    area: String(formData.get("area") ?? ""),
    teachMode: String(formData.get("teachMode") ?? ""),
    expectedTime: String(formData.get("expectedTime") ?? ""),
    budgetMin: String(formData.get("budgetMin") ?? ""),
    budgetMax: String(formData.get("budgetMax") ?? ""),
    description: String(formData.get("description") ?? ""),
  });

  if (!result.success) {
    redirectWithError(result.error.issues[0]?.message ?? "需求填写有误");
  }

  const demand = await prisma.demand.create({
    data: {
      parentId: user.id,
      childGrade: result.data.childGrade,
      subject: result.data.subject,
      goal: result.data.goal,
      area: result.data.area,
      teachMode: result.data.teachMode,
      expectedTime: result.data.expectedTime,
      budgetMin: result.data.budgetMin,
      budgetMax: result.data.budgetMax,
      description: result.data.description,
      status: "OPEN",
    },
  });

  await safelyNotifyAdmins({
    title: "有新的家教需求",
    content: "家长发布了新的家教需求，可在需求管理中查看。",
    type: "SYSTEM",
    link: "/admin/demands",
    dedupeKey: buildNotificationDedupeKey(
      "demand",
      demand.id,
      "created",
      "admins",
    ),
  });

  revalidatePath("/parent");
  revalidatePath("/parent/demands");
  revalidatePath("/admin");
  revalidatePath("/admin/demands");
  redirect(`/parent/demands?success=${encodeURIComponent("需求已发布")}`);
}
