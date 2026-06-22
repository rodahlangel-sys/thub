import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path: string) {
  return readFileSync(path, "utf8");
}

test("standalone deployment excludes the archived SQLite database", () => {
  const config = read("next.config.ts");
  assert.match(config, /output:\s*["']standalone["']/);
  assert.doesNotMatch(config, /prisma\/dev\.db/);
});

test("CloudBase Run image is minimal and runs Next.js as non-root", () => {
  const dockerfile = read("Dockerfile");
  assert.match(dockerfile, /FROM node:22-alpine AS deps/);
  assert.match(dockerfile, /FROM node:22-alpine AS builder/);
  assert.match(dockerfile, /FROM node:22-alpine AS runner/);
  assert.match(dockerfile, /npm ci/);
  assert.match(
    dockerfile,
    /prisma generate --schema prisma\/schema\.prisma/,
  );
  assert.match(dockerfile, /\.next\/standalone/);
  assert.match(dockerfile, /\.next\/static/);
  assert.match(dockerfile, /\/app\/public/);
  assert.match(dockerfile, /HOSTNAME=0\.0\.0\.0/);
  assert.match(dockerfile, /PORT=3000/);
  assert.match(dockerfile, /USER nextjs/);
  assert.match(dockerfile, /CMD \["node", "server\.js"\]/);
  assert.doesNotMatch(dockerfile, /migrate|seed|db push/i);
});

test("Docker build context excludes all local secrets and data", () => {
  const ignored = new Set(
    read(".dockerignore")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#")),
  );
  for (const entry of [
    ".env*",
    ".git",
    ".tmp",
    ".data",
    "local-backups",
    "prisma/*.db*",
    "prisma-sqlite/*.db*",
    "**/*.log",
  ]) {
    assert.ok(ignored.has(entry), `missing Docker ignore rule: ${entry}`);
  }
});
