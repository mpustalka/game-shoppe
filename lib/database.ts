import { getDatabase as getNetlifyDatabase } from "@netlify/database"

export function getDatabase() {
  const connectionString =
    process.env.NETLIFY_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.SUPABASE_DB_URL

  if (!connectionString) {
    return getNetlifyDatabase()
  }

  return getNetlifyDatabase({ connectionString })
}
