"use client"

import { useMemo, useState } from "react"
import {
  BookOpen,
  CircleHelp,
  Search,
} from "lucide-react"

import { Input } from "@/components/ui/input"

const sections = [
  {
    title: "Getting Started",
    items: [
      ["How do I add a card?", "Open Add Card from the navigation, search for the card, choose the correct condition, finish, language and quantity, then save it to your inventory."],
      ["How do I browse sets?", "Open Browse → English Sets or Japanese Sets. Select a set to view its cards and add exact variants to your collection."],
      ["What is the Dashboard?", "The Dashboard is your collection command center. It summarizes collection value, inventory totals, recent cards, binders and quick actions."],
    ],
  },
  {
    title: "Inventory",
    items: [
      ["How does Inventory work?", "Inventory stores each card entry with its quantity, condition, finish, language, price and identifiers. Use search and filters to find cards quickly."],
      ["Can I own only one copy of a card?", "Yes. A quantity of one is fully supported. You can also list that single copy for sale; once sold and finalized, it should no longer remain available in inventory."],
      ["What are SKU and barcode values?", "They are unique inventory identifiers used for tracking, labels and optional point-of-sale workflows."],
    ],
  },
  {
    title: "Binders",
    items: [
      ["What are Budget, Mid and Premium binders?", "They organize your collection into value tiers so you can browse cards in physical 9-pocket-style binder spreads."],
      ["Can I switch between English and Japanese cards?", "Yes. The binder language selector can show English, Japanese or the supported combined view depending on the page."],
      ["How do I move a card into a Sell Binder?", "Open Binders or Sell Center, choose the card, set your sell price or trade preferences, then add it to the Sell Binder."],
    ],
  },
  {
    title: "Selling & Trading",
    items: [
      ["Does Team Rocket Markets charge a selling fee?", "No. The marketplace currently uses a 0% selling-fee model."],
      ["Does Team Rocket Markets collect buyer payments?", "No. Payments are peer-to-peer. Buyers and sellers arrange payment directly with each other."],
      ["Who chooses shipping?", "The seller chooses the shipping methods and can describe additional shipping terms on the listing."],
      ["Can I list a card for trade only?", "Yes. Listings can be For Sale, For Trade, or Sale / Trade."],
      ["Can I sell my only copy?", "Yes. If one copy is available, that copy can be listed. The system should only block a listing when the available quantity is zero."],
    ],
  },
  {
    title: "Messages",
    items: [
      ["Who can use private messages?", "Signed-in users can privately message other signed-in collectors."],
      ["Are messages public?", "No. Conversation access is restricted to members of that conversation."],
      ["What should marketplace chat be used for?", "Use it to discuss payment preferences, shipping, trades, condition, extra photos and other transaction details."],
    ],
  },
  {
    title: "Account, Billing & Premium",
    items: [
      ["What does Premium unlock?", "Premium features can include Analytics, Showcase, Customer Lists, Import, Scan and other advanced tools based on your current subscription entitlements."],
      ["Where do I manage billing?", "Open Settings and select the Payments/Billing tab."],
      ["Where do I manage integrations?", "Open Settings → Integrations."],
    ],
  },
  {
    title: "Support",
    items: [
      ["How do I contact support?", "Open Support from the More menu and create a private support request, or email admin@evileevee.com."],
      ["Is support live chat?", "No. Support requests are asynchronous and are typically answered within 24–48 hours."],
      ["What should I include in a technical support request?", "Include the page you were using, what you clicked, what you expected, what happened, and any visible error message."],
    ],
  },
]

export default function FAQPage() {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return sections

    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter(([question, answer]) =>
          `${question} ${answer}`.toLowerCase().includes(query),
        ),
      }))
      .filter((section) => section.items.length > 0)
  }, [search])

  return (
    <main className="min-h-screen bg-[#070708] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_0%_0%,rgba(225,29,72,.18),transparent_34%),rgba(255,255,255,.03)] p-5 sm:p-7">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-300">
            <CircleHelp className="h-4 w-4" />
            Help Center
          </div>

          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">
            How to use Team Rocket Markets
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
            Search common questions about inventory, binders, selling, trading,
            messaging, billing and support.
          </p>

          <div className="relative mt-6 max-w-2xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search the FAQ..."
              className="h-12 rounded-xl border-white/10 bg-white/[0.045] pl-9 text-white placeholder:text-white/30"
            />
          </div>
        </section>

        <div className="mt-5 space-y-5">
          {filtered.map((section) => (
            <section
              key={section.title}
              className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]"
            >
              <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
                <BookOpen className="h-4 w-4 text-rose-400" />
                <h2 className="font-black">{section.title}</h2>
              </div>

              <div className="divide-y divide-white/8">
                {section.items.map(([question, answer]) => (
                  <details
                    key={question}
                    className="group px-5 py-4 open:bg-white/[0.025]"
                  >
                    <summary className="cursor-pointer list-none font-semibold text-white/85">
                      <div className="flex items-center justify-between gap-4">
                        <span>{question}</span>
                        <span className="text-lg text-rose-400 transition group-open:rotate-45">
                          +
                        </span>
                      </div>
                    </summary>

                    <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">
                      {answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          ))}

          {filtered.length === 0 && (
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-14 text-center text-white/40">
              No FAQ answers match that search.
            </div>
          )}
        </div>
      </div>
    </main>
  )
}