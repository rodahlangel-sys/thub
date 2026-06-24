import { createHash } from "node:crypto";
import { calculateSettlementAmounts } from "../src/lib/settlements";

export const MIGRATION_TABLES = [
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
] as const;

export type MigrationTable = (typeof MIGRATION_TABLES)[number];
export type MigrationValue = string | number | boolean | Date | null | undefined;
export type MigrationRow = Record<string, MigrationValue>;
export type MigrationSnapshot = Record<MigrationTable, MigrationRow[]>;

type ForeignKeySpec = {
  field: string;
  references: MigrationTable;
  nullable?: boolean;
};

type NumberSpec = {
  integer?: boolean;
  min?: number;
  max?: number;
};

type TableSpec = {
  columns: readonly string[];
  dependencies: readonly MigrationTable[];
  nullable?: readonly string[];
  dates: readonly string[];
  enums?: Readonly<Record<string, readonly string[]>>;
  foreignKeys?: readonly ForeignKeySpec[];
  numbers?: Readonly<Record<string, NumberSpec>>;
  stringMaxChars?: Readonly<Record<string, number>>;
  textFields?: readonly string[];
  unique?: readonly (readonly string[])[];
};

const id = { id: 191 } as const;
const timestamps = ["createdAt", "updatedAt"] as const;

