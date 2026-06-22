export type CloudBaseRunSourceManifest = {
  files: string[];
  directories: string[];
};

export type CloudBaseRunSourceAudit = {
  totalFiles: number;
  allowedEnvExamples: number;
  sensitiveEnvFiles: number;
  verificationFiles: number;
  temporaryFiles: number;
  nextBuildFiles: number;
  nodeModuleFiles: number;
  backupFiles: number;
  sqliteFiles: number;
  gitFiles: number;
  logFiles: number;
  unexpectedFiles: number;
  safe: boolean;
};

const FILES = [
  ".dockerignore",
  ".env.example",
  "Dockerfile",
  "eslint.config.mjs",
  "next.config.ts",
  "package-lock.json",
  "package.json",
  "postcss.config.mjs",
  "prisma/schema.prisma",
  "tsconfig.json",
];

const DIRECTORIES = ["public", "src"];

export function getCloudBaseRunSourceManifest(): CloudBaseRunSourceManifest {
  return { files: [...FILES], directories: [...DIRECTORIES] };
}

function normalize(entry: string) {
  return entry.replaceAll("\\", "/").replace(/^\.\//, "");
}

function isAllowed(entry: string) {
  return (
    FILES.includes(entry) ||
    DIRECTORIES.some((directory) => entry.startsWith(`${directory}/`))
  );
}

export function auditCloudBaseRunEntries(
  rawEntries: string[],
): CloudBaseRunSourceAudit {
  const entries = rawEntries.map(normalize);
  const count = (predicate: (entry: string) => boolean) =>
    entries.filter(predicate).length;
  const allowedEnvExamples = count((entry) => entry === ".env.example");
  const sensitiveEnvFiles = count(
    (entry) =>
      (entry === ".env" || entry.startsWith(".env.")) &&
      entry !== ".env.example",
  );
  const verificationFiles = count((entry) =>
    entry.startsWith(".data/tutor-verification/"),
  );
  const temporaryFiles = count((entry) => entry.startsWith(".tmp/"));
  const nextBuildFiles = count(
    (entry) => entry === ".next" || entry.startsWith(".next/"),
  );
  const nodeModuleFiles = count(
    (entry) => entry === "node_modules" || entry.startsWith("node_modules/"),
  );
  const backupFiles = count((entry) => entry.startsWith("local-backups/"));
  const sqliteFiles = count((entry) =>
    /(?:^|\/)[^/]+\.(?:db|sqlite|sqlite3)(?:-journal|-wal|-shm)?$/i.test(entry),
  );
  const gitFiles = count(
    (entry) => entry === ".git" || entry.startsWith(".git/"),
  );
  const logFiles = count((entry) =>
    /(?:^|\/)(?:[^/]+\.log(?:\.txt)?|[^/]+-log\.txt)$/i.test(entry),
  );
  const unexpectedFiles = count((entry) => !isAllowed(entry));
  const blocked =
    sensitiveEnvFiles +
    verificationFiles +
    temporaryFiles +
    nextBuildFiles +
    nodeModuleFiles +
    backupFiles +
    sqliteFiles +
    gitFiles +
    logFiles +
    unexpectedFiles;

  return {
    totalFiles: entries.length,
    allowedEnvExamples,
    sensitiveEnvFiles,
    verificationFiles,
    temporaryFiles,
    nextBuildFiles,
    nodeModuleFiles,
    backupFiles,
    sqliteFiles,
    gitFiles,
    logFiles,
    unexpectedFiles,
    safe: blocked === 0,
  };
}
