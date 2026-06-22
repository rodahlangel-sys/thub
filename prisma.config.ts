import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "prisma/config";
import { createMysqlRuntimeEnvironment } from "./scripts/mysql-runtime-launcher-core";

const cloudbasePath = path.join(process.cwd(), ".env.cloudbase.local");
const cloudbaseEnv = existsSync(cloudbasePath)
  ? readFileSync(cloudbasePath, "utf8")
  : undefined;
const environment = createMysqlRuntimeEnvironment(process.env, cloudbaseEnv);
process.env.DATABASE_URL = environment.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  engine: "classic",
  datasource: {
    url: environment.DATABASE_URL,
  },
});
