"use server";

import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { sendSupportMessage } from "@/lib/support-conversations";
import { getDashboardPath } from "@/lib/roles";

function adminSupportError(conversationId: string, message: string): never {
  redirect(`/admin/support/${conversationId}?error=${encodeURIComponent(message)}`);
}

export async function sendAdminSupportMessageAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.ADMIN) {
    redirect(getDashboardPath(user.role));
  }

  const conversationId = String(formData.get("conversationId") ?? "");
  const content = String(formData.get("content") ?? "");

  try {
    await sendSupportMessage({
      conversationId,
      sender: user,
      content,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "SUPPORT_MESSAGE_EMPTY") {
      adminSupportError(conversationId, "请输入回复内容。");
    }
    if (message === "SUPPORT_MESSAGE_TOO_LONG") {
      adminSupportError(conversationId, "消息不能超过1000字。");
    }
    adminSupportError(conversationId, "回复失败，请稍后重试。");
  }

  redirect(`/admin/support/${conversationId}`);
}
