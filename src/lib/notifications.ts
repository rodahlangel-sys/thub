import { Prisma, UserRole, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type NotificationType =
  | "SYSTEM"
  | "AUDIT"
  | "ORDER"
  | "PAYMENT"
  | "FEEDBACK"
  | "REVIEW"
  | "REFUND";

type NotificationParams = {
  title: string;
  content: string;
  type: NotificationType;
  link?: string;
  dedupeKey?: string;
};

type CreateNotificationParams = NotificationParams & {
  userId: string;
};

type PrismaExecutor = typeof prisma | Prisma.TransactionClient;

export function buildNotificationDedupeKey(...parts: string[]) {
  if (parts.length === 0 || parts.some((part) => !part || part.includes(":"))) {
    throw new Error("Notification dedupe key parts must be non-empty and cannot contain colons");
  }

  return parts.join(":");
}

export async function createNotification(
  params: CreateNotificationParams,
  db: PrismaExecutor = prisma,
) {
  const user = await db.user.findFirst({
    where: {
      id: params.userId,
      status: UserStatus.ACTIVE,
    },
    select: { id: true },
  });

  if (!user) {
    return null;
  }

  const data = {
    userId: user.id,
    title: params.title,
    content: params.content,
    type: params.type,
    link: params.link,
    dedupeKey: params.dedupeKey,
  };

  if (params.dedupeKey) {
    return db.notification.upsert({
      where: { dedupeKey: params.dedupeKey },
      update: {},
      create: data,
    });
  }

  return db.notification.create({ data });
}

export async function createNotificationsForUsers(
  userIds: string[],
  params: NotificationParams,
  db: PrismaExecutor = prisma,
) {
  const uniqueUserIds = Array.from(new Set(userIds)).filter(Boolean);

  if (uniqueUserIds.length === 0) {
    return { count: 0 };
  }

  const activeUsers = await db.user.findMany({
    where: {
      id: { in: uniqueUserIds },
      status: UserStatus.ACTIVE,
    },
    select: { id: true },
  });

  if (activeUsers.length === 0) {
    return { count: 0 };
  }

  const notifications = await Promise.all(
    activeUsers.map((user) =>
      createNotification(
        {
          ...params,
          userId: user.id,
          dedupeKey: params.dedupeKey
            ? `${params.dedupeKey}:${user.id}`
            : undefined,
        },
        db,
      ),
    ),
  );

  return { count: notifications.filter(Boolean).length };
}

export async function notifyAdmins(
  params: NotificationParams,
  db: PrismaExecutor = prisma,
) {
  const admins = await db.user.findMany({
    where: {
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
    select: { id: true },
  });

  return createNotificationsForUsers(
    admins.map((admin) => admin.id),
    params,
    db,
  );
}

export async function safelyCreateNotification(
  params: CreateNotificationParams,
  db: PrismaExecutor = prisma,
) {
  try {
    return await createNotification(params, db);
  } catch (error) {
    console.error("Failed to create notification", error);
    return null;
  }
}

export async function safelyNotifyAdmins(
  params: NotificationParams,
  db: PrismaExecutor = prisma,
) {
  try {
    return await notifyAdmins(params, db);
  } catch (error) {
    console.error("Failed to notify admins", error);
    return { count: 0 };
  }
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: {
      userId,
      readAt: null,
    },
  });
}

export async function markNotificationAsRead(
  notificationId: string,
  userId: string,
) {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
}

export async function markAllNotificationsAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
}
