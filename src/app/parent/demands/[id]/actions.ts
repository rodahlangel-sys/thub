"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardPath } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function closeParentDemandAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.PARENT) {
    redirect(getDashboardPath(user.role));
  }

  const demandId = String(formData.get("demandId") ?? "");
  const demand = await prisma.demand.findFirst({
    where: {
      id: demandId,
      parentId: user.id,
    },
    select: { id: true },
  });

  if (!demand) {
    redirect("/parent/demands");
  }

  await prisma.demand.update({
    where: { id: demand.id },
    data: { status: "CLOSED" },
  });

  revalidatePath("/parent");
  revalidatePath("/parent/demands");
  revalidatePath(`/parent/demands/${demand.id}`);
  revalidatePath("/admin");
  revalidatePath("/admin/demands");
  redirect(
    `/parent/demands/${demand.id}?success=${encodeURIComponent("需求已关闭")}`,
  );
}
