import ProductForm from "@/components/store/admin/product-form"

export default function NewStoreProductPage() {
  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-wider text-rose-500">
          Store Administration
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          Add Product
        </h1>

        <p className="mt-2 max-w-3xl text-muted-foreground">
          Add TCG products, apparel,
          medical scrubs, Loungefly,
          Funko, figures, accessories,
          collectibles or any other
          Pokémon merchandise.
        </p>
      </div>

      <ProductForm />
    </div>
  )
}