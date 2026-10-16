"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  useEffect,
  useState,
} from "react"

import {
  BarChart3,
  BookOpen,
  Building2,
  ChevronDown,
  ClipboardList,
  Crown,
  FileUp,
  LayoutGrid,
  LifeBuoy,
  Lock,
  Menu,
  MessageCircle,
  CircleHelp,
  Package,
  PlusCircle,
  Plug,
  QrCode,
  Search,
  Settings,
  Share2,
  ShoppingBag,
  Store,
  Tags,
  Upload,
  Users,
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
  gate?: (
    e: Entitlements,
  ) => boolean
  premium?: boolean
}

type CompanyRole =
  | "owner"
  | "manager"
  | "employee"

type AccountAccess = {
  authenticated: boolean

  accountType:
    | "individual"
    | "business"
    | "super_admin"
    | null

  isSuperAdmin: boolean

  company: {
    id: string
    name: string | null
    role: CompanyRole
    subscriptionStatus?: string | null
    subscriptionPlan?: string | null
    trialPlan?: string | null
    includedSeats?: number | null
  } | null
}

/* =========================================================
 * COLLECTOR NAVIGATION
 * ======================================================= */

const primaryNavigation: NavItem[] = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutGrid,
  },
  {
    name: "Inventory",
    href: "/inventory",
    icon: Package,
  },
  {
    name: "Binders",
    href: "/binders",
    icon: BookOpen,
  },
  {
    name: "Store",
    href: "/store",
    icon: ShoppingBag,
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    premium: true,
    gate: (e) =>
      e.canUseAnalytics,
  },
]

const singlesNavigation: NavItem[] = [
  {
    name: "Browse Marketplace",
    href: "/marketplace",
    icon: Store,
  },
  {
    name: "Sell Cards",
    href: "/sell",
    icon: Tags,
  },
]

const browseNavigation: NavItem[] = [
  {
    name: "English Sets",
    href: "/sets",
    icon: Package,
  },
  {
    name: "Japanese Sets",
    href: "/japanese-sets",
    icon: Package,
  },
  {
    name: "Chinese Sets",
    href: "/chinese-sets",
    icon: Package,
  },
]

