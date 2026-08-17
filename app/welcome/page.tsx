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
  Crown,
  BadgeDollarSign,
  ScanLine,
  Users,
  Upload,
} from "lucide-react"

import { Button } from "@/components/ui/button"

import {
  BASIC_MONTHLY_PRICE_USD,
  PREMIUM_MONTHLY_PRICE_USD,
  TRIAL_DAYS,
} from "@/lib/entitlements"

const ADMIN_EMAIL = "admin@evileevee.com"

export default function WelcomePage() {
  const features = [
    {
      icon: Search,
      title: "Find any single, fast",
      body: "Search English and Japanese cards by name and number with live TCGPlayer pricing.",
    },
    {
      icon: BookOpen,
      title: "Organize your collection",
      body: "Track inventory in binders by set, rarity, condition, finish, and language.",
    },
    {
      icon: Camera,
      title: "Add cards from any device",
      body: "Manage your collection from desktop, tablet, or phone with photos and card details.",
    },
    {
      icon: Tag,
      title: "Price cards quickly",
      body: "Pull TCGPlayer market pricing while adding cards individually or in bulk.",
    },
    {
      icon: BarChart3,
      title: "Understand your collection",
      body: "Premium analytics help you track collection value, trends, sales, and performance.",
    },
    {
      icon: ShieldCheck,
      title: "One clean inventory",
      body: "Keep condition, finish, quantity, pricing, and sales records together in one place.",
    },
  ]

  const basicFeatures = [
    "Browse English & Japanese sets",
    "Inventory management",
    "Add cards individually",
    "Bulk add cards from sets",
    "TCGPlayer market pricing",
    "Binder organization",
  ]

  const premiumFeatures = [
    "Everything in Basic",
    "Full collection analytics",
    "Public Showcase",
    "Customer Lists",
    "Collection import",
    "Card scanning",
    "Advanced seller tools",
  ]

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package className="h-5 w-5" />
          </div>

          <span className="text-lg font-semibold tracking-tight">
            Card Vault
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link href="/login">
              <LogIn className="mr-2 h-4 w-4" />
              Sign in
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
            <Sparkles className="h-3.5 w-3.5" />
            {TRIAL_DAYS}-day Premium trial · No card required
          </span>

          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
            Manage your Pokémon collection without the spreadsheet chaos.
          </h1>

          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Card Vault helps collectors and sellers browse sets, bulk-add cards,
            pull TCGPlayer market pricing, organize binders, and track a growing
            collection from desktop, tablet, or phone.
          </p>

          <p className="mt-4 max-w-xl text-base text-muted-foreground">
            Start with full Premium access free for {TRIAL_DAYS} days. After
            that, keep the essentials with Basic for just{" "}
            <span className="font-semibold text-foreground">
              ${BASIC_MONTHLY_PRICE_USD.toFixed(2)}/month
            </span>{" "}
            or unlock everything with Premium for{" "}
            <span className="font-semibold text-foreground">
              ${PREMIUM_MONTHLY_PRICE_USD.toFixed(2)}/month
            </span>
            .
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/login?mode=signup">
                Start {TRIAL_DAYS}-day Premium trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <Button asChild size="lg" variant="outline">
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Sign in
              </Link>
            </Button>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required for the trial. Questions? Email{" "}
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
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border bg-card p-6 shadow-sm"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <feature.icon className="h-5 w-5" />
              </div>

              <h3 className="font-semibold">{feature.title}</h3>

              <p className="mt-1 text-sm text-muted-foreground">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Trial CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-10 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Crown className="h-6 w-6" />
          </div>

          <h2 className="text-2xl font-semibold">
            Try every Premium feature first
          </h2>

          <p className="max-w-xl text-muted-foreground">
            New accounts get {TRIAL_DAYS} days of full Premium access, including
            analytics, Showcase, Customer Lists, import, scanning, and advanced
            tools.
          </p>

          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/login?mode=signup">
                <Sparkles className="mr-2 h-4 w-4" />
                Start free trial
              </Link>
            </Button>

            <Button asChild variant="outline">
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Sign in
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <BadgeDollarSign className="h-3.5 w-3.5" />
            Early-access pricing
          </span>

          <h2 className="mt-4 text-3xl font-bold tracking-tight">
            Simple pricing for collectors and sellers
          </h2>

          <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
            Start with a {TRIAL_DAYS}-day Premium trial, then choose the plan
            that fits how you use Card Vault.
          </p>
        </div>

        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {/* Basic */}
          <div className="rounded-3xl border bg-card p-8 shadow-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />

              <h3 className="text-2xl font-semibold">Basic</h3>
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              Core collection management at an ultra-low monthly price.
            </p>

            <div className="mt-5 flex items-end gap-1">
              <span className="text-5xl font-bold tracking-tight">
                ${BASIC_MONTHLY_PRICE_USD.toFixed(2)}
              </span>

              <span className="mb-2 text-muted-foreground">/month</span>
            </div>

            <ul className="mt-6 space-y-3 text-sm">
              {basicFeatures.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <Button asChild size="lg" variant="outline" className="mt-8 w-full">
              <Link href="/login?mode=signup">Start with Premium trial</Link>
            </Button>
          </div>

          {/* Premium */}
          <div className="relative rounded-3xl border-2 border-primary/50 bg-card p-8 shadow-lg">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                <Crown className="h-3.5 w-3.5" />
                Full access
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />

              <h3 className="text-2xl font-semibold">Premium</h3>
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              Everything unlocked for serious collectors and sellers.
            </p>

            <div className="mt-5 flex items-end gap-1">
              <span className="text-5xl font-bold tracking-tight">
                ${PREMIUM_MONTHLY_PRICE_USD.toFixed(2)}
              </span>

              <span className="mb-2 text-muted-foreground">/month</span>
            </div>

            <ul className="mt-6 space-y-3 text-sm">
              {premiumFeatures.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <Button asChild size="lg" className="mt-8 w-full">
              <Link href="/login?mode=signup">
                Start {TRIAL_DAYS}-day Premium trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="mx-auto mt-6 max-w-3xl rounded-xl border bg-muted/30 p-4">
          <div className="grid gap-4 text-sm sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <ScanLine className="h-4 w-4 text-primary" />
              <span>Scanning included in Premium</span>
            </div>

            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              <span>Import included in Premium</span>
            </div>

            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span>Customer Lists included in Premium</span>
            </div>
          </div>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Existing grandfathered members keep Premium access free, forever.
        </p>
      </section>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Card Vault · Pokémon card inventory management
      </footer>
    </main>
  )
}
