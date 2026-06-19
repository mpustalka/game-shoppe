import { Skeleton } from "@/components/ui/skeleton"

export default function SetDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="mb-6 h-9 w-24" />

      <div className="mb-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <Skeleton className="h-24 w-48" />
        <div className="flex-1">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="mt-1 h-6 w-32" />
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-2">
            <Skeleton className="aspect-[2.5/3.5] w-full rounded-lg" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-1 h-3 w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}
