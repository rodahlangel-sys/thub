import assert from "node:assert/strict";
import test from "node:test";
import {
  assertMysqlE2ePrefix,
  extractServerActionId,
  parseFixtureMode,
} from "./mysql-e2e-core";

test("accepts only timestamped MySQL e2e prefixes", () => {
  assert.equal(
    assertMysqlE2ePrefix("mysql_e2e_20260621T010203_a1b2c3"),
    "mysql_e2e_20260621T010203_a1b2c3",
  );
  assert.throws(() => assertMysqlE2ePrefix("mysql_e2e_old"));
  assert.throws(() => assertMysqlE2ePrefix("history-user"));
  assert.throws(() => assertMysqlE2ePrefix("mysql_e2e_20260621T010203_a1b2c3%"));
});

test("extracts the action id only from the form containing the requested field", () => {
  const html = `
    <form><input name="$ACTION_ID_first"/><input name="documentId"/></form>
    <form><input name="$ACTION_ID_second"/><input name="school"/></form>`;
  assert.equal(extractServerActionId(html, "school"), "$ACTION_ID_second");
  assert.throws(() => extractServerActionId(html, "missing"));
});

test("fixture writes require an exact operation and explicit apply flag", () => {
  assert.deepEqual(parseFixtureMode(["prepare"]), {
    operation: "prepare",
    apply: false,
  });
  assert.deepEqual(parseFixtureMode(["cleanup", "--apply"]), {
    operation: "cleanup",
    apply: true,
  });
  assert.deepEqual(parseFixtureMode(["inspect"]), {
    operation: "inspect",
    apply: false,
  });
  assert.throws(() => parseFixtureMode(["inspect", "--apply"]));
  assert.deepEqual(parseFixtureMode(["normalize-emails", "--apply"]), {
    operation: "normalize-emails",
    apply: true,
  });
  assert.throws(() => parseFixtureMode(["cleanup", "--force"]));
  assert.throws(() => parseFixtureMode(["--apply"]));
});
