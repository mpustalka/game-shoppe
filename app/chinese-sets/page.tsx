import Link from "next/link"
import { ArrowLeft, Construction } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function ChineseSetsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" className="mb-6">
        <Link href="/sets">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sets
        </Link>
      </Button>

      <Card className="overflow-hidden">
        <CardContent className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Construction className="h-8 w-8 text-primary" />
          </div>

          <div className="mb-3 text-4xl">🇨🇳</div>

          <h1 className="text-3xl font-bold tracking-tight">
            Chinese Pokémon Sets
          </h1>

          <p className="mt-3 max-w-xl text-muted-foreground">
            Chinese Pokémon TCG set browsing and card data are currently
            in development.
          </p>

          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            We&apos;re working on a reliable card data source before releasing
            this section.
          </p>

          <div className="mt-6 rounded-full border border-border bg-muted/40 px-4 py-2 text-sm font-medium">
            Coming Soon
          </div>
        </CardContent>
      </Card>
    </div>
  )
}