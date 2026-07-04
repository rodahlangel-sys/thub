import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildCloudPaymentQrPath,
  buildCloudVerificationPath,
  createCloudBasePrivateFileStorage,
  parseCloudStorageKey,
  type CloudBaseStorageClient,
} from "./cloudbase-storage";
import { createPrivateFileStorageRouter } from "./router";
import { createLocalPrivateFileStorage } from "./local-storage";
import { PrivateFileStorageError } from "./types";

test("LOCAL provider still saves, reads, checks, and deletes files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "thub-storage-"));
  try {
    const storage = createLocalPrivateFileStorage(root);
    const key = await storage.save({
      buffer: Buffer.from("local-file"),
      extension: "png",
      tutorProfileId: "profile-local",
    });
    assert.match(key, /^[a-f0-9-]+\.png$/i);
    assert.equal(await storage.exists(key), true);
    assert.equal((await storage.read(key))?.buffer.toString(), "local-file");
    await storage.delete(key);
    assert.equal(await storage.exists(key), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CloudBase paths never include user filenames or identity data", () => {
  assert.equal(
    buildCloudVerificationPath("profile_123", "webp", () => "uuid-456"),
    "private/tutor-verification/profile_123/uuid-456.webp",
  );
  assert.throws(() => buildCloudVerificationPath("../profile", "png"));
});

test("CloudBase payment QR paths use the private payment namespace", () => {
  assert.equal(
    buildCloudPaymentQrPath(
      { ownerType: "tutor", ownerId: "profile_123", qrType: "WECHAT" },
      "png",
      () => "uuid-789",
    ),
    "private/payment-qrcodes/tutor/profile_123/WECHAT/uuid-789.png",
  );
  assert.equal(
    buildCloudPaymentQrPath(
      { ownerType: "platform", ownerId: "default", qrType: "ALIPAY" },
      "jpg",
      () => "uuid-000",
    ),
    "private/payment-qrcodes/platform/default/ALIPAY/uuid-000.jpg",
  );
});

test("cloud storage keys accept only supported private namespaces", () => {
  const key =
    "cloud://thub-test.bucket/private/tutor-verification/profile_123/uuid-456.png";
  assert.equal(parseCloudStorageKey(key).cloudPath,
    "private/tutor-verification/profile_123/uuid-456.png");
  assert.equal(
    parseCloudStorageKey(
      "cloud://thub-test.bucket/private/payment-qrcodes/tutor/profile_123/WECHAT/uuid-456.png",
    ).cloudPath,
    "private/payment-qrcodes/tutor/profile_123/WECHAT/uuid-456.png",
  );
  assert.throws(() => parseCloudStorageKey("cloud://thub-test.bucket/public/file.png"));
  assert.throws(() => parseCloudStorageKey("https://example.invalid/file.png"));
});

test("CloudBase provider implements save, read, exists, and delete", async () => {
  const uploaded: string[] = [];
  const deleted: string[] = [];
  const client: CloudBaseStorageClient = {
    async uploadFile({ cloudPath, fileContent }) {
      uploaded.push(`${cloudPath}:${Buffer.from(fileContent as Buffer).toString()}`);
      return { fileID: `cloud://thub-test.bucket/${cloudPath}` };
    },
    async downloadFile({ fileID }) {
      if (fileID.includes("missing")) {
        throw Object.assign(new Error("not found"), { code: "STORAGE_FILE_NONEXIST" });
      }
      return { fileContent: Buffer.from("cloud-file") };
    },
    async deleteFile({ fileList }) {
      deleted.push(...fileList);
      return { fileList: fileList.map((fileID) => ({ fileID, code: "SUCCESS" })) };
    },
  };
  const storage = createCloudBasePrivateFileStorage({
    client,
    uuid: () => "uuid-456",
  });
  const key = await storage.save({
    buffer: Buffer.from("upload"),
    extension: "png",
    tutorProfileId: "profile_123",
  });
  assert.match(key, /^cloud:\/\//);
  assert.deepEqual(uploaded, [
    "private/tutor-verification/profile_123/uuid-456.png:upload",
  ]);
  assert.equal((await storage.read(key))?.buffer.toString(), "cloud-file");
  assert.equal(await storage.exists(key), true);
  assert.equal(
    await storage.exists(
      "cloud://thub-test.bucket/private/tutor-verification/profile_123/missing.png",
    ),
    false,
  );
  await storage.delete(key);
  assert.deepEqual(deleted, [key]);
});

test("CloudBase provider reports missing runtime credentials without database side effects", async () => {
  const client: CloudBaseStorageClient = {
    async uploadFile() {
      throw Object.assign(
        new Error(
          "missing secretId or secretKey of tencent cloud, please set secretId and secretKey in config",
        ),
        { code: "INVALID_PARAM" },
      );
    },
    async downloadFile() {
      throw new Error("unused");
    },
    async deleteFile() {
      throw new Error("unused");
    },
  };
  const storage = createCloudBasePrivateFileStorage({
    client,
    uuid: () => "uuid-456",
  });
  await assert.rejects(
    () =>
      storage.save({
        buffer: Buffer.from("upload"),
        extension: "png",
        tutorProfileId: "profile_123",
      }),
    (error) =>
      error instanceof PrivateFileStorageError &&
      error.code === "CLOUDBASE_CREDENTIALS_MISSING",
  );
});

test("storage router resolves local and cloud keys without duplicating authorization", async () => {
  const calls: string[] = [];
  const local = {
    save: async () => "local.png",
    read: async (key: string) => { calls.push(`local:${key}`); return null; },
    delete: async () => undefined,
    exists: async () => false,
  };
  const cloud = {
    save: async () => "cloud://env.bucket/private/tutor-verification/p/u.png",
    read: async (key: string) => { calls.push(`cloud:${key}`); return null; },
    delete: async () => undefined,
    exists: async () => false,
  };
  const router = createPrivateFileStorageRouter({ activeProvider: "LOCAL", local, cloud });
  await router.read("local.png");
  await router.read("cloud://env.bucket/private/tutor-verification/p/u.png");
  assert.deepEqual(calls, ["local:local.png", "cloud:cloud://env.bucket/private/tutor-verification/p/u.png"]);
});
