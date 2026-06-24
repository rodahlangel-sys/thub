/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import test from "node:test";
import { UserRole } from "@prisma/client";
import {
  createOrGetConversationForParent,
  getConversationForUser,
  listConversationsForUser,
  sendConversationMessage,
  validateMessageContent,
} from "./conversations";

type UserRecord = {
  id: string;
  name: string;
  role: UserRole;
  status: "ACTIVE" | "DISABLED";
};

type TutorProfileRecord = {
  id: string;
  userId: string;
  certificationStatus: "APPROVED" | "PENDING" | "REJECTED";
  user: Pick<UserRecord, "id" | "status" | "role" | "name">;
};

type DemandRecord = {
  id: string;
  parentId: string;
  subject: string;
};

type OrderRecord = {
  id: string;
  parentId: string;
  tutorId: string;
  demandId: string | null;
  subject: string;
};

type ConversationRecord = {
  id: string;
  parentUserId: string;
  tutorUserId: string;
  demandId: string;
  orderId: string | null;
  status: "ACTIVE";
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MessageRecord = {
  id: string;
  conversationId: string;
  senderUserId: string;
  content: string;
  createdAt: Date;
};

function createFakeDb() {
  const users: UserRecord[] = [
    { id: "parent-1", name: "家长A", role: UserRole.PARENT, status: "ACTIVE" },
    { id: "parent-2", name: "家长B", role: UserRole.PARENT, status: "ACTIVE" },
    { id: "tutor-user-1", name: "家教A", role: UserRole.TUTOR, status: "ACTIVE" },
    { id: "tutor-user-2", name: "家教B", role: UserRole.TUTOR, status: "DISABLED" },
  ];
  const tutorProfiles: TutorProfileRecord[] = [
    {
      id: "tutor-profile-1",
      userId: "tutor-user-1",
      certificationStatus: "APPROVED",
      user: users.find((user) => user.id === "tutor-user-1")!,
    },
    {
      id: "tutor-profile-2",
      userId: "tutor-user-2",
      certificationStatus: "APPROVED",
      user: users.find((user) => user.id === "tutor-user-2")!,
    },
  ];
  const demands: DemandRecord[] = [
    { id: "demand-1", parentId: "parent-1", subject: "数学" },
    { id: "demand-2", parentId: "parent-2", subject: "英语" },
  ];
  const orders: OrderRecord[] = [
    {
      id: "order-1",
      parentId: "parent-1",
      tutorId: "tutor-user-1",
      demandId: "demand-1",
      subject: "数学",
    },
    {
      id: "order-mismatch",
      parentId: "parent-2",
      tutorId: "tutor-user-1",
      demandId: "demand-2",
      subject: "英语",
    },
  ];
  const conversations: ConversationRecord[] = [];
  const messages: MessageRecord[] = [];
  let conversationSeq = 0;
  let messageSeq = 0;

  const db = {
    users,
    tutorProfiles,
    demands,
    orders,
    conversations,
    messages,
    $transaction: async (callback: (tx: typeof db) => unknown) => callback(db),
    tutorProfile: {
      findFirst: async ({ where }: any) =>
        tutorProfiles.find(
          (profile) =>
            profile.id === where.id &&
            profile.certificationStatus === where.certificationStatus &&
            profile.user.status === where.user.status &&
            profile.user.role === where.user.role,
        ) ?? null,
    },
    demand: {
      findFirst: async ({ where }: any) =>
        demands.find((demand) => demand.id === where.id && demand.parentId === where.parentId) ??
        null,
    },
    order: {
      findFirst: async ({ where }: any) =>
        orders.find(
          (order) =>
            order.id === where.id &&
            order.parentId === where.parentId &&
            order.tutorId === where.tutorId &&
            order.demandId === where.demandId,
        ) ?? null,
    },
    conversation: {
      findUnique: async ({ where, include }: any) => {
        const conversation = where.id
          ? conversations.find((item) => item.id === where.id)
          : conversations.find(
              (item) =>
                item.parentUserId === where.parentUserId_tutorUserId_demandId.parentUserId &&
                item.tutorUserId === where.parentUserId_tutorUserId_demandId.tutorUserId &&
                item.demandId === where.parentUserId_tutorUserId_demandId.demandId,
            );
        if (!conversation) return null;
        return includeConversation(conversation, include);
      },
      upsert: async ({ where, update, create }: any) => {
        const existing = conversations.find(
          (item) =>
            item.parentUserId === where.parentUserId_tutorUserId_demandId.parentUserId &&
            item.tutorUserId === where.parentUserId_tutorUserId_demandId.tutorUserId &&
            item.demandId === where.parentUserId_tutorUserId_demandId.demandId,
        );
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date("2026-01-01T00:00:01Z") });
          return includeConversation(existing, undefined);
        }
        const created: ConversationRecord = {
          id: `conversation-${++conversationSeq}`,
          ...create,
          status: "ACTIVE",
          lastMessageAt: null,
          createdAt: new Date("2026-01-01T00:00:00Z"),
          updatedAt: new Date("2026-01-01T00:00:00Z"),
        };
        conversations.push(created);
        return includeConversation(created, undefined);
      },
      update: async ({ where, data }: any) => {
        const conversation = conversations.find((item) => item.id === where.id);
        if (!conversation) throw new Error("CONVERSATION_NOT_FOUND");
        Object.assign(conversation, data, { updatedAt: new Date("2026-01-01T00:00:02Z") });
        return conversation;
      },
      findMany: async ({ where, orderBy }: any) => {
        let rows = conversations.filter(
          (conversation) =>
            conversation.parentUserId === where.OR?.[0]?.parentUserId ||
            conversation.tutorUserId === where.OR?.[1]?.tutorUserId,
        );
        if (orderBy?.lastMessageAt === "desc") {
          rows = rows.sort(
            (left, right) =>
              (right.lastMessageAt?.getTime() ?? 0) - (left.lastMessageAt?.getTime() ?? 0),
          );
        }
        return rows.map((conversation) => includeConversation(conversation, { messages: true }));
      },
    },
    message: {
      findFirst: async ({ where, orderBy }: any) => {
        let rows = messages.filter((message) => message.conversationId === where.conversationId);
        if (where.senderUserId) rows = rows.filter((message) => message.senderUserId === where.senderUserId);
        if (where.content) rows = rows.filter((message) => message.content === where.content);
        if (orderBy?.createdAt === "desc") {
          rows = rows.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
        }
        return rows[0] ?? null;
      },
      create: async ({ data }: any) => {
        const created = {
          id: `message-${++messageSeq}`,
          ...data,
          createdAt: new Date(Date.now() + messageSeq),
        } as MessageRecord;
        messages.push(created);
        return created;
      },
      findMany: async ({ where, orderBy }: any) => {
        let rows = messages.filter((message) => message.conversationId === where.conversationId);
        if (orderBy?.createdAt === "asc") {
          rows = rows.sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
        }
        return rows;
      },
    },
  };

  function includeConversation(conversation: ConversationRecord, include: any) {
    if (!include) return conversation;
    return {
      ...conversation,
      parent: users.find((user) => user.id === conversation.parentUserId),
      tutor: users.find((user) => user.id === conversation.tutorUserId),
      demand: demands.find((demand) => demand.id === conversation.demandId),
      order: orders.find((order) => order.id === conversation.orderId) ?? null,
      messages: messages
        .filter((message) => message.conversationId === conversation.id)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime()),
    };
  }

  return db;
}

