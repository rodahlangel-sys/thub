import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  MIGRATION_TABLES,
  auditSnapshot,
  evaluateBaselineHistory,
  evaluateTargetState,
  formatDryRunReport,
  parseMigrationMode,
  schemasHaveSameModels,
} from "./mysql-migration-core";
import {
  applySnapshot,
  createSqliteClient,
  hashFile,
  inspectMysqlTarget,
  inspectMigrationHistory,
  loadMigrationEnvironment,
  loadSqliteSnapshot,
  openMysqlConnection,
  safeErrorCategory,
} from "./mysql-migration-runtime";

async function main() {
  const mode = parseMigrationMode(process.argv.slice(2));
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
    const baselineName = "20260620_mysql_baseline";
    const baselineChecksum = createHash("sha256")
      .update(
        readFileSync(
          path.join(
            process.cwd(),
            "prisma",
            "migrations",
            baselineName,
            "migration.sql",
          ),
        ),
      )
      .digest("hex");
    const migrationHistory = target.state.tableNames.includes("_prisma_migrations")
      ? await inspectMigrationHistory(mysql)
      : [];
    const baselineReady = evaluateBaselineHistory(
      migrationHistory,
      baselineName,
      baselineChecksum,
    );
    const ready =
      audit.safeToMigrate && targetEvaluation.ready && modelsMatch && baselineReady;

    if (!mode.apply) {
      const sourceHashAfter = hashFile(environment.sqlitePath);
      console.log(
        JSON.stringify(
          {
            ...formatDryRunReport(audit),
            safeToMigrate: ready,
            sourceDatabaseUnchanged: sourceHashBefore === sourceHashAfter,
            schemasHaveSameModels: modelsMatch,
            mysql: {
              version: target.version,
              currentDatabase: target.state.currentDatabase,
              tableCount: target.state.tableNames.length,
              allBusinessTablesEmpty: MIGRATION_TABLES.every(
                (table) => target.state.rowCounts[table] === 0,
              ),
              baselineReady,
              defaultDatabaseTableCount: target.state.defaultDatabaseTableCount,
              readinessBlockers: targetEvaluation.blockers,
            },
          },
          null,
          2,
        ),
      );
      if (!ready || sourceHashBefore !== sourceHashAfter) process.exitCode = 1;
      return;
    }

    if (!ready) throw new Error("MIGRATION_READINESS_BLOCKED");
    const inserted = await applySnapshot(mysql, snapshot);
    const sourceHashAfter = hashFile(environment.sqlitePath);
    if (sourceHashBefore !== sourceHashAfter) throw new Error("SQLITE_SOURCE_CHANGED");
    console.log(
      JSON.stringify({
        mode: "apply",
        inserted,
        sourceDatabaseUnchanged: true,
      }),
    );
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
