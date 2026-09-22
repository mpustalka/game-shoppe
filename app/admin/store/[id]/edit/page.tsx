"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Package,
} from "lucide-react"

import ProductForm from "@/components/store/admin/product-form"
import { Button } from "@/components/ui/button"

export default function EditStoreProductPage() {
  const params =
    useParams<{
      id: string
    }>()

  const productId =
    params.id

  if (!productId) {
    return (
      <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <h1 className="text-xl font-black text-red-500">
            Product ID Missing
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            The product could not be opened because no product ID was provided.
          </p>

          <Button
            asChild
            variant="outline"
            className="mt-4"
          >
            <Link href="/admin/store">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Button
          asChild
          variant="ghost"
          className="-ml-3 mb-3"
        >
          <Link href="/admin/store">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Link>
        </Button>

        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
            <Package className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Edit Product
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Update product details, images, inventory, pricing, purchasing options and variants.
            </p>
          </div>
        </div>
      </div>

      <ProductForm
        productId={productId}
      />
    </div>
  )
}