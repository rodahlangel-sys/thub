import assert from "node:assert/strict";
import test from "node:test";
import { parseVerificationMigrationMode } from "./cloudbase-verification-migration-core";

test("verification file migration defaults to dry-run", () => {
  assert.deepEqual(parseVerificationMigrationMode([]), { apply: false });
  assert.deepEqual(parseVerificationMigrationMode(["--apply"]), { apply: true });
  assert.throws(() => parseVerificationMigrationMode(["--force"]));
  assert.throws(() => parseVerificationMigrationMode(["--apply", "--apply"]));
});
