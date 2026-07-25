"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Loader2,
  ShieldCheck,
  UserPlus,
  Building2,
  KeyRound,
  Trash2,
  Mail,
  Crown,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { isAdminUser } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

import { AdminPaymentsPanel } from "@/components/admin/admin-payments-panel"

type AdminUser = {
  id: string
  email: string | null
  storeName: string | null
  companyId: string | null
  isAdmin: boolean
  confirmed: boolean
  createdAt: string
  lastSignInAt: string | null
}

type Company = { id: string; name: string; created_at: string }

const NO_COMPANY = "none"

export default function AdminPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [allowed, setAllowed] = useState(false)

  // Gate the page to the admin account on the client. The APIs are the real
  // security boundary, but this avoids flashing the UI to non-admins.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login?redirect=/admin")
        return
      }
      if (!isAdminUser(data.user)) {
        toast.error("Admin access required")
        router.replace("/")
        return
      }
      setAllowed(true)
      setReady(true)
    })
  }, [router])

  if (!ready || !allowed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Checking access…
      </div>
    )
  }

  return <AdminPortal />
}

function AdminPortal() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [u, c] = await Promise.all([
        fetch("/api/admin/users").then((r) => r.json()),
        fetch("/api/admin/companies").then((r) => r.json()),
      ])
      if (u.error) throw new Error(u.error)
      if (c.error) throw new Error(c.error)
      setUsers(u.users ?? [])
      setCompanies(c.companies ?? [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load admin data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const companyName = (id: string | null) =>
    companies.find((c) => c.id === id)?.name ?? null

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Portal</h1>
          <p className="text-sm text-muted-foreground">
            Manage users, companies, and passwords for Card Vault.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CreateUserCard companies={companies} onCreated={load} />
        <CreateCompanyCard companies={companies} onCreated={load} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5" /> Users ({users.length})
          </CardTitle>
          <CardDescription>
            Every account that can sign in. Reset passwords or remove accounts here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading users…
            </div>
          ) : users.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No users yet.
            </p>
          ) : (
            <div className="divide-y">
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  companyName={companyName(user.companyId)}
                  onChanged={load}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <AdminPaymentsPanel />
      </div>
    </div>
  )
}

function CreateUserCard({
  companies,
  onCreated,
}: {
  companies: Company[]
  onCreated: () => void
}) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [storeName, setStoreName] = useState("")
  const [companyId, setCompanyId] = useState<string>(NO_COMPANY)
  const [isAdmin, setIsAdmin] = useState(false)
  const [saving, setSaving] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          storeName,
          companyId: companyId === NO_COMPANY ? "" : companyId,
          isAdmin,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create user")
      toast.success(`Created ${email}`)
      setEmail("")
      setPassword("")
      setStoreName("")
      setCompanyId(NO_COMPANY)
      setIsAdmin(false)
      onCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create user")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserPlus className="h-5 w-5" /> Create user
        </CardTitle>
        <CardDescription>Add a new account that can sign in immediately.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-email">Email</Label>
            <Input
              id="new-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-password">Temporary password</Label>
            <Input
              id="new-password"
              type="text"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-store">Store name (optional)</Label>
            <Input
              id="new-store"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Company (optional)</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="No company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_COMPANY}>No company</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2 text-sm">
              <Crown className="h-4 w-4 text-amber-500" /> Make this user an admin
            </div>
            <Switch checked={isAdmin} onCheckedChange={setIsAdmin} />
          </div>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Create user
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function CreateCompanyCard({
  companies,
  onCreated,
}: {
  companies: Company[]
  onCreated: () => void
}) {
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create company")
      toast.success(`Created ${name}`)
      setName("")
      onCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create company")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5" /> Companies ({companies.length})
        </CardTitle>
        <CardDescription>Create companies to group store accounts.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="company-name">Company name</Label>
            <Input
              id="company-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Evil Eevee"
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Add
          </Button>
        </form>

        {companies.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {companies.map((c) => (
              <Badge key={c.id} variant="secondary">
                {c.name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function UserRow({
  user,
  companyName,
  onChanged,
}: {
  user: AdminUser
  companyName: string | null
  onChanged: () => void
}) {
  const [pwOpen, setPwOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [working, setWorking] = useState(false)

  async function setPassword() {
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    setWorking(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update password")
      toast.success("Password updated")
      setNewPassword("")
      setPwOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password")
    } finally {
      setWorking(false)
    }
  }

  async function remove() {
    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) return
    setWorking(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete user")
      toast.success("User deleted")
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user")
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">{user.email}</span>
          {user.isAdmin && (
            <Badge className="bg-amber-500 text-white hover:bg-amber-500">
              <Crown className="mr-1 h-3 w-3" /> Admin
            </Badge>
          )}
          {!user.confirmed && <Badge variant="outline">Unconfirmed</Badge>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {user.storeName ? `${user.storeName} · ` : ""}
          {companyName ? `${companyName} · ` : ""}
          {user.lastSignInAt
            ? `Last sign-in ${new Date(user.lastSignInAt).toLocaleDateString()}`
            : "Never signed in"}
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPwOpen(true)}
          disabled={working}
        >
          <KeyRound className="h-4 w-4" /> Password
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={remove}
          disabled={working}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set a new password</DialogTitle>
            <DialogDescription>
              Set a new password for {user.email}. Share it with them securely.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`pw-${user.id}`}>New password</Label>
            <Input
              id={`pw-${user.id}`}
              type="text"
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)}>
              Cancel
            </Button>
            <Button onClick={setPassword} disabled={working}>
              {working && <Loader2 className="h-4 w-4 animate-spin" />}
              Save password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
