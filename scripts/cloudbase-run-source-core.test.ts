import assert from "node:assert/strict";
import test from "node:test";
import {
  auditCloudBaseRunEntries,
  getCloudBaseRunSourceManifest,
} from "./cloudbase-run-source-core";

test("CloudBase Run source manifest is an explicit build-only allowlist", () => {
  const manifest = getCloudBaseRunSourceManifest();
  assert.deepEqual(manifest.directories, ["public", "src"]);
  assert.ok(manifest.files.includes("Dockerfile"));
  assert.ok(manifest.files.includes("package-lock.json"));
  assert.ok(manifest.files.includes("prisma/schema.prisma"));
  assert.ok(manifest.files.includes(".env.example"));
  assert.ok(!manifest.files.includes("prisma/seed.ts"));
  assert.ok(!manifest.directories.includes("scripts"));
});

test("deployment audit blocks every local secret and data category", () => {
  const report = auditCloudBaseRunEntries([
    "Dockerfile",
    ".env.example",
    ".env",
    ".env.cloudbase.local",
    ".data/tutor-verification/proof.jpg",
    ".tmp/tutor-storage-migration-map.json",
    ".next/server.js",
    "node_modules/next/package.json",
    "local-backups/pre-history-cleanup/dev.db",
    "prisma/dev.db-wal",
    ".git/config",
    "thub-web-001-log.txt",
  ]);
  assert.equal(report.allowedEnvExamples, 1);
  assert.equal(report.sensitiveEnvFiles, 2);
  assert.equal(report.verificationFiles, 1);
  assert.equal(report.temporaryFiles, 1);
  assert.equal(report.nextBuildFiles, 1);
  assert.equal(report.nodeModuleFiles, 1);
  assert.equal(report.backupFiles, 1);
  assert.equal(report.sqliteFiles, 2);
  assert.equal(report.gitFiles, 1);
  assert.equal(report.logFiles, 1);
  assert.equal(report.safe, false);
});

test("deployment audit accepts the minimum source tree", () => {
  const report = auditCloudBaseRunEntries([
    "Dockerfile",
    ".dockerignore",
    ".env.example",
    "package.json",
    "package-lock.json",
    "prisma/schema.prisma",
    "public/brand/thub-logo.png",
    "src/app/page.tsx",
  ]);
  assert.equal(report.safe, true);
  assert.equal(report.sensitiveEnvFiles, 0);
  assert.equal(report.sqliteFiles, 0);
});