export const TABLE_SPECS: Record<MigrationTable, TableSpec> = {
  User: {
    columns: [
      "id",
      "email",
      "passwordHash",
      "role",
      "name",
      "phone",
      "status",
      "createdAt",
      "updatedAt",
      "termsAcceptedAt",
      "privacyAcceptedAt",
    ],
    dependencies: [],
    nullable: ["termsAcceptedAt", "privacyAcceptedAt"],
    dates: [...timestamps, "termsAcceptedAt", "privacyAcceptedAt"],
    enums: {
      role: ["PARENT", "TUTOR", "ADMIN"],
      status: ["ACTIVE", "DISABLED"],
    },
    stringMaxChars: { ...id, email: 320, passwordHash: 255, name: 191, phone: 32 },
    unique: [["email"]],
  },
  ParentProfile: {
    columns: ["id", "userId", "area", "addressDetail", "childInfo", "createdAt", "updatedAt"],
    dependencies: ["User"],
    dates: timestamps,
    foreignKeys: [{ field: "userId", references: "User" }],
    stringMaxChars: { ...id, userId: 191, area: 191 },
    textFields: ["addressDetail", "childInfo"],
    unique: [["userId"]],
  },
  TutorProfile: {
    columns: [
      "id",
      "userId",
      "school",
      "major",
      "grade",
      "gender",
      "subjects",
      "teachLevels",
      "areas",
      "teachMode",
      "availableTimes",
      "priceMin",
      "priceMax",
      "introduction",
      "experience",
      "certificationStatus",
      "certificationNote",
      "rating",
      "orderCount",
      "createdAt",
      "updatedAt",
    ],
    dependencies: ["User"],
    nullable: ["certificationNote"],
    dates: timestamps,
    enums: {
      teachMode: ["ONLINE", "OFFLINE", "BOTH"],
      certificationStatus: ["PENDING", "APPROVED", "REJECTED"],
    },
    foreignKeys: [{ field: "userId", references: "User" }],
    numbers: {
      priceMin: { integer: true, min: 0 },
      priceMax: { integer: true, min: 0 },
      rating: { min: 0, max: 5 },
      orderCount: { integer: true, min: 0 },
    },
    stringMaxChars: {
      ...id,
      userId: 191,
      school: 191,
      major: 191,
      grade: 64,
      gender: 32,
    },
    textFields: [
      "subjects",
      "teachLevels",
      "areas",
      "availableTimes",
      "introduction",
      "experience",
      "certificationNote",
    ],
    unique: [["userId"]],
  },
  TutorVerificationDocument: {
    columns: [
      "id",
      "tutorProfileId",
      "type",
      "storageKey",
      "originalName",
      "mimeType",
      "sizeBytes",
      "status",
      "rejectionReason",
      "reviewedAt",
      "reviewedById",
      "createdAt",
      "updatedAt",
    ],
    dependencies: ["TutorProfile", "User"],
    nullable: ["rejectionReason", "reviewedAt", "reviewedById"],
    dates: [...timestamps, "reviewedAt"],
    enums: {
      type: ["STUDENT_CARD", "ENROLLMENT_PROOF", "CERTIFICATE", "OTHER"],
      status: ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"],
    },
    foreignKeys: [
      { field: "tutorProfileId", references: "TutorProfile" },
      { field: "reviewedById", references: "User", nullable: true },
    ],
    numbers: { sizeBytes: { integer: true, min: 0 } },
    stringMaxChars: {
      ...id,
      tutorProfileId: 191,
      storageKey: 512,
      originalName: 255,
      mimeType: 191,
      reviewedById: 191,
    },
    textFields: ["rejectionReason"],
    unique: [["storageKey"]],
  },
  Demand: {
    columns: [
      "id",
      "parentId",
      "childGrade",
      "subject",
      "goal",
      "area",
      "teachMode",
      "expectedTime",
      "budgetMin",
      "budgetMax",
      "description",
      "status",
      "createdAt",
      "updatedAt",
    ],
    dependencies: ["User"],
    dates: timestamps,
    enums: {
      teachMode: ["ONLINE", "OFFLINE", "BOTH"],
      status: ["OPEN", "MATCHED", "CLOSED"],
    },
    foreignKeys: [{ field: "parentId", references: "User" }],
    numbers: {
      budgetMin: { integer: true, min: 0 },
      budgetMax: { integer: true, min: 0 },
    },
    stringMaxChars: { ...id, parentId: 191, childGrade: 64, subject: 191, area: 191 },
    textFields: ["goal", "expectedTime", "description"],
  },
  Order: {
    columns: [
      "id",
      "parentId",
      "tutorId",
      "demandId",
      "subject",
      "scheduledTime",
      "teachMode",
      "location",
      "hours",
      "hourlyPrice",
      "totalAmount",
      "serviceFee",
      "platformFeeRateBps",
      "platformFeeAmountFen",
      "tutorNetAmountFen",
      "status",
      "createdAt",
      "updatedAt",
    ],
    dependencies: ["User", "Demand"],
    nullable: ["demandId"],
    dates: [...timestamps, "scheduledTime"],
    enums: {
      teachMode: ["ONLINE", "OFFLINE", "BOTH"],
      status: [
        "PENDING_TUTOR_CONFIRM",
        "PENDING_PAYMENT",
        "ESCROWED",
        "IN_PROGRESS",
        "PENDING_PARENT_CONFIRM",
        "COMPLETED",
        "REFUND_REQUESTED",
        "REFUNDED",
        "CANCELLED",
      ],
    },
    foreignKeys: [
      { field: "parentId", references: "User" },
      { field: "tutorId", references: "User" },
      { field: "demandId", references: "Demand", nullable: true },
    ],
    numbers: {
      hours: { min: Number.MIN_VALUE },
      hourlyPrice: { integer: true, min: 1 },
      totalAmount: { integer: true, min: 1 },
      serviceFee: { integer: true, min: 0 },
      platformFeeRateBps: { integer: true, min: 0, max: 10_000 },
      platformFeeAmountFen: { integer: true, min: 0 },
      tutorNetAmountFen: { integer: true, min: 0 },
    },
    stringMaxChars: { ...id, parentId: 191, tutorId: 191, demandId: 191, subject: 191 },
    textFields: ["location"],
    unique: [["demandId", "tutorId"]],
  },
  Payment: {
    columns: [
      "id",
      "orderId",
      "amount",
      "provider",
      "status",
      "transactionNo",
      "paidAt",
      "createdAt",
      "updatedAt",
    ],
    dependencies: ["Order"],
    nullable: ["transactionNo", "paidAt"],
    dates: [...timestamps, "paidAt"],
    foreignKeys: [{ field: "orderId", references: "Order" }],
    numbers: { amount: { integer: true, min: 1 } },
    stringMaxChars: { ...id, orderId: 191, provider: 64, status: 64, transactionNo: 255 },
    unique: [["orderId"]],
  },
  Refund: {
    columns: [
      "id",
      "orderId",
      "applicantId",
      "reason",
      "description",
      "refundAmount",
      "previousOrderStatus",
      "status",
      "adminNote",
      "createdAt",
      "updatedAt",
    ],
    dependencies: ["Order", "User"],
    nullable: ["previousOrderStatus", "adminNote"],
    dates: timestamps,
    enums: {
      previousOrderStatus: [
        "PENDING_TUTOR_CONFIRM",
        "PENDING_PAYMENT",
        "ESCROWED",
        "IN_PROGRESS",
        "PENDING_PARENT_CONFIRM",
        "COMPLETED",
        "REFUND_REQUESTED",
        "REFUNDED",
        "CANCELLED",
      ],
      status: ["PENDING", "APPROVED", "REJECTED"],
    },
    foreignKeys: [
      { field: "orderId", references: "Order" },
      { field: "applicantId", references: "User" },
    ],
    numbers: { refundAmount: { integer: true, min: 1 } },
    stringMaxChars: { ...id, orderId: 191, applicantId: 191, reason: 191 },
    textFields: ["description", "adminNote"],
  },
  LessonFeedback: {
    columns: [
      "id",
      "orderId",
      "tutorId",
      "content",
      "studentPerformance",
      "problems",
      "nextSuggestion",
      "createdAt",
      "updatedAt",
    ],
    dependencies: ["Order", "User"],
    dates: timestamps,
    foreignKeys: [
      { field: "orderId", references: "Order" },
      { field: "tutorId", references: "User" },
    ],
    stringMaxChars: { ...id, orderId: 191, tutorId: 191 },
    textFields: ["content", "studentPerformance", "problems", "nextSuggestion"],
    unique: [["orderId"]],
  },
  Review: {
    columns: [
      "id",
      "orderId",
      "parentId",
      "tutorId",
      "scorePunctuality",
      "scoreClarity",
      "scoreCommunication",
      "scoreAcceptance",
      "overallScore",
      "comment",
      "createdAt",
      "updatedAt",
    ],
    dependencies: ["Order", "User"],
    dates: timestamps,
    foreignKeys: [
      { field: "orderId", references: "Order" },
      { field: "parentId", references: "User" },
      { field: "tutorId", references: "User" },
    ],
    numbers: {
      scorePunctuality: { integer: true, min: 1, max: 5 },
      scoreClarity: { integer: true, min: 1, max: 5 },
      scoreCommunication: { integer: true, min: 1, max: 5 },
      scoreAcceptance: { integer: true, min: 1, max: 5 },
      overallScore: { min: 1, max: 5 },
    },
    stringMaxChars: { ...id, orderId: 191, parentId: 191, tutorId: 191 },
    textFields: ["comment"],
    unique: [["orderId"]],
  },
  Settlement: {
    columns: [
      "id",
      "orderId",
      "tutorId",
      "provider",
      "status",
      "grossAmountFen",
      "platformFeeRateBps",
      "platformFeeAmountFen",
      "tutorNetAmountFen",
      "transactionNo",
      "settledAt",
      "failureReason",
      "createdAt",
      "updatedAt",
    ],
    dependencies: ["Order", "User"],
    nullable: ["transactionNo", "settledAt", "failureReason"],
    dates: [...timestamps, "settledAt"],
    enums: {
      provider: ["MOCK"],
      status: ["PENDING", "SETTLED", "FAILED", "REVERSED"],
    },
    foreignKeys: [
      { field: "orderId", references: "Order" },
      { field: "tutorId", references: "User" },
    ],
    numbers: {
      grossAmountFen: { integer: true, min: 1 },
      platformFeeRateBps: { integer: true, min: 0, max: 10_000 },
      platformFeeAmountFen: { integer: true, min: 0 },
      tutorNetAmountFen: { integer: true, min: 0 },
    },
    stringMaxChars: { ...id, orderId: 191, tutorId: 191, transactionNo: 255 },
    textFields: ["failureReason"],
    unique: [["orderId"], ["transactionNo"]],
  },
  Notification: {
    columns: ["id", "userId", "title", "content", "type", "link", "dedupeKey", "readAt", "createdAt"],
    dependencies: ["User"],
    nullable: ["link", "dedupeKey", "readAt"],
    dates: ["createdAt", "readAt"],
    foreignKeys: [{ field: "userId", references: "User" }],
    stringMaxChars: { ...id, userId: 191, title: 255, type: 64, dedupeKey: 512 },
    textFields: ["content", "link"],
    unique: [["dedupeKey"]],
  },
};

