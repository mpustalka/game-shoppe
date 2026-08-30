"use client"

import Link from "next/link"
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  Layers3,
  ShoppingBag,
  ScanLine,
  Sparkles,
  Tags,
  TrendingUp,
  WalletCards,
  Zap,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type ShowcaseCard = {
  name: string
  set: string
  finish: string
  price: string
  image: string
}

type ShowcaseSet = {
  name: string
  meta: string
  image: string
  href: string
}

const cards: ShowcaseCard[] = [
  { name: "Umbreon VMAX", set: "Evolving Skies", finish: "Secret Rare", price: "$1,249.99", image: "https://images.pokemontcg.io/swsh7/215_hires.png" },
  { name: "Charizard ex", set: "151", finish: "Special Illustration Rare", price: "$179.42", image: "https://images.pokemontcg.io/sv3pt5/199_hires.png" },
  { name: "Pikachu ex", set: "Surging Sparks", finish: "Special Illustration Rare", price: "$238.16", image: "https://images.pokemontcg.io/sv8/238_hires.png" },
  { name: "Gardevoir ex", set: "Paldean Fates", finish: "Special Illustration Rare", price: "$54.22", image: "https://images.pokemontcg.io/sv4pt5/233_hires.png" },
  { name: "Mew ex", set: "Paldean Fates", finish: "Special Illustration Rare", price: "$112.80", image: "https://images.pokemontcg.io/sv4pt5/232_hires.png" },
  { name: "Greninja ex", set: "Twilight Masquerade", finish: "Special Illustration Rare", price: "$289.34", image: "https://images.pokemontcg.io/sv6/214_hires.png" },
  { name: "Magikarp", set: "Paldea Evolved", finish: "Illustration Rare", price: "$215.07", image: "https://images.pokemontcg.io/sv2/203_hires.png" },
  { name: "Eevee", set: "Twilight Masquerade", finish: "Illustration Rare", price: "$89.71", image: "https://images.pokemontcg.io/sv6/188_hires.png" },
  { name: "Lugia V", set: "Silver Tempest", finish: "Alternate Full Art", price: "$236.44", image: "https://images.pokemontcg.io/swsh12/186_hires.png" },
  { name: "Giratina V", set: "Lost Origin", finish: "Alternate Full Art", price: "$478.19", image: "https://images.pokemontcg.io/swsh11/186_hires.png" },
]

const englishSets: ShowcaseSet[] = [
  { name: "Prismatic Evolutions", meta: "English · Scarlet & Violet", image: "https://images.pokemontcg.io/sv8pt5/logo.png", href: "/sets" },
  { name: "Destined Rivals", meta: "English · Scarlet & Violet", image: "https://images.pokemontcg.io/sv10/logo.png", href: "/sets" },
  { name: "Journey Together", meta: "English · Scarlet & Violet", image: "https://images.pokemontcg.io/sv9/logo.png", href: "/sets" },
  { name: "Surging Sparks", meta: "English · Scarlet & Violet", image: "https://images.pokemontcg.io/sv8/logo.png", href: "/sets" },
  { name: "Twilight Masquerade", meta: "English · Scarlet & Violet", image: "https://images.pokemontcg.io/sv6/logo.png", href: "/sets" },
  { name: "Temporal Forces", meta: "English · Scarlet & Violet", image: "https://images.pokemontcg.io/sv5/logo.png", href: "/sets" },
]

const japaneseSets: ShowcaseSet[] = [
  { name: "Japanese Collection", meta: "Japanese sets · newest first", image: "https://images.pokemontcg.io/sv8pt5/logo.png", href: "/japanese-sets" },
  { name: "Premium Japanese Sets", meta: "Japanese releases", image: "https://images.pokemontcg.io/sv7/logo.png", href: "/japanese-sets" },
  { name: "Special Expansions", meta: "Japanese releases", image: "https://images.pokemontcg.io/sv4pt5/logo.png", href: "/japanese-sets" },
  { name: "Modern Japanese Sets", meta: "Japanese releases", image: "https://images.pokemontcg.io/sv6/logo.png", href: "/japanese-sets" },
  { name: "Collector Favorites", meta: "Japanese releases", image: "https://images.pokemontcg.io/sv3pt5/logo.png", href: "/japanese-sets" },
  { name: "Browse Every Set", meta: "Japanese releases", image: "https://images.pokemontcg.io/sv9/logo.png", href: "/japanese-sets" },
]

