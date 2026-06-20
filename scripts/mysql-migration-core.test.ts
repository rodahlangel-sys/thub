import assert from "node:assert/strict";
import test from "node:test";
import {
  MIGRATION_TABLES,
  auditSnapshot,
  evaluateTargetState,
  extractModelNames,
  formatDryRunReport,
  parseMigrationMode,
  prepareInsertValues,
  resolveMigrationOrder,
  schemasHaveSameModels,
  compareMigrationSnapshots,
  evaluateBaselineHistory,
  type MigrationSnapshot,
} from "./mysql-migration-core";

const now = new Date("2026-06-20T08:00:00.123Z");

function validSnapshot(): MigrationSnapshot {
  return {
    User: [
      {
        id: "user-parent",
        email: "parent@example.test",
        passwordHash: "sensitive-existing-hash",
        role: "PARENT",
        name: "Parent",
        phone: "13000000000",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
      },
      {
        id: "user-tutor",
        email: "tutor@example.test",
        passwordHash: "another-sensitive-hash",
        role: "TUTOR",
        name: "Tutor",
        phone: "13100000000",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
      },
    ],
    ParentProfile: [
      {
        id: "parent-profile",
        userId: "user-parent",
        area: "Wuhan",
        addressDetail: "Private address",
        childInfo: "Private child info",
        createdAt: now,
        updatedAt: now,
      },
    ],
    TutorProfile: [
      {
        id: "tutor-profile",
        userId: "user-tutor",
        school: "University",
        major: "Math",
        grade: "2024",
        gender: "UNSPECIFIED",
        subjects: "Math",
        teachLevels: "High school",
        areas: "Wuhan",
        teachMode: "BOTH",
        availableTimes: "Weekends",
        priceMin: 10_000,
        priceMax: 20_000,
        introduction: "Introduction",
        experience: "Experience",
        certificationStatus: "APPROVED",
        certificationNote: null,
        rating: 5,
        orderCount: 1,
        createdAt: now,
        updatedAt: now,
      },
    ],
    TutorVerificationDocument: [
      {
        id: "document-1",
        tutorProfileId: "tutor-profile",
        type: "STUDENT_CARD",
        storageKey: "private/storage/key",
        originalName: "student-card.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        status: "APPROVED",
        rejectionReason: null,
        reviewedAt: now,
        reviewedById: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    Demand: [
      {
        id: "demand-1",
        parentId: "user-parent",
        childGrade: "Grade 10",
        subject: "Math",
        goal: "Improve",
        area: "Wuhan",
        teachMode: "BOTH",
        expectedTime: "Weekend",
        budgetMin: 10_000,
        budgetMax: 20_000,
        description: "Description",
        status: "MATCHED",
        createdAt: now,
        updatedAt: now,
      },
    ],
    Order: [
      {
        id: "order-1",
        parentId: "user-parent",
        tutorId: "user-tutor",
        demandId: "demand-1",
        subject: "Math",
        scheduledTime: now,
        teachMode: "BOTH",
        location: "Private location",
        hours: 2,
        hourlyPrice: 5_000,
        totalAmount: 10_000,
        serviceFee: 500,
        platformFeeRateBps: 500,
        platformFeeAmountFen: 500,
        tutorNetAmountFen: 9_500,
        status: "COMPLETED",
        createdAt: now,
        updatedAt: now,
      },
    ],
    Payment: [
      {
        id: "payment-1",
        orderId: "order-1",
        amount: 10_000,
        provider: "MOCK",
        status: "PAID",
        transactionNo: "MOCK-PAYMENT-1",
        paidAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ],
    Refund: [
      {
        id: "refund-1",
        orderId: "order-1",
        applicantId: "user-parent",
        reason: "OTHER",
        description: "Rejected request",
        refundAmount: 1_000,
        previousOrderStatus: "COMPLETED",
        status: "REJECTED",
        adminNote: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    LessonFeedback: [
      {
        id: "feedback-1",
        orderId: "order-1",
        tutorId: "user-tutor",
        content: "Feedback",
        studentPerformance: "Good",
        problems: "None",
        nextSuggestion: "Continue",
        createdAt: now,
        updatedAt: now,
      },
    ],
    Review: [
      {
        id: "review-1",
        orderId: "order-1",
        parentId: "user-parent",
        tutorId: "user-tutor",
        scorePunctuality: 5,
        scoreClarity: 5,
        scoreCommunication: 5,
        scoreAcceptance: 5,
        overallScore: 5,
        comment: "Good",
        createdAt: now,
        updatedAt: now,
      },
    ],
    Settlement: [
      {
        id: "settlement-1",
        orderId: "order-1",
        tutorId: "user-tutor",
        provider: "MOCK",
        status: "SETTLED",
        grossAmountFen: 10_000,
        platformFeeRateBps: 500,
        platformFeeAmountFen: 500,
        tutorNetAmountFen: 9_500,
        transactionNo: "MOCK-SETTLEMENT-1",
        settledAt: now,
        failureReason: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    Notification: [
      {
        id: "notification-1",
        userId: "user-parent",
        title: "Title",
        content: "Private notification content",
        type: "SYSTEM",
        link: "/orders/order-1",
        dedupeKey: "order:order-1:event",
        readAt: null,
        createdAt: now,
      },
    ],
  };
}

test("derives a stable foreign-key-safe migration order", () => {
  assert.deepEqual(resolveMigrationOrder(), MIGRATION_TABLES);
  assert.deepEqual(MIGRATION_TABLES, [
    "User",
    "ParentProfile",
    "TutorProfile",
    "TutorVerificationDocument",
    "Demand",
    "Order",
    "Payment",
    "Refund",
    "LessonFeedback",
    "Review",
    "Settlement",
    "Notification",
  ]);
});

test("accepts a valid snapshot and reports only aggregate counts", () => {
  const audit = auditSnapshot(validSnapshot());
  assert.equal(audit.safeToMigrate, true);
  assert.equal(audit.blockers.length, 0);
  assert.equal(audit.tables.User.sqliteCount, 2);
  assert.equal(audit.tables.User.expectedWrites, 2);
  assert.equal(audit.tables.User.skipped, 0);
  assert.equal(audit.booleanFieldCount, 0);

  const output = JSON.stringify(formatDryRunReport(audit));
  for (const secret of [
    "sensitive-existing-hash",
    "parent@example.test",
    "private/storage/key",
    "Private notification content",
  ] as const) {
    assert.equal(output.includes(secret), false);
  }
});

test("blocks orphan foreign keys and duplicate nullable-aware unique values", () => {
  const snapshot = validSnapshot();
  snapshot.Demand[0].parentId = "missing-user";
  snapshot.Notification.push({ ...snapshot.Notification[0], id: "notification-2" });
  const audit = auditSnapshot(snapshot);
  const codes = new Set(audit.blockers.map((issue) => issue.code));
  assert.equal(codes.has("FOREIGN_KEY_MISSING"), true);
  assert.equal(codes.has("UNIQUE_CONFLICT"), true);
  assert.equal(audit.safeToMigrate, false);
});

test("blocks invalid enums, dates, amounts, required values and varchar lengths", () => {
  const snapshot = validSnapshot();
  snapshot.User[0].role = "INVALID";
  snapshot.Order[0].createdAt = new Date(Number.NaN);
  snapshot.Order[0].totalAmount = -1;
  snapshot.User[0].name = null;
  snapshot.Notification[0].title = "x".repeat(256);
  const audit = auditSnapshot(snapshot);
  const codes = new Set(audit.blockers.map((issue) => issue.code));
  for (const code of [
    "ENUM_INVALID",
    "DATETIME_INVALID",
    "NUMBER_INVALID",
    "REQUIRED_VALUE_MISSING",
    "STRING_TOO_LONG",
  ] as const) {
    assert.equal(codes.has(code), true, code);
  }
});

test("blocks active school-proof and financial snapshot conflicts", () => {
  const snapshot = validSnapshot();
  snapshot.TutorVerificationDocument.push({
    ...snapshot.TutorVerificationDocument[0],
    id: "document-2",
    storageKey: "different-key",
    type: "ENROLLMENT_PROOF",
    status: "SUBMITTED",
  });
  snapshot.Payment[0].amount = 9_999;
  snapshot.Settlement[0].platformFeeAmountFen = 499;
  const audit = auditSnapshot(snapshot);
  const codes = new Set(audit.blockers.map((issue) => issue.code));
  assert.equal(codes.has("ACTIVE_SCHOOL_PROOF_CONFLICT"), true);
  assert.equal(codes.has("PAYMENT_ORDER_AMOUNT_MISMATCH"), true);
  assert.equal(codes.has("SETTLEMENT_AMOUNT_MISMATCH"), true);
});

test("keeps legacy serviceFee differences as non-blocking warnings", () => {
  const snapshot = validSnapshot();
  snapshot.Order[0].serviceFee = 1_000;
  const audit = auditSnapshot(snapshot);
  assert.equal(audit.safeToMigrate, true);
  assert.equal(audit.blockers.length, 0);
  assert.equal(audit.tables.Order.conversionWarnings, 1);
  assert.equal(audit.warnings[0].code, "LEGACY_SERVICE_FEE_DIFFERENCE");
});

test("preserves hashes and converts DateTime to UTC DATETIME(3) values", () => {
  const snapshot = validSnapshot();
  const values = prepareInsertValues("User", snapshot.User[0]);
  assert.equal(values.includes("sensitive-existing-hash"), true);
  assert.equal(values.includes("2026-06-20 08:00:00.123"), true);
});

test("accepts only the explicit apply flag", () => {
  assert.deepEqual(parseMigrationMode([]), { apply: false });
  assert.deepEqual(parseMigrationMode(["--apply"]), { apply: true });
  assert.throws(() => parseMigrationMode(["--force"]));
  assert.throws(() => parseMigrationMode(["--apply", "--force"]));
});

test("extracts the same model names from both Prisma schemas", () => {
  const sqlite = "model User {\n id String @id\n}\nmodel Order {\n id String @id\n}";
  const mysql = "model User {\n id String @id\n}\nmodel Order {\n id String @id\n}";
  assert.deepEqual(extractModelNames(sqlite), ["User", "Order"]);
  assert.deepEqual(extractModelNames(mysql), ["User", "Order"]);
  assert.equal(schemasHaveSameModels(sqlite, mysql), true);
  assert.equal(schemasHaveSameModels(sqlite, "model User {\n id String @id\n}"), false);
});

test("requires the exact empty MySQL target and complete native constraint", () => {
  const ready = evaluateTargetState({
    currentDatabase: "thub_test",
    tableNames: [...MIGRATION_TABLES].sort(),
    rowCounts: Object.fromEntries(MIGRATION_TABLES.map((table) => [table, 0])),
    defaultDatabaseTableCount: 0,
    primaryKeyCount: 12,
    foreignKeyCount: 19,
    uniqueNames: [
      "TutorVerificationDocument_one_active_school_proof",
      "Notification_dedupeKey_key",
      "Order_demandId_tutorId_key",
      "Payment_orderId_key",
      "Review_orderId_key",
      "LessonFeedback_orderId_key",
      "Settlement_orderId_key",
    ],
  });
  assert.equal(ready.ready, true);
  assert.deepEqual(ready.blockers, []);

  const nonEmpty = evaluateTargetState({
    currentDatabase: "thub_test",
    tableNames: [...MIGRATION_TABLES].sort(),
    rowCounts: { ...Object.fromEntries(MIGRATION_TABLES.map((table) => [table, 0])), User: 1 },
    defaultDatabaseTableCount: 0,
    primaryKeyCount: 12,
    foreignKeyCount: 19,
    uniqueNames: ready.requiredUniqueNames,
  });
  assert.equal(nonEmpty.ready, false);
  assert.equal(nonEmpty.blockers.includes("TARGET_NOT_EMPTY"), true);
});

test("ignores only the Prisma migration history table in target readiness", () => {
  const state = {
    currentDatabase: "thub_test",
    tableNames: [...MIGRATION_TABLES],
    rowCounts: Object.fromEntries(MIGRATION_TABLES.map((table) => [table, 0])),
    defaultDatabaseTableCount: 0,
    primaryKeyCount: 12,
    foreignKeyCount: 19,
    uniqueNames: [
      "TutorVerificationDocument_one_active_school_proof",
      "Notification_dedupeKey_key",
      "Order_demandId_tutorId_key",
      "Payment_orderId_key",
      "Review_orderId_key",
      "LessonFeedback_orderId_key",
      "Settlement_orderId_key",
    ],
  };
  state.tableNames.push("_prisma_migrations");
  state.rowCounts._prisma_migrations = 1;
  assert.deepEqual(evaluateTargetState(state).blockers, []);

  state.tableNames.push("UnexpectedBusinessTable");
  state.rowCounts.UnexpectedBusinessTable = 0;
  assert.deepEqual(evaluateTargetState(state).blockers, [
    "MYSQL_TABLE_SET_MISMATCH",
  ]);
});

test("compares migrated snapshots without exposing source values", () => {
  const source = validSnapshot();
  const target = structuredClone(source);
  const match = compareMigrationSnapshots(source, target);

  assert.equal(match.matches, true);
  assert.equal(match.passwordHashesMatch, true);
  assert.equal(match.documentStorageKeysMatch, true);
  assert.equal(match.notificationDedupeKeysMatch, true);
  assert.equal(match.financialFieldsMatch, true);
  assert.equal(JSON.stringify(match).includes("password-hash"), false);

  target.Payment[0].amount = 1;
  const mismatch = compareMigrationSnapshots(source, target);
  assert.equal(mismatch.matches, false);
  assert.equal(mismatch.financialFieldsMatch, false);
  assert.deepEqual(mismatch.tables.Payment, {
    sourceCount: 1,
    targetCount: 1,
    primaryKeysMatch: true,
    rowsMatch: false,
  });
});

test("requires exactly one completed baseline migration with the expected checksum", () => {
  const history = [{
    migrationName: "20260620_mysql_baseline",
    checksum: "expected-checksum",
    finished: true,
    rolledBack: false,
    appliedStepsCount: 0,
  }];
  assert.equal(
    evaluateBaselineHistory(history, "20260620_mysql_baseline", "expected-checksum"),
    true,
  );
  assert.equal(
    evaluateBaselineHistory(history, "20260620_mysql_baseline", "different"),
    false,
  );
  assert.equal(
    evaluateBaselineHistory([...history, ...history], "20260620_mysql_baseline", "expected-checksum"),
    false,
  );
});