test("parent creates a conversation idempotently for own demand and approved tutor", async () => {
  const db = createFakeDb();
  const first = await createOrGetConversationForParent(
    {
      parentUserId: "parent-1",
      tutorProfileId: "tutor-profile-1",
      demandId: "demand-1",
    },
    db as any,
  );
  const second = await createOrGetConversationForParent(
    {
      parentUserId: "parent-1",
      tutorProfileId: "tutor-profile-1",
      demandId: "demand-1",
    },
    db as any,
  );

  assert.equal(first.id, second.id);
  assert.equal(db.conversations.length, 1);
});

test("parent cannot create a conversation for another parent's demand", async () => {
  const db = createFakeDb();

  await assert.rejects(
    createOrGetConversationForParent(
      {
        parentUserId: "parent-1",
        tutorProfileId: "tutor-profile-1",
        demandId: "demand-2",
      },
      db as any,
    ),
    /DEMAND_NOT_FOUND/,
  );
});

test("order association must match the same parent tutor and demand", async () => {
  const db = createFakeDb();

  await assert.rejects(
    createOrGetConversationForParent(
      {
        parentUserId: "parent-1",
        tutorProfileId: "tutor-profile-1",
        demandId: "demand-1",
        orderId: "order-mismatch",
      },
      db as any,
    ),
    /ORDER_NOT_FOUND/,
  );
});

