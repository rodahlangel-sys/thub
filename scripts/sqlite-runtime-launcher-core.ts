export type SqliteRuntimeMode = "generate" | "build" | "dev";

export function createSqliteRuntimeEnvironment(
  base: NodeJS.ProcessEnv,
  root: string,
) {
  const normalizedRoot = root.replace(/[\\/]+$/, "").replaceAll("\\", "/");
  return {
    ...base,
    DATABASE_URL: `file:${normalizedRoot}/prisma/dev.db`,
    THUB_SQLITE_ROLLBACK: "1",
  };
}

export function parseSqliteRuntimeMode(args: string[]): { mode: SqliteRuntimeMode } {
  if (
    args.length === 1 &&
    (args[0] === "generate" || args[0] === "build" || args[0] === "dev")
  ) {
    return { mode: args[0] };
  }
  throw new Error("Expected exactly one SQLite rollback mode: generate, build, or dev");
}

export function createSqliteRuntimeCommands(
  root: string,
  nodeExecutable: string,
  mode: SqliteRuntimeMode,
) {
  const normalizedRoot = root.replace(/[\\/]+$/, "").replaceAll("\\", "/");
  const commands = [
    {
      command: nodeExecutable,
      args: [
        `${normalizedRoot}/node_modules/prisma/build/index.js`,
        "generate",
        "--config",
        "prisma-sqlite/prisma.config.ts",
      ],
    },
  ];
  if (mode === "build") {
    commands.push({
      command: nodeExecutable,
      args: [`${normalizedRoot}/node_modules/next/dist/bin/next`, "build"],
    });
  } else if (mode === "dev") {
    commands.push({
      command: nodeExecutable,
      args: [
        `${normalizedRoot}/node_modules/next/dist/bin/next`,
        "dev",
        "--hostname",
        "127.0.0.1",
      ],
    });
  }
  return commands;
}

export function createMigrationResultCheckCommands(
  root: string,
  nodeExecutable: string,
) {
  const normalizedRoot = root.replace(/[\\/]+$/, "").replaceAll("\\", "/");
  return {
    prepare: {
      command: nodeExecutable,
      args: [
        `${normalizedRoot}/node_modules/prisma/build/index.js`,
        "generate",
        "--config",
        "prisma-sqlite/prisma.config.ts",
      ],
    },
    check: {
      command: nodeExecutable,
      args: [
        `${normalizedRoot}/node_modules/tsx/dist/cli.mjs`,
        "scripts/check-mysql-migration-result.ts",
      ],
    },
    restore: {
      command: nodeExecutable,
      args: [`${normalizedRoot}/node_modules/prisma/build/index.js`, "generate"],
    },
  };
}
