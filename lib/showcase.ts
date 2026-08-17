import type { InventoryItem } from "./types"

// Soft cap on how many cards a Showcase binder can hold.
// Adding beyond this is blocked in both the UI and API.
export const SHOWCASE_CARD_LIMIT = 50

export interface ShowcaseBinder {
  id: string
  shareToken: string
  name: string
  items: InventoryItem[]
  createdAt: string
  updatedAt: string
}

/** Build the public, shareable URL for a showcase from its token. */
export function buildShareUrl(shareToken: string, origin?: string): string {
  const base =
    origin ?? (typeof window !== "undefined" ? window.location.origin : "")
  return `${base}/share/${shareToken}`
}

export async function listShowcases(): Promise<ShowcaseBinder[]> {
  const response = await fetch("/api/showcase")
  if (!response.ok) throw new Error("Failed to load showcases")
  return response.json()
}

export async function createShowcase(name: string): Promise<ShowcaseBinder> {
  const response = await fetch("/api/showcase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  if (!response.ok) throw new Error("Failed to create showcase")
  return response.json()
}

export async function updateShowcase(
  id: string,
  patch: { name?: string; items?: InventoryItem[] },
): Promise<ShowcaseBinder> {
  const response = await fetch(`/api/showcase/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error ?? "Failed to update showcase")
  }
  return response.json()
}

export async function deleteShowcase(id: string): Promise<void> {
  const response = await fetch(`/api/showcase/${id}`, { method: "DELETE" })
  if (!response.ok) throw new Error("Failed to delete showcase")
}

/** Public read-only fetch used by the shareable page. No auth required. */
export async function loadSharedShowcase(
  token: string,
): Promise<ShowcaseBinder> {
  const response = await fetch(`/api/showcase/share/${token}`)
  if (!response.ok) throw new Error("Showcase not found")
  return response.json()
}
