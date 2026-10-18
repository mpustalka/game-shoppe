"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Boxes,
  Share2,
  Sparkles,
  Zap,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import WelcomeSlider from "@/components/hero/WelcomeSlider"

/* ============================================================
   TYPES
============================================================ */

type ShowcaseCard = {
  name: string
  set: string
  finish: string
  price: string
  image: string
}

type StoreCategory = {
  id: string
  name: string
  slug: string
  parent_id: string | null
  image_url?: string | null
  navigation_image_url?: string | null
  banner_image_url?: string | null
  active?: boolean
  sort_order?: number
}

/* ============================================================
   CHASE CARD POOL
   Different cards from the anniversary section.
============================================================ */

const showcaseCards: ShowcaseCard[] = [
  {
    name: "Umbreon VMAX",
    set: "Evolving Skies",
    finish: "Secret Rare",
    price: "$1,249.99",
    image: "https://images.pokemontcg.io/swsh7/215_hires.png",
  },
  {
    name: "Giratina V",
    set: "Lost Origin",
    finish: "Alternate Full Art",
    price: "$478.19",
    image: "https://images.pokemontcg.io/swsh11/186_hires.png",
  },
  {
    name: "Lugia V",
    set: "Silver Tempest",
    finish: "Alternate Full Art",
    price: "$236.44",
    image: "https://images.pokemontcg.io/swsh12/186_hires.png",
  },
  {
    name: "Greninja ex",
    set: "Twilight Masquerade",
    finish: "Special Illustration Rare",
    price: "$289.34",
    image: "https://images.pokemontcg.io/sv6/214_hires.png",
  },
  {
    name: "Magikarp",
    set: "Paldea Evolved",
    finish: "Illustration Rare",
    price: "$215.07",
    image: "https://images.pokemontcg.io/sv2/203_hires.png",
  },
  {
    name: "Gardevoir ex",
    set: "Paldean Fates",
    finish: "Special Illustration Rare",
    price: "$54.22",
    image: "https://images.pokemontcg.io/sv4pt5/233_hires.png",
  },
  {
    name: "Eevee",
    set: "Twilight Masquerade",
    finish: "Illustration Rare",
    price: "$89.71",
    image: "https://images.pokemontcg.io/sv6/188_hires.png",
  },
]

/* ============================================================
   RANDOM CHASE STRIP
=========================================================== */

