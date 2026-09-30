import "./ws-env";
import ws from "ws";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { neonConfig } from "@neondatabase/serverless";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
  }

  // Neon hosts use the Neon serverless driver so a Vercel function does not
  // keep a traditional Postgres connection open. Local Postgres uses `pg`.
  if (/neon\.tech/i.test(connectionString)) {
    neonConfig.webSocketConstructor = ws;
    const adapter = new PrismaNeon({ connectionString, max: 1 });
    return new PrismaClient({ adapter });
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
