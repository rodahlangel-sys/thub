export type FixtureOperation =
  | "prepare"
  | "cleanup"
  | "inspect"
  | "normalize-emails";

const prefixPattern = /^mysql_e2e_\d{8}T\d{6}_[a-f0-9]{6}$/;

export function assertMysqlE2ePrefix(prefix: string) {
  if (!prefixPattern.test(prefix)) throw new Error("MYSQL_E2E_PREFIX_INVALID");
  return prefix;
}

export function extractServerActionId(html: string, requiredField: string) {
  const forms = Array.from(html.matchAll(/<form\b[\s\S]*?<\/form>/gi), (match) =>
    match[0],
  );
  const form = forms.find((candidate) =>
    new RegExp(`name=["']${requiredField}["']`, "i").test(candidate),
  );
  if (!form) throw new Error("SERVER_ACTION_FORM_NOT_FOUND");
  const action = form.match(/name=["'](\$ACTION_[^"']+)["']/i)?.[1];
  if (!action) throw new Error("SERVER_ACTION_ID_NOT_FOUND");
  return action;
}

export function parseFixtureMode(args: string[]) {
  const operation = args[0];
  if (
    operation !== "prepare" &&
    operation !== "cleanup" &&
    operation !== "inspect" &&
    operation !== "normalize-emails"
  ) {
    throw new Error("Expected prepare, cleanup, inspect, or normalize-emails operation");
  }
  if (args.length === 1) return { operation, apply: false } as const;
  if (operation === "inspect") throw new Error("Inspect is always read-only");
  if (args.length === 2 && args[1] === "--apply") {
    return { operation, apply: true } as const;
  }
  throw new Error("Only the explicit --apply flag is supported");
}
