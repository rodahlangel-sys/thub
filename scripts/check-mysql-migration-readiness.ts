import { readFileSync } from "node:fs";
import path from "node:path";
import {
  MIGRATION_TABLES,
  auditSnapshot,
  evaluateTargetState,
  formatDryRunReport,
  schemasHaveSameModels,
} from "./mysql-migration-core";
import {
  createSqliteClient,
  hashFile,
  inspectMysqlTarget,
  loadMigrationEnvironment,
  loadSqliteSnapshot,
  openMysqlConnection,
  safeErrorCategory,
} from "./mysql-migration-runtime";

async function main() {
  const environment = loadMigrationEnvironment();
  const sourceHashBefore = hashFile(environment.sqlitePath);
  const prisma = createSqliteClient(environment.sqliteUrl);
  const mysql = await openMysqlConnection(environment.mysqlUrl);

  try {
    const snapshot = await loadSqliteSnapshot(prisma);
    const audit = auditSnapshot(snapshot);
    const target = await inspectMysqlTarget(mysql);
    const targetEvaluation = evaluateTargetState(target.state);
    const sqliteSchema = readFileSync(
      path.join(process.cwd(), "prisma-sqlite", "schema.prisma"),
      "utf8",
    );
    const mysqlSchema = readFileSync(
      path.join(process.cwd(), "prisma", "schema.prisma"),
      "utf8",
    );
    const modelsMatch = schemasHaveSameModels(sqliteSchema, mysqlSchema);
    const sourceHashAfter = hashFile(environment.sqlitePath);
    const ready =
      audit.safeToMigrate &&
      targetEvaluation.ready &&
      modelsMatch &&
      sourceHashBefore === sourceHashAfter;

    console.log(
      JSON.stringify(
        {
          mode: "read-only",
          ready,
          sourceDatabaseUnchanged: sourceHashBefore === sourceHashAfter,
          schemasHaveSameModels: modelsMatch,
          sqlite: {
            totalRecords: audit.totalSqliteRecords,
            tables: MIGRATION_TABLES.map((table) => ({
              table,
              records: audit.tables[table].sqliteCount,
            })),
          },
          mysql: {
            version: target.version,
            currentDatabase: target.state.currentDatabase,
            tableCount: target.state.tableNames.length,
            allBusinessTablesEmpty: MIGRATION_TABLES.every(
              (table) => target.state.rowCounts[table] === 0,
            ),
            defaultDatabaseTableCount: target.state.defaultDatabaseTableCount,
            blockers: targetEvaluation.blockers,
          },
          conversionAudit: formatDryRunReport(audit),
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
  console.error(
    JSON.stringify({ ok: false, category: safeErrorCategory(error) }),
  );
  process.exitCode = 1;
});
