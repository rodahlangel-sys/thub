import { promises as fs } from "node:fs";
import path from "node:path";
import {
  auditCloudBaseRunEntries,
  getCloudBaseRunSourceManifest,
} from "./cloudbase-run-source-core";

const projectRoot = process.cwd();
const temporaryRoot = path.resolve(projectRoot, ".tmp");
const outputRoot = path.resolve(temporaryRoot, "cloudbase-run-source");

function assertSafeOutputPath() {
  if (!outputRoot.startsWith(`${temporaryRoot}${path.sep}`)) {
    throw new Error("CloudBase Run source output path is unsafe");
  }
}

async function copyEntry(relativePath: string) {
  const source = path.resolve(projectRoot, relativePath);
  const destination = path.resolve(outputRoot, relativePath);
  if (!source.startsWith(`${projectRoot}${path.sep}`)) {
    throw new Error("CloudBase Run source entry is unsafe");
  }
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.cp(source, destination, {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
}

async function listFiles(directory: string, relative = ""): Promise<string[]> {
  const entries = await fs.readdir(path.join(directory, relative), {
    withFileTypes: true,
  });
  const files: string[] = [];
  for (const entry of entries) {
    const entryPath = path.join(relative, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(directory, entryPath)));
    } else if (entry.isFile()) {
      files.push(entryPath.replaceAll("\\", "/"));
    } else {
      throw new Error("CloudBase Run source contains an unsupported link");
    }
  }
  return files;
}

async function main() {
  assertSafeOutputPath();
  const manifest = getCloudBaseRunSourceManifest();
  await fs.rm(outputRoot, { recursive: true, force: true });
  await fs.mkdir(outputRoot, { recursive: true });
  for (const entry of [...manifest.files, ...manifest.directories]) {
    await copyEntry(entry);
  }
  const files = await listFiles(outputRoot);
  const audit = auditCloudBaseRunEntries(files);
  console.log(JSON.stringify({ mode: "prepare-only", ...audit }, null, 2));
  if (!audit.safe) process.exitCode = 1;
}

main().catch(() => {
  console.error(
    JSON.stringify({ ok: false, category: "cloudbase-source-preparation" }),
  );
  process.exitCode = 1;
});
