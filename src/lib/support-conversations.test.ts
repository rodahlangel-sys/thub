/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import test from "node:test";
import { UserRole, UserStatus } from "@prisma/client";
import {
  createOrGetSupportConversationForUser,
  getSupportConversationForUser,
  listSupportConversationsForAdmin,
  sendSupportMessage,
  validateSupportMessageContent,
} from "./support-conversations";

type UserRecord = {
  id: string;
  name: string;
  role: UserRole;
  status: UserStatus;
};

type SupportConversationRecord = {
  id: string;
  userId: string;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type SupportMessageRecord = {
  id: string;
  conversationId: string;
  senderUserId: string;
  content: string;
  createdAt: Date;
};

function createFakeDb() {
  const users: UserRecord[] = [
    { id: "parent-1", name: "Parent One", role: UserRole.PARENT, status: UserStatus.ACTIVE },
    { id: "tutor-1", name: "Tutor One", role: UserRole.TUTOR, status: UserStatus.ACTIVE },
    { id: "parent-2", name: "Parent Two", role: UserRole.PARENT, status: UserStatus.ACTIVE },
    { id: "admin-1", name: "Admin One", role: UserRole.ADMIN, status: UserStatus.ACTIVE },
    { id: "disabled-1", name: "Disabled", role: UserRole.PARENT, status: UserStatus.DISABLED },
  ];
  const supportConversations: SupportConversationRecord[] = [];
  const supportMessages: SupportMessageRecord[] = [];
  let conversationSeq = 0;
  let messageSeq = 0;

  const db = {
    users,
    supportConversations,
    supportMessages,
    $transaction: async (callback: (tx: typeof db) => unknown) => callback(db),
    user: {
      findUnique: async ({ where }: any) =>
        users.find((user) => user.id === where.id) ?? null,
    },
    supportConversation: {
      findUnique: async ({ where, include }: any) => {
        const conversation = where.id
          ? supportConversations.find((item) => item.id === where.id)
          : supportConversations.find((item) => item.userId === where.userId);
        return conversation ? includeConversation(conversation, include) : null;
      },
      upsert: async ({ where, create, update }: any) => {
        const existing = supportConversations.find((item) => item.userId === where.userId);
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date("2026-01-01T00:00:02Z") });
          return includeConversation(existing, undefined);
        }
        const created: SupportConversationRecord = {
          id: `support-conversation-${++conversationSeq}`,
          ...create,
          lastMessageAt: null,
          createdAt: new Date("2026-01-01T00:00:00Z"),
          updatedAt: new Date("2026-01-01T00:00:00Z"),
        };
        supportConversations.push(created);
        return includeConversation(created, undefined);
      },
      update: async ({ where, data }: any) => {
        const conversation = supportConversations.find((item) => item.id === where.id);
        if (!conversation) throw new Error("SUPPORT_CONVERSATION_NOT_FOUND");
        Object.assign(conversation, data, { updatedAt: new Date("2026-01-01T00:00:03Z") });
        return conversation;
      },
      findMany: async ({ orderBy }: any) => {
        let rows = [...supportConversations];
        if (orderBy?.[0]?.lastMessageAt === "desc") {
          rows = rows.sort(
            (left, right) =>
              (right.lastMessageAt?.getTime() ?? 0) - (left.lastMessageAt?.getTime() ?? 0),
          );
        }
        return rows.map((conversation) => includeConversation(conversation, { messages: true }));
      },
    },
    supportMessage: {
      findFirst: async ({ where, orderBy }: any) => {
        let rows = supportMessages.filter((message) => message.conversationId === where.conversationId);
        if (where.senderUserId) rows = rows.filter((message) => message.senderUserId === where.senderUserId);
        if (where.content) rows = rows.filter((message) => message.content === where.content);
        if (orderBy?.createdAt === "desc") {
          rows = rows.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
        }
        return rows[0] ?? null;
      },
      create: async ({ data }: any) => {
        const created: SupportMessageRecord = {
          id: `support-message-${++messageSeq}`,
          ...data,
          createdAt: new Date(Date.now() + messageSeq),
        };
        supportMessages.push(created);
        return created;
      },
    },
  };

  function includeConversation(conversation: SupportConversationRecord, include: any) {
    if (!include) return conversation;
    return {
      ...conversation,
      user: users.find((user) => user.id === conversation.userId),
      messages: supportMessages
        .filter((message) => message.conversationId === conversation.id)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
        .map((message) => ({
          ...message,
          sender: users.find((user) => user.id === message.senderUserId),
        })),
    };
  }

  return db;
}

