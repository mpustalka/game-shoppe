"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import {
  LogOut,
  LogIn,
  User as UserIcon,
  Loader2,
  ShieldCheck,
  ChevronDown,
} from "lucide-react"
import type { User } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/client"
import { isAdminUser } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function AuthNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
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
      pathname && pathname !== "/login" ? pathname : "/"

    return (
      <Button
        asChild
        variant="outline"
        size="sm"
        className="h-9 rounded-xl border-white/10 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white"
      >
        <Link href={`/login?redirect=${encodeURIComponent(redirect)}`}>
          <LogIn className="h-4 w-4" />
          <span className="hidden sm:inline">Sign in</span>
        </Link>
      </Button>
    )
  }

  const storeName =
    (user.user_metadata?.store_name as string | undefined) ||
    undefined
  const label = storeName || user.email || "Account"
  const initial = label.charAt(0).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-2 text-white/75 hover:bg-white/10 hover:text-white sm:px-2.5"
          aria-label="Account menu"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-500/12 text-[10px] font-black text-rose-300">
            {initial || <UserIcon className="h-3.5 w-3.5" />}
          </div>
          <span className="hidden max-w-[130px] truncate text-xs font-semibold 2xl:inline">
            {label}
          </span>
          <ChevronDown className="hidden h-3.5 w-3.5 text-white/30 sm:block" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-64 rounded-2xl border-white/10 bg-[#101013] p-1.5 text-white shadow-2xl shadow-black/40"
      >
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

        {isAdminUser(user) && (
          <DropdownMenuItem asChild>
            <Link
              href="/admin"
              className="cursor-pointer rounded-xl text-white/70 focus:bg-white/10 focus:text-white"
            >
              <ShieldCheck className="mr-2 h-4 w-4 text-rose-400" />
              Admin portal
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          onSelect={handleSignOut}
          className="cursor-pointer rounded-xl text-white/70 focus:bg-white/10 focus:text-white"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}