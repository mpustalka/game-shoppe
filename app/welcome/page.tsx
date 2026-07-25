import Link from "next/link"
import {
  Package,
  LogIn,
  Search,
  BookOpen,
  BarChart3,
  ArrowRight,
  Sparkles,
  Camera,
  Tag,
  ShieldCheck,
  Check,
} from "lucide-react"

import { Button } from "@/components/ui/button"

const ADMIN_EMAIL = "admin@evileevee.com"

// Public landing page shown before sign-in. Unauthenticated visitors are
// routed here by the middleware so the dashboard and navigation stay private.
// Short and focused: what the platform does, a way to get access, and a couple
// of images. Tailored to Pokemon card singles management.
export default function WelcomePage() {
  const features = [
    {
      icon: Search,
      title: "Find any single, fast",
      body: "Search English & Japanese cards by name and number, with live TCGplayer pricing.",
    },
    {
      icon: BookOpen,
      title: "Organize like a binder",
      body: "Track inventory in 9-pocket binders by set, rarity, condition, and finish.",
    },
    {
      icon: Camera,
      title: "Snap from your phone",
      body: "Add front, back, and detail photos of a card right from a phone or tablet.",
    },
    {
      icon: Tag,
      title: "Buy & sell with confidence",
      body: "Built-in buy list and store-credit calculator price every card in seconds.",
    },
    {
      icon: BarChart3,
      title: "Know what's hot",
      body: "Analytics on the most searched and sold cards so you stock the right singles.",
    },
    {
      icon: ShieldCheck,
      title: "One clean record",
      body: "Every condition, finish, and sale logged so your inventory always ties out.",
    },
  ]

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40">
      {/* Top bar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Card Vault</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link href="/login">
              <LogIn className="h-4 w-4" /> Sign in
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/login?mode=signup">Start free trial</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-20">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> 14-day free trial · No card required
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
            Manage your Pokémon singles like a pro.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Card Vault is the all-in-one command center for Pokémon card shops. Scan a
            single, check the live market, drop it in a 9-pocket binder, and keep one
            clean record of everything you own, buy, and sell — on tablet, desktop, or
            phone. Pricing, photos, conditions, and analytics, all in one place. Spend
            less time on spreadsheets and more time moving cards.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/login?mode=signup">
                Start 14-day free trial <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">
                <LogIn className="h-4 w-4" /> Sign in
              </Link>
            </Button>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            14 days free, then just <span className="font-semibold text-foreground">$7.99/month</span> for
            full access. Questions? Email{" "}
            <a
              href={`mailto:${ADMIN_EMAIL}`}
              className="font-medium text-foreground underline underline-offset-4"
            >
              {ADMIN_EMAIL}
            </a>
            .
          </p>
        </div>

        {/* Images */}
        <div className="relative">
          <div className="grid grid-cols-2 gap-4">
            <img
              src="/charmander-front.gif"
              alt="Charmander card"
              className="aspect-[3/4] w-full rounded-2xl border bg-card object-contain p-4 shadow-lg"
            />
            <img
              src="/houndoom-front.gif"
              alt="Houndoom card"
              className="mt-8 aspect-[3/4] w-full rounded-2xl border bg-card object-contain p-4 shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border bg-card p-6 shadow-sm"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-10 text-center shadow-sm">
          <h2 className="text-2xl font-semibold">Ready to get started?</h2>
          <p className="max-w-md text-muted-foreground">
            Start your 14-day free trial in under a minute — no credit card needed.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/login?mode=signup">
                <Sparkles className="h-4 w-4" /> Start free trial
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">
                <LogIn className="h-4 w-4" /> Sign in
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="mx-auto max-w-md">
          <div className="rounded-3xl border-2 border-primary/40 bg-card p-8 shadow-lg">
            <div className="flex items-center justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" /> 14-day free trial
              </span>
            </div>
            <h2 className="mt-5 text-center text-2xl font-semibold">All Access</h2>
            <div className="mt-3 flex items-end justify-center gap-1">
              <span className="text-5xl font-bold tracking-tight">$7.99</span>
              <span className="mb-2 text-muted-foreground">/month</span>
            </div>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Free for 14 days, then $7.99/month. Cancel anytime.
            </p>

            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Unlimited binders & inventory",
                "Live TCGplayer pricing & analytics",
                "Bulk import, add cards & photo uploads",
                "Square POS sync & sales tracking",
                "Buy list, store-credit calculator & customer lists",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <Button asChild size="lg" className="mt-8 w-full">
              <Link href="/login?mode=signup">
                Start your free trial <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Existing members keep full access free, forever.
            </p>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            During the free trial you get 1 binder, up to 50 cards, and limited
            analytics. Upgrade any time to unlock everything.
          </p>
        </div>
      </section>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Card Vault · Pokémon card singles management
      </footer>
    </main>
  )
}
