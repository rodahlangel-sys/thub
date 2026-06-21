export type MysqlRuntimeMode = "generate" | "build" | "check" | "dev";

function parseEnvValue(source: string, name: string) {
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

export function createMysqlRuntimeEnvironment(
  base: NodeJS.ProcessEnv,
  cloudbaseEnvFile: string,
) {
  const mysqlUrl = parseEnvValue(
    cloudbaseEnvFile,
    "CLOUDBASE_MYSQL_EXTERNAL_URL",
  );
  if (!mysqlUrl) throw new Error("CloudBase MySQL external URL is missing");

  const parsed = new URL(mysqlUrl);
  if (parsed.protocol !== "mysql:") {
    throw new Error("CloudBase MySQL URL protocol is invalid");
  }
  if (decodeURIComponent(parsed.pathname.replace(/^\//, "")) !== "thub_test") {
    throw new Error("CloudBase MySQL target database is invalid");
  }

  return {
    ...base,
    DATABASE_URL: mysqlUrl,
    CLOUDBASE_MYSQL_EXTERNAL_URL: mysqlUrl,
  };
}

export function parseMysqlRuntimeMode(args: string[]): { mode: MysqlRuntimeMode } {
  if (
    args.length === 1 &&
    (args[0] === "generate" ||
      args[0] === "build" ||
      args[0] === "check" ||
      args[0] === "dev")
  ) {
    return { mode: args[0] };
  }
  throw new Error(
    "Expected exactly one runtime mode: generate, build, check, or dev",
  );
}

export function createMysqlRuntimeCommands(
  root: string,
  nodeExecutable: string,
  mode: MysqlRuntimeMode,
) {
  const normalizedRoot = root.replace(/[\\/]+$/, "").replaceAll("\\", "/");
  if (mode === "check") {
    return [
      {
        command: nodeExecutable,
        args: [
          `${normalizedRoot}/node_modules/tsx/dist/cli.mjs`,
          "scripts/check-mysql-runtime-reads.ts",
        ],
      },
    ];
  }
  const commands = [
    {
      command: nodeExecutable,
      args: [
        `${normalizedRoot}/node_modules/prisma/build/index.js`,
        "generate",
        "--schema",
        "prisma-mysql/schema.prisma",
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
