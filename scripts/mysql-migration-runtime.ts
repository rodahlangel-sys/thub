import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import mysql, { type Connection, type RowDataPacket } from "mysql2/promise";
import {
  MIGRATION_TABLES,
  TABLE_SPECS,
  prepareInsertValues,
  resolveMigrationOrder,
  type MigrationSnapshot,
  type MigrationTable,
  type TargetState,
} from "./mysql-migration-core";

const TARGET_DATABASE = "thub_test";
const DEFAULT_DATABASE = "thub-test-d2gtl1mcfd13d8b31";

export function parseEnvValue(source: string, name: string) {
  const line = source
    .split(/\r?\n/)
    .find((candidate) => candidate.trimStart().startsWith(`${name}=`));
  if (!line) return undefined;
  const raw = line.slice(line.indexOf("=") + 1).trim();
  if (
    raw.length >= 2 &&
    ((raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'")))
  ) {
    return raw.slice(1, -1);
  }
  return raw;
}

export function loadMigrationEnvironment(root = process.cwd()) {
  const sqliteEnv = readFileSync(path.join(root, ".env"), "utf8");
  const cloudBaseEnv = readFileSync(
    path.join(root, ".env.cloudbase.local"),
    "utf8",
  );
  const sqliteUrl = parseEnvValue(sqliteEnv, "DATABASE_URL");
  const mysqlUrl =
    process.env.CLOUDBASE_MYSQL_EXTERNAL_URL ??
    parseEnvValue(cloudBaseEnv, "CLOUDBASE_MYSQL_EXTERNAL_URL");

  if (sqliteUrl !== "file:./dev.db") throw new Error("SQLITE_SOURCE_URL_INVALID");
  if (!mysqlUrl) throw new Error("MYSQL_TARGET_URL_MISSING");
  const parsed = new URL(mysqlUrl);
  if (parsed.protocol !== "mysql:") throw new Error("MYSQL_TARGET_PROTOCOL_INVALID");
  if (decodeURIComponent(parsed.pathname.replace(/^\//, "")) !== TARGET_DATABASE) {
    throw new Error("MYSQL_TARGET_DATABASE_INVALID");
  }

  return {
    sqliteUrl: `file:${path.join(root, "prisma", "dev.db").replaceAll("\\", "/")}`,
    mysqlUrl,
    sqlitePath: path.join(root, "prisma", "dev.db"),
  };
}

export function hashFile(filePath: string) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

export function createSqliteClient(sqliteUrl: string) {
  return new PrismaClient({ datasources: { db: { url: sqliteUrl } } });
}

export async function loadSqliteSnapshot(prisma: PrismaClient): Promise<MigrationSnapshot> {
  const [
    User,
    ParentProfile,
    TutorProfile,
    TutorVerificationDocument,
    Demand,
    Order,
    Payment,
    Refund,
    LessonFeedback,
    Review,
    Settlement,
    Notification,
  ] = await Promise.all([
    prisma.user.findMany({ orderBy: { id: "asc" } }),
    prisma.parentProfile.findMany({ orderBy: { id: "asc" } }),
    prisma.tutorProfile.findMany({ orderBy: { id: "asc" } }),
    prisma.tutorVerificationDocument.findMany({ orderBy: { id: "asc" } }),
    prisma.demand.findMany({ orderBy: { id: "asc" } }),
    prisma.order.findMany({ orderBy: { id: "asc" } }),
    prisma.payment.findMany({ orderBy: { id: "asc" } }),
    prisma.refund.findMany({ orderBy: { id: "asc" } }),
    prisma.lessonFeedback.findMany({ orderBy: { id: "asc" } }),
    prisma.review.findMany({ orderBy: { id: "asc" } }),
    prisma.settlement.findMany({ orderBy: { id: "asc" } }),
    prisma.notification.findMany({ orderBy: { id: "asc" } }),
  ]);
  return {
    User,
    ParentProfile,
    TutorProfile,
    TutorVerificationDocument,
    Demand,
    Order,
    Payment,
    Refund,
    LessonFeedback,
    Review,
    Settlement,
    Notification,
  } as MigrationSnapshot;
}

export async function openMysqlConnection(mysqlUrl: string) {
  return mysql.createConnection({ uri: mysqlUrl, timezone: "Z" });
}

export async function loadMysqlSnapshot(
  connection: Connection,
): Promise<MigrationSnapshot> {
  const snapshot = {} as MigrationSnapshot;
  for (const table of MIGRATION_TABLES) {
    const columns = TABLE_SPECS[table].columns;
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT ${columns.map((column) => `\`${column}\``).join(", ")} FROM \`${table}\` ORDER BY \`id\``,
    );
    snapshot[table] = rows as MigrationSnapshot[typeof table];
  }
  return snapshot;
}

export async function inspectMigrationHistory(connection: Connection) {
  type MigrationRow = RowDataPacket & {
    migration_name: string;
    checksum: string;
    finished_at: Date | null;
    rolled_back_at: Date | null;
    applied_steps_count: number;
  };
  const [rows] = await connection.query<MigrationRow[]>(`
    SELECT migration_name, checksum, finished_at, rolled_back_at, applied_steps_count
    FROM _prisma_migrations
    ORDER BY started_at
  `);
  return rows.map((row) => ({
    migrationName: String(row.migration_name),
    checksum: String(row.checksum),
    finished: row.finished_at !== null,
    rolledBack: row.rolled_back_at !== null,
    appliedStepsCount: Number(row.applied_steps_count),
  }));
}

export async function inspectMysqlTarget(connection: Connection) {
  type IdentityRow = RowDataPacket & { database_name: string | null; version: string };
  type TableRow = RowDataPacket & { TABLE_NAME: string };
  type CountRow = RowDataPacket & { row_count?: number; table_count?: number };
  type ConstraintRow = RowDataPacket & {
    TABLE_NAME: string;
    CONSTRAINT_NAME: string;
    CONSTRAINT_TYPE: "PRIMARY KEY" | "FOREIGN KEY" | "UNIQUE" | string;
  };

  const [[identity]] = await connection.query<IdentityRow[]>(
    "SELECT DATABASE() AS database_name, VERSION() AS version",
  );
  const [tables] = await connection.query<TableRow[]>(`
    SELECT TABLE_NAME
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = '${TARGET_DATABASE}' AND TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME
  `);
  const rowCounts: Record<string, number> = {};
  for (const table of tables) {
    const name = String(table.TABLE_NAME);
    if (!MIGRATION_TABLES.includes(name as MigrationTable)) {
      rowCounts[name] = -1;
      continue;
    }
    const [[count]] = await connection.query<CountRow[]>(
      `SELECT COUNT(*) AS row_count FROM \`${name}\``,
    );
    rowCounts[name] = Number(count.row_count);
  }
  const [[defaultDatabase]] = await connection.query<CountRow[]>(
    "SELECT COUNT(*) AS table_count FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?",
    [DEFAULT_DATABASE],
  );
  const [constraints] = await connection.query<ConstraintRow[]>(`
    SELECT TABLE_NAME, CONSTRAINT_NAME, CONSTRAINT_TYPE
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = '${TARGET_DATABASE}'
  `);
  const businessConstraints = constraints.filter((constraint) =>
    MIGRATION_TABLES.includes(String(constraint.TABLE_NAME) as MigrationTable),
  );

  const state: TargetState = {
    currentDatabase: identity.database_name,
    tableNames: tables.map((table) => String(table.TABLE_NAME)),
    rowCounts,
    defaultDatabaseTableCount: Number(defaultDatabase.table_count),
    primaryKeyCount: businessConstraints.filter(
      (constraint) => constraint.CONSTRAINT_TYPE === "PRIMARY KEY",
    ).length,
    foreignKeyCount: businessConstraints.filter(
      (constraint) => constraint.CONSTRAINT_TYPE === "FOREIGN KEY",
    ).length,
    uniqueNames: businessConstraints
      .filter((constraint) => constraint.CONSTRAINT_TYPE === "UNIQUE")
      .map((constraint) => String(constraint.CONSTRAINT_NAME)),
  };
  return { state, version: String(identity.version) };
}

export function buildInsertStatement(table: MigrationTable, columns: readonly string[]) {
  if (!MIGRATION_TABLES.includes(table)) throw new Error("UNTRUSTED_TABLE");
  const trustedColumns = new Set(TABLE_SPECS[table].columns);
  if (columns.some((column) => !trustedColumns.has(column))) {
    throw new Error("UNTRUSTED_COLUMN");
  }
  return `INSERT INTO \`${table}\` (${columns.map((column) => `\`${column}\``).join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`;
}

export async function applySnapshot(
  connection: Connection,
  snapshot: MigrationSnapshot,
) {
  const inserted = Object.fromEntries(
    MIGRATION_TABLES.map((table) => [table, 0]),
  ) as Record<MigrationTable, number>;
  await connection.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
  await connection.beginTransaction();
  try {
    for (const table of resolveMigrationOrder()) {
      const columns = TABLE_SPECS[table].columns;
      const statement = buildInsertStatement(table, columns);
      for (const row of snapshot[table]) {
        await connection.execute(statement, prepareInsertValues(table, row));
        inserted[table] += 1;
      }
    }
    for (const table of MIGRATION_TABLES) {
      const [[count]] = await connection.query<(RowDataPacket & { row_count: number })[]>(
        `SELECT COUNT(*) AS row_count FROM \`${table}\``,
      );
      if (Number(count.row_count) !== snapshot[table].length) {
        throw new Error("APPLY_COUNT_MISMATCH");
      }
    }
    await connection.commit();
    return inserted;
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

export function safeErrorCategory(error: unknown) {
  const code = String((error as { code?: unknown })?.code ?? "");
  if (code === "ER_ACCESS_DENIED_ERROR") return "authentication";
  if (code === "ER_BAD_DB_ERROR" || code.includes("TARGET_DATABASE")) return "database";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "dns";
  if (code === "ECONNREFUSED") return "host-or-port";
  if (code === "ETIMEDOUT" || code === "EHOSTUNREACH") return "network";
  if (/SSL|TLS|CERT/i.test(code)) return "ssl";
  return "migration-check";
}
