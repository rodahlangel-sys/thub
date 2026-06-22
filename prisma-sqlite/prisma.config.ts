import path from "node:path";
import { defineConfig } from "prisma/config";

const databasePath = path
  .join(process.cwd(), "prisma", "dev.db")
  .replaceAll("\\", "/");
process.env.DATABASE_URL = `file:${databasePath}`;

export default defineConfig({
  schema: "schema.prisma",
  migrations: {
    path: "migrations",
  },
  engine: "classic",
  datasource: {
    url: `file:${databasePath}`,
  },
});
