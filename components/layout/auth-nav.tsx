"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  usePathname,
  useRouter,
} from "next/navigation"
import {
  Building2,
  ChevronDown,
  CreditCard,
  FileUp,
  LifeBuoy,
  Loader2,
  LogIn,
  LogOut,
  Plug,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Users,
  User as UserIcon,
} from "lucide-react"
import type { User } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

  user: {
    id: string
    email: string | null
  } | null

  company: {
    id: string
    name: string | null
    slug: string | null
    role: CompanyRole
    permissions?: Record<string, unknown>
    membershipStatus?: string | null
    subscriptionStatus?: string | null
    subscriptionPlan?: string | null
    billingInterval?: string | null
    trialPlan?: string | null
    trialStartedAt?: string | null
    trialEndsAt?: string | null
    includedSeats?: number | null
  } | null
}

export function AuthNav() {
  const router = useRouter()
  const pathname = usePathname()

  const [user, setUser] =
    useState<User | null>(null)

  const [
    accountAccess,
    setAccountAccess,
  ] =
    useState<AccountAccess | null>(
      null,
    )

  const [loading, setLoading] =
    useState(true)

  async function loadAccountAccess() {
    try {
      const response = await fetch(
        "/api/account/access",
        {
          cache: "no-store",
        },
      )

      if (!response.ok) {
        setAccountAccess(null)
        return
      }

      const data =
        (await response.json()) as AccountAccess

      setAccountAccess(data)
    } catch (error) {
      console.error(
        "Unable to load account access:",
        error,
      )

      setAccountAccess(null)
    }
  }

  useEffect(() => {
    const supabase =
      createClient()

    let active = true

    async function loadUser() {
      const { data } =
        await supabase.auth.getUser()

      if (!active) return

      setUser(data.user)

      if (data.user) {
        await loadAccountAccess()
      } else {
        setAccountAccess(null)
      }

      if (active) {
        setLoading(false)
      }
    }

    void loadUser()

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!active) return

          const nextUser =
            session?.user ?? null

          setUser(nextUser)

          if (nextUser) {
            void loadAccountAccess()
          } else {
            setAccountAccess(null)
          }

          setLoading(false)
        },
      )

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSignOut() {
    const supabase =
      createClient()

    await supabase.auth.signOut()

    setUser(null)
    setAccountAccess(null)

    router.push("/")
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/35">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    )
  }

  if (!user) {
    const redirect =
      pathname &&
      pathname !== "/login"
        ? pathname
        : "/"

    return (
      <Button
        asChild
        variant="outline"
        size="sm"
        className="h-9 rounded-xl border-white/10 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white"
      >
        <Link
          href={`/login?redirect=${encodeURIComponent(
            redirect,
          )}`}
        >
          <LogIn className="h-4 w-4" />

          <span className="hidden sm:inline">
            Sign in
          </span>
        </Link>
      </Button>
    )
  }

  const isBusiness =
    accountAccess?.accountType ===
      "business" &&
    accountAccess.company !== null

  const isSuperAdmin =
    accountAccess?.isSuperAdmin ===
    true

  const company =
    isBusiness
      ? accountAccess.company
      : null

  const companyRole =
    company?.role ?? null

  const canManageBusiness =
    companyRole === "owner" ||
    companyRole === "manager"

  const isBusinessOwner =
    companyRole === "owner"

  const storeName =
    (user.user_metadata
      ?.store_name as
      | string
      | undefined) ||
    undefined

  const label =
    company?.name ||
    storeName ||
    user.email ||
    "Account"

  const initial =
    label.charAt(0).toUpperCase()

  const businessPlan =
    company?.trialPlan ||
    company?.subscriptionPlan

  const businessStatus =
    company?.subscriptionStatus

  function formatRole(
    role: CompanyRole,
  ) {
    return (
      role.charAt(0).toUpperCase() +
      role.slice(1)
    )
  }

  function formatPlan(
    plan?: string | null,
  ) {
    if (!plan) return null

    return (
      plan.charAt(0).toUpperCase() +
      plan.slice(1)
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild
      >
        <Button
          variant="ghost"
          className="h-9 gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-2 text-white/75 hover:bg-white/10 hover:text-white sm:px-2.5"
          aria-label="Account menu"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-500/12 text-[10px] font-black text-rose-300">
            {initial || (
              <UserIcon className="h-3.5 w-3.5" />
            )}
          </div>

          <span className="hidden max-w-[150px] truncate text-xs font-semibold 2xl:inline">
            {label}
          </span>

          <ChevronDown className="hidden h-3.5 w-3.5 text-white/30 sm:block" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-72 rounded-2xl border-white/10 bg-[#101013] p-1.5 text-white shadow-2xl shadow-black/40"
      >
        {isBusiness &&
        company ? (
          <>
            <DropdownMenuLabel className="flex flex-col gap-1 px-3 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-300">
                  <Building2 className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <span className="block truncate font-semibold text-white">
                    {company.name ||
                      "Business"}
                  </span>

                  <span className="block text-xs font-normal text-white/40">
                    {formatRole(
                      company.role,
                    )}

                    {businessPlan
                      ? ` · ${formatPlan(
                          businessPlan,
                        )}`
                      : ""}

                    {businessStatus ===
                    "trialing"
                      ? " Trial"
                      : ""}
                  </span>
                </div>
              </div>

              {user.email && (
                <span className="mt-1 truncate text-xs font-normal text-white/30">
                  {user.email}
                </span>
              )}
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="bg-white/10" />

            <DropdownMenuItem
              asChild
            >
              <Link
                href="/business"
                className="cursor-pointer rounded-xl text-white/70 focus:bg-white/10 focus:text-white"
              >
                <Building2 className="mr-2 h-4 w-4 text-rose-400" />
                Business Dashboard
              </Link>
            </DropdownMenuItem>

            {canManageBusiness && (
              <>
                <DropdownMenuItem
                  asChild
                >
                  <Link
                    href="/business/team"
                    className="cursor-pointer rounded-xl text-white/70 focus:bg-white/10 focus:text-white"
                  >
                    <Users className="mr-2 h-4 w-4 text-rose-400" />
                    Manage Team
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem
                  asChild
                >
                  <Link
                    href="/business/integrations"
                    className="cursor-pointer rounded-xl text-white/70 focus:bg-white/10 focus:text-white"
                  >
                    <Plug className="mr-2 h-4 w-4 text-rose-400" />
                    Integrations
                  </Link>
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuItem
              asChild
            >
              <Link
                href="/import"
                className="cursor-pointer rounded-xl text-white/70 focus:bg-white/10 focus:text-white"
              >
                <FileUp className="mr-2 h-4 w-4 text-rose-400" />
                Import / Export
              </Link>
            </DropdownMenuItem>

            {isBusinessOwner && (
              <DropdownMenuItem
                asChild
              >
                <Link
                  href="/business/billing"
                  className="cursor-pointer rounded-xl text-white/70 focus:bg-white/10 focus:text-white"
                >
                  <CreditCard className="mr-2 h-4 w-4 text-rose-400" />
                  Billing & Plan
                </Link>
              </DropdownMenuItem>
            )}

            {canManageBusiness && (
              <DropdownMenuItem
                asChild
              >
                <Link
                  href="/business/settings"
                  className="cursor-pointer rounded-xl text-white/70 focus:bg-white/10 focus:text-white"
                >
                  <Settings className="mr-2 h-4 w-4 text-rose-400" />
                  Business Settings
                </Link>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              asChild
            >
              <Link
                href="/support"
                className="cursor-pointer rounded-xl text-white/70 focus:bg-white/10 focus:text-white"
              >
                <LifeBuoy className="mr-2 h-4 w-4 text-rose-400" />
                Support
              </Link>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuLabel className="flex flex-col gap-1 px-3 py-2.5">
              <span className="truncate font-semibold text-white">
                {label}
              </span>

              {user.email && (
                <span className="truncate text-xs font-normal text-white/35">
                  {user.email}
                </span>
              )}
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="bg-white/10" />

            <DropdownMenuItem
              asChild
            >
              <Link
                href="/orders"
                className="cursor-pointer rounded-xl text-white/70 focus:bg-white/10 focus:text-white"
              >
                <ShoppingBag className="mr-2 h-4 w-4 text-rose-400" />
                My Orders
              </Link>
            </DropdownMenuItem>

            {isSuperAdmin && (
              <DropdownMenuItem
                asChild
              >
                <Link
                  href="/admin"
                  className="cursor-pointer rounded-xl text-white/70 focus:bg-white/10 focus:text-white"
                >
                  <ShieldCheck className="mr-2 h-4 w-4 text-rose-400" />
                  Admin Portal
                </Link>
              </DropdownMenuItem>
            )}
          </>
        )}

        <DropdownMenuSeparator className="bg-white/10" />

        <DropdownMenuItem
          onSelect={
            handleSignOut
          }
          className="cursor-pointer rounded-xl text-white/70 focus:bg-white/10 focus:text-white"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}