"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/notifications";

export async function markNotificationReadAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const notificationId = String(formData.get("notificationId") ?? "");

  if (notificationId) {
    await markNotificationAsRead(notificationId, user.id);
  }

  revalidatePath("/notifications");
  revalidatePath("/");
  revalidatePath("/parent");
  revalidatePath("/tutor");
  revalidatePath("/admin");
}

export async function markAllNotificationsReadAction() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  await markAllNotificationsAsRead(user.id);

  revalidatePath("/notifications");
  revalidatePath("/");
  revalidatePath("/parent");
  revalidatePath("/tutor");
  revalidatePath("/admin");
}
