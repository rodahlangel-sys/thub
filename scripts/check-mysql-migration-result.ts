import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { RowDataPacket } from "mysql2";
import {
  MIGRATION_TABLES,
  auditSnapshot,
  compareMigrationSnapshots,
  evaluateBaselineHistory,
  formatDryRunReport,
} from "./mysql-migration-core";
import {
  createSqliteClient,
  hashFile,
  inspectMigrationHistory,
  inspectMysqlTarget,
  loadMigrationEnvironment,
  loadMysqlSnapshot,
  loadSqliteSnapshot,
  openMysqlConnection,
  safeErrorCategory,
} from "./mysql-migration-runtime";

const BASELINE_NAME = "20260620_mysql_baseline";
const CONVERSATION_MIGRATION_NAME = "20260624090000_add_conversations";
const EMPTY_CHAT_TABLES = ["Conversation", "Message"] as const;

function isEmptyChatTable(name: string): name is (typeof EMPTY_CHAT_TABLES)[number] {
  return EMPTY_CHAT_TABLES.includes(name as (typeof EMPTY_CHAT_TABLES)[number]);
}

async function main() {
  const environment = loadMigrationEnvironment();
  const sourceHashBefore = hashFile(environment.sqlitePath);
  const prisma = createSqliteClient(environment.sqliteUrl);
  const mysql = await openMysqlConnection(environment.mysqlUrl);

  try {
    const [source, target, mysqlTarget, migrationHistory] = await Promise.all([
      loadSqliteSnapshot(prisma),
      loadMysqlSnapshot(mysql),
      inspectMysqlTarget(mysql),
      inspectMigrationHistory(mysql),
    ]);
    const sourceAudit = auditSnapshot(source);
    const targetAudit = auditSnapshot(target);
    const comparison = compareMigrationSnapshots(source, target);
    const baselineSql = readFileSync(
      path.join(
        process.cwd(),
        "prisma",
        "migrations",
        BASELINE_NAME,
        "migration.sql",
      ),
    );
    const baselineChecksum = createHash("sha256").update(baselineSql).digest("hex");
    const baselineHistoryCorrect = evaluateBaselineHistory(
      migrationHistory,
      BASELINE_NAME,
      baselineChecksum,
    );
    const conversationMigrationCorrect = migrationHistory.some(
      (record) =>
        record.migrationName === CONVERSATION_MIGRATION_NAME &&
        record.finished &&
        !record.rolledBack,
    );
    const chatTableCounts = Object.fromEntries(
      await Promise.all(
        EMPTY_CHAT_TABLES.map(async (table) => {
          const [[count]] = await mysql.query<Array<RowDataPacket & { row_count: number }>>(
            `SELECT COUNT(*) AS row_count FROM \`${table}\``,
          );
          return [table, Number(count.row_count)] as const;
        }),
      ),
    );
    const chatTablesReady = EMPTY_CHAT_TABLES.every(
      (table) =>
        mysqlTarget.state.tableNames.includes(table) &&
        chatTableCounts[table] === 0,
    );
    const sourceHashAfter = hashFile(environment.sqlitePath);
    const historicalTableNames = mysqlTarget.state.tableNames.filter(
      (name) => name !== "_prisma_migrations" && !isEmptyChatTable(name),
    );
    const ready =
      mysqlTarget.state.currentDatabase === "thub_test" &&
      mysqlTarget.state.defaultDatabaseTableCount === 0 &&
      historicalTableNames.length === MIGRATION_TABLES.length &&
      chatTablesReady &&
      sourceAudit.safeToMigrate &&
      targetAudit.safeToMigrate &&
      comparison.matches &&
      baselineHistoryCorrect &&
      conversationMigrationCorrect &&
      sourceHashBefore === sourceHashAfter;

    console.log(
      JSON.stringify(
        {
          mode: "read-only-post-migration",
          ready,
          sourceDatabaseUnchanged: sourceHashBefore === sourceHashAfter,
          mysql: {
            currentDatabase: mysqlTarget.state.currentDatabase,
            defaultDatabaseTableCount: mysqlTarget.state.defaultDatabaseTableCount,
            businessTableCount: MIGRATION_TABLES.length,
            chatTableCounts,
          },
          baseline: {
            recordCount: migrationHistory.length,
            correct: baselineHistoryCorrect,
          },
          conversationMigration: {
            correct: conversationMigrationCorrect,
          },
          comparison,
          sourceAudit: formatDryRunReport(sourceAudit),
          targetAudit: formatDryRunReport(targetAudit),
        },
        null,
        2,
      ),
    );
    if (!ready) process.exitCode = 1;
  } finally {
    await Promise.all([prisma.$disconnect(), mysql.end()]);
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, category: safeErrorCategory(error) }));
  process.exitCode = 1;
});
