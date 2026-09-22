import Link from "next/link"
import {
  ArrowLeft,
  Pencil,
} from "lucide-react"

import ProductForm from "@/components/store/admin/product-form"
import { Button } from "@/components/ui/button"

type PageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function EditStoreProductPage({
  params,
}: PageProps) {
  const { id } = await params

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <Button
          asChild
          variant="ghost"
          className="mb-4 -ml-3"
        >
          <Link href="/admin/store">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Store
          </Link>
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
            <Pencil className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-3xl font-black tracking-tight">
              Edit Product
            </h1>

            <p className="mt-1 text-muted-foreground">
              Update product details,
              inventory, pricing,
              images and availability.
            </p>
          </div>
        </div>
      </div>

      <ProductForm
        productId={id}
      />
    </div>
  )
}