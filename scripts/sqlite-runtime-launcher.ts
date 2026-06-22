import { spawn } from "node:child_process";
import {
  createSqliteRuntimeCommands,
  createSqliteRuntimeEnvironment,
  parseSqliteRuntimeMode,
} from "./sqlite-runtime-launcher-core";

function run(command: string, args: string[], environment: NodeJS.ProcessEnv) {
  return new Promise<number>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: environment,
      stdio: "inherit",
      shell: false,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve(signal ? 1 : (code ?? 1)));
  });
}

async function main() {
  const { mode } = parseSqliteRuntimeMode(process.argv.slice(2));
  const environment = createSqliteRuntimeEnvironment(process.env, process.cwd());
  const commands = createSqliteRuntimeCommands(process.cwd(), process.execPath, mode);

  console.log("Preparing the archived SQLite rollback Prisma Client.");
  let exitCode = await run(commands[0].command, commands[0].args, environment);
  if (exitCode !== 0 || mode === "generate") {
    process.exitCode = exitCode;
    return;
  }
  exitCode = await run(commands[1].command, commands[1].args, environment);
  process.exitCode = exitCode;
}

main().catch(() => {
  console.error("SQLite rollback runtime preparation failed.");
  process.exitCode = 1;
});
