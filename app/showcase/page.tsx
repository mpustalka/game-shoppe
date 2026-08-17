"use client"

import { useEffect, useMemo, useState } from "react"

import type { InventoryItem } from "@/lib/types"

import {
  SHOWCASE_CARD_LIMIT,
  buildShareUrl,
  createShowcase,
  deleteShowcase,
  listShowcases,
  updateShowcase,
  type ShowcaseBinder,
} from "@/lib/showcase"

import { ShowcaseBinderView } from "@/components/inventory/showcase-binder-view"
import { ShowcaseCardPicker } from "@/components/inventory/showcase-card-picker"

import { useToast } from "@/hooks/use-toast"
import { useEntitlements } from "@/hooks/use-entitlements"

import { FeatureLocked, TrialBanner } from "@/components/billing/trial-banner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { Input } from "@/components/ui/input"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  Check,
  Copy,
  ExternalLink,
  Plus,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-react"

export default function ShowcasePage() {
  const { toast } = useToast()

  const { entitlements, loading: entitlementsLoading } = useEntitlements()

  const showcaseAllowed = entitlements.canUseShowcase

  const [showcases, setShowcases] = useState<ShowcaseBinder[]>([])

  const [activeId, setActiveId] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)

  const [creating, setCreating] = useState(false)

  const [newName, setNewName] = useState("")

  const [busy, setBusy] = useState(false)

  const [addingId, setAddingId] = useState<string | null>(null)

  const [removingId, setRemovingId] = useState<string | null>(null)

  const [copied, setCopied] = useState(false)

  const active = useMemo(
    () => showcases.find((showcase) => showcase.id === activeId) ?? null,
    [showcases, activeId],
  )

  /**
   * Load showcases only for accounts that
   * currently have Premium-equivalent access.
   */
  useEffect(() => {
    if (entitlementsLoading) {
      return
    }

    if (!showcaseAllowed) {
      setLoading(false)
      return
    }

    let activeRequest = true

    listShowcases()
      .then((list) => {
        if (!activeRequest) {
          return
        }

        setShowcases(list)

        if (list.length > 0) {
          setActiveId(list[0].id)
        }
      })
      .catch((error) => {
        console.error("Failed to load showcases:", error)

        if (activeRequest) {
          toast({
            title: "Failed to load showcases",
            variant: "destructive",
          })
        }
      })
      .finally(() => {
        if (activeRequest) {
          setLoading(false)
        }
      })

    return () => {
      activeRequest = false
    }
  }, [entitlementsLoading, showcaseAllowed, toast])

  function replaceShowcase(updated: ShowcaseBinder) {
    setShowcases((prev) =>
      prev.some((showcase) => showcase.id === updated.id)
        ? prev.map((showcase) =>
            showcase.id === updated.id ? updated : showcase,
          )
        : [updated, ...prev],
    )
  }

  async function handleCreate() {
    if (!showcaseAllowed) {
      toast({
        title: "Premium required",
        description: "Showcase binders are included with Premium.",
        variant: "destructive",
      })

      return
    }

    setCreating(true)

    try {
      const created = await createShowcase(newName.trim() || "Showcase")

      replaceShowcase(created)

      setActiveId(created.id)

      setNewName("")

      toast({
        title: "Showcase created",

        description: "Share it with the public link.",
      })
    } catch (error) {
      console.error("Failed to create showcase:", error)

      toast({
        title: "Failed to create showcase",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  async function handleAddCard(card: InventoryItem) {
    if (!showcaseAllowed) {
      toast({
        title: "Premium required",
        description: "Showcase binders are included with Premium.",
        variant: "destructive",
      })

      return
    }

    if (!active) {
      return
    }

    if (active.items.some((item) => item.id === card.id)) {
      toast({
        title: "Already in this showcase",
      })

      return
    }

    if (active.items.length >= SHOWCASE_CARD_LIMIT) {
      toast({
        title: `Limit reached (${SHOWCASE_CARD_LIMIT} cards)`,

        description: `This showcase has reached the ${SHOWCASE_CARD_LIMIT}-card limit.`,

        variant: "destructive",
      })

      return
    }

    setBusy(true)
    setAddingId(card.id)

    try {
      const updated = await updateShowcase(active.id, {
        items: [...active.items, card],
      })

      replaceShowcase(updated)
    } catch (error) {
      console.error("Failed to add showcase card:", error)

      toast({
        title: "Failed to add card",

        description: error instanceof Error ? error.message : undefined,

        variant: "destructive",
      })
    } finally {
      setBusy(false)
      setAddingId(null)
    }
  }

  async function handleRemoveCard(itemId: string) {
    if (!showcaseAllowed || !active) {
      return
    }

    setRemovingId(itemId)

    try {
      const updated = await updateShowcase(active.id, {
        items: active.items.filter((item) => item.id !== itemId),
      })

      replaceShowcase(updated)
    } catch (error) {
      console.error("Failed to remove showcase card:", error)

      toast({
        title: "Failed to remove card",
        variant: "destructive",
      })
    } finally {
      setRemovingId(null)
    }
  }

  async function handleDeleteShowcase() {
    if (!showcaseAllowed || !active) {
      return
    }

    if (!confirm(`Delete "${active.name}"? This cannot be undone.`)) {
      return
    }

    try {
      await deleteShowcase(active.id)

      setShowcases((prev) => {
        const next = prev.filter((showcase) => showcase.id !== active.id)

        setActiveId(next[0]?.id ?? null)

        return next
      })

      toast({
        title: "Showcase deleted",
      })
    } catch (error) {
      console.error("Failed to delete showcase:", error)

      toast({
        title: "Failed to delete showcase",
        variant: "destructive",
      })
    }
  }

  async function handleCopyLink() {
    if (!active) {
      return
    }

    const url = buildShareUrl(active.shareToken)

    try {
      await navigator.clipboard.writeText(url)

      setCopied(true)

      window.setTimeout(() => setCopied(false), 2000)

      toast({
        title: "Link copied",
        description: url,
      })
    } catch {
      toast({
        title: "Copy failed",
        description: url,
        variant: "destructive",
      })
    }
  }

  const count = active?.items.length ?? 0

  const atLimit = count >= SHOWCASE_CARD_LIMIT

  const shareUrl = active ? buildShareUrl(active.shareToken) : ""

  const existingIds = useMemo(
    () => new Set((active?.items ?? []).map((item) => item.id)),
    [active],
  )

  /**
   * The Premium gate belongs here at the PAGE level.
   *
   * Basic / expired users should never see or interact
   * with the Showcase management UI.
   */
  if (!entitlementsLoading && !showcaseAllowed) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <FeatureLocked
          title="Premium Showcase"
          description="Public Showcase binders are included with Premium. Upgrade to build shareable card displays and send public collection links to customers."
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_12%_6%,rgba(255,213,79,.34),transparent_28%),radial-gradient(circle_at_92%_2%,rgba(59,130,246,.18),transparent_24%),linear-gradient(180deg,#fffdf4_0%,#f4fbff_48%,#fff9ea_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Trial banner */}
        <div className="mb-6">
          <TrialBanner />
        </div>

        {/* Header */}
        <div className="mb-8 rounded-2xl border border-yellow-200/70 bg-white/72 p-5 shadow-sm backdrop-blur">
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-blue-500 bg-white shadow-sm">
              <Share2 className="h-6 w-6 text-blue-700" />
            </span>
            Showcase Binders
          </h1>

          <p className="mt-2 text-slate-600">
            Build a public, shareable binder of any cards — any value, any set —
            and send the link to customers.
          </p>
        </div>

        {/* Showcase picker + create */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {showcases.length > 0 && (
              <Select value={activeId ?? ""} onValueChange={setActiveId}>
                <SelectTrigger className="w-full sm:w-[260px]">
                  <SelectValue placeholder="Select a showcase" />
                </SelectTrigger>

                <SelectContent>
                  {showcases.map((showcase) => (
                    <SelectItem key={showcase.id} value={showcase.id}>
                      {showcase.name} ({showcase.items.length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="New showcase name…"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              className="w-full bg-white sm:w-[220px]"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  handleCreate()
                }
              }}
            />

            <Button onClick={handleCreate} disabled={creating}>
              <Plus className="mr-2 h-4 w-4" />

              {creating ? "Creating…" : "New Showcase"}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground">
            Loading showcases…
          </div>
        ) : !active ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Sparkles className="h-10 w-10 text-yellow-500" />

              <h3 className="text-lg font-medium">No showcase yet</h3>

              <p className="max-w-md text-sm text-muted-foreground">
                Create your first Showcase binder above, then add up to{" "}
                {SHOWCASE_CARD_LIMIT} cards and share the public link.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Share + stats */}
            <Card className="mb-6 border-blue-100/80 bg-white/88 shadow-sm backdrop-blur">
              <CardHeader className="border-b border-yellow-100 bg-[linear-gradient(90deg,rgba(255,236,153,.55),rgba(219,234,254,.48),rgba(220,252,231,.38))]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {active.name}

                      <Badge
                        variant={atLimit ? "destructive" : "secondary"}
                        className="font-mono"
                      >
                        {count}/{SHOWCASE_CARD_LIMIT}
                      </Badge>
                    </CardTitle>

                    <CardDescription>
                      Public, read-only — anyone with the link can view it.
                    </CardDescription>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={handleDeleteShowcase}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-6">
                {/* Share URL */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex-1 truncate rounded-md border border-blue-100 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-700">
                    {shareUrl}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleCopyLink} variant="outline">
                      {copied ? (
                        <Check className="mr-2 h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="mr-2 h-4 w-4" />
                      )}

                      {copied ? "Copied" : "Copy link"}
                    </Button>

                    <Button asChild variant="secondary">
                      <a href={shareUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Card picker */}
                <ShowcaseCardPicker
                  existingIds={existingIds}
                  onAdd={handleAddCard}
                  busy={busy}
                  disabled={atLimit}
                  addingId={addingId}
                />

                {atLimit && (
                  <p className="text-sm text-amber-600">
                    This showcase has reached the {SHOWCASE_CARD_LIMIT}
                    -card limit.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Binder view */}
            <Card className="border-blue-100/80 bg-white/88 shadow-xl shadow-blue-100/40 backdrop-blur">
              <CardContent className="pt-6">
                <ShowcaseBinderView
                  title={active.name}
                  items={active.items}
                  onRemove={handleRemoveCard}
                  removingId={removingId}
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
