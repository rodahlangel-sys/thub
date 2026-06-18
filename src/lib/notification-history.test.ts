import assert from "node:assert/strict";
import test from "node:test";
import { analyzeDuplicateNotificationGroups } from "./notification-history";

test("identical legacy payloads without an event instance remain review-only", () => {
  const groups = analyzeDuplicateNotificationGroups([
    {
      id: "notification-1",
      userId: "user-1",
      type: "AUDIT",
      title: "same title",
      content: "same content",
      link: "/tutor/profile",
      createdAt: new Date("2026-06-17T10:00:00Z"),
      dedupeKey: null,
    },
    {
      id: "notification-2",
      userId: "user-1",
      type: "AUDIT",
      title: "same title",
      content: "same content",
      link: "/tutor/profile",
      createdAt: new Date("2026-06-17T10:01:00Z"),
      dedupeKey: null,
    },
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.decision, "REVIEW_REQUIRED");
  assert.equal(groups[0]?.records.length, 2);
  assert.equal(groups[0]?.content, undefined);
});

test("different business links are not grouped as duplicate payloads", () => {
  const groups = analyzeDuplicateNotificationGroups([
    {
      id: "notification-1",
      userId: "user-1",
      type: "ORDER",
      title: "same title",
      content: "same content",
      link: "/parent/orders/order-1",
      createdAt: new Date("2026-06-17T10:00:00Z"),
      dedupeKey: null,
    },
    {
      id: "notification-2",
      userId: "user-1",
      type: "ORDER",
      title: "same title",
      content: "same content",
      link: "/parent/orders/order-2",
      createdAt: new Date("2026-06-17T10:01:00Z"),
      dedupeKey: null,
    },
  ]);

  assert.equal(groups.length, 0);
});
