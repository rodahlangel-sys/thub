import assert from "node:assert/strict";
import test from "node:test";
import { getSeedPasswords } from "./seed-config";

test("seed passwords must be provided through the environment", () => {
  assert.throws(() => getSeedPasswords({}), /SEED_ADMIN_PASSWORD/);
  assert.throws(
    () =>
      getSeedPasswords({
        SEED_ADMIN_PASSWORD: ["admin", "configured"].join("-"),
      }),
    /SEED_DEMO_PASSWORD/,
  );
});

test("returns explicitly configured seed passwords", () => {
  const adminPassword = ["admin", "configured"].join("-");
  const demoPassword = ["demo", "configured"].join("-");

  assert.deepEqual(
    getSeedPasswords({
      SEED_ADMIN_PASSWORD: adminPassword,
      SEED_DEMO_PASSWORD: demoPassword,
    }),
    { adminPassword, demoPassword },
  );
});
