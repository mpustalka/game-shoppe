"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import {
  BarChart3,
  BookOpen,
  ChevronDown,
  ClipboardList,
  Crown,
  LayoutGrid,
  Lock,
  Menu,
  MessageCircle,
  CircleHelp,
  LifeBuoy,
  Package,
  PlusCircle,
  QrCode,
  Search,
  Settings,
  Share2,
  ShoppingBag,
  Store,
  Upload,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { AuthNav } from "@/components/layout/auth-nav"
import { useEntitlements } from "@/hooks/use-entitlements"
import type { Entitlements } from "@/lib/entitlements"

type NavItem = {
  name: string
  href: string
  icon: typeof LayoutGrid
  gate?: (e: Entitlements) => boolean
  premium?: boolean
}

const primaryNavigation: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutGrid },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Binders", href: "/binders", icon: BookOpen },
  { name: "Marketplace", href: "/marketplace", icon: Store },
  { name: "Sell", href: "/sell", icon: ShoppingBag },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    premium: true,
    gate: (e) => e.canUseAnalytics,
  },
]

const browseNavigation: NavItem[] = [
  { name: "English Sets", href: "/sets", icon: Package },
  { name: "Japanese Sets", href: "/japanese-sets", icon: Package },
]

const moreNavigation: NavItem[] = [
  {
    name: "Showcase",
    href: "/showcase",
    icon: Share2,
    premium: true,
    gate: (e) => e.canUseShowcase,
  },
  {
    name: "Customer Lists",
    href: "/customer-lists",
    icon: ClipboardList,
    premium: true,
    gate: (e) => e.canUseCustomerLists,
  },
  {
    name: "Messages",
    href: "/messages",
    icon: MessageCircle,
  },
  {
    name: "Add Card",
    href: "/add",
    icon: PlusCircle,
    gate: (e) => e.canAddCards,
  },
  {
    name: "Import",
    href: "/import",
    icon: Upload,
    premium: true,
    gate: (e) => e.canImport,
  },
  {
    name: "Scan",
    href: "/scan",
    icon: QrCode,
    premium: true,
    gate: (e) => e.canScan,
  },
  { name: "FAQ", href: "/faq", icon: CircleHelp },
  { name: "Support", href: "/support", icon: LifeBuoy },
  { name: "Settings", href: "/settings", icon: Settings },
]

const mobileNavigation = [
  ...primaryNavigation,
  ...browseNavigation,
  ...moreNavigation,
]