function RandomChaseRow() {
  const [visibleCards, setVisibleCards] =
    useState<ShowcaseCard[]>(showcaseCards)

  useEffect(() => {
    const shuffle = () => {
      setVisibleCards((current) => {
        const next = [...current]

        for (let i = next.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[next[i], next[j]] = [next[j], next[i]]
        }

        return next
      })
    }

    shuffle()

    const timer = window.setInterval(shuffle, 15000)

    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="chase-mask overflow-hidden">
      <div className="chase-track">
        {[...visibleCards, ...visibleCards].map((card, index) => (
          <article
            key={`${card.name}-${index}`}
            className="group w-[135px] shrink-0 sm:w-[150px] lg:w-[165px]"
          >
            <div className="relative">
              <div className="absolute inset-x-5 bottom-2 h-10 rounded-full bg-rose-500/10 blur-2xl" />

              <img
                src={card.image}
                alt={card.name}
                loading="lazy"
                className="relative aspect-[2.5/3.5] w-full object-contain drop-shadow-[0_18px_25px_rgba(0,0,0,.55)] transition duration-300 group-hover:-translate-y-2 group-hover:scale-[1.025]"
              />
            </div>

            <div className="mt-2.5 px-1">
              <p className="truncate text-xs font-bold text-white">
                {card.name}
              </p>

              <p className="mt-0.5 truncate text-[10px] text-white/40">
                {card.set}
              </p>

              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="truncate text-[9px] text-white/30">
                  {card.finish}
                </span>

                <span className="shrink-0 text-[10px] font-bold text-rose-300">
                  {card.price}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

/* ============================================================
   PAGE
============================================================ */

export default function WelcomePage() {
  const [storeCategories, setStoreCategories] = useState<StoreCategory[]>([])

  useEffect(() => {
    let cancelled = false

    async function loadStoreCategories() {
      try {
        const response = await fetch("/api/store/categories", {
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error("Unable to load store categories")
        }

        const data = await response.json()

        const rows = Array.isArray(data)
          ? data
          : Array.isArray(data?.categories)
            ? data.categories
            : []

        const activeCategories = rows
          .filter(
            (category: StoreCategory) =>
              category.active !== false && category.parent_id === null,
          )
          .sort(
            (a: StoreCategory, b: StoreCategory) =>
              Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
          )
          .slice(0, 7)

        if (!cancelled) {
          setStoreCategories(activeCategories)
        }
      } catch (error) {
        console.error("Unable to load welcome store categories:", error)
      }
    }

    void loadStoreCategories()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="overflow-x-hidden bg-[#070708] text-white">
      <style jsx global>{`
        @keyframes feature-marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        @keyframes chase-marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        @keyframes float-left {
          0%,
          100% {
            transform: translateY(0) rotate(-6deg);
          }
          50% {
            transform: translateY(-10px) rotate(-4deg);
          }
        }

        @keyframes float-center {
          0%,
          100% {
            transform: translateY(0) rotate(2deg);
          }
          50% {
            transform: translateY(-13px) rotate(1deg);
          }
        }

        @keyframes float-right {
          0%,
          100% {
            transform: translateY(0) rotate(6deg);
          }
          50% {
            transform: translateY(-8px) rotate(4deg);
          }
        }

        .feature-track {
          display: flex;
          width: max-content;
          animation: feature-marquee 42s linear infinite;
        }

        .chase-track {
          display: flex;
          width: max-content;
          gap: 20px;
          animation: chase-marquee 56s linear infinite;
          will-change: transform;
        }

        .chase-track:hover {
          animation-play-state: paused;
        }

        .feature-mask,
        .chase-mask {
          mask-image: linear-gradient(
            to right,
            transparent,
            black 5%,
            black 95%,
            transparent
          );

          -webkit-mask-image: linear-gradient(
            to right,
            transparent,
            black 5%,
            black 95%,
            transparent
          );
        }

        .anniversary-left {
          animation: float-left 7s ease-in-out infinite;
        }

        .anniversary-center {
          animation: float-center 6.4s ease-in-out infinite;
        }

        .anniversary-right {
          animation: float-right 7.5s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .feature-track,
          .chase-track,
          .anniversary-left,
          .anniversary-center,
          .anniversary-right {
            animation-play-state: paused;
          }
        }
      `}</style>

      {/* NAV (keep verbiage and show business actions, remove Shop button) */}
      <section className="relative isolate min-h-[160px] overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_15%,rgba(225,29,72,.28),transparent_32%),radial-gradient(circle_at_82%_8%,rgba(127,29,29,.25),transparent_28%),linear-gradient(to_bottom,#09090b,#070708)]" />

        <div className="absolute inset-0 -z-10 opacity-[0.09] [background-image:linear-gradient(rgba(255,255,255,.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.2)_1px,transparent_1px)] [background-size:56px_56px]" />

        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
          <Link href="/welcome" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-400/30 bg-rose-500/10">
              <span className="text-lg font-black text-rose-400">TR</span>
            </div>

            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em]">Team Rocket</p>
              <p className="-mt-0.5 text-xs text-white/45">Markets</p>
            </div>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-semibold text-white/60 lg:flex">
            <Link href="/store" className="transition hover:text-white">Store</Link>
            <Link href="/store?collection=new" className="transition hover:text-white">New Arrivals</Link>
            <Link href="/store?collection=preorder" className="transition hover:text-white">Preorders</Link>
            <Link href="/store?collection=sale" className="transition hover:text-white">Sale</Link>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden text-white hover:bg-white/10 hover:text-white sm:inline-flex">
              <Link href="/login">Sign In</Link>
            </Button>

            <Button asChild className="hidden bg-rose-600 text-white hover:bg-rose-500 sm:inline-flex">
              <Link href="/login?mode=signup">Sign Up Free</Link>
            </Button>

            {/* Business actions in the top nav (replace Shop) */}
            <Button asChild className="border border-amber-300/30 bg-gradient-to-r from-amber-400 to-yellow-400 font-black text-zinc-950 shadow-lg shadow-amber-500/10 hover:from-amber-300 hover:to-yellow-300">
              <Link href="/business/signup">Business Signup</Link>
            </Button>

            <Button asChild variant="outline" className="ml-2 hidden sm:inline-flex h-10 rounded-xl border-white/15 bg-white/5 px-4 text-sm text-white">
              <Link href="/login?redirect=/business">Business Sign in</Link>
            </Button>
          </div>
        </nav>
      </section>

      {/* HERO SLIDER (replaces previous hero grid) */}
      <WelcomeSlider />

      {/* ============================================================
          SMALL FEATURE TICKER
      ============================================================ */}

      <section className="border-b border-white/10 bg-[#0a0a0c] py-3.5">
        <div className="feature-mask overflow-hidden">
          <div className="feature-track gap-10 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35 sm:text-xs">
            {["Premium Smart Scanner","Live Market Values","Every Finish","Smart Binders","English Sets","Japanese Sets","Collection Analytics","0% Selling Fees","Premium Smart Scanner","Live Market Values","Every Finish","Smart Binders","English Sets","Japanese Sets","Collection Analytics","0% Selling Fees"].map((label, index) => (
              <span key={`${label}-${index}`} className="flex shrink-0 items-center gap-3">
                <Zap className="h-3.5 w-3.5 text-rose-500" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* REST OF PAGE (simplified, shop, tracking, etc.) - kept intact */}

      <section id="simplified" className="relative isolate overflow-hidden bg-[#f8fbff] text-[#0b1220]">
        <div className="absolute inset-0 -z-30 bg-[#f8fbff]" />
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_0%_45%,rgba(59,130,246,.13),transparent_30%),radial-gradient(circle_at_100%_40%,rgba(244,63,94,.10),transparent_32%),radial-gradient(circle_at_55%_100%,rgba(250,204,21,.09),transparent_28%)]" />

        <div className="relative mx-auto grid min-h-[720px] max-w-[1500px] items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[.68fr_1.32fr] lg:px-10 lg:py-24">
          <div className="relative z-30 max-w-[500px]">
            <Badge className="mb-6 border border-blue-200 bg-white/90 px-3 py-1.5 text-blue-700 shadow-sm hover:bg-white">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Everything in one place
            </Badge>

            <h2 className="text-5xl font-black leading-[0.88] tracking-[-0.055em] sm:text-6xl lg:text-[64px]">
              Your Collection.

              <span className="block bg-gradient-to-r from-blue-600 via-indigo-500 to-rose-500 bg-clip-text text-transparent">Simplified.</span>
            </h2>

            <p className="mt-7 max-w-md text-base leading-7 text-slate-600 sm:text-lg">Card Vault helps collectors, shops, and traders manage their Pokémon cards with powerful tools, beautiful visuals, and a growing community.</p>

            <div className="mt-7 space-y-2.5"> 
              <div className="flex max-w-md items-center gap-4 rounded-xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                  <Boxes className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-bold text-slate-950">Track Inventory</p>
                  <p className="mt-0.5 text-sm text-slate-500">Keep every card, finish, and condition organized.</p>
                </div>
              </div>

              <div className="flex max-w-md items-center gap-4 rounded-xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                  <BookOpen className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-bold text-slate-950">Build Binders</p>
                  <p className="mt-0.5 text-sm text-slate-500">Create custom binders and showcase your collection.</p>
                </div>
              </div>

              <div className="flex max-w-md items-center gap-4 rounded-xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                  <BarChart3 className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-bold text-slate-950">Analyze Value</p>
                  <p className="mt-0.5 text-sm text-slate-500">Track trends and portfolio value in real time.</p>
                </div>
              </div>

              <div className="flex max-w-md items-center gap-4 rounded-xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                  <Share2 className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-bold text-slate-950">Share &amp; Trade</p>
                  <p className="mt-0.5 text-sm text-slate-500">Connect with collectors around the world.</p>
                </div>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-6">
              <Button size="lg" asChild className="h-14 rounded-xl bg-[#07101f] px-7 font-bold text-white shadow-xl hover:bg-[#111b2c]">
                <Link href="/login?mode=signup">Create Your Account <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>

              <a href="#tracking" className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-500">Learn More <ArrowRight className="h-4 w-4" /></a>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-medium text-slate-500">
              {["English + Japanese Sets","Real Market Data","Collector Community"].map((item) => (
                <span key={item} className="flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-blue-600" />{item}</span>
              ))}
            </div>
          </div>

          <div className="relative z-20 mx-auto w-full max-w-[930px] pb-20 pt-10 lg:pb-12 lg:pt-0">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[75%] w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400/15 blur-[100px]" />

            <div className="relative z-10 mx-auto w-full">
              <div className="relative mx-auto w-[96%] rounded-t-[25px] border-[9px] border-[#15181d] bg-[#15181d] shadow-[0_35px_70px_rgba(15,23,42,.30)]">
                <div className="absolute left-1/2 top-[3px] z-30 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-zinc-600" />
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-[15px] bg-[#09090b]">
                  <img src="/card-vault-dashboard-desktop.png" alt="Card Vault desktop dashboard" className="absolute inset-0 h-full w-full object-cover object-top" />
                </div>
              </div>

              <div className="relative z-20 mx-auto h-[10px] w-[98%] bg-gradient-to-b from-zinc-300 to-zinc-400"><div className="absolute left-1/2 top-0 h-[6px] w-[17%] -translate-x-1/2 rounded-b-lg bg-zinc-500/50" /></div>
              <div className="relative z-20 mx-auto h-[17px] w-full rounded-b-[50%] bg-gradient-to-b from-zinc-100 via-zinc-300 to-zinc-400 shadow-[0_18px_25px_rgba(15,23,42,.18)]" />
            </div>

            <div className="absolute -bottom-4 right-[1%] z-40 w-[24%] min-w-[145px] max-w-[210px] sm:right-[2%] lg:-bottom-5 lg:-right-[2%]">
              <div className="relative overflow-hidden rounded-[34px] border-[7px] border-[#101217] bg-[#101217] shadow-[0_35px_65px_rgba(15,23,42,.42)]">
                <div className="absolute left-1/2 top-[8px] z-30 h-[16px] w-[34%] -translate-x-1/2 rounded-full bg-black" />
                <div className="relative aspect-[9/19.5] w-full overflow-hidden rounded-[25px] bg-black"><img src="/card-vault-dashboard-mobile.png" alt="Card Vault mobile dashboard" className="absolute inset-0 h-full w-full object-cover object-top" /></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="shop" className="relative isolate overflow-hidden border-y border-white/10 bg-[#08090b]">
        <div className="absolute inset-0 -z-30 bg-[radial-gradient(circle_at_12%_30%,rgba(250,204,21,.10),transparent_30%),radial-gradient(circle_at_88%_70%,rgba(225,29,72,.10),transparent_32%),linear-gradient(to_bottom,#08090b,#050506)]" />
        <div className="absolute inset-0 -z-20 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.16)_1px,transparent_1px)] [background-size:52px_52px]" />

        <div className="py-10 sm:py-12 lg:py-14">
          <div className="mx-auto max-w-4xl px-5 text-center sm:px-8 lg:px-10">
            <h2 className="text-3xl font-black leading-tight tracking-[-0.04em] sm:text-4xl lg:text-5xl">We're a <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 bg-clip-text text-transparent">store too.</span></h2>
            <p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-white/55 sm:text-base">Shop Pokémon TCG releases, sealed products, collectibles, exclusive nursing scrubs, apparel and more.</p>
```}],