export type AuditIssueCode =
  | "ACTIVE_SCHOOL_PROOF_CONFLICT"
  | "DATETIME_INVALID"
  | "ENUM_INVALID"
  | "FINANCIAL_MISMATCH"
  | "FOREIGN_KEY_MISSING"
  | "NUMBER_INVALID"
  | "PAYMENT_ORDER_AMOUNT_MISMATCH"
  | "REQUIRED_VALUE_MISSING"
  | "SETTLEMENT_AMOUNT_MISMATCH"
  | "STRING_TOO_LONG"
  | "UNIQUE_CONFLICT";

export type AuditIssue = {
  table: MigrationTable;
  field: string;
  code: AuditIssueCode;
};

export type AuditWarning = {
  table: MigrationTable;
  field: string;
  code: "LEGACY_SERVICE_FEE_DIFFERENCE";
};

export type TableAuditSummary = {
  sqliteCount: number;
  expectedWrites: number;
  skipped: number;
  errorCount: number;
  foreignKeyIssues: number;
  uniqueConstraintConflicts: number;
  conversionWarnings: number;
};

export type MigrationAudit = {
  safeToMigrate: boolean;
  blockers: AuditIssue[];
  warnings: AuditWarning[];
  tables: Record<MigrationTable, TableAuditSummary>;
  totalSqliteRecords: number;
  totalExpectedWrites: number;
  booleanFieldCount: number;
  dateTimeValueCount: number;
};

