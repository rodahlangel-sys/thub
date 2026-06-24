"use server";

import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import {
  createOrGetConversationForOrder,
  createOrGetConversationForParent,
  sendConversationMessage,
} from "@/lib/conversations";

function messageError(conversationId: string, message: string): never {
  redirect(`/messages/${conversationId}?error=${encodeURIComponent(message)}`);
}

export async function startConversationAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.PARENT) {
    redirect("/messages");
  }

  const demandId = String(formData.get("demandId") ?? "");
  const tutorProfileId = String(formData.get("tutorProfileId") ?? "");
  const orderId = String(formData.get("orderId") ?? "") || null;

  let conversationId: string;
  try {
    const conversation = await createOrGetConversationForParent({
      parentUserId: user.id,
      tutorProfileId,
      demandId,
      orderId,
    });
    conversationId = conversation.id;
  } catch {
    redirect("/messages?error=无法创建会话，请确认需求和家教信息。");
  }

  redirect(`/messages/${conversationId}`);
}

export async function startOrderConversationAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const orderId = String(formData.get("orderId") ?? "");

  let conversationId: string;
  try {
    const conversation = await createOrGetConversationForOrder(orderId, user);
    conversationId = conversation.id;
  } catch {
    redirect("/messages?error=无法创建订单会话，请确认订单状态。");
  }

  redirect(`/messages/${conversationId}`);
}

export async function sendMessageAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const conversationId = String(formData.get("conversationId") ?? "");
  const content = String(formData.get("content") ?? "");

  try {
    await sendConversationMessage({
      conversationId,
      senderUserId: user.id,
      content,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "MESSAGE_EMPTY") {
      messageError(conversationId, "请输入消息内容。");
    }
    if (message === "MESSAGE_TOO_LONG") {
      messageError(conversationId, "消息不能超过1000字。");
    }
    messageError(conversationId, "发送失败，请稍后重试。");
  }

  redirect(`/messages/${conversationId}`);
}
