"use client"

import { useEffect, useMemo, useState } from "react"

import { useInventory } from "@/lib/inventory-context"
import {
  customerListTotal,
  deleteCustomerList,
  inventoryItemToListItem,
  loadCustomerLists,
  saveCustomerList,
} from "@/lib/customer-lists"

import type { CustomerList, CustomerListItem } from "@/lib/types"

import { useToast } from "@/hooks/use-toast"
import { useEntitlements } from "@/hooks/use-entitlements"

import { FeatureLocked, TrialBanner } from "@/components/billing/trial-banner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { ListPlus, Plus, Save, Trash2, X } from "lucide-react"

function newId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID()
  }

  return `list-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export default function CustomerListsPage() {
  const { items } = useInventory()
  const { toast } = useToast()

  const { entitlements, loading: entitlementsLoading } = useEntitlements()

  const customerListsAllowed = entitlements.canUseCustomerLists

  const [lists, setLists] = useState<CustomerList[]>([])

  const [customerName, setCustomerName] = useState("")

  const [note, setNote] = useState("")

  const [search, setSearch] = useState("")

  const [draftItems, setDraftItems] = useState<CustomerListItem[]>([])

  const [saving, setSaving] = useState(false)

  const [loadingLists, setLoadingLists] = useState(false)

  /**
   * Only load customer lists when the user
   * actually has Premium access.
   */
  useEffect(() => {
    if (entitlementsLoading || !customerListsAllowed) {
      return
    }

    let active = true

    async function loadLists() {
      setLoadingLists(true)

      try {
        const result = await loadCustomerLists()

        if (active) {
          setLists(result)
        }
      } catch (error) {
        console.error("Failed to load customer lists:", error)

        if (active) {
          toast({
            title: "Could not load customer lists",
            variant: "destructive",
          })
        }
      } finally {
        if (active) {
          setLoadingLists(false)
        }
      }
    }

    loadLists()

    return () => {
      active = false
    }
  }, [customerListsAllowed, entitlementsLoading, toast])

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) {
      return []
    }

    return items
      .filter((item) => {
        const name = item.card?.name?.toLowerCase() ?? ""

        const set = item.card?.set?.name?.toLowerCase() ?? ""

        return name.includes(term) || set.includes(term)
      })
      .slice(0, 8)
  }, [items, search])

  const draftTotal = draftItems.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
    0,
  )

  function addDraftItem(inventoryId: string) {
    const item = items.find((entry) => entry.id === inventoryId)

    if (!item) return

    if (draftItems.some((entry) => entry.id === item.id)) {
      toast({
        title: "Already on the list",
      })

      return
    }

    setDraftItems((prev) => [...prev, inventoryItemToListItem(item)])

    setSearch("")
  }

  function removeDraftItem(id: string) {
    setDraftItems((prev) => prev.filter((entry) => entry.id !== id))
  }

  function resetDraft() {
    setCustomerName("")
    setNote("")
    setDraftItems([])
    setSearch("")
  }

  async function handleSave() {
    if (!customerListsAllowed) {
      toast({
        title: "Premium required",
        description: "Customer Lists are available with Premium.",
        variant: "destructive",
      })

      return
    }

    if (!customerName.trim() && draftItems.length === 0) {
      toast({
        title: "Add a customer name or at least one card first",
        variant: "destructive",
      })

      return
    }

    const now = new Date().toISOString()

    const list: CustomerList = {
      id: newId(),

      customerName: customerName.trim(),

      note: note.trim(),

      items: draftItems,

      createdAt: now,

      updatedAt: now,
    }

    setSaving(true)

    try {
      await saveCustomerList(list)

      setLists((prev) => [list, ...prev])

      resetDraft()

      toast({
        title: "Customer list saved",
      })
    } catch (error) {
      console.error("Failed to save customer list:", error)

      toast({
        title: "Could not save list",

        description: error instanceof Error ? error.message : undefined,

        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!customerListsAllowed) {
      toast({
        title: "Premium required",
        description: "Customer Lists are available with Premium.",
        variant: "destructive",
      })

      return
    }

    const previous = lists

    setLists((prev) => prev.filter((list) => list.id !== id))

    try {
      await deleteCustomerList(id)
    } catch (error) {
      console.error("Failed to delete customer list:", error)

      setLists(previous)

      toast({
        title: "Could not delete list",
        variant: "destructive",
      })
    }
  }

  /**
   * Basic/expired users should never get the actual
   * Customer Lists interface.
   */
  if (!entitlementsLoading && !customerListsAllowed) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <FeatureLocked
          title="Customer Lists"
          description="Customer Lists are included with Premium. Upgrade to build customer-specific card lists, save requests, track totals, and organize cards for buyers."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <TrialBanner />
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ListPlus className="h-5 w-5" />
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Customer Lists
          </h1>

          <p className="text-sm text-muted-foreground">
            Build a card list for a customer, add a note, and save it for later.
          </p>
        </div>
      </div>

      {loadingLists ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          Loading customer lists…
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* Builder */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New list</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <Input
                placeholder="Customer name"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
              />

              <Textarea
                placeholder="Note (e.g. holding until Friday, wants NM only)"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
              />

              <div className="relative">
                <Input
                  placeholder="Search inventory to add cards…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />

                {matches.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border bg-background shadow-lg">
                    {matches.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => addDraftItem(item.id)}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        <span className="truncate">
                          {item.card?.name}

                          <span className="ml-1 text-muted-foreground">
                            {item.card?.set?.name}
                          </span>
                        </span>

                        <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {draftItems.length === 0 ? (
                  <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
                    No cards added yet.
                  </p>
                ) : (
                  draftItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.name}</p>

                        <p className="truncate text-xs text-muted-foreground">
                          {item.setName}

                          {item.condition ? ` · ${item.condition}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="tabular-nums">
                          ${item.price.toFixed(2)}
                        </span>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeDraftItem(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-sm text-muted-foreground">
                  {draftItems.length} card
                  {draftItems.length === 1 ? "" : "s"} ·{" "}
                  <span className="font-medium text-foreground">
                    ${draftTotal.toFixed(2)}
                  </span>
                </span>

                <Button onClick={handleSave} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />

                  {saving ? "Saving…" : "Save list"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Saved lists */}
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              Saved lists ({lists.length})
            </h2>

            {lists.length === 0 ? (
              <p className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
                Saved customer lists will appear here.
              </p>
            ) : (
              lists.map((list) => (
                <Card key={list.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">
                        {list.customerName || "Untitled list"}
                      </CardTitle>

                      {list.note && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {list.note}
                        </p>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(list.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>

                  <CardContent className="space-y-2">
                    {list.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span className="truncate">{item.name}</span>

                        <span className="tabular-nums text-muted-foreground">
                          ${item.price.toFixed(2)}
                        </span>
                      </div>
                    ))}

                    <div className="flex items-center justify-between border-t pt-2">
                      <Badge variant="secondary">
                        {list.items.length} card
                        {list.items.length === 1 ? "" : "s"}
                      </Badge>

                      <span className="text-sm font-medium tabular-nums">
                        ${customerListTotal(list).toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
