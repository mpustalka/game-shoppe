import { Skeleton } from "@/components/ui/skeleton"

export default function SetsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-2 h-5 w-96" />
      </div>

      <div className="space-y-12">
        {[1, 2, 3].map((section) => (
          <section key={section}>
            <Skeleton className="mb-4 h-7 w-48" />
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border p-4">
                  <Skeleton className="mx-auto mb-3 h-20 w-32" />
                  <Skeleton className="mx-auto mb-2 h-4 w-24" />
                  <div className="flex justify-center gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
