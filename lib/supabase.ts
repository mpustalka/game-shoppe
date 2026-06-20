const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.SUPABASE_DATABASE_URL

// Public/anon key — safe for client, but subject to row level security.
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

// Privileged server key — bypasses RLS. supabaseTable only runs server-side
// (inside route handlers), so it is never shipped to the browser.
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SERVICE_ROLE_KEY

export function hasSupabaseConfig() {
  return Boolean(
    SUPABASE_URL && (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY),
  )
}

export async function supabaseTable(
  table: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE"
    select?: string
    filters?: string[]
    order?: string
    limit?: number
    body?: unknown
    onConflict?: string
  } = {},
) {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase environment variables are not configured")
  }

  const params = new URLSearchParams()

  if (options.select) params.set("select", options.select)
  if (options.order) params.set("order", options.order)
  if (options.limit) params.set("limit", String(options.limit))
  if (options.onConflict) params.set("on_conflict", options.onConflict)

  const filterQuery = options.filters?.join("&") || ""
  const query = [params.toString(), filterQuery].filter(Boolean).join("&")
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ""}`

  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY

  const headers = new Headers({
    apikey: key!,
    Authorization: `Bearer ${key!}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  })

  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    const message = await response.text().catch(() => "Supabase request failed")
    const details = message ? ` ${message}` : ""
    throw new Error(`Supabase request failed (${response.status})${details}`)
  }

  if (response.status === 204) {
    return null
  }

  const text = await response.text()

  if (!text || text.trim() === "") {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }

  return response.json()
}
