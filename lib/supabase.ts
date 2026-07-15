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

// PostgREST caps every response at its server-side `max-rows` setting (1000 on
// the Supabase Data API), regardless of the `limit` query param. Analytics reads
// ask for tens of thousands of rows to compute price movers, insights, and
// collection value across weeks of history — so without paging they only ever
// see the first 1000 rows (the oldest single day), which makes the whole
// analytics page look like it has one day of data forever. GET requests that ask
// for more than one page are fetched in Range-header pages and concatenated.
const PAGE_SIZE = 1000

function buildHeaders(extra?: Record<string, string>) {
  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
  return new Headers({
    apikey: key!,
    Authorization: `Bearer ${key!}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
    ...extra,
  })
}

function parseBody(text: string) {
  if (!text || text.trim() === "") return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
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

  const method = options.method || "GET"

  const params = new URLSearchParams()
  if (options.select) params.set("select", options.select)
  if (options.order) params.set("order", options.order)
  if (options.onConflict) params.set("on_conflict", options.onConflict)

  const filterQuery = options.filters?.join("&") || ""
  const baseQuery = [params.toString(), filterQuery].filter(Boolean).join("&")
  const baseUrl = `${SUPABASE_URL}/rest/v1/${table}`

  // GET requests that need more than one page: walk the result set with Range
  // headers until a short page (or an out-of-range response) signals the end.
  const desired = options.limit ?? PAGE_SIZE
  if (method === "GET" && desired > PAGE_SIZE) {
    const url = `${baseUrl}${baseQuery ? `?${baseQuery}` : ""}`
    const rows: unknown[] = []

    for (let offset = 0; offset < desired; offset += PAGE_SIZE) {
      const to = Math.min(offset + PAGE_SIZE, desired) - 1
      const response = await fetch(url, {
        headers: buildHeaders({ "Range-Unit": "items", Range: `${offset}-${to}` }),
      })

      // Asking past the last row yields 416; treat it as a clean end-of-data.
      if (response.status === 416) break

      if (!response.ok) {
        const message = await response
          .text()
          .catch(() => "Supabase request failed")
        throw new Error(
          `Supabase request failed (${response.status})${message ? ` ${message}` : ""}`,
        )
      }

      const page = parseBody(await response.text())
      if (!Array.isArray(page)) {
        // Unexpected non-array payload — return whatever we have so far.
        if (rows.length === 0) return page
        break
      }

      rows.push(...page)
      if (page.length < to - offset + 1) break // last (short) page reached
    }

    return rows
  }

  // Single-request path (writes, and reads that fit in one page).
  if (options.limit) params.set("limit", String(options.limit))
  const query = [params.toString(), filterQuery].filter(Boolean).join("&")
  const url = `${baseUrl}${query ? `?${query}` : ""}`

  const response = await fetch(url, {
    method,
    headers: buildHeaders(),
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

  return parseBody(await response.text())
}
