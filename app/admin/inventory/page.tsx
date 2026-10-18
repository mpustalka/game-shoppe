"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, Loader2, PackageCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type Company = { id: string; name: string }

export default function AdminInventoryTenantPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [companyId, setCompanyId] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const response = await fetch("/api/admin/active-tenant", { cache: "no-store" })
        const data = await response.json().catch(() => null)
        if (!response.ok) throw new Error(data?.error || "Unable to load companies.")
        if (!active) return
        setCompanies(data?.companies ?? [])
        setCompanyId(data?.activeTenantId ?? "")
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load companies.")
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [])

  async function chooseCompany() {
    setSaving(true)
    setError("")
    try {
      const response = await fetch("/api/admin/active-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "Unable to select company.")
      router.push("/inventory")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to select company.")
    } finally {
      setSaving(false)
    }
  }

  async function clearCompany() {
    setSaving(true)
    setError("")
    try {
      const response = await fetch("/api/admin/active-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: "" }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "Unable to clear company selection.")
      setCompanyId("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to clear company selection.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-[65vh] max-w-2xl items-center justify-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <CardTitle>Choose an inventory company</CardTitle>
          <CardDescription>
            Select one company to view and manage its inventory. Platform-admin inventory access
            is limited to this selected company; it does not expose every tenant at once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading companies…
            </div>
          ) : companies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No companies were found.</p>
          ) : (
            <select
              aria-label="Company for inventory"
              value={companyId}
              onChange={(event) => setCompanyId(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select a company…</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          )}

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => void chooseCompany()} disabled={loading || saving || !companyId}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
              Open company inventory
            </Button>
            <Button variant="outline" onClick={() => void clearCompany()} disabled={loading || saving || !companyId}>
              Clear selection
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
