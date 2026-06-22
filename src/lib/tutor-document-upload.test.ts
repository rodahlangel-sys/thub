import assert from "node:assert/strict";
import test from "node:test";
import { persistTutorDocumentUpload } from "./tutor-document-upload";
import type { PrivateFileStorage } from "./storage";

function storageFixture(options?: { saveFails?: boolean; deleteOldFails?: boolean }) {
  const deleted: string[] = [];
  const storage: PrivateFileStorage = {
    async save() {
      if (options?.saveFails) throw new Error("UPLOAD_FAILED");
      return "new.png";
    },
    async read() { return null; },
    async exists() { return false; },
    async delete(key) {
      deleted.push(key);
      if (options?.deleteOldFails && key === "old.png") throw new Error("DELETE_FAILED");
    },
  };
  return { storage, deleted };
}

const input = {
  buffer: Buffer.from("image"),
  extension: "png" as const,
  tutorProfileId: "profile_123",
};

test("upload failure never calls the database commit", async () => {
  const { storage } = storageFixture({ saveFails: true });
  let commits = 0;
  await assert.rejects(() =>
    persistTutorDocumentUpload({ storage, input, oldStorageKeys: [], commit: async () => { commits += 1; } }),
  );
  assert.equal(commits, 0);
});

test("database failure removes only the new upload and keeps the old file", async () => {
  const { storage, deleted } = storageFixture();
  await assert.rejects(() =>
    persistTutorDocumentUpload({
      storage,
      input,
      oldStorageKeys: ["old.png"],
      commit: async () => { throw new Error("DATABASE_FAILED"); },
    }),
  );
  assert.deepEqual(deleted, ["new.png"]);
});

test("old-file cleanup failure never removes the committed new file", async () => {
  const { storage, deleted } = storageFixture({ deleteOldFails: true });
  const cleanupErrors: unknown[] = [];
  const key = await persistTutorDocumentUpload({
    storage,
    input,
    oldStorageKeys: ["old.png"],
    commit: async () => undefined,
    onCleanupError: (error) => cleanupErrors.push(error),
  });
  assert.equal(key, "new.png");
  assert.deepEqual(deleted, ["old.png"]);
  assert.equal(cleanupErrors.length, 1);
});