const moreNavigation: NavItem[] = [
  {
    name: "Showcase",
    href: "/showcase",
    icon: Share2,
    premium: true,
    gate: (e) =>
      e.canUseShowcase,
  },
  {
    name: "Customer Lists",
    href: "/customer-lists",
    icon: ClipboardList,
    premium: true,
    gate: (e) =>
      e.canUseCustomerLists,
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
    gate: (e) =>
      e.canAddCards,
  },
  {
    name: "Import",
    href: "/import",
    icon: Upload,
    premium: true,
    gate: (e) =>
      e.canImport,
  },
  {
    name: "Scan",
    href: "/scan",
    icon: QrCode,
    premium: true,
    gate: (e) =>
      e.canScan,
  },
  {
    name: "FAQ",
    href: "/faq",
    icon: CircleHelp,
  },
  {
    name: "Support",
    href: "/support",
    icon: LifeBuoy,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

/* =========================================================
 * BUSINESS NAVIGATION
 * ======================================================= */

const businessPrimaryNavigation: NavItem[] = [
  {
    name: "Business",
    href: "/business",
    icon: Building2,
  },
  {
    name: "Inventory",
    href: "/inventory",
    icon: Package,
  },
  {
    name: "Add Cards",
    href: "/add",
    icon: PlusCircle,
  },
  {
    name: "Binders",
    href: "/binders",
    icon: BookOpen,
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
]

const businessBrowseNavigation: NavItem[] = [
  {
    name: "English Sets",
    href: "/sets",
    icon: Package,
  },
  {
    name: "Japanese Sets",
    href: "/japanese-sets",
    icon: Package,
  },
  {
    name: "Chinese Sets",
    href: "/chinese-sets",
    icon: Package,
  },
]

const businessToolsNavigation: NavItem[] = [
  {
    name: "Import / Export",
    href: "/import",
    icon: FileUp,
  },
  {
    name: "Scan Cards",
    href: "/scan",
    icon: QrCode,
  },
  {
    name: "Support",
    href: "/support",
    icon: LifeBuoy,
  },
]

const businessManagementNavigation: NavItem[] = [
  {
    name: "Team",
    href: "/business/team",
    icon: Users,
  },
  {
    name: "Integrations",
    href: "/business/integrations",
    icon: Plug,
  },
  {
    name: "Business Settings",
    href: "/business/settings",
    icon: Settings,
  },
]

/*
 * PLATFORM administration.
 *
 * This must NEVER be controlled by a subscription plan.
 */
const adminNavigation: NavItem[] = [
  {
    name: "Manage Store",
    href: "/admin/store",
    icon: Store,
  },
]

/* =========================================================
 * HEADER
 * ======================================================= */

export function Header() {
  const pathname =
    usePathname()

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false)

  const [
    unreadMessages,
    setUnreadMessages,
  ] = useState(0)

  const [
    accountAccess,
    setAccountAccess,
  ] =
    useState<AccountAccess | null>(
      null,
    )

  const {
    entitlements,
    loading:
      entitlementsLoading,
  } = useEntitlements()

  /* =======================================================
   * ACCOUNT ACCESS
   * ===================================================== */

  useEffect(() => {
    let cancelled = false

    async function loadAccountAccess() {
      try {
        const response =
          await fetch(
            "/api/account/access",
            {
              cache: "no-store",
            },
          )

        if (!response.ok) {
          return
        }

        const data =
          (await response.json()) as AccountAccess

        if (!cancelled) {
          setAccountAccess(
            data,
          )
        }
      } catch (error) {
        console.error(
          "Unable to load account access:",
          error,
        )
      }
    }

    void loadAccountAccess()

    return () => {
      cancelled = true
    }
  }, [pathname])

  const isAdmin =
    accountAccess?.isSuperAdmin ===
    true

  const isBusiness =
    accountAccess?.accountType ===
      "business" &&
    accountAccess.company !== null

  const companyRole =
    accountAccess?.company?.role ??
    null

  const canManageBusiness =
    companyRole === "owner" ||
    companyRole === "manager"

  /* =======================================================
   * MESSAGE COUNT
   *
   * Business accounts do not use consumer messaging.
   * ===================================================== */

  useEffect(() => {
    if (isBusiness) {
      setUnreadMessages(0)
      return
    }

    /*
     * Wait until account access resolves before polling.
     *
     * This prevents business accounts from making an initial
     * /api/messages request before we know their account type.
     */
    if (!accountAccess) {
      return
    }

    if (
      !accountAccess.authenticated
    ) {
      setUnreadMessages(0)
      return
    }

    let cancelled = false

    async function loadUnreadMessages() {
      try {
        const response =
          await fetch(
            "/api/messages",
            {
              cache: "no-store",
            },
          )

        if (!response.ok) {
          return
        }

        const result =
          await response
            .json()
            .catch(() => null)

        const conversations =
          Array.isArray(
            result?.conversations,
          )
            ? result.conversations
            : []

        const count =
          conversations.filter(
            (
              conversation: {
                unread?: boolean
              },
            ) =>
              conversation?.unread ===
              true,
          ).length

        if (!cancelled) {
          setUnreadMessages(
            count,
          )
        }
      } catch {
        // Header must not fail because messages failed.
      }
    }

    void loadUnreadMessages()

    const interval =
      window.setInterval(
        () =>
          void loadUnreadMessages(),
        30_000,
      )

    return () => {
      cancelled = true

      window.clearInterval(
        interval,
      )
    }
  }, [
    accountAccess,
    isBusiness,
  ])

  /* =======================================================
   * PUBLIC ROUTES
   * ===================================================== */

  const publicRoutes = [
    "/welcome",
    "/login",
    "/reset-password",
    "/auth",
    "/share",
    "/business/signup",
  ]

  const isPublicRoute =
    publicRoutes.some(
      (route) =>
        pathname === route ||
        pathname.startsWith(
          `${route}/`,
        ),
    )

  if (isPublicRoute) {
    return null
  }

  /* =======================================================
   * ACCESS HELPERS
   * ===================================================== */

  const hasPremiumAccess =
    entitlements.canUseAnalytics &&
    entitlements.canUseShowcase &&
    entitlements.canUseCustomerLists &&
    entitlements.canImport &&
    entitlements.canScan

  function getNavigationHref(
    item: NavItem,
  ) {
    /*
     * Business plans are being handled independently from
     * collector subscriptions. Don't send business users to
     * the collector billing screen.
     */
    if (isBusiness) {
      return item.href
    }

    if (entitlementsLoading) {
      return item.href
    }

    const locked =
      item.gate
        ? !item.gate(
            entitlements,
          )
        : false

    return locked
      ? "/settings?tab=billing"
      : item.href
  }

  function isLocked(
    item: NavItem,
  ) {
    if (isBusiness) {
      return false
    }

    if (entitlementsLoading) {
      return false
    }

    return item.gate
      ? !item.gate(
          entitlements,
        )
      : false
  }

  function isActive(
    item: NavItem,
  ) {
    return (
      pathname === item.href ||
      (
        item.href !== "/" &&
        pathname.startsWith(
          `${item.href}/`,
        )
      )
    )
  }

  const singlesActive =
    singlesNavigation.some(
      isActive,
    )

  const browseActive =
    (
      isBusiness
        ? businessBrowseNavigation
        : browseNavigation
    ).some(isActive)

  const moreActive =
    (
      isBusiness
        ? [
            ...businessToolsNavigation,
            ...(canManageBusiness
              ? businessManagementNavigation
              : []),
          ]
        : [
            ...moreNavigation,
            ...(isAdmin
              ? adminNavigation
              : []),
          ]
    ).some(isActive)

  const desktopPrimaryNavigation =
    isBusiness
      ? businessPrimaryNavigation
      : primaryNavigation

  const desktopBrowseNavigation =
    isBusiness
      ? businessBrowseNavigation
      : browseNavigation

  const desktopMoreNavigation =
    isBusiness
      ? [
          ...businessToolsNavigation,
          ...(canManageBusiness
            ? businessManagementNavigation
            : []),
        ]
      : [
          ...moreNavigation,
          ...(isAdmin
            ? adminNavigation
            : []),
        ]

  /* =======================================================
   * RENDER
   * ===================================================== */

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#070708]/90 text-white shadow-[0_12px_40px_rgba(0,0,0,.22)] backdrop-blur-xl supports-[backdrop-filter]:bg-[#070708]/75">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-2 px-3 sm:px-5 lg:px-7">
        {/* BRAND */}

        <Link
          href={
            isBusiness
              ? "/business"
              : "/"
          }
          className="group flex shrink-0 items-center gap-2.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-400/25 bg-rose-500/10 shadow-lg shadow-rose-950/20 transition group-hover:border-rose-400/45 group-hover:bg-rose-500/15">
            <span className="text-xs font-black tracking-[-0.08em] text-rose-400">
              TR
            </span>
          </div>

          <div className="hidden xl:block">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-white">
              {isBusiness &&
              accountAccess?.company
                ?.name
                ? accountAccess
                    .company.name
                : "Team Rocket"}
            </p>

            <p className="-mt-0.5 text-[10px] text-white/40">
              {isBusiness
                ? "Business"
                : "Markets"}
            </p>
          </div>
        </Link>

        {/* DESKTOP NAV */}

        <nav className="hidden shrink-0 items-center gap-0.5 lg:flex">
          {desktopPrimaryNavigation.map(
            (item) => {
              const locked =
                isLocked(item)

              const active =
                isActive(item)

              const Icon =
                item.icon

              return (
                <Link
                  key={
                    item.name
                  }
                  href={getNavigationHref(
                    item,
                  )}
                  title={
                    locked
                      ? `${item.name} requires Premium`
                      : undefined
                  }
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold transition",
                    active &&
                      !locked
                      ? "bg-rose-500/12 text-rose-300 ring-1 ring-inset ring-rose-400/15"
                      : "text-white/50 hover:bg-white/[0.06] hover:text-white",
                    locked &&
                      "opacity-65",
                  )}
                >
                  {locked ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}

                  <span>
                    {item.name}
                  </span>
                </Link>
              )
            },
          )}

          {!isBusiness && (
            <NavDropdown
              label="Singles"
              active={
                singlesActive
              }
              items={
                singlesNavigation
              }
              getNavigationHref={
                getNavigationHref
              }
              isLocked={
                isLocked
              }
            />
          )}

          <NavDropdown
            label="Browse"
            active={
              browseActive
            }
            items={
              desktopBrowseNavigation
            }
            getNavigationHref={
              getNavigationHref
            }
            isLocked={
              isLocked
            }
          />

          <NavDropdown
            label={
              isBusiness
                ? "Business Tools"
                : "More"
            }
            active={
              moreActive
            }
            items={
              desktopMoreNavigation
            }
            getNavigationHref={
              getNavigationHref
            }
            isLocked={
              isLocked
            }
          />
        </nav>

        {/* SEARCH */}

        <div className="ml-auto hidden min-w-0 flex-1 justify-end md:flex">
          <form
            action="/search"
            className="relative w-full max-w-[260px]"
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />

            <Input
              type="search"
              name="q"
              placeholder="Search cards..."
              className="h-9 rounded-xl border-white/10 bg-white/[0.045] pl-9 text-white placeholder:text-white/30 focus-visible:ring-rose-500/40"
            />
          </form>
        </div>

        {/* RIGHT SIDE */}

        <div className="flex shrink-0 items-center gap-1.5">
          {!isBusiness &&
            !entitlementsLoading &&
            !hasPremiumAccess &&
            entitlements.plan ===
              "basic" && (
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

          {/* Consumer messages only */}

          {!isBusiness && (
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="relative rounded-xl text-white/65 hover:bg-white/10 hover:text-white"
            >
              <Link
                href="/messages"
                aria-label="Messages"
              >
                <MessageCircle className="h-5 w-5" />

                {unreadMessages >
                  0 && (
                  <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-black leading-none text-white">
                    {unreadMessages >
                    99
                      ? "99+"
                      : unreadMessages}
                  </span>
                )}
              </Link>
            </Button>
          )}

          <AuthNav />

          {/* MOBILE */}

          <Sheet
            open={
              mobileMenuOpen
            }
            onOpenChange={
              setMobileMenuOpen
            }
          >
            <SheetTrigger
              asChild
              className="lg:hidden"
            >
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl text-white/70 hover:bg-white/10 hover:text-white"
              >
                <Menu className="h-5 w-5" />

                <span className="sr-only">
                  Open menu
                </span>
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
                      {isBusiness &&
                      accountAccess
                        ?.company
                        ?.name
                        ? accountAccess
                            .company
                            .name
                        : "Team Rocket"}
                    </p>

                    <p className="text-[10px] text-white/40">
                      {isBusiness
                        ? "Business"
                        : "Markets"}
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setMobileMenuOpen(
                      false,
                    )
                  }
                  className="rounded-xl text-white/60 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex flex-col gap-5 px-4 py-5">
                {/* ACCOUNT / PLAN */}

                {isBusiness &&
                accountAccess?.company ? (
                  <div className="rounded-2xl border border-rose-400/15 bg-rose-500/[0.06] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-300/70">
                      Business Account
                    </p>

                    <p className="mt-1 font-bold text-white">
                      {
                        accountAccess
                          .company
                          .name
                      }
                    </p>

                    <p className="mt-1 text-xs capitalize text-white/45">
                      {
                        accountAccess
                          .company
                          .role
                      }

                      {accountAccess
                        .company
                        .trialPlan
                        ? ` · ${accountAccess.company.trialPlan} trial`
                        : accountAccess
                            .company
                            .subscriptionPlan
                          ? ` · ${accountAccess.company.subscriptionPlan}`
                          : ""}
                    </p>
                  </div>
                ) : (
                  !entitlementsLoading && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.15em] text-white/30">
                            Current plan
                          </p>

                          <p className="mt-1 font-bold capitalize">
                            {entitlements.plan ===
                            "trial"
                              ? "Premium Trial"
                              : entitlements.plan ===
                                  "grandfathered"
                                ? "Founding Premium"
                                : entitlements.plan ===
                                    "admin"
                                  ? "Admin"
                                  : entitlements.plan}
                          </p>
                        </div>

                        {entitlements.plan ===
                          "basic" && (
                          <Button
                            asChild
                            size="sm"
                            className="rounded-xl bg-rose-600 hover:bg-rose-500"
                          >
                            <Link
                              href="/settings?tab=billing"
                              onClick={() =>
                                setMobileMenuOpen(
                                  false,
                                )
                              }
                            >
                              Upgrade
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                )}

                {/* SEARCH */}

                <form
                  action="/search"
                  className="relative"
                >
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />

                  <Input
                    type="search"
                    name="q"
                    placeholder="Search cards..."
                    className="h-11 rounded-xl border-white/10 bg-white/[0.045] pl-9 text-white placeholder:text-white/30"
                  />
                </form>

                {isBusiness ? (
                  <>
                    <MobileNavSection
                      label="Business"
                      items={
                        businessPrimaryNavigation
                      }
                      pathname={
                        pathname
                      }
                      unreadMessages={
                        0
                      }
                      getNavigationHref={
                        getNavigationHref
                      }
                      isLocked={
                        isLocked
                      }
                      closeMenu={() =>
                        setMobileMenuOpen(
                          false,
                        )
                      }
                    />

                    <MobileNavSection
                      label="Browse Sets"
                      items={
                        businessBrowseNavigation
                      }
                      pathname={
                        pathname
                      }
                      unreadMessages={
                        0
                      }
                      getNavigationHref={
                        getNavigationHref
                      }
                      isLocked={
                        isLocked
                      }
                      closeMenu={() =>
                        setMobileMenuOpen(
                          false,
                        )
                      }
                    />

                    <MobileNavSection
                      label="Tools"
                      items={
                        businessToolsNavigation
                      }
                      pathname={
                        pathname
                      }
                      unreadMessages={
                        0
                      }
                      getNavigationHref={
                        getNavigationHref
                      }
                      isLocked={
                        isLocked
                      }
                      closeMenu={() =>
                        setMobileMenuOpen(
                          false,
                        )
                      }
                    />

                    {canManageBusiness && (
                      <MobileNavSection
                        label="Management"
                        items={
                          businessManagementNavigation
                        }
                        pathname={
                          pathname
                        }
                        unreadMessages={
                          0
                        }
                        getNavigationHref={
                          getNavigationHref
                        }
                        isLocked={
                          isLocked
                        }
                        closeMenu={() =>
                          setMobileMenuOpen(
                            false,
                          )
                        }
                      />
                    )}
                  </>
                ) : (
                  <>
                    <MobileNavSection
                      label="Collection"
                      items={
                        primaryNavigation
                      }
                      pathname={
                        pathname
                      }
                      unreadMessages={
                        unreadMessages
                      }
                      getNavigationHref={
                        getNavigationHref
                      }
                      isLocked={
                        isLocked
                      }
                      closeMenu={() =>
                        setMobileMenuOpen(
                          false,
                        )
                      }
                    />

                    <MobileNavSection
                      label="Singles"
                      items={
                        singlesNavigation
                      }
                      pathname={
                        pathname
                      }
                      unreadMessages={
                        unreadMessages
                      }
                      getNavigationHref={
                        getNavigationHref
                      }
                      isLocked={
                        isLocked
                      }
                      closeMenu={() =>
                        setMobileMenuOpen(
                          false,
                        )
                      }
                    />

                    <MobileNavSection
                      label="Browse Sets"
                      items={
                        browseNavigation
                      }
                      pathname={
                        pathname
                      }
                      unreadMessages={
                        unreadMessages
                      }
                      getNavigationHref={
                        getNavigationHref
                      }
                      isLocked={
                        isLocked
                      }
                      closeMenu={() =>
                        setMobileMenuOpen(
                          false,
                        )
                      }
                    />

                    <MobileNavSection
                      label="Tools & Account"
                      items={
                        moreNavigation
                      }
                      pathname={
                        pathname
                      }
                      unreadMessages={
                        unreadMessages
                      }
                      getNavigationHref={
                        getNavigationHref
                      }
                      isLocked={
                        isLocked
                      }
                      closeMenu={() =>
                        setMobileMenuOpen(
                          false,
                        )
                      }
                    />

                    {isAdmin && (
                      <MobileNavSection
                        label="Admin"
                        items={
                          adminNavigation
                        }
                        pathname={
                          pathname
                        }
                        unreadMessages={
                          unreadMessages
                        }
                        getNavigationHref={
                          getNavigationHref
                        }
                        isLocked={
                          isLocked
                        }
                        closeMenu={() =>
                          setMobileMenuOpen(
                            false,
                          )
                        }
                      />
                    )}
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

/* =========================================================
 * DESKTOP DROPDOWN
 * ======================================================= */

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
  getNavigationHref: (
    item: NavItem,
  ) => string
  isLocked: (
    item: NavItem,
  ) => boolean
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
          {items.map(
            (item) => {
              const locked =
                isLocked(item)

              const Icon =
                item.icon

              return (
                <Link
                  key={`${item.name}-${item.href}`}
                  href={getNavigationHref(
                    item,
                  )}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 transition hover:bg-white/[0.06] hover:text-white"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.045]">
                    {locked ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>

                  <span className="font-semibold">
                    {item.name}
                  </span>

                  {item.premium && (
                    <div className="ml-auto">
                      <PremiumBadge
                        locked={
                          locked
                        }
                      />
                    </div>
                  )}
                </Link>
              )
            },
          )}
        </div>
      </div>
    </div>
  )
}

/* =========================================================
 * MOBILE NAV SECTION
 * ======================================================= */

function MobileNavSection({
  label,
  items,
  pathname,
  unreadMessages,
  getNavigationHref,
  isLocked,
  closeMenu,
}: {
  label: string
  items: NavItem[]
  pathname: string
  unreadMessages: number
  getNavigationHref: (
    item: NavItem,
  ) => string
  isLocked: (
    item: NavItem,
  ) => boolean
  closeMenu: () => void
}) {
  return (
    <section>
      <div className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
        {label}
      </div>

      <nav className="flex flex-col gap-1">
        {items.map(
          (item) => {
            const locked =
              isLocked(item)

            const active =
              pathname ===
                item.href ||
              (
                item.href !==
                  "/" &&
                pathname.startsWith(
                  `${item.href}/`,
                )
              )

            const Icon =
              item.icon

            return (
              <Link
                key={`${item.name}-${item.href}`}
                href={getNavigationHref(
                  item,
                )}
                onClick={
                  closeMenu
                }
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition",
                  active &&
                    !locked
                    ? "bg-rose-500/12 text-rose-300 ring-1 ring-inset ring-rose-400/15"
                    : "text-white/55 hover:bg-white/[0.06] hover:text-white",
                  locked &&
                    "opacity-65",
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.045]">
                  {locked ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>

                <span>
                  {item.name}
                </span>

                {item.href ===
                  "/messages" &&
                  unreadMessages >
                    0 && (
                  <span className="ml-auto flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-black text-white">
                    {unreadMessages >
                    99
                      ? "99+"
                      : unreadMessages}
                  </span>
                )}

                {item.premium && (
                  <div className="ml-auto">
                    <PremiumBadge
                      locked={
                        locked
                      }
                    />
                  </div>
                )}
              </Link>
            )
          },
        )}
      </nav>
    </section>
  )
}

/* =========================================================
 * PREMIUM BADGE
 * ======================================================= */

function PremiumBadge({
  locked,
}: {
  locked: boolean
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 gap-1 border-white/10 bg-white/[0.04] px-1.5 text-[9px] font-bold text-white/40",
        locked &&
          "border-rose-400/20 text-rose-300",
      )}
    >
      <Crown className="h-3 w-3" />
      Premium
    </Badge>
  )
}