export function resolveMigrationOrder() {
  const resolved: MigrationTable[] = [];
  const visiting = new Set<MigrationTable>();
  const visited = new Set<MigrationTable>();

  function visit(table: MigrationTable) {
    if (visited.has(table)) return;
    if (visiting.has(table)) throw new Error("MIGRATION_DEPENDENCY_CYCLE");
    visiting.add(table);
    for (const dependency of TABLE_SPECS[table].dependencies) visit(dependency);
    visiting.delete(table);
    visited.add(table);
    resolved.push(table);
  }

  for (const table of MIGRATION_TABLES) visit(table);
  return resolved;
}

function isMissing(value: unknown) {
  return value === null || value === undefined;
}

function isValidDate(value: unknown) {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function uniqueKey(row: MigrationRow, fields: readonly string[]) {
  const values = fields.map((field) => row[field]);
  if (values.some(isMissing)) return null;
  return JSON.stringify(values);
}

export function auditSnapshot(snapshot: MigrationSnapshot): MigrationAudit {
  const blockers: AuditIssue[] = [];
  const warnings: AuditWarning[] = [];
  const invalidRows = Object.fromEntries(
    MIGRATION_TABLES.map((table) => [table, new Set<number>()]),
  ) as Record<MigrationTable, Set<number>>;
  let dateTimeValueCount = 0;

  const addIssue = (
    table: MigrationTable,
    rowIndex: number,
    code: AuditIssueCode,
    field: string,
  ) => {
    blockers.push({ table, code, field });
    invalidRows[table].add(rowIndex);
  };

  const ids = Object.fromEntries(
    MIGRATION_TABLES.map((table) => [
      table,
      new Set(snapshot[table].map((row) => row.id).filter((value) => typeof value === "string")),
    ]),
  ) as Record<MigrationTable, Set<string>>;

  for (const table of MIGRATION_TABLES) {
    const spec = TABLE_SPECS[table];
    const nullable = new Set(spec.nullable ?? []);
    const idCounts = new Map<string, number>();

    snapshot[table].forEach((row, rowIndex) => {
      for (const field of spec.columns) {
        if (!nullable.has(field) && isMissing(row[field])) {
          addIssue(table, rowIndex, "REQUIRED_VALUE_MISSING", field);
        }
      }

      if (typeof row.id !== "string" || row.id.length === 0) {
        addIssue(table, rowIndex, "REQUIRED_VALUE_MISSING", "id");
      } else {
        idCounts.set(row.id, (idCounts.get(row.id) ?? 0) + 1);
      }

      for (const field of spec.dates) {
        const value = row[field];
        if (isMissing(value) && nullable.has(field)) continue;
        if (!isValidDate(value)) addIssue(table, rowIndex, "DATETIME_INVALID", field);
        else dateTimeValueCount += 1;
      }

      for (const [field, allowed] of Object.entries(spec.enums ?? {})) {
        const value = row[field];
        if (isMissing(value) && nullable.has(field)) continue;
        if (typeof value !== "string" || !allowed.includes(value)) {
          addIssue(table, rowIndex, "ENUM_INVALID", field);
        }
      }

      for (const [field, numberSpec] of Object.entries(spec.numbers ?? {})) {
        const value = row[field];
        const valid =
          typeof value === "number" &&
          Number.isFinite(value) &&
          (!numberSpec.integer || Number.isSafeInteger(value)) &&
          (numberSpec.min === undefined || value >= numberSpec.min) &&
          (numberSpec.max === undefined || value <= numberSpec.max);
        if (!valid) addIssue(table, rowIndex, "NUMBER_INVALID", field);
      }

      for (const [field, max] of Object.entries(spec.stringMaxChars ?? {})) {
        const value = row[field];
        if (isMissing(value) && nullable.has(field)) continue;
        if (typeof value === "string" && value.length > max) {
          addIssue(table, rowIndex, "STRING_TOO_LONG", field);
        }
      }

      for (const field of spec.textFields ?? []) {
        const value = row[field];
        if (isMissing(value) && nullable.has(field)) continue;
        if (typeof value === "string" && Buffer.byteLength(value, "utf8") > 65_535) {
          addIssue(table, rowIndex, "STRING_TOO_LONG", field);
        }
      }
    });

    for (const count of idCounts.values()) {
      if (count > 1) {
        const rowIndex = snapshot[table].findIndex(
          (row) => typeof row.id === "string" && (idCounts.get(row.id) ?? 0) > 1,
        );
        addIssue(table, rowIndex, "UNIQUE_CONFLICT", "id");
      }
    }

    for (const fields of spec.unique ?? []) {
      const seen = new Set<string>();
      snapshot[table].forEach((row, rowIndex) => {
        const key = uniqueKey(row, fields);
        if (key === null) return;
        if (seen.has(key)) addIssue(table, rowIndex, "UNIQUE_CONFLICT", fields.join("+"));
        else seen.add(key);
      });
    }

    for (const foreignKey of spec.foreignKeys ?? []) {
      snapshot[table].forEach((row, rowIndex) => {
        const value = row[foreignKey.field];
        if (isMissing(value) && foreignKey.nullable) return;
        if (typeof value !== "string" || !ids[foreignKey.references].has(value)) {
          addIssue(table, rowIndex, "FOREIGN_KEY_MISSING", foreignKey.field);
        }
      });
    }
  }

  const activeProofs = new Set<string>();
  snapshot.TutorVerificationDocument.forEach((row, rowIndex) => {
    const active =
      typeof row.type === "string" &&
      typeof row.status === "string" &&
      ["STUDENT_CARD", "ENROLLMENT_PROOF"].includes(row.type) &&
      ["DRAFT", "SUBMITTED", "APPROVED"].includes(row.status);
    if (!active || typeof row.tutorProfileId !== "string") return;
    if (activeProofs.has(row.tutorProfileId)) {
      addIssue(
        "TutorVerificationDocument",
        rowIndex,
        "ACTIVE_SCHOOL_PROOF_CONFLICT",
        "tutorProfileId",
      );
    } else activeProofs.add(row.tutorProfileId);
  });

  const orders = new Map<string, MigrationRow>(
    snapshot.Order.flatMap((row) =>
      typeof row.id === "string" ? [[row.id, row] as const] : [],
    ),
  );
  const payments = new Map<string, MigrationRow>(
    snapshot.Payment.flatMap((row) =>
      typeof row.orderId === "string" ? [[row.orderId, row] as const] : [],
    ),
  );
  const approvedRefundOrderIds = new Set(
    snapshot.Refund.flatMap((row) =>
      row.status === "APPROVED" && typeof row.orderId === "string"
        ? [row.orderId]
        : [],
    ),
  );

  snapshot.TutorProfile.forEach((row, rowIndex) => {
    if (
      isFiniteNumber(row.priceMin) &&
      isFiniteNumber(row.priceMax) &&
      row.priceMin > row.priceMax
    ) {
      addIssue("TutorProfile", rowIndex, "FINANCIAL_MISMATCH", "priceMin+priceMax");
    }
  });
  snapshot.Demand.forEach((row, rowIndex) => {
    if (
      isFiniteNumber(row.budgetMin) &&
      isFiniteNumber(row.budgetMax) &&
      row.budgetMin > row.budgetMax
    ) {
      addIssue("Demand", rowIndex, "FINANCIAL_MISMATCH", "budgetMin+budgetMax");
    }
  });
  snapshot.Order.forEach((row, rowIndex) => {
    if (
      isFiniteNumber(row.hours) &&
      typeof row.hourlyPrice === "number" &&
      Number.isSafeInteger(row.hourlyPrice) &&
      Math.round(row.hours * row.hourlyPrice) !== row.totalAmount
    ) {
      addIssue("Order", rowIndex, "FINANCIAL_MISMATCH", "hours+hourlyPrice+totalAmount");
    }
    try {
      if (
        typeof row.totalAmount !== "number" ||
        typeof row.platformFeeRateBps !== "number"
      ) {
        throw new Error("INVALID_FEE_SNAPSHOT");
      }
      const amounts = calculateSettlementAmounts(
        row.totalAmount,
        row.platformFeeRateBps,
      );
      if (
        row.platformFeeRateBps !== 500 ||
        row.platformFeeAmountFen !== amounts.platformFeeAmountFen ||
        row.tutorNetAmountFen !== amounts.tutorNetAmountFen
      ) {
        addIssue("Order", rowIndex, "FINANCIAL_MISMATCH", "feeSnapshot");
      }
      if (row.serviceFee !== amounts.platformFeeAmountFen) {
        warnings.push({
          table: "Order",
          field: "serviceFee",
          code: "LEGACY_SERVICE_FEE_DIFFERENCE",
        });
      }
    } catch {
      addIssue("Order", rowIndex, "FINANCIAL_MISMATCH", "feeSnapshot");
    }
  });
  snapshot.Payment.forEach((row, rowIndex) => {
    const order =
      typeof row.orderId === "string" ? orders.get(row.orderId) : undefined;
    if (order && row.amount !== order.totalAmount) {
      addIssue("Payment", rowIndex, "PAYMENT_ORDER_AMOUNT_MISMATCH", "amount");
    }
  });
  snapshot.Refund.forEach((row, rowIndex) => {
    const order =
      typeof row.orderId === "string" ? orders.get(row.orderId) : undefined;
    if (
      order &&
      isFiniteNumber(row.refundAmount) &&
      isFiniteNumber(order.totalAmount) &&
      row.refundAmount > order.totalAmount
    ) {
      addIssue("Refund", rowIndex, "FINANCIAL_MISMATCH", "refundAmount");
    }
  });
  snapshot.Settlement.forEach((row, rowIndex) => {
    const order =
      typeof row.orderId === "string" ? orders.get(row.orderId) : undefined;
    const payment =
      typeof row.orderId === "string" ? payments.get(row.orderId) : undefined;
    let mismatch =
      !order ||
      row.grossAmountFen !== order.totalAmount ||
      row.platformFeeRateBps !== order.platformFeeRateBps ||
      row.platformFeeAmountFen !== order.platformFeeAmountFen ||
      row.tutorNetAmountFen !== order.tutorNetAmountFen ||
      payment?.status !== "PAID" ||
      payment.amount !== row.grossAmountFen ||
      (typeof row.orderId === "string" && approvedRefundOrderIds.has(row.orderId)) ||
      row.provider !== "MOCK" ||
      (typeof row.transactionNo === "string" && !row.transactionNo.startsWith("MOCK-"));
    try {
      if (
        typeof row.grossAmountFen !== "number" ||
        typeof row.platformFeeRateBps !== "number"
      ) {
        throw new Error("INVALID_SETTLEMENT_SNAPSHOT");
      }
      const amounts = calculateSettlementAmounts(
        row.grossAmountFen,
        row.platformFeeRateBps,
      );
      mismatch ||=
        amounts.platformFeeAmountFen !== row.platformFeeAmountFen ||
        amounts.tutorNetAmountFen !== row.tutorNetAmountFen;
    } catch {
      mismatch = true;
    }
    if (mismatch) {
      addIssue("Settlement", rowIndex, "SETTLEMENT_AMOUNT_MISMATCH", "amountSnapshot");
    }
  });

  const tables = Object.fromEntries(
    MIGRATION_TABLES.map((table) => {
      const tableIssues = blockers.filter((issue) => issue.table === table);
      const skipped = invalidRows[table].size;
      return [
        table,
        {
          sqliteCount: snapshot[table].length,
          expectedWrites: snapshot[table].length - skipped,
          skipped,
          errorCount: tableIssues.length,
          foreignKeyIssues: tableIssues.filter((issue) => issue.code === "FOREIGN_KEY_MISSING").length,
          uniqueConstraintConflicts: tableIssues.filter((issue) =>
            ["UNIQUE_CONFLICT", "ACTIVE_SCHOOL_PROOF_CONFLICT"].includes(issue.code),
          ).length,
          conversionWarnings: warnings.filter((warning) => warning.table === table)
            .length,
        },
      ];
    }),
  ) as Record<MigrationTable, TableAuditSummary>;

  return {
    safeToMigrate: blockers.length === 0,
    blockers,
    warnings,
    tables,
    totalSqliteRecords: MIGRATION_TABLES.reduce((sum, table) => sum + snapshot[table].length, 0),
    totalExpectedWrites: MIGRATION_TABLES.reduce(
      (sum, table) => sum + tables[table].expectedWrites,
      0,
    ),
    booleanFieldCount: 0,
    dateTimeValueCount,
  };
}

export function toMysqlDateTime(value: Date) {
  if (!isValidDate(value)) throw new Error("DATETIME_INVALID");
  return value.toISOString().slice(0, 23).replace("T", " ");
}

export function prepareInsertValues(table: MigrationTable, row: MigrationRow) {
  const dates = new Set(TABLE_SPECS[table].dates);
  return TABLE_SPECS[table].columns.map((column) => {
    const value = row[column];
    if (value === null || value === undefined) return null;
    if (dates.has(column)) {
      if (!(value instanceof Date)) throw new Error("DATETIME_INVALID");
      return toMysqlDateTime(value);
    }
    if (typeof value === "boolean") return value ? 1 : 0;
    return value;
  });
}

export function parseMigrationMode(args: string[]) {
  if (args.length === 0) return { apply: false };
  if (args.length === 1 && args[0] === "--apply") return { apply: true };
  throw new Error("Only the explicit --apply flag is supported");
}

export function extractModelNames(schema: string) {
  return Array.from(schema.matchAll(/^model\s+(\w+)\s*\{/gm), (match) => match[1]);
}

export function schemasHaveSameModels(sqliteSchema: string, mysqlSchema: string) {
  const sqliteModels = extractModelNames(sqliteSchema).sort();
  const mysqlModels = extractModelNames(mysqlSchema).sort();
  return JSON.stringify(sqliteModels) === JSON.stringify(mysqlModels);
}

export type TargetState = {
  currentDatabase: string | null;
  tableNames: string[];
  rowCounts: Record<string, number>;
  defaultDatabaseTableCount: number;
  primaryKeyCount: number;
  foreignKeyCount: number;
  uniqueNames: string[];
};

export type MigrationHistoryRecord = {
  migrationName: string;
  checksum: string;
  finished: boolean;
  rolledBack: boolean;
  appliedStepsCount: number;
};

export function evaluateBaselineHistory(
  history: MigrationHistoryRecord[],
  expectedName: string,
  expectedChecksum: string,
) {
  return history.some(
    (record) =>
      record.migrationName === expectedName &&
      record.checksum === expectedChecksum &&
      record.finished &&
      !record.rolledBack &&
      record.appliedStepsCount === 0,
  );
}

const REQUIRED_TARGET_UNIQUES = [
  "TutorVerificationDocument_one_active_school_proof",
  "Notification_dedupeKey_key",
  "Order_demandId_tutorId_key",
  "Payment_orderId_key",
  "Review_orderId_key",
  "LessonFeedback_orderId_key",
  "Settlement_orderId_key",
] as const;

export function evaluateTargetState(state: TargetState) {
  const blockers: string[] = [];
  const expectedTables = [...MIGRATION_TABLES].sort();
  const actualTables = state.tableNames
    .filter((table) => table !== "_prisma_migrations")
    .sort();
  if (state.currentDatabase !== "thub_test") blockers.push("WRONG_TARGET_DATABASE");
  if (JSON.stringify(actualTables) !== JSON.stringify(expectedTables)) {
    blockers.push("MYSQL_TABLE_SET_MISMATCH");
  }
  if (
    Object.entries(state.rowCounts).some(
      ([table, count]) => table !== "_prisma_migrations" && count !== 0,
    )
  ) {
    blockers.push("TARGET_NOT_EMPTY");
  }
  if (state.defaultDatabaseTableCount !== 0) blockers.push("DEFAULT_DATABASE_MODIFIED");
  if (state.primaryKeyCount !== 12) blockers.push("PRIMARY_KEY_COUNT_MISMATCH");
  if (state.foreignKeyCount !== 19) blockers.push("FOREIGN_KEY_COUNT_MISMATCH");
  if (REQUIRED_TARGET_UNIQUES.some((name) => !state.uniqueNames.includes(name))) {
    blockers.push("REQUIRED_UNIQUE_MISSING");
  }
  return {
    ready: blockers.length === 0,
    blockers,
    requiredUniqueNames: [...REQUIRED_TARGET_UNIQUES],
  };
}

export function formatDryRunReport(audit: MigrationAudit) {
  const blockerCounts = Object.fromEntries(
    Array.from(new Set(audit.blockers.map((issue) => issue.code))).map((code) => [
      code,
      audit.blockers.filter((issue) => issue.code === code).length,
    ]),
  );
  const blockerFieldCounts = Object.fromEntries(
    Array.from(
      new Set(audit.blockers.map((issue) => `${issue.table}.${issue.field}`)),
    ).map((field) => [
      field,
      audit.blockers.filter((issue) => `${issue.table}.${issue.field}` === field)
        .length,
    ]),
  );
  const warningCounts = Object.fromEntries(
    Array.from(new Set(audit.warnings.map((warning) => warning.code))).map(
      (code) => [
        code,
        audit.warnings.filter((warning) => warning.code === code).length,
      ],
    ),
  );
  return {
    mode: "dry-run",
    safeToMigrate: audit.safeToMigrate,
    totals: {
      sqliteRecords: audit.totalSqliteRecords,
      expectedWrites: audit.totalExpectedWrites,
      skipped: audit.totalSqliteRecords - audit.totalExpectedWrites,
      blockers: audit.blockers.length,
      dateTimeValuesToConvert: audit.dateTimeValueCount,
      booleanFields: audit.booleanFieldCount,
      conversionWarnings: audit.warnings.length,
    },
    tables: MIGRATION_TABLES.map((table) => ({ table, ...audit.tables[table] })),
    blockerCounts,
    blockerFieldCounts,
    warningCounts,
  };
}

function canonicalValue(value: MigrationValue) {
  if (value instanceof Date) return value.toISOString();
  return value ?? null;
}

function digestRows(
  rows: MigrationRow[],
  columns: readonly string[],
) {
  const canonical = [...rows]
    .sort((left, right) => String(left.id).localeCompare(String(right.id)))
    .map((row) => columns.map((column) => canonicalValue(row[column])));
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export function compareMigrationSnapshots(
  source: MigrationSnapshot,
  target: MigrationSnapshot,
) {
  const tables = Object.fromEntries(
    MIGRATION_TABLES.map((table) => {
      const sourceIds = source[table].map((row) => String(row.id)).sort();
      const targetIds = target[table].map((row) => String(row.id)).sort();
      return [
        table,
        {
          sourceCount: source[table].length,
          targetCount: target[table].length,
          primaryKeysMatch: JSON.stringify(sourceIds) === JSON.stringify(targetIds),
          rowsMatch:
            digestRows(source[table], TABLE_SPECS[table].columns) ===
            digestRows(target[table], TABLE_SPECS[table].columns),
        },
      ];
    }),
  ) as Record<
    MigrationTable,
    {
      sourceCount: number;
      targetCount: number;
      primaryKeysMatch: boolean;
      rowsMatch: boolean;
    }
  >;

  const passwordHashesMatch =
    digestRows(source.User, ["id", "passwordHash"]) ===
    digestRows(target.User, ["id", "passwordHash"]);
  const documentStorageKeysMatch =
    digestRows(source.TutorVerificationDocument, ["id", "storageKey"]) ===
    digestRows(target.TutorVerificationDocument, ["id", "storageKey"]);
  const notificationDedupeKeysMatch =
    digestRows(source.Notification, ["id", "dedupeKey"]) ===
    digestRows(target.Notification, ["id", "dedupeKey"]);
  const financialFields = {
    Order: [
      "id",
      "hours",
      "hourlyPrice",
      "totalAmount",
      "serviceFee",
      "platformFeeRateBps",
      "platformFeeAmountFen",
      "tutorNetAmountFen",
      "status",
    ],
    Payment: ["id", "orderId", "amount", "provider", "status"],
    Refund: ["id", "orderId", "refundAmount", "previousOrderStatus", "status"],
    Settlement: [
      "id",
      "orderId",
      "provider",
      "status",
      "grossAmountFen",
      "platformFeeRateBps",
      "platformFeeAmountFen",
      "tutorNetAmountFen",
    ],
  } as const;
  const financialFieldsMatch = Object.entries(financialFields).every(
    ([table, columns]) =>
      digestRows(source[table as MigrationTable], columns) ===
      digestRows(target[table as MigrationTable], columns),
  );
  const matches =
    Object.values(tables).every(
      (table) => table.primaryKeysMatch && table.rowsMatch,
    ) &&
    passwordHashesMatch &&
    documentStorageKeysMatch &&
    notificationDedupeKeysMatch &&
    financialFieldsMatch;

  return {
    matches,
    tables,
    passwordHashesMatch,
    documentStorageKeysMatch,
    notificationDedupeKeysMatch,
    financialFieldsMatch,
  };
}
