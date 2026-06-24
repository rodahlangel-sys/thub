import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path: string) {
  return readFileSync(path, "utf8");
}

test("health route is lightweight and does not depend on downstream services", async () => {
  const source = read("src/app/api/health/route.ts");
  assert.doesNotMatch(source, /@\/lib\/prisma|PrismaClient|DATABASE_URL/);
  assert.doesNotMatch(source, /cloudbase|storage/i);

  const route = await import("../src/app/api/health/route");
  const response = await route.GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { ok: true });
});

test("Prisma MySQL datasource URL gets bounded connection settings", async () => {
  const { getPrismaDatasourceUrl } = await import("../src/lib/env");
  const url = getPrismaDatasourceUrl({
    DATABASE_URL: "mysql://user:pass@example.invalid:3306/thub_test",
  });

  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get("connect_timeout"), "5");
  assert.equal(parsed.searchParams.get("pool_timeout"), "5");
  assert.equal(parsed.searchParams.get("connection_limit"), "5");
});

test("Prisma datasource URL preserves explicit MySQL connection settings", async () => {
  const { getPrismaDatasourceUrl } = await import("../src/lib/env");
  const url = getPrismaDatasourceUrl({
    DATABASE_URL:
      "mysql://user:pass@example.invalid:3306/thub_test?connect_timeout=2&pool_timeout=3&connection_limit=4",
  });

  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get("connect_timeout"), "2");
  assert.equal(parsed.searchParams.get("pool_timeout"), "3");
  assert.equal(parsed.searchParams.get("connection_limit"), "4");
});

test("login card no longer exposes the demo account panel", () => {
  const source = read("src/components/auth/ThubLoginCard.tsx");
  assert.doesNotMatch(source, /查看体验账号/);
  assert.doesNotMatch(source, /admin@example\.com|parent1@example\.com|tutor1@example\.com/);
  assert.doesNotMatch(source, /<details/);
});
