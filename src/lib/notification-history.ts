import { createHash } from "node:crypto";

export type HistoricalNotification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  content: string;
  link: string | null;
  createdAt: Date;
  dedupeKey: string | null;
};

export type DuplicateNotificationGroup = {
  groupId: string;
  userId: string;
  type: string;
  titleHash: string;
  contentHash: string;
  titleLength: number;
  contentLength: number;
  link: string | null;
  decision: "REVIEW_REQUIRED";
  reason: "MISSING_EVENT_INSTANCE" | "LEGACY_EVENT_INSTANCE_UNPROVEN";
  records: Array<{
    id: string;
    createdAt: string;
    dedupeKey: string | null;
  }>;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function payloadKey(notification: HistoricalNotification) {
  return JSON.stringify([
    notification.userId,
    notification.type,
    notification.title,
    notification.content,
    notification.link,
  ]);
}

function hasSpecificBusinessEntity(link: string | null) {
  if (!link) return false;
  return /\/(orders|refunds|demands|tutors|settlements)\/[^/?#]+/.test(link);
}

export function analyzeDuplicateNotificationGroups(
  notifications: HistoricalNotification[],
): DuplicateNotificationGroup[] {
  const grouped = new Map<string, HistoricalNotification[]>();

  for (const notification of notifications) {
    const key = payloadKey(notification);
    grouped.set(key, [...(grouped.get(key) ?? []), notification]);
  }

  return Array.from(grouped.entries())
    .filter(([, records]) => records.length > 1)
    .map(([key, records]) => {
      const sorted = [...records].sort(
        (left, right) =>
          left.createdAt.getTime() - right.createdAt.getTime() ||
          left.id.localeCompare(right.id),
      );
      const first = sorted[0]!;

      return {
        groupId: sha256(key).slice(0, 16),
        userId: first.userId,
        type: first.type,
        titleHash: sha256(first.title),
        contentHash: sha256(first.content),
        titleLength: first.title.length,
        contentLength: first.content.length,
        link: first.link,
        decision: "REVIEW_REQUIRED" as const,
        reason: hasSpecificBusinessEntity(first.link)
          ? ("LEGACY_EVENT_INSTANCE_UNPROVEN" as const)
          : ("MISSING_EVENT_INSTANCE" as const),
        records: sorted.map((record) => ({
          id: record.id,
          createdAt: record.createdAt.toISOString(),
          dedupeKey: record.dedupeKey,
        })),
      };
    });
}
