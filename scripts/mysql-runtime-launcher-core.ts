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
  cloudbaseEnvFile?: string,
): NodeJS.ProcessEnv & { DATABASE_URL: string } {
  const production = base.NODE_ENV === "production";

  // 检测 Netlify / CI 环境(用于错误消息)
  const isNetlifyOrCi = base.NETLIFY === "true" || base.CI === "true";

  // 检测 CloudBase Runtime 配置是否可用(.env.cloudbase.local 中存在 CLOUDBASE_MYSQL_EXTERNAL_URL)
  // 优先级:CloudBase Runtime 配置存在 > Netlify/CI 环境
  // 这样 CloudBase Run / 本地开发(有 .env.cloudbase.local)的行为完全不变,
  // 即使本地 VS Code 等工具设置了 CI=true 也不会误触发 fallback 分支。
  const cloudbaseExternalUrl = cloudbaseEnvFile
    ? parseEnvValue(cloudbaseEnvFile, "CLOUDBASE_MYSQL_EXTERNAL_URL")
    : undefined;
  const hasCloudBaseRuntime = Boolean(cloudbaseExternalUrl);

  // CloudBase Runtime 配置不存在(如 Netlify):直接使用 DATABASE_URL,不读 CloudBase Runtime 配置
  if (!hasCloudBaseRuntime) {
    if (!base.DATABASE_URL) {
      throw new Error(
        isNetlifyOrCi
          ? "DATABASE_URL is required for Netlify/CI builds"
          : production
            ? "Production DATABASE_URL is missing"
            : "DATABASE_URL is missing and CloudBase Runtime is not configured",
      );
    }
    // production 环境不允许 SQLite(保留业务规则)
    if (production && !base.DATABASE_URL.startsWith("mysql:")) {
      throw new Error("Production DATABASE_URL protocol is invalid");
    }
    return { ...base, DATABASE_URL: base.DATABASE_URL };
  }

  // CloudBase Runtime 分支(原有逻辑,行为完全不变)
  const mysqlUrl = production
    ? base.DATABASE_URL
    : cloudbaseExternalUrl;
  if (!mysqlUrl) {
    throw new Error(
      production
        ? "Production DATABASE_URL is missing"
        : "CloudBase MySQL external URL is missing",
    );
  }

  const parsed = new URL(mysqlUrl);
  if (parsed.protocol !== "mysql:") {
    throw new Error("CloudBase MySQL URL protocol is invalid");
  }
  if (decodeURIComponent(parsed.pathname.replace(/^\//, "")) !== "thub_test") {
    throw new Error("CloudBase MySQL target database is invalid");
  }

  const environment: NodeJS.ProcessEnv & { DATABASE_URL: string } = {
    ...base,
    DATABASE_URL: mysqlUrl,
  };
  if (!production) environment.CLOUDBASE_MYSQL_EXTERNAL_URL = mysqlUrl;
  return environment;
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
