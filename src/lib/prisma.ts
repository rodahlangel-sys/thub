import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl } from "./env";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ datasourceUrl: getDatabaseUrl(process.env) });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
