import Link from "next/link"
import {
  Package,
  LogIn,
  Mail,
  Search,
  BookOpen,
  BarChart3,
  ArrowRight,
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
      icon: BarChart3,
      title: "Know what's hot",
      body: "Analytics on the most searched and sold cards so you stock the right singles.",
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
        <Button asChild size="sm">
          <Link href="/login">
            <LogIn className="h-4 w-4" /> Sign in
          </Link>
        </Button>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-20">
        <div>
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Pokémon Card Singles Management
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
            Run your singles inventory like a pro.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Card Vault is the all-in-one platform for Pokémon card shops to catalog,
            price, and sell single cards. Scan a card, check the market, drop it in a
            binder, and keep a clean record of everything in stock — on tablet, desktop,
            or phone.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/login">
                Sign in <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={`mailto:${ADMIN_EMAIL}?subject=Card%20Vault%20access`}>
                <Mail className="h-4 w-4" /> Request access
              </a>
            </Button>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Need an account? Email{" "}
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
        <div className="grid gap-6 sm:grid-cols-3">
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
            Sign in to your store, or reach out to set up a new account for your shop.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/login">
                <LogIn className="h-4 w-4" /> Sign in
              </Link>
            </Button>
            <Button asChild variant="outline">
              <a href={`mailto:${ADMIN_EMAIL}?subject=Card%20Vault%20access`}>
                <Mail className="h-4 w-4" /> {ADMIN_EMAIL}
              </a>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Card Vault · Pokémon card singles management
      </footer>
    </main>
  )
}
