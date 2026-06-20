"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { KeyRound, Loader2, Package, MailCheck } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toast } from "sonner"

// Dual-purpose reset page:
//   • No active session  → show "email me a reset link" form.
//   • Active session      → show "choose a new password" form. This is the
//     state a user lands in after clicking the recovery link (the auth
//     callback exchanges the code for a session, then redirects here).
export default function ResetPasswordPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)

  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session))
      setChecking(false)
    })
  }, [])

  async function requestReset(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?redirect=/reset-password`
        : undefined
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setSent(true)
  }

  async function updatePassword(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success("Password updated — you're all set.")
    router.push("/")
    router.refresh()
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Package className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Card Vault</h1>
      </div>

      <Card>
        {checking ? (
          <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </CardContent>
        ) : hasSession ? (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <KeyRound className="h-5 w-5" /> Choose a new password
              </CardTitle>
              <CardDescription>
                Enter a new password for your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={updatePassword} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Update password
                </Button>
              </form>
            </CardContent>
          </>
        ) : sent ? (
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <MailCheck className="h-10 w-10 text-primary" />
            <p className="font-medium">Check your email</p>
            <p className="text-sm text-muted-foreground">
              If an account exists for {email}, a password reset link is on its way.
            </p>
            <Button asChild variant="outline" className="mt-2">
              <Link href="/login">Back to sign in</Link>
            </Button>
          </CardContent>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <KeyRound className="h-5 w-5" /> Reset your password
              </CardTitle>
              <CardDescription>
                We&apos;ll email you a link to set a new password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={requestReset} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send reset link
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
