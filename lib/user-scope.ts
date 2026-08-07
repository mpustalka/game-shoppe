import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"
import { resolveEntitlements } from "@/lib/subscription-server"

// Per-account data ownership needs a `user_id` column on the data tables, which
// arrives via supabase/migrations/20260725000000_per_user_data_isolation.sql.
// This project has no automated migration runner, so that file is applied by
// hand and the code can be live before the column exists. Querying a missing
// column fails the whole request, so routes must not assume it is there — they
// ask for a scope and get one that matches the schema actually present.
export type DataScope =
  // Migration applied: real per-row ownership.
  | { mode: "owned"; userId: string; filters: string[] }
  // Pre-migration, account predates the paid program: sees the shared rows it
  // has always seen. No regression for established users.
  | { mode: "legacy"; userId: string; filters: string[] }
  // Pre-migration, account created after launch: sees nothing, because the
  // shared rows belong to someone else.
  | { mode: "isolated"; userId: string }

// Probing costs one cheap query, so the result is cached. A positive result is
// permanent (columns don't disappear); a negative one is re-checked so the app
// picks up the migration without waiting for a redeploy.
const MISSING_COLUMN_RECHECK_MS = 60_000
let ownershipProbe: { present: boolean; checkedAt: number } | null = null

export async function hasOwnershipColumn(): Promise<boolean> {
  if (ownershipProbe?.present) return true
  if (
    ownershipProbe &&
    Date.now() - ownershipProbe.checkedAt < MISSING_COLUMN_RECHECK_MS
  ) {
    return false
  }

  let present = false
  try {
    // All the ownership columns land in one migration, so inventory_items is
    // representative of the whole set.
    await supabaseTable("inventory_items", { select: "user_id", limit: 1 })
    present = true
  } catch (error) {
    console.error("OWNERSHIP PROBE FAILED:", error)
    present = false
  }

  ownershipProbe = { present, checkedAt: Date.now() }
  return present
}

// Resolves how the current request may see the shared data tables.
//
// Ownership fails CLOSED, the opposite of `requireFeature` in
// lib/subscription-server.ts. That guard is permissive on purpose: a billing
// hiccup should never lock a paying customer out of their own data. Here the
// risk runs the other way — guessing wrong hands one account another's
// inventory — so an empty list is always preferred to an unfiltered read.
export async function resolveDataScope(): Promise<DataScope | NextResponse> {
  const { user, entitlements } = await resolveEntitlements()

  if (!user) {
    return NextResponse.json(
      { error: "Not signed in", code: "auth_required" },
      { status: 401 },
    )
  }

  if (await hasOwnershipColumn()) {
    // Transitional compatibility: rows created before the ownership migration
    // have NULL user_id. Keep them visible/editable to the signed-in account
    // so existing collections do not appear to vanish overnight.
    return {
      mode: "owned",
      userId: user.id,
      filters: [`or=(user_id.eq.${user.id},user_id.is.null)`],
    }
  }

  // Pre-migration. Established accounts keep the shared view they already had;
  // new signups get nothing rather than someone else's collection.
  const isEstablished = entitlements ? !entitlements.isNewAccount : true
  return isEstablished
    ? { mode: "legacy", userId: user.id, filters: [] }
    : { mode: "isolated", userId: user.id }
}

// Convenience for the common shape: ownership filters, or [] pre-migration.
export function scopeFilters(scope: DataScope): string[] {
  return scope.mode === "isolated" ? [] : scope.filters
}

// Stamps ownership on writes, but only once the column exists.
export function ownerStamp(scope: DataScope): { user_id?: string } {
  return scope.mode === "owned" ? { user_id: scope.userId } : {}
}

// Pre-migration, a post-launch account has nowhere safe to write: an unstamped
// row would join the shared pool and show up in established accounts. Rather
// than silently mix data, the write is refused with an explanation.
export function pendingSetupResponse() {
  return NextResponse.json(
    {
      error:
        "Per-account storage isn't ready yet. The database migration that " +
        "separates each account's data still needs to be applied.",
      code: "ownership_migration_pending",
    },
    { status: 503 },
  )
}

// Note: there is deliberately no bare `ownedBy(userId)` helper. Building a
// `user_id=eq.…` filter without going through resolveDataScope() is what breaks
// the app while the migration is unapplied — the query errors on the missing
// column and the route returns nothing. Always ask for a scope.
