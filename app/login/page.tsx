"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Package, Loader2, Sparkles, Check, Crown } from "lucide-react"

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

import {
  BASIC_MONTHLY_PRICE_USD,
  PREMIUM_MONTHLY_PRICE_USD,
  TRIAL_DAYS,
} from "@/lib/entitlements"

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

  // Allow direct links such as:
  // /login?mode=signup
  const initialMode =
    searchParams.get("mode") === "signup" ? "signup" : "signin"

  const [mode, setMode] = useState<"signin" | "signup">(initialMode)

  const [email, setEmail] = useState("")

  const [password, setPassword] = useState("")

  const [storeName, setStoreName] = useState("")

  const [loading, setLoading] = useState(false)

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault()

    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success("Signed in")

      router.push(redirectTo)
      router.refresh()
    } catch (error) {
      console.error("Sign-in failed:", error)

      toast.error("Unable to sign in. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUp(event: React.FormEvent) {
    event.preventDefault()

    setLoading(true)

    try {
      const supabase = createClient()

      const trialStartedAt = new Date().toISOString()

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

            // New users receive a
            // 7-day Premium trial.
            trial_started_at: trialStartedAt,
          },
        },
      })

      if (error) {
        toast.error(error.message)

        return
      }

      // If email confirmation is enabled,
      // Supabase creates the user but does
      // not return an active session yet.
      if (data.user && !data.session) {
        toast.success("Check your email to confirm your account.", {
          description: `Your ${TRIAL_DAYS}-day Premium trial starts with your new account.`,
        })

        setMode("signin")

        return
      }

      toast.success("Account created", {
        description: `Your ${TRIAL_DAYS}-day Premium trial has started.`,
      })

      router.push(redirectTo)

      router.refresh()
    } catch (error) {
      console.error("Sign-up failed:", error)

      toast.error("Unable to create your account. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-10">
      {/* Branding */}
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Package className="h-6 w-6" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">Card Vault</h1>

        <p className="text-sm text-muted-foreground">
          Sign in to your collection, or start a free {TRIAL_DAYS}-day Premium
          trial.
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
            {/* SIGN IN */}
            <TabsContent value="signin" className="mt-0">
              <CardTitle className="mb-1 text-lg">Welcome back</CardTitle>

              <CardDescription className="mb-4">
                Enter your credentials to access your inventory and collection.
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
                    onChange={(event) => setEmail(event.target.value)}
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
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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

            {/* SIGN UP */}
            <TabsContent value="signup" className="mt-0">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Crown className="h-4 w-4" />
                </div>

                <div>
                  <CardTitle className="text-lg">
                    Start your Premium trial
                  </CardTitle>

                  <CardDescription>
                    Full access for {TRIAL_DAYS} days. No card required.
                  </CardDescription>
                </div>
              </div>

              {/* Trial summary */}
              <div className="mb-5 rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />

                  <p className="font-medium">{TRIAL_DAYS}-day Premium trial</p>
                </div>

                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <TrialFeature>Full inventory and bulk adding</TrialFeature>

                  <TrialFeature>TCGPlayer market pricing</TrialFeature>

                  <TrialFeature>Binders and collection tools</TrialFeature>

                  <TrialFeature>
                    Analytics, Showcase, Customer Lists, Import and Scan
                  </TrialFeature>
                </div>

                <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
                  After your trial, choose Basic for{" "}
                  <span className="font-semibold text-foreground">
                    ${BASIC_MONTHLY_PRICE_USD.toFixed(2)}
                    /mo
                  </span>{" "}
                  or Premium for{" "}
                  <span className="font-semibold text-foreground">
                    ${PREMIUM_MONTHLY_PRICE_USD.toFixed(2)}
                    /mo
                  </span>
                  .
                </div>
              </div>

              <form onSubmit={handleSignUp} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="signup-store">Store or collection name</Label>

                  <Input
                    id="signup-store"
                    type="text"
                    placeholder="Andrew's Cards"
                    value={storeName}
                    onChange={(event) => setStoreName(event.target.value)}
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
                    onChange={(event) => setEmail(event.target.value)}
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
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Start {TRIAL_DAYS}-day Premium trial
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  No credit card required.
                </p>
              </form>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link
          href="/welcome"
          className="underline underline-offset-4 hover:text-foreground"
        >
          ← Back to home
        </Link>
      </p>
    </div>
  )
}

function TrialFeature({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />

      <span>{children}</span>
    </div>
  )
}
