import { ConversationStatus, Prisma, UserRole, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ConversationDb = typeof prisma | Prisma.TransactionClient;
type TransactionCapableDb = typeof prisma & {
  $transaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
};

type ConversationListRow = {
  id: string;
  tutor?: { name?: string | null } | null;
  parent?: { name?: string | null } | null;
  demand?: { subject?: string | null } | null;
  order?: { subject?: string | null } | null;
  messages: Array<{ content: string }>;
  lastMessageAt: Date | null;
  updatedAt: Date;
};

type CreateConversationInput = {
  parentUserId: string;
  tutorProfileId: string;
  demandId: string;
  orderId?: string | null;
};

type SendMessageInput = {
  conversationId: string;
  senderUserId: string;
  content: string;
};

type ConversationUser = {
  id: string;
  role: UserRole;
};

export function validateMessageContent(value: string) {
  const content = value.trim();

  if (!content) {
    throw new Error("MESSAGE_EMPTY");
  }

  if (content.length > 1000) {
    throw new Error("MESSAGE_TOO_LONG");
  }

  return content;
}

export async function createOrGetConversationForParent(
  input: CreateConversationInput,
  db: ConversationDb = prisma,
) {
  return (db as TransactionCapableDb).$transaction(async (tx) => {
    const [demand, tutorProfile] = await Promise.all([
      tx.demand.findFirst({
        where: {
          id: input.demandId,
          parentId: input.parentUserId,
        },
        select: {
          id: true,
          parentId: true,
          subject: true,
        },
      }),
      tx.tutorProfile.findFirst({
        where: {
          id: input.tutorProfileId,
          certificationStatus: "APPROVED",
          user: {
            role: UserRole.TUTOR,
            status: UserStatus.ACTIVE,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
              status: true,
            },
          },
        },
      }),
    ]);

    if (!demand) {
      throw new Error("DEMAND_NOT_FOUND");
    }

    if (!tutorProfile) {
      throw new Error("TUTOR_NOT_AVAILABLE");
    }

    if (input.orderId) {
      const order = await tx.order.findFirst({
        where: {
          id: input.orderId,
          parentId: input.parentUserId,
          tutorId: tutorProfile.userId,
          demandId: input.demandId,
        },
        select: { id: true },
      });

      if (!order) {
        throw new Error("ORDER_NOT_FOUND");
      }
    }

    return tx.conversation.upsert({
      where: {
        parentUserId_tutorUserId_demandId: {
          parentUserId: input.parentUserId,
          tutorUserId: tutorProfile.userId,
          demandId: input.demandId,
        },
      },
      update: input.orderId ? { orderId: input.orderId } : {},
      create: {
        parentUserId: input.parentUserId,
        tutorUserId: tutorProfile.userId,
        demandId: input.demandId,
        orderId: input.orderId ?? null,
        status: ConversationStatus.ACTIVE,
      },
    });
  });
}

export async function createOrGetConversationForOrder(
  orderId: string,
  user: ConversationUser,
  db: ConversationDb = prisma,
) {
  const order = await db.order.findFirst({
    where:
      user.role === UserRole.PARENT
        ? { id: orderId, parentId: user.id }
        : user.role === UserRole.TUTOR
          ? { id: orderId, tutorId: user.id }
          : { id: "__never__" },
    include: {
      tutor: {
        include: {
          tutorProfile: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!order || !order.demandId || !order.tutor.tutorProfile) {
    throw new Error("ORDER_NOT_FOUND");
  }

  return createOrGetConversationForParent(
    {
      parentUserId: order.parentId,
      tutorProfileId: order.tutor.tutorProfile.id,
      demandId: order.demandId,
      orderId: order.id,
    },
    db,
  );
}

export async function getConversationForUser(
  conversationId: string,
  userId: string,
  db: ConversationDb = prisma,
) {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: {
      parent: { select: { id: true, name: true } },
      tutor: { select: { id: true, name: true } },
      demand: { select: { id: true, subject: true, childGrade: true } },
      order: { select: { id: true, subject: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sender: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!conversation) {
    return null;
  }

  if (conversation.parentUserId !== userId && conversation.tutorUserId !== userId) {
    return null;
  }

  return conversation;
}

export async function sendConversationMessage(
  input: SendMessageInput,
  db: ConversationDb = prisma,
) {
  const content = validateMessageContent(input.content);

  return (db as TransactionCapableDb).$transaction(async (tx) => {
    const conversation = await tx.conversation.findUnique({
      where: { id: input.conversationId },
      select: {
        id: true,
        parentUserId: true,
        tutorUserId: true,
      },
    });

    if (!conversation) {
      throw new Error("CONVERSATION_NOT_FOUND");
    }

    if (
      conversation.parentUserId !== input.senderUserId &&
      conversation.tutorUserId !== input.senderUserId
    ) {
      throw new Error("CONVERSATION_FORBIDDEN");
    }

    const duplicate = await tx.message.findFirst({
      where: {
        conversationId: input.conversationId,
        senderUserId: input.senderUserId,
        content,
      },
      orderBy: { createdAt: "desc" },
    });

    if (duplicate) {
      return duplicate;
    }

    const message = await tx.message.create({
      data: {
        conversationId: input.conversationId,
        senderUserId: input.senderUserId,
        content,
      },
    });

    await tx.conversation.update({
      where: { id: input.conversationId },
      data: { lastMessageAt: message.createdAt },
    });

    return message;
  });
}

export async function listConversationsForUser(
  user: ConversationUser,
  db: ConversationDb = prisma,
) {
  if (user.role !== UserRole.PARENT && user.role !== UserRole.TUTOR) {
    return [];
  }

  const rows = await db.conversation.findMany({
    where:
      user.role === UserRole.PARENT
        ? { OR: [{ parentUserId: user.id }] }
        : { OR: [{ tutorUserId: user.id }] },
    include: {
      parent: { select: { id: true, name: true } },
      tutor: { select: { id: true, name: true } },
      demand: { select: { id: true, subject: true, childGrade: true } },
      order: { select: { id: true, subject: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
  });

  return (rows as ConversationListRow[]).map((conversation) => {
    const counterpart =
      user.role === UserRole.PARENT ? conversation.tutor : conversation.parent;
    const lastMessage = conversation.messages.at(-1) ?? null;

    return {
      id: conversation.id,
      counterpartName: counterpart?.name ?? "对方用户",
      demandSubject: conversation.demand?.subject ?? "关联需求",
      orderSubject: conversation.order?.subject ?? null,
      lastMessagePreview: lastMessage?.content ?? "暂无消息",
      lastMessageAt: conversation.lastMessageAt ?? conversation.updatedAt,
      updatedAt: conversation.updatedAt,
    };
  });
}
