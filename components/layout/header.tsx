"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Search, 
  Package, 
  LayoutGrid, 
  PlusCircle, 
  QrCode,
  Menu,
  Settings,
  BookOpen,
  BarChart3,
  Upload,
  LogOut
} from "lucide-react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutGrid },
  { name: "Browse Sets", href: "/sets", icon: Package },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Binders", href: "/binders", icon: BookOpen },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Add Card", href: "/add", icon: PlusCircle },
  { name: "Import", href: "/import", icon: Upload },
  { name: "Scan", href: "/scan", icon: QrCode },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Header() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const supabase = createClient()

const handleLogout = async () => {
  await supabase.auth.signOut()
  window.location.href = "/login"
}
  const hiddenRoutes = ["/login", "/register"]

if (hiddenRoutes.includes(pathname)) {
  return null
}

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package className="h-5 w-5" />
          </div>
          <span className="hidden text-lg font-semibold tracking-tight sm:inline-block">
            Card Vault
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
         className="hidden md:flex"
             >
         <LogOut className="h-4 w-4" />
        </Button>
        {/* Search */}
        <div className="hidden flex-1 justify-end md:flex">
          <form action="/search" className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              placeholder="Search cards, SKU, or barcode..."
              className="w-full pl-9 pr-4"
            />
          </form>
        </div>

        {/* Mobile Menu Button */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[350px]">
            <div className="flex flex-col gap-6 py-4">
              {/* Mobile Search */}
              <form action="/search" className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  name="q"
                  placeholder="Search..."
                  className="w-full pl-9"
                />
              </form>

              {/* Mobile Navigation */}
              <nav className="flex flex-col gap-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || 
                    (item.href !== "/" && pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
