import assert from "node:assert/strict";
import test from "node:test";
import {
  createMigrationResultCheckCommands,
  createSqliteRuntimeCommands,
  createSqliteRuntimeEnvironment,
  parseSqliteRuntimeMode,
} from "./sqlite-runtime-launcher-core";

test("SQLite rollback targets the archived schema and original database", () => {
  const environment = createSqliteRuntimeEnvironment(
    { AUTH_SECRET: "existing" },
    "C:/workspace",
  );
  assert.equal(environment.DATABASE_URL, "file:C:/workspace/prisma/dev.db");
  assert.equal(environment.AUTH_SECRET, "existing");

  assert.deepEqual(
    createSqliteRuntimeCommands("C:/workspace", "C:/node/node.exe", "dev"),
    [
      {
        command: "C:/node/node.exe",
        args: [
          "C:/workspace/node_modules/prisma/build/index.js",
          "generate",
          "--config",
          "prisma-sqlite/prisma.config.ts",
        ],
      },
      {
        command: "C:/node/node.exe",
        args: [
          "C:/workspace/node_modules/next/dist/bin/next",
          "dev",
          "--hostname",
          "127.0.0.1",
        ],
      },
    ],
  );
});

test("migration result checks restore the default MySQL Client", () => {
  assert.deepEqual(
    createMigrationResultCheckCommands("C:/workspace", "C:/node/node.exe"),
    {
      prepare: {
        command: "C:/node/node.exe",
        args: [
          "C:/workspace/node_modules/prisma/build/index.js",
          "generate",
          "--config",
          "prisma-sqlite/prisma.config.ts",
        ],
      },
      check: {
        command: "C:/node/node.exe",
        args: [
          "C:/workspace/node_modules/tsx/dist/cli.mjs",
          "scripts/check-mysql-migration-result.ts",
        ],
      },
      restore: {
        command: "C:/node/node.exe",
        args: ["C:/workspace/node_modules/prisma/build/index.js", "generate"],
      },
    },
  );
});

test("SQLite rollback accepts only explicit rollback modes", () => {
  assert.deepEqual(parseSqliteRuntimeMode(["generate"]), { mode: "generate" });
  assert.deepEqual(parseSqliteRuntimeMode(["build"]), { mode: "build" });
  assert.deepEqual(parseSqliteRuntimeMode(["dev"]), { mode: "dev" });
  assert.throws(() => parseSqliteRuntimeMode([]));
  assert.throws(() => parseSqliteRuntimeMode(["migrate"]));
});