export function Header() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const { entitlements, loading: entitlementsLoading } = useEntitlements()

  useEffect(() => {
    let cancelled = false

    async function loadUnreadMessages() {
      try {
        const response = await fetch("/api/messages", {
          cache: "no-store",
        })

        if (!response.ok) return

        const result = await response.json().catch(() => null)
        const conversations = Array.isArray(result?.conversations)
          ? result.conversations
          : []

        const count = conversations.filter(
          (conversation: { unread?: boolean }) =>
            conversation?.unread === true,
        ).length

        if (!cancelled) {
          setUnreadMessages(count)
        }
      } catch {
        // Header should never fail because unread-count loading failed.
      }
    }

    void loadUnreadMessages()

    const interval = window.setInterval(
      () => void loadUnreadMessages(),
      30000,
    )

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [pathname])

  const publicRoutes = [
    "/welcome",
    "/login",
    "/reset-password",
    "/auth",
    "/share",
  ]

  const isPublicRoute = publicRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`),
  )

  if (isPublicRoute) return null

  const hasPremiumAccess =
    entitlements.canUseAnalytics &&
    entitlements.canUseShowcase &&
    entitlements.canUseCustomerLists &&
    entitlements.canImport &&
    entitlements.canScan

  function getNavigationHref(item: NavItem) {
    if (entitlementsLoading) return item.href
    const locked = item.gate ? !item.gate(entitlements) : false
    return locked ? "/settings?tab=billing" : item.href
  }

  function isLocked(item: NavItem) {
    if (entitlementsLoading) return false
    return item.gate ? !item.gate(entitlements) : false
  }

  function isActive(item: NavItem) {
    return (
      pathname === item.href ||
      (item.href !== "/" &&
        pathname.startsWith(`${item.href}/`))
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#070708]/90 text-white shadow-[0_12px_40px_rgba(0,0,0,.22)] backdrop-blur-xl supports-[backdrop-filter]:bg-[#070708]/75">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-2 px-3 sm:px-5 lg:px-7">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-400/25 bg-rose-500/10 shadow-lg shadow-rose-950/20 transition group-hover:border-rose-400/45 group-hover:bg-rose-500/15">
            <span className="text-xs font-black tracking-[-0.08em] text-rose-400">
              TR
            </span>
          </div>
          <div className="hidden xl:block">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-white">
              Team Rocket
            </p>
            <p className="-mt-0.5 text-[10px] text-white/40">
              Markets
            </p>
          </div>
        </Link>

        <nav className="hidden shrink-0 items-center gap-0.5 lg:flex">
          {primaryNavigation.map((item) => {
            const locked = isLocked(item)
            const active = isActive(item)
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={getNavigationHref(item)}
                title={locked ? `${item.name} requires Premium` : undefined}
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold transition",
                  active && !locked
                    ? "bg-rose-500/12 text-rose-300 ring-1 ring-inset ring-rose-400/15"
                    : "text-white/50 hover:bg-white/[0.06] hover:text-white",
                  locked && "opacity-65",
                )}
              >
                {locked ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
                <span>{item.name}</span>
              </Link>
            )
          })}

          <NavDropdown
            label="Browse"
            active={
              pathname.startsWith("/sets") ||
              pathname.startsWith("/japanese-sets")
            }
            items={browseNavigation}
            getNavigationHref={getNavigationHref}
            isLocked={isLocked}
          />

          <NavDropdown
            label="More"
            active={moreNavigation.some(isActive)}
            items={moreNavigation}
            getNavigationHref={getNavigationHref}
            isLocked={isLocked}
          />
        </nav>

        <div className="ml-auto hidden min-w-0 flex-1 justify-end md:flex">
          <form action="/search" className="relative w-full max-w-[260px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <Input
              type="search"
              name="q"
              placeholder="Search cards..."
              className="h-9 rounded-xl border-white/10 bg-white/[0.045] pl-9 text-white placeholder:text-white/30 focus-visible:ring-rose-500/40"
            />
          </form>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {!entitlementsLoading &&
            !hasPremiumAccess &&
            entitlements.plan === "basic" && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="hidden h-9 gap-1.5 rounded-xl border-rose-400/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15 hover:text-white 2xl:flex"
              >
                <Link href="/settings?tab=billing">
                  <Crown className="h-4 w-4" />
                  Upgrade
                </Link>
              </Button>
            )}

          <Button
            asChild
            variant="ghost"
            size="icon"
            className="relative rounded-xl text-white/65 hover:bg-white/10 hover:text-white"
          >
            <Link href="/messages" aria-label="Messages">
              <MessageCircle className="h-5 w-5" />
              {unreadMessages > 0 && (
                <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-black leading-none text-white">
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              )}
            </Link>
          </Button>

          <AuthNav />

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl text-white/70 hover:bg-white/10 hover:text-white"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>

            <SheetContent
              side="right"
              className="w-[min(92vw,380px)] overflow-y-auto border-white/10 bg-[#09090b] p-0 text-white"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#09090b]/95 px-5 py-4 backdrop-blur">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-400/25 bg-rose-500/10 text-xs font-black text-rose-400">
                    TR
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em]">
                      Team Rocket
                    </p>
                    <p className="text-[10px] text-white/40">Markets</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl text-white/60 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex flex-col gap-5 px-4 py-5">
                {!entitlementsLoading && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.15em] text-white/30">
                          Current plan
                        </p>
                        <p className="mt-1 font-bold capitalize">
                          {entitlements.plan === "trial"
                            ? "Premium Trial"
                            : entitlements.plan === "grandfathered"
                              ? "Founding Premium"
                              : entitlements.plan === "admin"
                                ? "Admin"
                                : entitlements.plan}
                        </p>
                      </div>

                      {entitlements.plan === "basic" && (
                        <Button
                          asChild
                          size="sm"
                          className="rounded-xl bg-rose-600 hover:bg-rose-500"
                        >
                          <Link
                            href="/settings?tab=billing"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            Upgrade
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <form action="/search" className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <Input
                    type="search"
                    name="q"
                    placeholder="Search cards..."
                    className="h-11 rounded-xl border-white/10 bg-white/[0.045] pl-9 text-white placeholder:text-white/30"
                  />
                </form>

                <nav className="flex flex-col gap-1">
                  {mobileNavigation.map((item) => {
                    const locked = isLocked(item)
                    const active = isActive(item)
                    const Icon = item.icon

                    return (
                      <Link
                        key={`${item.name}-${item.href}`}
                        href={getNavigationHref(item)}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex min-h-12 items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition",
                          active && !locked
                            ? "bg-rose-500/12 text-rose-300 ring-1 ring-inset ring-rose-400/15"
                            : "text-white/55 hover:bg-white/[0.06] hover:text-white",
                          locked && "opacity-65",
                        )}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.045]">
                          {locked ? (
                            <Lock className="h-4 w-4" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </div>

                        <span>{item.name}</span>

                        {item.href === "/messages" &&
                          unreadMessages > 0 && (
                          <span className="ml-auto flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-black text-white">
                            {unreadMessages > 99 ? "99+" : unreadMessages}
                          </span>
                        )}

                        {item.premium && (
                          <div className="ml-auto">
                            <PremiumBadge locked={locked} />
                          </div>
                        )}
                      </Link>
                    )
                  })}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

function NavDropdown({
  label,
  active,
  items,
  getNavigationHref,
  isLocked,
}: {
  label: string
  active: boolean
  items: NavItem[]
  getNavigationHref: (item: NavItem) => string
  isLocked: (item: NavItem) => boolean
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold transition",
          active
            ? "bg-rose-500/12 text-rose-300"
            : "text-white/50 hover:bg-white/[0.06] hover:text-white",
        )}
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
      </button>

      <div className="invisible absolute left-0 top-full z-50 min-w-[245px] pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100">
        <div className="rounded-2xl border border-white/10 bg-[#101013]/98 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl">
          {items.map((item) => {
            const locked = isLocked(item)
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={getNavigationHref(item)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 transition hover:bg-white/[0.06] hover:text-white"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.045]">
                  {locked ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>

                <span className="font-semibold">{item.name}</span>

                {item.premium && (
                  <div className="ml-auto">
                    <PremiumBadge locked={locked} />
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function PremiumBadge({ locked }: { locked: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 gap-1 border-white/10 bg-white/[0.04] px-1.5 text-[9px] font-bold text-white/40",
        locked && "border-rose-400/20 text-rose-300",
      )}
    >
      <Crown className="h-3 w-3" />
      Premium
    </Badge>
  )
}