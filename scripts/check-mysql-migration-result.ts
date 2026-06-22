import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
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
    const sourceHashAfter = hashFile(environment.sqlitePath);
    const ready =
      mysqlTarget.state.currentDatabase === "thub_test" &&
      mysqlTarget.state.defaultDatabaseTableCount === 0 &&
      mysqlTarget.state.tableNames.filter((name) => name !== "_prisma_migrations")
        .length === MIGRATION_TABLES.length &&
      sourceAudit.safeToMigrate &&
      targetAudit.safeToMigrate &&
      comparison.matches &&
      baselineHistoryCorrect &&
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
          },
          baseline: {
            recordCount: migrationHistory.length,
            correct: baselineHistoryCorrect,
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
