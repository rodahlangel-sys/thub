"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UserRole, UserStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDashboardPath } from "@/lib/roles";

async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.ADMIN) {
    redirect(getDashboardPath(user.role));
  }

  return user;
}

async function updateUserStatus(formData: FormData, status: UserStatus) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");

  if (!userId) {
    redirect("/admin/users");
  }

  if (userId === admin.id) {
    redirect(`/admin/users/${userId}?error=${encodeURIComponent("不能禁用或恢复自己的账号")}`);
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!targetUser) {
    redirect("/admin/users");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { status },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  redirect(`/admin/users/${userId}`);
}

export async function disableUserAction(formData: FormData) {
  await updateUserStatus(formData, UserStatus.DISABLED);
}

export async function enableUserAction(formData: FormData) {
  await updateUserStatus(formData, UserStatus.ACTIVE);
}