test("participants can send and read messages sorted by creation time", async () => {
  const db = createFakeDb();
  const conversation = await createOrGetConversationForParent(
    {
      parentUserId: "parent-1",
      tutorProfileId: "tutor-profile-1",
      demandId: "demand-1",
      orderId: "order-1",
    },
    db as any,
  );

  const parentMessage = await sendConversationMessage(
    {
      conversationId: conversation.id,
      senderUserId: "parent-1",
      content: "  你好，可以沟通一下上课时间吗？  ",
    },
    db as any,
  );
  const tutorMessage = await sendConversationMessage(
    {
      conversationId: conversation.id,
      senderUserId: "tutor-user-1",
      content: "可以，我周末下午有时间。",
    },
    db as any,
  );
  const visible = await getConversationForUser(conversation.id, "parent-1", db as any);

  assert.equal(parentMessage.content, "你好，可以沟通一下上课时间吗？");
  assert.deepEqual(
    visible?.messages.map((message) => message.id),
    [parentMessage.id, tutorMessage.id],
  );
});

test("message content rejects empty and too long text", () => {
  assert.throws(() => validateMessageContent("   "), /MESSAGE_EMPTY/);
  assert.throws(() => validateMessageContent("x".repeat(1001)), /MESSAGE_TOO_LONG/);
  assert.equal(validateMessageContent("  正常消息  "), "正常消息");
});

test("non participants cannot view or send messages", async () => {
  const db = createFakeDb();
  const conversation = await createOrGetConversationForParent(
    {
      parentUserId: "parent-1",
      tutorProfileId: "tutor-profile-1",
      demandId: "demand-1",
    },
    db as any,
  );

  assert.equal(await getConversationForUser(conversation.id, "parent-2", db as any), null);
  await assert.rejects(
    sendConversationMessage(
      {
        conversationId: conversation.id,
        senderUserId: "parent-2",
        content: "我不应该能发",
      },
      db as any,
    ),
    /CONVERSATION_FORBIDDEN/,
  );
});

test("rapid duplicate submit returns the existing message", async () => {
  const db = createFakeDb();
  const conversation = await createOrGetConversationForParent(
    {
      parentUserId: "parent-1",
      tutorProfileId: "tutor-profile-1",
      demandId: "demand-1",
    },
    db as any,
  );

  const first = await sendConversationMessage(
    { conversationId: conversation.id, senderUserId: "parent-1", content: "重复点击" },
    db as any,
  );
  const second = await sendConversationMessage(
    { conversationId: conversation.id, senderUserId: "parent-1", content: "重复点击" },
    db as any,
  );

  assert.equal(first.id, second.id);
  assert.equal(db.messages.length, 1);
});

test("conversation list includes last message summary and counterpart name", async () => {
  const db = createFakeDb();
  const conversation = await createOrGetConversationForParent(
    {
      parentUserId: "parent-1",
      tutorProfileId: "tutor-profile-1",
      demandId: "demand-1",
    },
    db as any,
  );
  await sendConversationMessage(
    { conversationId: conversation.id, senderUserId: "parent-1", content: "第一条消息" },
    db as any,
  );

  const list = await listConversationsForUser(
    { id: "parent-1", role: UserRole.PARENT },
    db as any,
  );

  assert.equal(list.length, 1);
  assert.equal(list[0].counterpartName, "家教A");
  assert.equal(list[0].lastMessagePreview, "第一条消息");
  assert.equal(list[0].demandSubject, "数学");
});
