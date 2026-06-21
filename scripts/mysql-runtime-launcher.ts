import { readFileSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  createMysqlRuntimeCommands,
  createMysqlRuntimeEnvironment,
  parseMysqlRuntimeMode,
} from "./mysql-runtime-launcher-core";

function run(command: string, args: string[], environment: NodeJS.ProcessEnv) {
  return new Promise<number>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: environment,
      stdio: "inherit",
      shell: false,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) resolve(1);
      else resolve(code ?? 1);
    });
  });
}

async function main() {
  const { mode } = parseMysqlRuntimeMode(process.argv.slice(2));
  const cloudbaseEnv = readFileSync(
    path.join(process.cwd(), ".env.cloudbase.local"),
    "utf8",
  );
  const environment = createMysqlRuntimeEnvironment(process.env, cloudbaseEnv);
  const commands = createMysqlRuntimeCommands(process.cwd(), process.execPath, mode);

  if (mode === "check") {
    process.exitCode = await run(
      commands[0].command,
      commands[0].args,
      environment,
    );
    return;
  }

  console.log("Preparing the isolated CloudBase MySQL Prisma Client.");
  let exitCode = await run(commands[0].command, commands[0].args, environment);
  if (exitCode !== 0 || mode === "generate") {
    process.exitCode = exitCode;
    return;
  }

  if (mode === "build") {
    exitCode = await run(commands[1].command, commands[1].args, environment);
  } else {
    console.log("Starting the local read-only MySQL validation server.");
    exitCode = await run(
      commands[1].command,
      commands[1].args,
      environment,
    );
  }
  process.exitCode = exitCode;
}

main().catch(() => {
  console.error("CloudBase MySQL runtime preparation failed.");
  process.exitCode = 1;
});