test("user gets one idempotent support conversation", async () => {
  const db = createFakeDb();
  const first = await createOrGetSupportConversationForUser(
    { id: "parent-1", role: UserRole.PARENT, status: UserStatus.ACTIVE },
    db as any,
  );
  const second = await createOrGetSupportConversationForUser(
    { id: "parent-1", role: UserRole.PARENT, status: UserStatus.ACTIVE },
    db as any,
  );

  assert.equal(first.id, second.id);
  assert.equal(db.supportConversations.length, 1);
});

test("parent and tutor can send support messages and admin can reply", async () => {
  const db = createFakeDb();
  const parentConversation = await createOrGetSupportConversationForUser(
    { id: "parent-1", role: UserRole.PARENT, status: UserStatus.ACTIVE },
    db as any,
  );
  const tutorConversation = await createOrGetSupportConversationForUser(
    { id: "tutor-1", role: UserRole.TUTOR, status: UserStatus.ACTIVE },
    db as any,
  );

  await sendSupportMessage(
    {
      conversationId: parentConversation.id,
      sender: { id: "parent-1", role: UserRole.PARENT, status: UserStatus.ACTIVE },
      content: "  Need help with an order. ",
    },
    db as any,
  );
  await sendSupportMessage(
    {
      conversationId: tutorConversation.id,
      sender: { id: "tutor-1", role: UserRole.TUTOR, status: UserStatus.ACTIVE },
      content: "Need help with my profile.",
    },
    db as any,
  );
  const reply = await sendSupportMessage(
    {
      conversationId: parentConversation.id,
      sender: { id: "admin-1", role: UserRole.ADMIN, status: UserStatus.ACTIVE },
      content: "We will check it.",
    },
    db as any,
  );
  const visible = await getSupportConversationForUser(
    parentConversation.id,
    { id: "parent-1", role: UserRole.PARENT, status: UserStatus.ACTIVE },
    db as any,
  );

  assert.equal(reply.senderUserId, "admin-1");
  assert.deepEqual(
    visible?.messages.map((message) => message.content),
    ["Need help with an order.", "We will check it."],
  );
  assert.equal(db.supportMessages.length, 3);
});

test("admin can list support conversations with last message summary", async () => {
  const db = createFakeDb();
  const conversation = await createOrGetSupportConversationForUser(
    { id: "parent-1", role: UserRole.PARENT, status: UserStatus.ACTIVE },
    db as any,
  );
  await sendSupportMessage(
    {
      conversationId: conversation.id,
      sender: { id: "parent-1", role: UserRole.PARENT, status: UserStatus.ACTIVE },
      content: "I need help.",
    },
    db as any,
  );

  const list = await listSupportConversationsForAdmin(
    { id: "admin-1", role: UserRole.ADMIN, status: UserStatus.ACTIVE },
    db as any,
  );

  assert.equal(list.length, 1);
  assert.equal(list[0].userName, "Parent One");
  assert.equal(list[0].userRole, UserRole.PARENT);
  assert.equal(list[0].lastMessagePreview, "I need help.");
});

test("ordinary users cannot view or write to other support conversations", async () => {
  const db = createFakeDb();
  const conversation = await createOrGetSupportConversationForUser(
    { id: "parent-1", role: UserRole.PARENT, status: UserStatus.ACTIVE },
    db as any,
  );

  assert.equal(
    await getSupportConversationForUser(
      conversation.id,
      { id: "parent-2", role: UserRole.PARENT, status: UserStatus.ACTIVE },
      db as any,
    ),
    null,
  );
  await assert.rejects(
    sendSupportMessage(
      {
        conversationId: conversation.id,
        sender: { id: "parent-2", role: UserRole.PARENT, status: UserStatus.ACTIVE },
        content: "I should not send this.",
      },
      db as any,
    ),
    /SUPPORT_CONVERSATION_FORBIDDEN/,
  );
});

test("non admin cannot list support conversations", async () => {
  const db = createFakeDb();

  await assert.rejects(
    listSupportConversationsForAdmin(
      { id: "parent-1", role: UserRole.PARENT, status: UserStatus.ACTIVE },
      db as any,
    ),
    /SUPPORT_ADMIN_REQUIRED/,
  );
});

test("disabled users and invalid message content are rejected", async () => {
  const db = createFakeDb();

  await assert.rejects(
    createOrGetSupportConversationForUser(
      { id: "disabled-1", role: UserRole.PARENT, status: UserStatus.DISABLED },
      db as any,
    ),
    /SUPPORT_USER_INACTIVE/,
  );
  assert.throws(() => validateSupportMessageContent("   "), /SUPPORT_MESSAGE_EMPTY/);
  assert.throws(() => validateSupportMessageContent("x".repeat(1001)), /SUPPORT_MESSAGE_TOO_LONG/);
  assert.equal(validateSupportMessageContent("  normal text  "), "normal text");
});
