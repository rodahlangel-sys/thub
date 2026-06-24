import path from "node:path";

export type PrivateFileStorageDriver = "LOCAL" | "PERSISTENT_FILESYSTEM";
export type StorageProvider = "LOCAL" | "PERSISTENT_FILESYSTEM" | "CLOUDBASE";

type ServerEnvInput = Record<string, string | undefined>;

export type ServerEnv = {
  authSecret: string;
  databaseUrl: string;
  privateFileStorageDriver: PrivateFileStorageDriver;
  privateFileStorageRoot: string;
  storageProvider: StorageProvider;
  cloudbaseEnvId: string;
  cloudbaseRegion: string;
  cloudbaseApiKey: string;
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

export function getPrismaDatasourceUrl(input: ServerEnvInput) {
  return withBoundedMysqlConnectionSettings(getDatabaseUrl(input));
}

function withBoundedMysqlConnectionSettings(databaseUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    return databaseUrl;
  }

  if (parsed.protocol !== "mysql:") return databaseUrl;

  for (const [name, value] of [
    ["connect_timeout", "5"],
    ["pool_timeout", "5"],
    ["connection_limit", "5"],
  ] as const) {
    if (!parsed.searchParams.has(name)) {
      parsed.searchParams.set(name, value);
    }
  }

  return parsed.toString();
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
  const storageProviderValue =
    input.STORAGE_PROVIDER?.trim() ||
    (nodeEnv === "production" ? "CLOUDBASE" : "LOCAL");

  if (driverValue !== "LOCAL" && driverValue !== "PERSISTENT_FILESYSTEM") {
    throw new Error(
      "PRIVATE_FILE_STORAGE_DRIVER 仅支持 LOCAL 或 PERSISTENT_FILESYSTEM",
    );
  }

  if (
    storageProviderValue !== "LOCAL" &&
    storageProviderValue !== "PERSISTENT_FILESYSTEM" &&
    storageProviderValue !== "CLOUDBASE"
  ) {
    throw new Error("STORAGE_PROVIDER only supports LOCAL, PERSISTENT_FILESYSTEM, or CLOUDBASE");
  }

  if (nodeEnv === "production" && storageProviderValue === "LOCAL") {
    throw new Error("LOCAL storage provider is not allowed in production");
  }

  if (
    nodeEnv === "production" &&
    storageProviderValue !== "CLOUDBASE" &&
    driverValue === "LOCAL"
  ) {
    throw new Error(
      "LOCAL private file storage is not allowed in production; configure PERSISTENT_FILESYSTEM",
    );
  }

  const configuredRoot = input.PRIVATE_FILE_STORAGE_ROOT?.trim();
  if (
    storageProviderValue !== "CLOUDBASE" &&
    driverValue === "PERSISTENT_FILESYSTEM" &&
    !configuredRoot
  ) {
    throw new Error(
      "PERSISTENT_FILESYSTEM 需要配置 PRIVATE_FILE_STORAGE_ROOT",
    );
  }

  const storageRoot = configuredRoot || path.join(process.cwd(), ".data", "tutor-verification");
  if (
    storageProviderValue !== "CLOUDBASE" &&
    driverValue === "PERSISTENT_FILESYSTEM" &&
    !path.isAbsolute(storageRoot)
  ) {
    throw new Error("PRIVATE_FILE_STORAGE_ROOT 必须是绝对路径");
  }

  const databaseUrl = getDatabaseUrl(input);
  const cloudbaseEnvId = input.CLOUDBASE_ENV_ID?.trim() || "";
  const cloudbaseRegion = input.CLOUDBASE_REGION?.trim() || "";
  const cloudbaseApiKey = input.CLOUDBASE_APIKEY?.trim() || "";
  if (storageProviderValue === "CLOUDBASE") {
    if (!cloudbaseEnvId) throw new Error("Missing CLOUDBASE_ENV_ID environment variable");
    if (!cloudbaseRegion) throw new Error("Missing CLOUDBASE_REGION environment variable");
  }

  return {
    authSecret: required(input, "AUTH_SECRET"),
    databaseUrl,
    privateFileStorageDriver: driverValue,
    privateFileStorageRoot: storageRoot,
    storageProvider: storageProviderValue,
    cloudbaseEnvId,
    cloudbaseRegion,
    cloudbaseApiKey,
  };
}

export function getServerEnv() {
  return parseServerEnv(process.env);
}
