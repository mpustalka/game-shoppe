"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"

/**
 * Slider that preserves the original individual hero markup + images
 * exactly, and adds a second 'business' slide. Tabs + auto-rotate are supported.
 */

const SLIDE_DURATION = 5000

export default function Slider() {
  const [index, setIndex] = useState(0) // 0 = individual, 1 = business
  const timerRef = useRef<number | null>(null)
  const paused = useRef(false)

  useEffect(() => {
    startTimer()
    return stopTimer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  function startTimer() {
    stopTimer()
    timerRef.current = window.setTimeout(() => {
      if (!paused.current) {
        setIndex((i) => (i + 1) % 2)
      }
    }, SLIDE_DURATION)
  }

  function stopTimer() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Welcome slides"
      onMouseEnter={() => {
        paused.current = true
        stopTimer()
      }}
      onMouseLeave={() => {
        paused.current = false
        startTimer()
      }}
      className="relative isolate min-h-[760px] overflow-hidden border-b border-white/10"
    >
      {/* background gradients (kept same as original) */}
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_15%,rgba(225,29,72,.28),transparent_32%),radial-gradient(circle_at_82%_8%,rgba(127,29,29,.25),transparent_28%),linear-gradient(to_bottom,#09090b,#070708)]" />
      <div className="absolute inset-0 -z-10 opacity-[0.09] [background-image:linear-gradient(rgba(255,255,255,.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.2)_1px,transparent_1px)] [background-size:56px_56px]" />

      {/* Tabs (Collectors / Business) */}
      <div className="relative z-30 mx-auto max-w-7xl px-5 pt-6 sm:px-8 lg:px-10">
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setIndex(0)}
            aria-pressed={index === 0}
            className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
              index === 0
                ? "bg-white/10 text-white"
                : "bg-white/5 text-white/70 hover:bg-white/8"
            }`}
          >
            Collectors
          </button>

          <button
            onClick={() => setIndex(1)}
            aria-pressed={index === 1}
            className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
              index === 1
                ? "bg-white/10 text-white"
                : "bg-white/5 text-white/70 hover:bg-white/8"
            }`}
          >
            Business
          </button>
        </div>
      </div>

      {/* Slides container */}
      <div className="mx-auto grid max-w-7xl gap-12 px-5 pb-24 pt-20 sm:px-8 md:pt-28 lg:grid-cols-[1.05fr_.95fr] lg:px-10">
        {/* LEFT: content — preserve original markup for individual; replace with business when index === 1 */}
        <div className="relative z-10">
          {index === 0 ? (
            // Individual (original content preserved)
            <>
              <Badge className="mb-6 border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-rose-200 hover:bg-rose-500/10">
                {/* original badge content */}
                <svg className="mr-1.5 h-3.5 w-3.5 inline-block" aria-hidden />
                Now featuring Smart Scanner 
              </Badge>

              <h1 className="max-w-4xl text-5xl font-black leading-[.92] tracking-[-0.055em] sm:text-6xl md:text-7xl xl:text-[86px]">
                Your collection.
                <span className="block bg-gradient-to-r from-rose-400 via-red-500 to-orange-400 bg-clip-text text-transparent">
                  ADHD Built Organization.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-white/60 sm:text-xl">
                Track every card. Know what it's worth. Organize every binder. And
                with Premium Smart Scanner Beta, point your phone at a supported English card,
                identify it, confirm the exact match, and send it straight into your inventory.
              </p>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/45">
                Basic is $0.99/month and Premium is $3.99/month. We're collectors ourselves and we're
                always open to new features and ideas. 
                Active users get premium usage! Just keep organizing and get premium use or free months! 
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href="/login?mode=signup"
                  className="inline-flex items-center h-12 rounded-xl bg-rose-600 px-6 text-white hover:bg-rose-500"
                >
                  Start your collection
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>

                <Link
                  href="/login"
                  className="inline-flex items-center h-12 rounded-xl border-white/15 bg-white/5 px-6 text-white hover:bg-white/10"
                >
                  Sign In
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/50">
                {[
                  "Premium Smart Scanner",
                  "English + Japanese collection",
                  "Variant-level tracking",
                  "Active users get free premium benefits",
                ].map((label) => (
                  <span key={label} className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-rose-400" aria-hidden />
                    {label}
                  </span>
                ))}
              </div>
            </>
          ) : (
            // Business slide content (keeps hero layout & spacing)
            <>
              <p className="text-xs font-black uppercase tracking-[0.42em] text-amber-300 sm:text-sm">
                For Shops & Premium Sellers
              </p>

              <h2 className="mt-5 text-5xl font-black leading-[.92] tracking-[-0.055em] text-white sm:text-6xl md:text-6xl lg:text-[48px]">
                Manage all your Inventory
                <span className="block bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
                  from one place.
                </span>
              </h2>

              <p className="mt-6 max-w-2xl text-lg leading-7 text-white/70">
                Inventory, card search, employees, imports, integrations and premium analytics
                built specifically for card shops, pro sellers and collectibles stores.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/business/signup"
                  className="inline-flex items-center h-12 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-6 text-white font-semibold shadow-sm hover:from-sky-500 hover:to-indigo-500"
                >
                  Business Signup
                </Link>

                <Link
                  href="/login?redirect=/business"
                  className="inline-flex items-center h-12 rounded-xl border-white/15 bg-white/5 px-6 text-white hover:bg-white/10"
                >
                  Business Sign in
                </Link>
              </div>

              <div className="mt-8 max-w-2xl text-sm text-white/60">
                <p>
                  Manage multiple websites, pricing, single cards, virtual shareable binders, multiple user accounts, integrates directly with square and advanced inventory tools tailored for retailers. We will even help you with our virtual employee options
                </p>
              </div>
            </>
          )}
        </div>

        {/* RIGHT: cards/images area — preserve exact placements when individual */}
        <div className="relative min-h-[470px]">
          {index === 0 ? (
            <>
              <div className="absolute left-[5%] top-12 w-[42%] -rotate-6 transition duration-300 hover:z-20 hover:rotate-0 hover:scale-105">
                <img
                  src="https://images.pokemontcg.io/sv4pt5/232_hires.png"
                  alt="Mew ex"
                  className="w-full drop-shadow-[0_35px_55px_rgba(0,0,0,.55)]"
                />
              </div>

              <div className="absolute right-[3%] top-0 z-10 w-[46%] rotate-6 transition duration-300 hover:z-20 hover:rotate-0 hover:scale-105">
                <img
                  src="https://images.pokemontcg.io/sv8/238_hires.png"
                  alt="Pikachu ex"
                  className="w-full drop-shadow-[0_35px_55px_rgba(0,0,0,.55)]"
                />
              </div>

              <div className="absolute bottom-0 left-[31%] z-10 w-[42%] rotate-1 transition duration-300 hover:z-20 hover:rotate-0 hover:scale-105">
                <img
                  src="https://images.pokemontcg.io/sv6/214_hires.png"
                  alt="Greninja ex"
                  className="w-full drop-shadow-[0_35px_55px_rgba(0,0,0,.55)]"
                />
              </div>
            </>
          ) : (
            // Business imagery: use your business images (local) if available; use placeholders otherwise.
            <>
              <div className="absolute left-[10%] top-8 w-[40%] -rotate-3 transition duration-300 hover:z-20 hover:rotate-0 hover:scale-105">
                <img
                  src="https://images.pokemontcg.io/sv4pt5/233_hires.png"
                  alt="Business inventory"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement
                    if (!img.dataset.fallback) {
                      img.dataset.fallback = "1"
                      img.src = "https://images.pokemontcg.io/sv2/203_hires.png"
                    }
                  }}
                  className="w-full drop-shadow-[0_35px_55px_rgba(0,0,0,.55)] rounded-md object-cover"
                />
              </div>

              <div className="absolute right-[8%] top-6 z-10 w-[44%] rotate-2 transition duration-300 hover:z-20 hover:rotate-0 hover:scale-105">
                <img
                  src="https://images.pokemontcg.io/sv6/214_hires.png"
                  alt="Business team"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement
                    if (!img.dataset.fallback) {
                      img.dataset.fallback = "1"
                      img.src = "https://images.pokemontcg.io/swsh11/186_hires.png"
                    }
                  }}
                  className="w-full drop-shadow-[0_35px_55px_rgba(0,0,0,.55)] rounded-md object-cover"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}