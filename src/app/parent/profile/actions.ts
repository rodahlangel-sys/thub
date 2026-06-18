"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardPath } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

const parentProfileSchema = z.object({
  area: z.string().trim().min(1, "请选择或填写所在区域"),
  addressDetail: z.string().trim().max(120, "详细地址请控制在 120 字以内"),
  childInfo: z.string().trim().max(300, "孩子情况请控制在 300 字以内"),
});

function redirectWithError(message: string): never {
  redirect(`/parent/profile?error=${encodeURIComponent(message)}`);
}

export async function updateParentProfileAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.PARENT) {
    redirect(getDashboardPath(user.role));
  }

  const result = parentProfileSchema.safeParse({
    area: String(formData.get("area") ?? ""),
    addressDetail: String(formData.get("addressDetail") ?? ""),
    childInfo: String(formData.get("childInfo") ?? ""),
  });

  if (!result.success) {
    redirectWithError(result.error.issues[0]?.message ?? "资料填写有误");
  }

  await prisma.parentProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      area: result.data.area,
      addressDetail: result.data.addressDetail,
      childInfo: result.data.childInfo,
    },
    update: {
      area: result.data.area,
      addressDetail: result.data.addressDetail,
      childInfo: result.data.childInfo,
    },
  });

  redirect(`/parent/profile?success=${encodeURIComponent("家长资料已保存")}`);
}
