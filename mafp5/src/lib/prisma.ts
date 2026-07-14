import { PrismaClient } from "@prisma/client"
import { PrismaD1 } from "@prisma/adapter-d1"
import { getCloudflareContext } from "@opennextjs/cloudflare"

/**
 * On Cloudflare Workers there is no long-lived Node process, and the database
 * is reached through the D1 binding (`env.DB`) rather than a connection string.
 * A single module-level PrismaClient is therefore not possible: the client must
 * be created from the per-request Cloudflare context.
 *
 * We memoize one client per Cloudflare `env` object (stable within a request)
 * using a WeakMap. This keeps all `prisma.*` accesses inside a single request
 * pointing at the same client instance, which is required for `$transaction`
 * batches to work correctly. It also transparently reuses the client across
 * requests within the same isolate.
 *
 * The exported `prisma` is a Proxy so existing call sites keep working
 * unchanged (`import { prisma } from "@/lib/prisma"` then `prisma.user.…`).
 */

type PrismaD1Database = ConstructorParameters<typeof PrismaD1>[0]

const clients = new WeakMap<object, PrismaClient>()

function resolveClient(): PrismaClient {
  const { env } = getCloudflareContext()
  const key = env as unknown as object

  const existing = clients.get(key)
  if (existing) return existing

  const db = env.DB
  if (!db) {
    throw new Error(
      'Binding D1 "DB" tidak tersedia. Pastikan wrangler.jsonc memuat d1_databases ' +
        "dengan binding DB, dan migrasi sudah diterapkan."
    )
  }

  const adapter = new PrismaD1(db as PrismaD1Database)
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
  clients.set(key, client)
  return client
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = resolveClient()
    const value = Reflect.get(client, prop, client)
    return typeof value === "function" ? value.bind(client) : value
  },
}) as PrismaClient
