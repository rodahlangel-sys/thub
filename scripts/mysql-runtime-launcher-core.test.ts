import assert from "node:assert/strict";
import test from "node:test";
import {
  createMysqlRuntimeCommands,
  createMysqlRuntimeEnvironment,
  parseMysqlRuntimeMode,
} from "./mysql-runtime-launcher-core";

test("loads only the external thub_test URL into the child environment", () => {
  const url = "mysql://user:secret@example.invalid:3306/thub_test";
  const environment = createMysqlRuntimeEnvironment(
    { AUTH_SECRET: "existing" },
    `CLOUDBASE_MYSQL_EXTERNAL_URL="${url}"\nCLOUDBASE_MYSQL_INTERNAL_URL="mysql://internal/ignored"`,
  );

  assert.equal(environment.DATABASE_URL, url);
  assert.equal(environment.CLOUDBASE_MYSQL_EXTERNAL_URL, url);
  assert.equal(environment.AUTH_SECRET, "existing");
  assert.equal(JSON.stringify(parseMysqlRuntimeMode(["build"])).includes(url), false);
});

test("rejects missing, non-MySQL and wrong-database runtime URLs", () => {
  assert.throws(() => createMysqlRuntimeEnvironment({}, ""), /missing/i);
  assert.throws(
    () =>
      createMysqlRuntimeEnvironment(
        {},
        'CLOUDBASE_MYSQL_EXTERNAL_URL="postgres://host/thub_test"',
      ),
    /protocol/i,
  );
  assert.throws(
    () =>
      createMysqlRuntimeEnvironment(
        {},
        'CLOUDBASE_MYSQL_EXTERNAL_URL="mysql://host/other"',
      ),
    /database/i,
  );
});

test("production uses only the platform DATABASE_URL", () => {
  const url = "mysql://app:test@example.invalid:3306/thub_test";
  const environment = createMysqlRuntimeEnvironment(
    { NODE_ENV: "production", DATABASE_URL: url },
  );

  assert.equal(environment.DATABASE_URL, url);
  assert.equal(environment.CLOUDBASE_MYSQL_EXTERNAL_URL, undefined);
  assert.throws(
    () =>
      createMysqlRuntimeEnvironment({
        NODE_ENV: "production",
        DATABASE_URL: "file:./dev.db",
      }),
    /protocol/i,
  );
  assert.throws(
    () => createMysqlRuntimeEnvironment({ NODE_ENV: "production" }),
    /missing/i,
  );
});

test("supports only generate, build, check and dev runtime modes", () => {
  assert.deepEqual(parseMysqlRuntimeMode(["generate"]), { mode: "generate" });
  assert.deepEqual(parseMysqlRuntimeMode(["build"]), { mode: "build" });
  assert.deepEqual(parseMysqlRuntimeMode(["dev"]), { mode: "dev" });
  assert.deepEqual(parseMysqlRuntimeMode(["check"]), { mode: "check" });
  assert.throws(() => parseMysqlRuntimeMode([]));
  assert.throws(() => parseMysqlRuntimeMode(["apply"]));
});

test("plans a Prisma read check without regenerating the in-use Client", () => {
  const commands = createMysqlRuntimeCommands(
    "C:/workspace",
    "C:/node/node.exe",
    "check",
  );
  assert.equal(commands.length, 1);
  assert.deepEqual(commands[0], {
    command: "C:/node/node.exe",
    args: [
      "C:/workspace/node_modules/tsx/dist/cli.mjs",
      "scripts/check-mysql-runtime-reads.ts",
    ],
  });
});

test("uses the current Node executable instead of Windows command shims", () => {
  const commands = createMysqlRuntimeCommands(
    "C:/workspace",
    "C:/node/node.exe",
    "dev",
  );
  assert.deepEqual(commands, [
    {
      command: "C:/node/node.exe",
      args: [
      "C:/workspace/node_modules/prisma/build/index.js",
      "generate",
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
  ]);
});
