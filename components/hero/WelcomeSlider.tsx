"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

type Slide = {
  id: string
  title: React.ReactNode
  description?: React.ReactNode
  ctas?: React.ReactNode
  images?: string[]
}

const SLIDE_DURATION = 5000

export default function WelcomeSlider() {
  const slides: Slide[] = [
    {
      id: "individual",
      title: (
        <>
          Your collection.
          <span className="block bg-gradient-to-r from-rose-400 via-red-500 to-orange-400 bg-clip-text text-transparent">
            Your market.
          </span>
        </>
      ),
      description: (
        <>
          Create your free account and start building your collection today. Get
          exclusive benefits as an active user.
        </>
      ),
      ctas: (
        <div className="flex w-full gap-3 sm:justify-start">
          <Button
            size="lg"
            asChild
            className="h-12 rounded-xl bg-rose-600 px-6 text-white hover:bg-rose-500"
          >
            <Link href="/login?mode=signup">
              Start your collection <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>

          <Button
            size="lg"
            asChild
            variant="outline"
            className="h-12 rounded-xl border-white/15 bg-white/5 px-6 text-white hover:bg-white/10"
          >
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      ),
      images: [
        "https://images.pokemontcg.io/sv4pt5/232_hires.png",
        "https://images.pokemontcg.io/sv8/238_hires.png",
        "https://images.pokemontcg.io/sv6/214_hires.png",
      ],
    },

    {
      id: "business",
      title: (
        <>
          Run your business
          <span className="block bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
            from one place.
          </span>
        </>
      ),
      description: (
        <>
          Inventory, employees, imports, integrations and analytics built
          specifically for card shops, pro sellers and collectibles stores.
        </>
      ),
      ctas: (
        <div className="flex w-full gap-3 sm:justify-start">
          <Button
            size="lg"
            asChild
            className="h-12 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-6 text-white font-semibold"
          >
            <Link href="/business/signup">Business Signup</Link>
          </Button>

          <Button
            size="lg"
            asChild
            variant="outline"
            className="h-12 rounded-xl px-6 border-white/20 text-white"
          >
            <Link href="/login?redirect=/business">Business Sign in</Link>
          </Button>
        </div>
      ),
      images: [
        "/images/business-inventory.png",
        "/images/business-team.png",
        "/images/business-analytics.png",
      ],
    },
  ]

  const [index, setIndex] = useState(0)
  const timerRef = useRef<number | null>(null)
  const isPaused = useRef(false)

  useEffect(() => {
    startTimer()
    return stopTimer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  function startTimer() {
    stopTimer()
    timerRef.current = window.setTimeout(() => {
      if (!isPaused.current) {
        setIndex((s) => (s + 1) % slides.length)
      }
    }, SLIDE_DURATION)
  }

  function stopTimer() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function goTo(i: number) {
    setIndex(i)
    startTimer()
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Welcome slides"
      onMouseEnter={() => {
        isPaused.current = true
        stopTimer()
      }}
      onMouseLeave={() => {
        isPaused.current = false
        startTimer()
      }}
      className="relative isolate overflow-hidden border-t border-white/10 bg-[#091326]"
    >
      <div className="relative mx-auto flex min-h-[470px] max-w-7xl items-center justify-center px-5 py-20 sm:px-8 lg:min-h-[520px] lg:px-10">
        <div className="relative z-20 mx-auto max-w-4xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.42em] text-amber-300 sm:text-sm">
            {index === 0 ? "Your Collection Starts Here" : "For Shops & Sellers"}
          </p>

          <h2 className="mt-5 text-5xl font-black leading-[0.92] tracking-[-0.055em] text-white sm:text-6xl lg:text-[72px]">
            {slides[index].title}
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/85 sm:text-lg">
            {slides[index].description}
          </p>

          <div className="mx-auto mt-8 flex max-w-xl flex-col justify-center gap-3 sm:flex-row sm:justify-start">
            {slides[index].ctas}
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            {slides.map((s, i) => (
              <button
                key={s.id}
                aria-current={i === index}
                aria-label={`Show ${s.id}`}
                onClick={() => goTo(i)}
                className={`h-2 w-8 rounded-full transition-all duration-300 ${
                  i === index ? "bg-white" : "bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>

          <p className="mt-9 text-[10px] font-black uppercase tracking-[0.45em] text-white/75 sm:text-xs">
            Same Passion · A Brighter Future
          </p>
        </div>

        <div className="relative min-h-[470px] hidden lg:block">
          {slides[index].images?.map((src, i) => {
            const transformClass =
              i === 0
                ? "absolute left-[5%] top-12 w-[42%] -rotate-6 transition duration-300 hover:z-20 hover:rotate-0 hover:scale-105"
                : i === 1
                ? "absolute right-[3%] top-0 z-10 w-[46%] rotate-6 transition duration-300 hover:z-20 hover:rotate-0 hover:scale-105"
                : "absolute bottom-0 left-[31%] z-10 w-[42%] rotate-1 transition duration-300 hover:z-20 hover:rotate-0 hover:scale-105"

            return (
              <div key={String(i)} className={transformClass}>
                <img
                  src={src}
                  alt={`${slides[index].id} ${i}`}
                  className="w-full drop-shadow-[0_35px_55px_rgba(0,0,0,.55)] rounded-md object-cover"
                />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
