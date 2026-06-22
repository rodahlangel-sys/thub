export function parseVerificationMigrationMode(args: string[]) {
  if (args.length === 0) return { apply: false };
  if (args.length === 1 && args[0] === "--apply") return { apply: true };
  throw new Error("Only a single explicit --apply flag is supported");
}
