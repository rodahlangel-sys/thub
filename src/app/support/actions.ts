"use server";

import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import {
  createOrGetSupportConversationForUser,
  sendSupportMessage,
} from "@/lib/support-conversations";

function supportError(message: string): never {
  redirect(`/support?error=${encodeURIComponent(message)}`);
}

export async function sendUserSupportMessageAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.PARENT && user.role !== UserRole.TUTOR) {
    redirect("/admin/support");
  }

  const content = String(formData.get("content") ?? "");

  try {
    const conversation = await createOrGetSupportConversationForUser(user);
    await sendSupportMessage({
      conversationId: conversation.id,
      sender: user,
      content,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "SUPPORT_MESSAGE_EMPTY") {
      supportError("请输入消息内容。");
    }
    if (message === "SUPPORT_MESSAGE_TOO_LONG") {
      supportError("消息不能超过1000字。");
    }
    supportError("发送失败，请稍后重试。");
  }

  redirect("/support");
}
