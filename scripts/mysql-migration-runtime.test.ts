import assert from "node:assert/strict";
import test from "node:test";
import { buildInsertStatement, parseEnvValue } from "./mysql-migration-runtime";

test("parses only the requested quoted environment value", () => {
  const source = [
    'DATABASE_URL="file:./dev.db"',
    'UNRELATED_VALUE="not-used"',
  ].join("\n");
  assert.equal(parseEnvValue(source, "DATABASE_URL"), "file:./dev.db");
  assert.equal(parseEnvValue(source, "MISSING"), undefined);
});

test("builds parameterized INSERT statements from trusted metadata", () => {
  assert.equal(
    buildInsertStatement("Order", ["id", "parentId", "totalAmount"]),
    "INSERT INTO `Order` (`id`, `parentId`, `totalAmount`) VALUES (?, ?, ?)",
  );
});
