"use client"

import {
  useEffect,
  useState,
} from "react"
import {
  useParams,
} from "next/navigation"
import {
  Loader2,
  PackageX,
} from "lucide-react"

import ProductDetail from "@/components/store/product-detail"

import {
  Button,
} from "@/components/ui/button"

type ProductData =
  Parameters<
    typeof ProductDetail
  >[0]["product"]

export default function StoreProductPage() {
  const params =
    useParams<{
      slug: string
    }>()

  const slug =
    params.slug

  const [
    product,
    setProduct,
  ] = useState<
    ProductData | null
  >(null)

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState("")

  useEffect(() => {
    if (!slug) {
      return
    }

    let cancelled = false

    async function loadProduct() {
      setLoading(true)
      setError("")

      try {
        const response =
          await fetch(
            `/api/store/products/${encodeURIComponent(
              slug,
            )}`,
            {
              cache:
                "no-store",
            },
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ??
              "Unable to load product",
          )
        }

        if (!cancelled) {
          setProduct(
            data.product,
          )
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof
              Error
              ? error.message
              : "Unable to load product",
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadProduct()

    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-rose-500" />

          <p className="mt-3 font-semibold">
            Loading product...
          </p>
        </div>
      </div>
    )
  }

  if (
    error ||
    !product
  ) {
    return (
      <div className="mx-auto flex min-h-[65vh] max-w-xl items-center justify-center px-4">
        <div className="w-full rounded-2xl border bg-card p-8 text-center">
          <PackageX className="mx-auto h-12 w-12 text-muted-foreground" />

          <h1 className="mt-4 text-xl font-black">
            Product Not
            Available
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {error ||
              "This product could not be found."}
          </p>

          <Button
            asChild
            className="mt-5"
          >
            <a href="/store">
              Back to Store
            </a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <ProductDetail
      product={product}
    />
  )
}