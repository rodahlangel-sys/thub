import path from "node:path";

export type PrivateFileStorageDriver = "LOCAL" | "PERSISTENT_FILESYSTEM";

type ServerEnvInput = Record<string, string | undefined>;

export type ServerEnv = {
  authSecret: string;
  databaseUrl: string;
  privateFileStorageDriver: PrivateFileStorageDriver;
  privateFileStorageRoot: string;
};

export function getDatabaseUrl(input: ServerEnvInput) {
  const databaseUrl = required(input, "DATABASE_URL");
  const production = input.NODE_ENV?.trim() === "production";
  const explicitSqliteRollback = input.THUB_SQLITE_ROLLBACK === "1";
  if (production && databaseUrl.startsWith("file:") && !explicitSqliteRollback) {
    throw new Error("SQLite DATABASE_URL is not allowed in production");
  }
  return databaseUrl;
}

function required(input: ServerEnvInput, name: string) {
  const value = input[name]?.trim();

  if (!value) {
    throw new Error(`缺少 ${name} 环境变量`);
  }

  return value;
}

export function parseServerEnv(input: ServerEnvInput): ServerEnv {
  const nodeEnv = input.NODE_ENV?.trim() || "development";
  const driverValue = input.PRIVATE_FILE_STORAGE_DRIVER?.trim() || "LOCAL";

  if (driverValue !== "LOCAL" && driverValue !== "PERSISTENT_FILESYSTEM") {
    throw new Error(
      "PRIVATE_FILE_STORAGE_DRIVER 仅支持 LOCAL 或 PERSISTENT_FILESYSTEM",
    );
  }

  if (nodeEnv === "production" && driverValue === "LOCAL") {
    throw new Error(
      "LOCAL private file storage is not allowed in production; configure PERSISTENT_FILESYSTEM",
    );
  }

  const configuredRoot = input.PRIVATE_FILE_STORAGE_ROOT?.trim();
  if (driverValue === "PERSISTENT_FILESYSTEM" && !configuredRoot) {
    throw new Error(
      "PERSISTENT_FILESYSTEM 需要配置 PRIVATE_FILE_STORAGE_ROOT",
    );
  }

  const storageRoot = configuredRoot || path.join(process.cwd(), ".data", "tutor-verification");
  if (driverValue === "PERSISTENT_FILESYSTEM" && !path.isAbsolute(storageRoot)) {
    throw new Error("PRIVATE_FILE_STORAGE_ROOT 必须是绝对路径");
  }

  const databaseUrl = getDatabaseUrl(input);

  return {
    authSecret: required(input, "AUTH_SECRET"),
    databaseUrl,
    privateFileStorageDriver: driverValue,
    privateFileStorageRoot: storageRoot,
  };
}

export function getServerEnv() {
  return parseServerEnv(process.env);
}