const features = [
  { icon: WalletCards, title: "Smart collection tracking", body: "Know exactly what you own by card, finish, language, condition, quantity, set, and binder." },
  { icon: TrendingUp, title: "Market-aware pricing", body: "Keep collection values close to the market and spot the cards driving your portfolio." },
  { icon: Boxes, title: "Real binder organization", body: "Budget, Mid, Premium, custom inventory workflows, and set completion live in one system." },
  { icon: ShoppingBag, title: "0% marketplace selling fees", body: "List cards for sale, trade, or both. Collectors arrange payment and shipping peer-to-peer." },
  { icon: BarChart3, title: "Collection analytics", body: "Track value, sold cards, movers, search demand, inventory age, and collection performance." },
  { icon: Layers3, title: "English + Japanese sets", body: "Browse modern English releases and Japanese expansions without splitting your collection across apps." },
  { icon: ScanLine, title: "Smart Scanner · Premium Beta", body: "Use your phone camera to recognize supported English Pokémon cards, confirm the exact match, and add them straight to inventory." },
]

function InfiniteCardRow({ reverse = false }: { reverse?: boolean }) {
  const row = reverse ? [...cards].reverse() : cards
  return (
    <div className="rocket-marquee-mask overflow-hidden">
      <div className={reverse ? "rocket-marquee rocket-marquee-reverse" : "rocket-marquee"}>
        {[...row, ...row].map((card, index) => (
          <div key={`${card.name}-${index}`} className="group w-[150px] shrink-0 sm:w-[175px] lg:w-[195px]">
            <div className="relative transition duration-300 group-hover:-translate-y-2 group-hover:scale-[1.025]">
              <img src={card.image} alt={card.name} loading="lazy" className="aspect-[2.5/3.5] w-full object-contain drop-shadow-[0_20px_28px_rgba(0,0,0,.28)]" />
            </div>
            <div className="mt-3 px-1">
              <p className="truncate text-sm font-bold text-white">{card.name}</p>
              <p className="truncate text-xs text-white/50">{card.set}</p>
              <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate text-white/40">{card.finish}</span>
                <span className="font-semibold text-rose-300">{card.price}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SetRow({ sets, reverse = false }: { sets: ShowcaseSet[]; reverse?: boolean }) {
  const row = reverse ? [...sets].reverse() : sets
  return (
    <div className="rocket-marquee-mask overflow-hidden">
      <div className={reverse ? "rocket-set-marquee rocket-marquee-reverse" : "rocket-set-marquee"}>
        {[...row, ...row].map((set, index) => (
          <Link key={`${set.name}-${index}`} href={set.href} className="group w-[260px] shrink-0 sm:w-[300px]">
            <div className="flex h-[140px] items-center justify-center overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(225,29,72,.22),transparent_44%),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.025))] p-8 shadow-2xl shadow-black/20 transition duration-300 group-hover:-translate-y-1 group-hover:border-rose-400/40">
              <img src={set.image} alt={set.name} loading="lazy" className="max-h-20 max-w-[85%] object-contain drop-shadow-xl transition duration-300 group-hover:scale-105" />
            </div>
            <div className="mt-3 px-2">
              <p className="font-semibold text-white">{set.name}</p>
              <p className="text-xs text-white/45">{set.meta}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <main className="overflow-x-hidden bg-[#070708] text-white">
      <style jsx global>{`
        @keyframes rocket-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .rocket-marquee { display:flex; width:max-content; gap:18px; animation:rocket-marquee 52s linear infinite; will-change:transform; }
        .rocket-set-marquee { display:flex; width:max-content; gap:18px; animation:rocket-marquee 62s linear infinite; will-change:transform; }
        .rocket-marquee-reverse { animation-direction:reverse; }
        .rocket-marquee:hover, .rocket-set-marquee:hover { animation-play-state:paused; }
        .rocket-marquee-mask { mask-image:linear-gradient(to right,transparent,black 7%,black 93%,transparent); -webkit-mask-image:linear-gradient(to right,transparent,black 7%,black 93%,transparent); }
        @media (prefers-reduced-motion: reduce) { .rocket-marquee, .rocket-set-marquee { animation-play-state:paused; } }
      `}</style>

      <section className="relative isolate min-h-[760px] overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_15%,rgba(225,29,72,.28),transparent_32%),radial-gradient(circle_at_82%_8%,rgba(127,29,29,.25),transparent_28%),linear-gradient(to_bottom,#09090b,#070708)]" />
        <div className="absolute inset-0 -z-10 opacity-[0.09] [background-image:linear-gradient(rgba(255,255,255,.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.2)_1px,transparent_1px)] [background-size:56px_56px]" />

        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-400/30 bg-rose-500/10 shadow-lg shadow-rose-950/30"><span className="text-lg font-black tracking-[-0.12em] text-rose-400">TR</span></div>
            <div><p className="text-sm font-black uppercase tracking-[0.18em]">Team Rocket</p><p className="-mt-0.5 text-xs text-white/45">Markets</p></div>
          </Link>
          <div className="hidden items-center gap-8 text-sm text-white/60 md:flex">
            <Link className="transition hover:text-white" href="/sets">Sets</Link>
            <Link className="transition hover:text-white" href="/japanese-sets">Japanese</Link>
            <Link className="transition hover:text-white" href="/sell">Marketplace</Link>
            <Link className="transition hover:text-white" href="/analytics">Analytics</Link>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:text-white"><Link href="/login">Sign in</Link></Button>
            <Button asChild className="bg-rose-600 text-white hover:bg-rose-500"><Link href="/welcome">Get started</Link></Button>
          </div>
        </nav>

        <div className="mx-auto grid max-w-7xl gap-12 px-5 pb-24 pt-20 sm:px-8 md:pt-28 lg:grid-cols-[1.05fr_.95fr] lg:px-10">
          <div className="relative z-10">
            <Badge className="mb-6 border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-rose-200 hover:bg-rose-500/10"><Sparkles className="mr-1.5 h-3.5 w-3.5" />Now featuring Smart Scanner Beta</Badge>
            <h1 className="max-w-4xl text-5xl font-black leading-[.92] tracking-[-0.055em] sm:text-6xl md:text-7xl xl:text-[86px]">Your collection.<span className="block bg-gradient-to-r from-rose-400 via-red-500 to-orange-400 bg-clip-text text-transparent">Your market.</span></h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/58 sm:text-xl">Track every card. Know what it&apos;s worth. Organize every binder. And with Premium Smart Scanner Beta, point your phone at a supported English card, identify it, confirm the exact match, and send it straight into your inventory.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button size="lg" asChild className="h-12 rounded-xl bg-rose-600 px-6 text-white hover:bg-rose-500"><Link href="/welcome">Start your collection<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              <Button size="lg" asChild variant="outline" className="h-12 rounded-xl border-white/15 bg-white/5 px-6 text-white hover:bg-white/10 hover:text-white"><Link href="/sets">Explore sets</Link></Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/48">
              {['Premium Smart Scanner','English + Japanese collection','Variant-level tracking','0% selling fees'].map((label) => <span key={label} className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-rose-400" />{label}</span>)}
            </div>
          </div>

          <div className="relative min-h-[470px]">
            <div className="absolute left-[5%] top-12 w-[42%] -rotate-6 transition hover:z-20 hover:rotate-0 hover:scale-105"><img src="https://images.pokemontcg.io/sv4pt5/232_hires.png" alt="Mew ex card" className="w-full drop-shadow-[0_35px_55px_rgba(0,0,0,.55)]" /></div>
            <div className="absolute right-[3%] top-0 z-10 w-[46%] rotate-6 transition hover:z-20 hover:rotate-0 hover:scale-105"><img src="https://images.pokemontcg.io/sv8/238_hires.png" alt="Pikachu ex card" className="w-full drop-shadow-[0_35px_55px_rgba(0,0,0,.55)]" /></div>
            <div className="absolute bottom-0 left-[31%] z-10 w-[42%] rotate-1 transition hover:z-20 hover:rotate-0 hover:scale-105"><img src="https://images.pokemontcg.io/sv6/214_hires.png" alt="Greninja ex card" className="w-full drop-shadow-[0_35px_55px_rgba(0,0,0,.55)]" /></div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#0a0a0c] py-5">
        <div className="rocket-marquee-mask overflow-hidden"><div className="rocket-marquee !gap-10 text-xs font-bold uppercase tracking-[0.2em] text-white/35">{['Premium Smart Scanner','Live market values','Every finish','Smart binders','English sets','Japanese sets','Collection analytics','0% selling fees','Premium Smart Scanner','Live market values','Every finish','Smart binders','English sets','Japanese sets','Collection analytics','0% selling fees'].map((label,index)=><span key={`${label}-${index}`} className="flex shrink-0 items-center gap-3"><Zap className="h-3.5 w-3.5 text-rose-500" />{label}</span>)}</div></div>
      </section>

      <section className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10"><div className="max-w-3xl"><p className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-rose-400">Exact collection tracking</p><h2 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl lg:text-6xl">Every card. Every finish.<span className="block text-white/38">Every variant.</span></h2><p className="mt-5 max-w-2xl text-lg leading-8 text-white/50">Reverse Holo, Poké Ball, Master Ball, stamped promos, Full Arts and more. Track the exact version you own — not just the card number — with its own condition, language, quantity, and market value.</p></div></div>
        <div className="mt-14 space-y-12"><InfiniteCardRow /><InfiniteCardRow reverse /></div>
      </section>

      <section className="relative overflow-hidden border-y border-rose-500/20 bg-[#0b080b] py-24 sm:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_30%,rgba(225,29,72,.22),transparent_32%),radial-gradient(circle_at_78%_65%,rgba(251,146,60,.10),transparent_30%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[1fr_.9fr] lg:items-center lg:px-10">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge className="border border-rose-400/25 bg-rose-500/10 px-3 py-1 text-rose-200 hover:bg-rose-500/10">
                <ScanLine className="mr-1.5 h-3.5 w-3.5" />
                Premium Feature
              </Badge>
              <Badge className="border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-amber-100 hover:bg-amber-300/10">
                Beta Edition
              </Badge>
              <Badge className="border border-white/10 bg-white/[0.05] px-3 py-1 text-white/70 hover:bg-white/[0.05]">
                English Cards Only
              </Badge>
            </div>

            <p className="mt-7 text-sm font-black uppercase tracking-[0.22em] text-rose-400">
              Your camera becomes an inventory tool
            </p>
            <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.045em] sm:text-5xl lg:text-6xl">
              Don&apos;t type the card.
              <span className="block bg-gradient-to-r from-rose-400 via-red-400 to-orange-300 bg-clip-text text-transparent">
                Scan it.
              </span>
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/55">
              Smart Scanner turns your phone camera into a Pokémon inventory
              workflow. Photograph a supported English card, review likely
              matches, choose the exact print, set condition and finish, then
              add it directly to inventory or a binder.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ["01", "Scan", "Photograph the card"],
                ["02", "Confirm", "Choose the exact match"],
                ["03", "Add", "Inventory or binder"],
              ].map(([number, title, body]) => (
                <div key={number} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <span className="text-xs font-black text-rose-400">{number}</span>
                  <p className="mt-2 font-black text-white">{title}</p>
                  <p className="mt-1 text-xs text-white/40">{body}</p>
                </div>
              ))}
            </div>

            <div className="mt-7 rounded-2xl border border-amber-300/15 bg-amber-300/[0.055] p-4">
              <p className="text-sm font-bold text-amber-100">
                Beta coverage: Destined Rivals, Journey Together, and older
                English Pokémon TCG releases.
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-100/55">
                Recognition database updates are in progress. Newer English
                releases may not be recognized yet.
              </p>
            </div>

            <Button size="lg" asChild className="mt-8 h-12 rounded-xl bg-rose-600 px-6 text-white hover:bg-rose-500">
              <Link href="/welcome">
                Unlock Smart Scanner with Premium
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="relative mx-auto w-full max-w-[430px]">
            <div className="absolute -inset-8 rounded-full bg-rose-600/10 blur-3xl" />
            <div className="relative rounded-[36px] border border-white/15 bg-black/70 p-4 shadow-2xl shadow-rose-950/30">
              <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-zinc-950 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-300">Smart Scanner</p>
                    <p className="mt-1 text-sm font-bold text-white">Camera recognition</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/10">
                    <ScanLine className="h-5 w-5 text-rose-400" />
                  </div>
                </div>

                <div className="relative mx-auto mt-6 aspect-[63/88] w-[70%] rounded-2xl border-2 border-rose-400/70 bg-[radial-gradient(circle_at_center,rgba(225,29,72,.12),transparent_60%)] shadow-[0_0_35px_rgba(225,29,72,.16)]">
                  <div className="absolute inset-x-4 top-1/2 h-px bg-rose-400 shadow-[0_0_14px_rgba(244,63,94,.9)]" />
                  <div className="absolute left-3 top-3 h-7 w-7 border-l-2 border-t-2 border-white/80" />
                  <div className="absolute right-3 top-3 h-7 w-7 border-r-2 border-t-2 border-white/80" />
                  <div className="absolute bottom-3 left-3 h-7 w-7 border-b-2 border-l-2 border-white/80" />
                  <div className="absolute bottom-3 right-3 h-7 w-7 border-b-2 border-r-2 border-white/80" />
                </div>

                <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                  {["Card read", "Match found", "Ready to add"].map((label) => (
                    <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-3">
                      <BadgeCheck className="mx-auto h-4 w-4 text-emerald-400" />
                      <p className="mt-1 text-[10px] font-bold text-white/60">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white text-zinc-950">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 sm:px-8 sm:py-32 lg:grid-cols-[.9fr_1.1fr] lg:px-10">
          <div>
            <p className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-rose-600">Collection → marketplace</p>
            <h2 className="text-4xl font-black tracking-[-0.045em] sm:text-5xl">Your collection is already your marketplace.</h2>
            <p className="mt-6 text-lg leading-8 text-zinc-600">No rebuilding listings from scratch. Choose a card from your binders, set your price or mark it for trade, and make it available to other collectors.</p>
            <div className="mt-8 flex flex-wrap gap-2"><Badge className="bg-zinc-950 px-3 py-1.5 text-white">For Sale</Badge><Badge className="bg-zinc-950 px-3 py-1.5 text-white">For Trade</Badge><Badge className="bg-zinc-950 px-3 py-1.5 text-white">Sale or Trade</Badge></div>
            <div className="mt-10 rounded-3xl bg-zinc-950 p-6 text-white"><p className="text-4xl font-black tracking-[-0.05em] text-rose-400">0%</p><p className="mt-1 text-lg font-bold">marketplace selling fees</p><p className="mt-2 text-sm leading-6 text-white/50">Collectors arrange payment, shipping, and trades directly. Your subscription powers the platform — we don&apos;t take a cut of the card.</p></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">{features.slice(0,4).map((feature)=>{const Icon=feature.icon;return <div key={feature.title} className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100"><Icon className="h-5 w-5 text-rose-700" /></div><h3 className="mt-5 text-xl font-bold">{feature.title}</h3><p className="mt-2 text-sm leading-6 text-zinc-600">{feature.body}</p></div>})}</div>
        </div>
      </section>

      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end"><div className="max-w-3xl"><p className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-rose-400">English + Japanese</p><h2 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl lg:text-6xl">Collect across<span className="block text-white/38">every era.</span></h2><p className="mt-5 max-w-2xl text-lg leading-8 text-white/50">Browse modern English expansions and Japanese releases in one collection. Track set completion and add cards without rebuilding your inventory in another app.</p></div><div className="flex gap-2"><Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Link href="/sets">English sets<ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Link href="/japanese-sets">Japanese sets<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div></div>
        </div>
        <div className="mt-14 space-y-10"><SetRow sets={englishSets} /><SetRow sets={japaneseSets} reverse /></div>
      </section>

      <section className="border-y border-white/10 bg-[#0c0c0f] py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10"><div className="mx-auto max-w-3xl text-center"><p className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-rose-400">More than a spreadsheet</p><h2 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">Built around how collectors actually collect.</h2></div><div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{features.map((feature)=>{const Icon=feature.icon;return <div key={feature.title} className="rounded-[28px] border border-white/10 bg-white/[0.035] p-7 transition hover:-translate-y-1 hover:border-rose-500/30 hover:bg-white/[0.05]"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-500/10"><Icon className="h-5 w-5 text-rose-400" /></div><h3 className="mt-5 text-xl font-bold">{feature.title}</h3><p className="mt-2 text-sm leading-6 text-white/48">{feature.body}</p></div>})}</div></div>
      </section>

      <section className="relative overflow-hidden py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(225,29,72,.16),transparent_42%)]" />
        <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-8"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-400/30 bg-rose-500/10"><Tags className="h-6 w-6 text-rose-400" /></div><h2 className="mt-7 text-4xl font-black tracking-[-0.045em] sm:text-6xl">Your cards deserve<span className="block text-rose-400">a better command center.</span></h2><p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/50">Build your collection, organize every binder, follow market values, and connect with collectors from one place.</p><div className="mt-9 flex flex-wrap justify-center gap-3"><Button size="lg" asChild className="h-12 rounded-xl bg-rose-600 px-6 hover:bg-rose-500"><Link href="/welcome">Get started<ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button size="lg" asChild variant="outline" className="h-12 rounded-xl border-white/15 bg-white/5 px-6 text-white hover:bg-white/10 hover:text-white"><Link href="/login">Sign in</Link></Button></div></div>
      </section>

      <footer className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-white/35 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-400/20 bg-rose-500/10 text-xs font-black text-rose-400">TR</div><span>Team Rocket Markets</span></div><div className="flex flex-wrap gap-5"><Link className="hover:text-white" href="/sets">Sets</Link><Link className="hover:text-white" href="/sell">Marketplace</Link><Link className="hover:text-white" href="/login">Sign in</Link></div></div></footer>
    </main>
  )
}