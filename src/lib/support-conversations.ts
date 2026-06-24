import { Prisma, UserRole, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type SupportDb = typeof prisma | Prisma.TransactionClient;
type TransactionCapableDb = typeof prisma & {
  $transaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
};

export type SupportUser = {
  id: string;
  role: UserRole;
  status: UserStatus;
};

type SupportListRow = {
  id: string;
  user?: {
    id: string;
    name: string;
    role: UserRole;
  } | null;
  messages: Array<{ content: string }>;
  lastMessageAt: Date | null;
  updatedAt: Date;
};

export function validateSupportMessageContent(value: string) {
  const content = value.trim();

  if (!content) {
    throw new Error("SUPPORT_MESSAGE_EMPTY");
  }

  if (content.length > 1000) {
    throw new Error("SUPPORT_MESSAGE_TOO_LONG");
  }

  return content;
}

function ensureActiveUser(user: SupportUser) {
  if (user.status !== UserStatus.ACTIVE) {
    throw new Error("SUPPORT_USER_INACTIVE");
  }
}

function ensureCustomerUser(user: SupportUser) {
  ensureActiveUser(user);

  if (user.role !== UserRole.PARENT && user.role !== UserRole.TUTOR) {
    throw new Error("SUPPORT_CUSTOMER_REQUIRED");
  }
}

function ensureAdminUser(user: SupportUser) {
  ensureActiveUser(user);

  if (user.role !== UserRole.ADMIN) {
    throw new Error("SUPPORT_ADMIN_REQUIRED");
  }
}

export async function createOrGetSupportConversationForUser(
  user: SupportUser,
  db: SupportDb = prisma,
) {
  ensureCustomerUser(user);

  return db.supportConversation.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });
}

export async function getSupportConversationForUser(
  conversationId: string,
  user: SupportUser,
  db: SupportDb = prisma,
) {
  ensureActiveUser(user);

  const conversation = await db.supportConversation.findUnique({
    where: { id: conversationId },
    include: {
      user: { select: { id: true, name: true, role: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { id: true, name: true, role: true } } },
      },
    },
  });

  if (!conversation) {
    return null;
  }

  if (user.role !== UserRole.ADMIN && conversation.userId !== user.id) {
    return null;
  }

  return conversation;
}

export async function listSupportConversationsForAdmin(
  admin: SupportUser,
  db: SupportDb = prisma,
) {
  ensureAdminUser(admin);

  const rows = await db.supportConversation.findMany({
    include: {
      user: { select: { id: true, name: true, role: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
  });

  return (rows as SupportListRow[]).map((conversation) => {
    const lastMessage = conversation.messages.at(-1) ?? null;

    return {
      id: conversation.id,
      userName: conversation.user?.name ?? "用户",
      userRole: conversation.user?.role ?? UserRole.PARENT,
      lastMessagePreview: lastMessage?.content ?? "暂无消息",
      lastMessageAt: conversation.lastMessageAt ?? conversation.updatedAt,
      updatedAt: conversation.updatedAt,
    };
  });
}

export async function sendSupportMessage(
  input: {
    conversationId: string;
    sender: SupportUser;
    content: string;
  },
  db: SupportDb = prisma,
) {
  const content = validateSupportMessageContent(input.content);
  ensureActiveUser(input.sender);

  return (db as TransactionCapableDb).$transaction(async (tx) => {
    const conversation = await tx.supportConversation.findUnique({
      where: { id: input.conversationId },
      select: { id: true, userId: true },
    });

    if (!conversation) {
      throw new Error("SUPPORT_CONVERSATION_NOT_FOUND");
    }

    if (input.sender.role !== UserRole.ADMIN && conversation.userId !== input.sender.id) {
      throw new Error("SUPPORT_CONVERSATION_FORBIDDEN");
    }

    if (
      input.sender.role !== UserRole.ADMIN &&
      input.sender.role !== UserRole.PARENT &&
      input.sender.role !== UserRole.TUTOR
    ) {
      throw new Error("SUPPORT_CONVERSATION_FORBIDDEN");
    }

    const duplicate = await tx.supportMessage.findFirst({
      where: {
        conversationId: input.conversationId,
        senderUserId: input.sender.id,
        content,
      },
      orderBy: { createdAt: "desc" },
    });

    if (duplicate) {
      return duplicate;
    }

    const message = await tx.supportMessage.create({
      data: {
        conversationId: input.conversationId,
        senderUserId: input.sender.id,
        content,
      },
    });

    await tx.supportConversation.update({
      where: { id: input.conversationId },
      data: { lastMessageAt: message.createdAt },
    });

    return message;
  });
}
