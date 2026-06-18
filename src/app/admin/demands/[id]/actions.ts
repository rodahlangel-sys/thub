"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardPath } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

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

async function updateDemandStatus(demandId: string, status: "OPEN" | "CLOSED") {
  await requireAdmin();

  const demand = await prisma.demand.findUnique({
    where: { id: demandId },
    select: { id: true },
  });

  if (!demand) {
    redirect("/admin/demands");
  }

  await prisma.demand.update({
    where: { id: demand.id },
    data: { status },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/demands");
  revalidatePath(`/admin/demands/${demand.id}`);
  revalidatePath("/parent");
  revalidatePath("/parent/demands");
  redirect(
    `/admin/demands/${demand.id}?success=${encodeURIComponent(
      status === "OPEN" ? "需求已重新开放" : "需求已关闭",
    )}`,
  );
}

export async function closeAdminDemandAction(formData: FormData) {
  const demandId = String(formData.get("demandId") ?? "");

  await updateDemandStatus(demandId, "CLOSED");
}

export async function reopenAdminDemandAction(formData: FormData) {
  const demandId = String(formData.get("demandId") ?? "");

  await updateDemandStatus(demandId, "OPEN");
}
