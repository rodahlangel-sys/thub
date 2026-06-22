import { spawn } from "node:child_process";
import { createMigrationResultCheckCommands } from "./sqlite-runtime-launcher-core";

function run(command: string, args: string[]) {
  return new Promise<number>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
      shell: false,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve(signal ? 1 : (code ?? 1)));
  });
}

async function main() {
  const commands = createMigrationResultCheckCommands(process.cwd(), process.execPath);
  const prepareCode = await run(commands.prepare.command, commands.prepare.args);
  if (prepareCode !== 0) {
    const restoreCode = await run(commands.restore.command, commands.restore.args);
    process.exitCode = restoreCode === 0 ? prepareCode : restoreCode;
    return;
  }

  let checkCode = 1;
  let restoreCode = 1;
  try {
    checkCode = await run(commands.check.command, commands.check.args);
  } finally {
    restoreCode = await run(commands.restore.command, commands.restore.args);
  }
  process.exitCode = restoreCode === 0 ? checkCode : restoreCode;
}

main().catch(() => {
  console.error("MySQL migration result check failed safely.");
  process.exitCode = 1;
});
