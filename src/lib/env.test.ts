import assert from "node:assert/strict";
import test from "node:test";
import { parseServerEnv } from "./env";

const baseEnv = {
  AUTH_SECRET: "test-secret",
  DATABASE_URL: "file:./test.db",
};

test("development defaults private file storage to LOCAL", () => {
  assert.equal(
    parseServerEnv({ ...baseEnv, NODE_ENV: "development" }).privateFileStorageDriver,
    "LOCAL",
  );
});

test("production rejects ephemeral local private file storage", () => {
  assert.throws(
    () => parseServerEnv({ ...baseEnv, NODE_ENV: "production", PRIVATE_FILE_STORAGE_DRIVER: "LOCAL" }),
    /LOCAL.*production/i,
  );
});

test("production rejects a SQLite database URL", () => {
  assert.throws(
    () =>
      parseServerEnv({
        ...baseEnv,
        NODE_ENV: "production",
        PRIVATE_FILE_STORAGE_DRIVER: "PERSISTENT_FILESYSTEM",
        PRIVATE_FILE_STORAGE_ROOT: "C:/private-files",
      }),
    /SQLite.*production/i,
  );
});

test("production requires an explicit database URL", () => {
  assert.throws(
    () =>
      parseServerEnv({
        AUTH_SECRET: "test-secret",
        NODE_ENV: "production",
        PRIVATE_FILE_STORAGE_DRIVER: "PERSISTENT_FILESYSTEM",
        PRIVATE_FILE_STORAGE_ROOT: "C:/private-files",
      }),
    /DATABASE_URL/,
  );
});

test("unsupported private file storage drivers fail closed", () => {
  assert.throws(
    () => parseServerEnv({ ...baseEnv, NODE_ENV: "development", PRIVATE_FILE_STORAGE_DRIVER: "S3" }),
    /PRIVATE_FILE_STORAGE_DRIVER/,
  );
});

test("persistent filesystem storage requires an absolute path", () => {
  assert.throws(
    () =>
      parseServerEnv({
        ...baseEnv,
        NODE_ENV: "production",
        PRIVATE_FILE_STORAGE_DRIVER: "PERSISTENT_FILESYSTEM",
        PRIVATE_FILE_STORAGE_ROOT: "./private-files",
      }),
    /PRIVATE_FILE_STORAGE_ROOT.*绝对路径/,
  );
});
