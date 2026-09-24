import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"

import { Toaster } from "@/components/ui/sonner"
import { Header } from "@/components/layout/header"
import { InventoryProvider } from "@/lib/inventory-context"
import StoreCartProviderWrapper from "@/components/store/store-cart-provider"

import "./globals.css"

const _geist = Geist({
  subsets: ["latin"],
})

const _geistMono = Geist_Mono({
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "Team Rocket Markets | Pokémon TCG Store & Collection Manager",
    template: "%s | Team Rocket Markets",
  },

  description:
    "Shop Pokémon TCG cards, sealed products, collectibles, exclusive nursing scrubs and more at Team Rocket Markets. Collectors can also track Pokémon cards, organize binders, monitor collection value, browse English and Japanese sets, and manage their inventory.",

  keywords: [
    "Team Rocket Markets",
    "Pokemon TCG",
    "Pokémon TCG",
    "Pokemon cards",
    "Pokémon cards",
    "Pokemon card store",
    "Pokémon card store",
    "Pokemon TCG store",
    "sealed Pokemon products",
    "Pokemon collectibles",
    "Pokemon card inventory",
    "Pokemon collection tracker",
    "Pokemon card scanner",
    "Pokemon binders",
    "Japanese Pokemon cards",
    "English Pokemon cards",
    "nursing scrubs",
    "Pokemon scrubs",
    "collectibles",
  ],

  applicationName: "Team Rocket Markets",

  openGraph: {
    type: "website",
    siteName: "Team Rocket Markets",
    title: "Team Rocket Markets | Pokémon TCG Store & Collection Manager",
    description:
      "Shop Pokémon TCG, sealed products, collectibles, exclusive nursing scrubs and more. Track your cards, build binders and manage your Pokémon collection with Team Rocket Markets.",
  },

  twitter: {
    card: "summary_large_image",
    title: "Team Rocket Markets | Pokémon TCG Store & Collection Manager",
    description:
      "Shop Pokémon TCG, collectibles, exclusive nursing scrubs and more while managing your Pokémon card collection.",
  },

  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
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
              <StoreCartProviderWrapper>
                {children}
              </StoreCartProviderWrapper>
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