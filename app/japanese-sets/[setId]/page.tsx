import { notFound } from "next/navigation"
import Link from "next/link"
import { getJapaneseSetById, getJapaneseCardsBySet } from "@/lib/japanese-tcg"
import { CardGrid } from "@/components/cards/card-grid"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, Layers, Sparkles } from "lucide-react"

interface JapaneseSetDetailPageProps {
  params: Promise<{ setId: string }>
}

export async function generateMetadata({ params }: JapaneseSetDetailPageProps) {
  const { setId } = await params
  const set = await getJapaneseSetById(setId)
  if (!set) return { title: "Set Not Found - Team Rocket Markets" }
  return {
    title: `${set.name} - Team Rocket Markets`,
    description: `Browse and add ${set.total} cards from ${set.name} to your inventory`,
  }
}

export default async function JapaneseSetDetailPage({ params }: JapaneseSetDetailPageProps) {
  const { setId } = await params
  const [set, cards] = await Promise.all([
    getJapaneseSetById(setId),
    getJapaneseCardsBySet(setId),
  ])
  if (!set) notFound()

  const releaseDate = set.releaseDate ? new Date(set.releaseDate) : null
  const formattedDate =
    releaseDate && !Number.isNaN(releaseDate.getTime())
      ? releaseDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : "Unknown"

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#070708] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(225,29,72,.18),transparent_34%),radial-gradient(circle_at_90%_10%,rgba(127,29,29,.12),transparent_30%)]" />
        <div className="relative mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-9 lg:px-8">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-6 rounded-xl text-white/55 hover:bg-white/[0.06] hover:text-white">
            <Link href="/japanese-sets"><ArrowLeft className="mr-2 h-4 w-4" />Japanese Sets</Link>
          </Button>

          <div className="flex flex-col gap-7 md:flex-row md:items-center">
            <div className="flex min-h-36 w-full items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.035] p-6 md:w-[300px]">
              {set.images.logo ? (
                <img src={set.images.logo} alt={`${set.name} logo`} className="max-h-28 max-w-full object-contain" />
              ) : set.images.symbol ? (
                <img src={set.images.symbol} alt={`${set.name} symbol`} className="max-h-24 max-w-full object-contain" />
              ) : (
                <Layers className="h-14 w-14 text-white/20" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <Badge className="border border-rose-400/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/10">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />Japanese Set
              </Badge>
              <div className="mt-4 flex items-center gap-3">
                {set.images.symbol && <img src={set.images.symbol} alt="" className="h-8 w-8 shrink-0 object-contain" />}
                <h1 className="text-4xl font-black tracking-[-0.045em] sm:text-5xl">{set.name}</h1>
              </div>
              <p className="mt-2 text-lg font-medium text-white/45">{set.series}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-white/65">
                  <Layers className="mr-1.5 h-3.5 w-3.5" />{set.total} cards
                </Badge>
                <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-white/65">
                  <Calendar className="mr-1.5 h-3.5 w-3.5" />Released {formattedDate}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        {cards.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/15 bg-white/[0.025] px-6 py-16 text-center">
            <Layers className="mx-auto mb-4 h-10 w-10 text-white/20" />
            <h2 className="text-xl font-black">Card list coming soon</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/40">
              {set.name} is a brand-new release. Individual cards will appear automatically as soon as they are published.
            </p>
          </div>
        ) : (
          <CardGrid cards={cards} setId={setId} language="ja" />
        )}
      </div>
    </main>
  )
}