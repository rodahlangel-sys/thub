import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { createCloudBasePrivateFileStorage } from "../src/lib/storage/cloudbase-storage";
import { createLocalPrivateFileStorage } from "../src/lib/storage/local-storage";
import { parseVerificationMigrationMode } from "./cloudbase-verification-migration-core";
import { createMysqlRuntimeEnvironment } from "./mysql-runtime-launcher-core";

type MigrationEntry = {
  documentId: string;
  oldStorageKeyHash: string;
  cloudFileId: string;
  sha256: string;
  sizeBytes: number;
  uploadVerified: boolean;
  anonymousReadDenied: boolean;
};

type MigrationMap = {
  version: number;
  envId: string;
  region: string;
  entries: MigrationEntry[];
};

function digest(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}

function loadEnvironment() {
  const envPath = path.join(process.cwd(), ".env.cloudbase.local");
  const envFile = existsSync(envPath) ? readFileSync(envPath, "utf8") : undefined;
  return createMysqlRuntimeEnvironment(process.env, envFile);
}

function loadMap() {
  const mapPath = path.join(process.cwd(), ".tmp", "tutor-storage-migration-map.json");
  if (!existsSync(mapPath)) throw new Error("Verification storage migration map is missing");
  const map = JSON.parse(readFileSync(mapPath, "utf8")) as MigrationMap;
  if (map.version !== 1 || map.entries.length !== 2 || !map.envId || !map.region) {
    throw new Error("Verification storage migration map is invalid");
  }
  if (new Set(map.entries.map((entry) => entry.documentId)).size !== map.entries.length) {
    throw new Error("Verification storage migration map contains duplicate documents");
  }
  return map;
}

async function main() {
  const mode = parseVerificationMigrationMode(process.argv.slice(2));
  const map = loadMap();
  const environment = loadEnvironment();
  const prisma = new PrismaClient({ datasourceUrl: environment.DATABASE_URL });
  const local = createLocalPrivateFileStorage(
    path.join(process.cwd(), ".data", "tutor-verification"),
  );
  try {
    const documents = await prisma.tutorVerificationDocument.findMany({
      where: { id: { in: map.entries.map((entry) => entry.documentId) } },
      select: { id: true, storageKey: true, sizeBytes: true },
    });
    const byId = new Map(documents.map((document) => [document.id, document]));
    for (const entry of map.entries) {
      const document = byId.get(entry.documentId);
      if (!document || document.storageKey.startsWith("cloud://")) {
        throw new Error("Document is missing or has already been migrated");
      }
      if (digest(document.storageKey) !== entry.oldStorageKeyHash) {
        throw new Error("Document storage key changed after cloud upload");
      }
      const localFile = await local.read(document.storageKey);
      if (
        !localFile ||
        document.sizeBytes !== entry.sizeBytes ||
        localFile.buffer.length !== entry.sizeBytes ||
        digest(localFile.buffer) !== entry.sha256 ||
        !entry.uploadVerified ||
        !entry.anonymousReadDenied
      ) {
        throw new Error("Local or cloud verification evidence is inconsistent");
      }
    }

    if (!mode.apply) {
      console.log(JSON.stringify({ mode: "dry-run", ready: true, documents: map.entries.length, databaseChanges: 0 }));
      return;
    }

    const { init } = await import("@cloudbase/node-sdk");
    const cloudApp = init({ env: map.envId, region: map.region });
    const cloud = createCloudBasePrivateFileStorage({ client: cloudApp });
    for (const entry of map.entries) {
      const cloudFile = await cloud.read(entry.cloudFileId);
      if (!cloudFile || cloudFile.buffer.length !== entry.sizeBytes || digest(cloudFile.buffer) !== entry.sha256) {
        throw new Error("Cloud verification file failed the apply-time integrity check");
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const entry of map.entries) {
        const current = byId.get(entry.documentId)!;
        const result = await tx.tutorVerificationDocument.updateMany({
          where: { id: entry.documentId, storageKey: current.storageKey },
          data: { storageKey: entry.cloudFileId },
        });
        if (result.count !== 1) throw new Error("Concurrent document update detected");
      }
    });
    console.log(JSON.stringify({ mode: "apply", migrated: map.entries.length }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error(JSON.stringify({ ok: false, category: "verification-storage-migration-failed" }));
  process.exitCode = 1;
});
