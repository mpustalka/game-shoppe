"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Package, Loader2 } from "lucide-react"

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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/"

  // Allow deep-linking straight to the sign-up tab, e.g. /login?mode=signup
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin"

  const [mode, setMode] = useState<"signin" | "signup">(initialMode)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [storeName, setStoreName] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success("Signed in")
    router.push(redirectTo)
    router.refresh()
  }

  async function handleSignUp(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(
                redirectTo,
              )}`
            : undefined,
        data: {
          store_name: storeName,
          // 14-day free trial window, recorded at sign-up. Billing is wired
          // up later — this just stamps when the trial began.
          trial_started_at: new Date().toISOString(),
        },
      },
    })

    setLoading(false)

    if (error) {
      toast.error(error.message)
      return
    }

    // When email confirmation is enabled, no session is returned yet.
    if (data.user && !data.session) {
      toast.success("Check your email to confirm your account.")
      setMode("signin")
      return
    }

    toast.success("Account created — your 14-day free trial has started.")
    router.push(redirectTo)
    router.refresh()
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Package className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Card Vault</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your store, or start a free 14-day trial.
        </p>
      </div>

      <Card>
        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as "signin" | "signup")}
        >
          <CardHeader>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent>
            <TabsContent value="signin" className="mt-0">
              <CardTitle className="mb-1 text-lg">Welcome back</CardTitle>
              <CardDescription className="mb-4">
                Enter your credentials to access your inventory.
              </CardDescription>

              <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Sign in
                </Button>

                <Link
                  href="/reset-password"
                  className="text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Forgot your password?
                </Link>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-0">
              <CardTitle className="mb-1 text-lg">Start your free trial</CardTitle>
              <CardDescription className="mb-4">
                Two weeks free, then $5/month. No card required to start.
              </CardDescription>

              <form onSubmit={handleSignUp} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="signup-store">Store name</Label>
                  <Input
                    id="signup-store"
                    type="text"
                    placeholder="Andrew's Cards"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
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
                  Create account
                </Button>
              </form>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/welcome" className="underline underline-offset-4 hover:text-foreground">
          ← Back to home
        </Link>
      </p>
    </div>
  )
}
