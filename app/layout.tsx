import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import { Header } from "@/components/layout/header"
import { InventoryProvider } from "@/lib/inventory-context"
// import { createClient } from "@/lib/supabase/server"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Card Vault - Pokemon Card Inventory Management",
  description:
    "Manage your Pokemon card inventory with barcode scanning, Square POS integration, and full set browsing",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased">
        <InventoryProvider>
          <div className="relative flex min-h-screen flex-col">
            <Header />

            <main className="flex-1">
              {children}
            </main>
          </div>

          <Toaster position="bottom-right" />
        </InventoryProvider>

        {process.env.NODE_ENV === "production" && (
          <Analytics />
        )}
      </body>
    </html>
  )
}