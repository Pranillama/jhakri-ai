import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { withAccelerate } from "@prisma/extension-accelerate";

// The Accelerate-extended client is a superset of the plain client, so we use
// it as the single singleton type. This keeps `prisma` callable instead of a
// union of incompatible client types at every consumer.
function createAcceleratedClient(url: string) {
  return new PrismaClient({ accelerateUrl: url }).$extends(withAccelerate());
}

type PrismaClientSingleton = ReturnType<typeof createAcceleratedClient>;

function createPrismaClient(): PrismaClientSingleton {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL is required but was not set.");
  }

  if (url.startsWith("prisma+postgres://")) {
    return createAcceleratedClient(url);
  }

  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter }) as unknown as PrismaClientSingleton;
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
