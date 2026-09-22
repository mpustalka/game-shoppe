"use client"

import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  ChevronDown,
  ChevronRight,
  Edit,
  FolderTree,
  ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Category = {
  id: string
  name: string
  slug: string
  description: string | null

  parentId: string | null

  imageUrl: string | null
  navigationImageUrl: string | null
  bannerImageUrl: string | null
  mobileBannerImageUrl: string | null

  featured: boolean
  active: boolean
  sortOrder: number

  productCount: number

  createdAt?: string | null
  updatedAt?: string | null
}

type CategoryForm = {
  name: string
  slug: string
  description: string

  parentId: string

  imageUrl: string
  navigationImageUrl: string
  bannerImageUrl: string
  mobileBannerImageUrl: string

  featured: boolean
  active: boolean
  sortOrder: string
}

type UploadTarget =
  | "imageUrl"
  | "navigationImageUrl"
  | "bannerImageUrl"
  | "mobileBannerImageUrl"

type UploadResponse = {
  image?: {
    url?: string
    path?: string
  }

  error?: string
}

const emptyForm: CategoryForm = {
  name: "",
  slug: "",
  description: "",

  parentId: "",

  imageUrl: "",
  navigationImageUrl: "",
  bannerImageUrl: "",
  mobileBannerImageUrl: "",

  featured: false,
  active: true,
  sortOrder: "0",
}

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function categoryToForm(
  category: Category,
): CategoryForm {
  return {
    name:
      category.name ?? "",

    slug:
      category.slug ?? "",

    description:
      category.description ?? "",

    parentId:
      category.parentId ?? "",

    imageUrl:
      category.imageUrl ?? "",

    navigationImageUrl:
      category.navigationImageUrl ?? "",

    bannerImageUrl:
      category.bannerImageUrl ?? "",

    mobileBannerImageUrl:
      category.mobileBannerImageUrl ?? "",

    featured:
      category.featured === true,

    active:
      category.active !== false,

    sortOrder:
      String(
        category.sortOrder ?? 0,
      ),
  }
}

function getErrorMessage(
  data: unknown,
  fallback: string,
) {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (
      data as {
        error?: unknown
      }
    ).error === "string"
  ) {
    return (
      data as {
        error: string
      }
    ).error
  }

  return fallback
}

export default function AdminStoreCategoriesPage() {
  const [
    categories,
    setCategories,
  ] = useState<Category[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    saving,
    setSaving,
  ] = useState(false)

  const [
    deleting,
    setDeleting,
  ] = useState(false)

  const [
    uploadTarget,
    setUploadTarget,
  ] = useState<
    UploadTarget | null
  >(null)

  const [
    selectedId,
    setSelectedId,
  ] = useState<
    string | null
  >(null)

  const [
    creating,
    setCreating,
  ] = useState(false)

  const [
    form,
    setForm,
  ] = useState<CategoryForm>({
    ...emptyForm,
  })

  const [
    error,
    setError,
  ] = useState("")

  const [
    success,
    setSuccess,
  ] = useState("")

  const [
    expanded,
    setExpanded,
  ] = useState<
    Set<string>
  >(
    new Set(),
  )

  const selectedCategory =
    useMemo(
      () =>
        categories.find(
          (category) =>
            category.id ===
            selectedId,
        ) ?? null,
      [
        categories,
        selectedId,
      ],
    )

  const loadCategories =
    useCallback(
      async () => {
        setLoading(true)
        setError("")

        try {
          const response =
            await fetch(
              "/api/admin/store/categories",
              {
                cache:
                  "no-store",
              },
            )

          const data =
            await response.json()

          if (
            !response.ok
          ) {
            throw new Error(
              getErrorMessage(
                data,
                "Unable to load categories.",
              ),
            )
          }

          const nextCategories =
            Array.isArray(
              data.categories,
            )
              ? data.categories
              : []

          setCategories(
            nextCategories,
          )

          setExpanded(
            new Set(
              nextCategories
                .filter(
                  (
                    category: Category,
                  ) =>
                    !category.parentId,
                )
                .map(
                  (
                    category: Category,
                  ) =>
                    category.id,
                ),
            ),
          )
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Unable to load categories.",
          )
        } finally {
          setLoading(false)
        }
      },
      [],
    )

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  function startCreate() {
    setSelectedId(null)
    setCreating(true)

    setForm({
      ...emptyForm,
    })

    setError("")
    setSuccess("")
  }

  function startEdit(
    category: Category,
  ) {
    setSelectedId(
      category.id,
    )

    setCreating(false)

    setForm(
      categoryToForm(
        category,
      ),
    )

    setError("")
    setSuccess("")
  }

  function cancelEditor() {
    setSelectedId(null)
    setCreating(false)

    setForm({
      ...emptyForm,
    })

    setError("")
    setSuccess("")
  }

  function updateForm<
    K extends keyof CategoryForm,
  >(
    key: K,
    value: CategoryForm[K],
  ) {
    setForm(
      (current) => ({
        ...current,
        [key]:
          value,
      }),
    )
  }

  function handleNameChange(
    value: string,
  ) {
    setForm(
      (current) => {
        const previousAutoSlug =
          makeSlug(
            current.name,
          )

        const shouldUpdateSlug =
          !current.slug ||
          current.slug ===
            previousAutoSlug

        return {
          ...current,

          name:
            value,

          slug:
            shouldUpdateSlug
              ? makeSlug(
                  value,
                )
              : current.slug,
        }
      },
    )
  }

  function toggleExpanded(
    id: string,
  ) {
    setExpanded(
      (current) => {
        const next =
          new Set(
            current,
          )

        if (
          next.has(id)
        ) {
          next.delete(id)
        } else {
          next.add(id)
        }

        return next
      },
    )
  }

  const childrenByParent =
    useMemo(() => {
      const map =
        new Map<
          string,
          Category[]
        >()

      for (
        const category of
        categories
      ) {
        const parentKey =
          category.parentId ??
          "ROOT"

        const current =
          map.get(
            parentKey,
          ) ?? []

        current.push(
          category,
        )

        map.set(
          parentKey,
          current,
        )
      }

      for (
        const list of
        map.values()
      ) {
        list.sort(
          (a, b) => {
            if (
              a.sortOrder !==
              b.sortOrder
            ) {
              return (
                a.sortOrder -
                b.sortOrder
              )
            }

            return a.name.localeCompare(
              b.name,
            )
          },
        )
      }

      return map
    }, [categories])

  function isDescendant(
    possibleChildId: string,
    possibleParentId: string,
  ) {
    let current =
      categories.find(
        (category) =>
          category.id ===
          possibleChildId,
      )

    const visited =
      new Set<string>()

    while (
      current?.parentId
    ) {
      if (
        visited.has(
          current.id,
        )
      ) {
        break
      }

      visited.add(
        current.id,
      )

      if (
        current.parentId ===
        possibleParentId
      ) {
        return true
      }

      current =
        categories.find(
          (category) =>
            category.id ===
            current?.parentId,
        )
    }

    return false
  }

  const availableParents =
    useMemo(() => {
      return categories.filter(
        (category) => {
          if (
            !selectedId
          ) {
            return true
          }

          if (
            category.id ===
            selectedId
          ) {
            return false
          }

          /*
           * Prevent selecting one
           * of this category's own
           * descendants as parent.
           */
          if (
            isDescendant(
              category.id,
              selectedId,
            )
          ) {
            return false
          }

          return true
        },
      )
    }, [
      categories,
      selectedId,
    ])

  async function uploadImage(
    target: UploadTarget,
    file: File,
  ) {
    setUploadTarget(
      target,
    )

    setError("")
    setSuccess("")

    try {
      const uploadData =
        new FormData()

      uploadData.append(
        "file",
        file,
      )

      const response =
        await fetch(
          "/api/admin/store/upload",
          {
            method:
              "POST",

            body:
              uploadData,
          },
        )

      const data =
        (await response.json()) as
          UploadResponse

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ??
            "Unable to upload image.",
        )
      }

      const url =
        data.image?.url

      if (!url) {
        throw new Error(
          "The image uploaded, but no public URL was returned.",
        )
      }

      updateForm(
        target,
        url,
      )

      setSuccess(
        "Image uploaded successfully. Save the category to keep this change.",
      )
    } catch (
      uploadError
    ) {
      setError(
        uploadError instanceof
          Error
          ? uploadError.message
          : "Unable to upload image.",
      )
    } finally {
      setUploadTarget(
        null,
      )
    }
  }

  async function handleFileChange(
    target: UploadTarget,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target
        .files?.[0]

    /*
     * Allows choosing the same
     * file again if necessary.
     */
    event.target.value =
      ""

    if (!file) {
      return
    }

    await uploadImage(
      target,
      file,
    )
  }

  async function saveCategory() {
    const name =
      form.name.trim()

    if (!name) {
      setError(
        "Category name is required.",
      )

      return
    }

    const slug =
      makeSlug(
        form.slug ||
          name,
      )

    if (!slug) {
      setError(
        "A valid category slug is required.",
      )

      return
    }

    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const payload = {
        name,

        slug,

        description:
          form.description.trim() ||
          null,

        parentId:
          form.parentId ||
          null,

        imageUrl:
          form.imageUrl ||
          null,

        navigationImageUrl:
          form.navigationImageUrl ||
          null,

        bannerImageUrl:
          form.bannerImageUrl ||
          null,

        mobileBannerImageUrl:
          form.mobileBannerImageUrl ||
          null,

        featured:
          form.featured,

        active:
          form.active,

        sortOrder:
          Number(
            form.sortOrder ||
              0,
          ),
      }

      const editing =
        Boolean(
          selectedId,
        )

      const endpoint =
        editing
          ? `/api/admin/store/categories/${selectedId}`
          : "/api/admin/store/categories"

      const response =
        await fetch(
          endpoint,
          {
            method:
              editing
                ? "PUT"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                payload,
              ),
          },
        )

      const data =
        await response.json()

      if (
        !response.ok
      ) {
        throw new Error(
          getErrorMessage(
            data,
            "Unable to save category.",
          ),
        )
      }

      await loadCategories()

      if (
        data.category?.id
      ) {
        setSelectedId(
          data.category.id,
        )

        setCreating(
          false,
        )

        setForm(
          categoryToForm({
            ...data.category,

            productCount:
              data.category
                .productCount ??
              selectedCategory
                ?.productCount ??
              0,
          }),
        )
      }

      setSuccess(
        editing
          ? "Category updated successfully."
          : "Category created successfully.",
      )
    } catch (
      saveError
    ) {
      setError(
        saveError instanceof
          Error
          ? saveError.message
          : "Unable to save category.",
      )
    } finally {
      setSaving(false)
    }
  }

  async function deleteCategory() {
    if (
      !selectedCategory
    ) {
      return
    }

    const confirmed =
      window.confirm(
        `Delete "${selectedCategory.name}"?\n\nCategories containing products or subcategories cannot be deleted.`,
      )

    if (!confirmed) {
      return
    }

    setDeleting(true)
    setError("")
    setSuccess("")

    try {
      const response =
        await fetch(
          `/api/admin/store/categories/${selectedCategory.id}`,
          {
            method:
              "DELETE",
          },
        )

      const data =
        await response.json()

      if (
        !response.ok
      ) {
        throw new Error(
          getErrorMessage(
            data,
            "Unable to delete category.",
          ),
        )
      }

      cancelEditor()

      await loadCategories()

      setSuccess(
        "Category deleted.",
      )
    } catch (
      deleteError
    ) {
      setError(
        deleteError instanceof
          Error
          ? deleteError.message
          : "Unable to delete category.",
      )
    } finally {
      setDeleting(false)
    }
  }

  function renderCategory(
    category: Category,
    depth = 0,
  ) {
    const children =
      childrenByParent.get(
        category.id,
      ) ?? []

    const hasChildren =
      children.length >
      0

    const isOpen =
      expanded.has(
        category.id,
      )

    const isSelected =
      selectedId ===
      category.id

    return (
      <div
        key={
          category.id
        }
      >
        <div
          className={[
            "group flex items-center gap-2 rounded-lg border px-3 py-3 transition",
            isSelected
              ? "border-primary bg-primary/5"
              : "border-transparent hover:bg-muted/60",
          ].join(" ")}
          style={{
            marginLeft:
              depth * 18,
          }}
        >
          <button
            type="button"
            onClick={() =>
              hasChildren
                ? toggleExpanded(
                    category.id,
                  )
                : undefined
            }
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded hover:bg-muted"
          >
            {hasChildren ? (
              isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )
            ) : (
              <span className="h-4 w-4" />
            )}
          </button>

          {category.imageUrl ? (
            <img
              src={
                category.imageUrl
              }
              alt=""
              className="h-10 w-10 shrink-0 rounded-md border object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              startEdit(
                category,
              )
            }
            className="min-w-0 flex-1 text-left"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">
                {
                  category.name
                }
              </span>

              {category.featured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  <Star className="h-3 w-3" />
                  Featured
                </span>
              )}

              {!category.active && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  Hidden
                </span>
              )}
            </div>

            <div className="mt-1 text-xs text-muted-foreground">
              {
                category.productCount
              }{" "}
              product
              {category.productCount ===
              1
                ? ""
                : "s"}{" "}
              · /
              {
                category.slug
              }
            </div>
          </button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() =>
              startEdit(
                category,
              )
            }
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>

        {hasChildren &&
          isOpen &&
          children.map(
            (child) =>
              renderCategory(
                child,
                depth + 1,
              ),
          )}
      </div>
    )
  }

  const rootCategories =
    childrenByParent.get(
      "ROOT",
    ) ?? []

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FolderTree className="h-6 w-6" />

            <h1 className="text-2xl font-bold tracking-tight">
              Store Categories
            </h1>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage store
            categories,
            subcategories,
            category images and
            promotional banners.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              void loadCategories()
            }
            disabled={
              loading
            }
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}

            Refresh
          </Button>

          <Button
            type="button"
            onClick={
              startCreate
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm">
          {success}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(360px,0.9fr)_minmax(500px,1.4fr)]">
        {/* CATEGORY TREE */}

        <section className="rounded-xl border bg-card">
          <div className="border-b p-4">
            <div className="font-semibold">
              Categories
            </div>

            <div className="mt-1 text-sm text-muted-foreground">
              {
                categories.length
              }{" "}
              total categories
            </div>
          </div>

          <div className="max-h-[calc(100vh-260px)] overflow-y-auto p-3">
            {loading ? (
              <div className="flex min-h-48 items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading
                categories...
              </div>
            ) : rootCategories.length ===
              0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No categories
                found.
              </div>
            ) : (
              <div className="space-y-1">
                {rootCategories.map(
                  (
                    category,
                  ) =>
                    renderCategory(
                      category,
                    ),
                )}
              </div>
            )}
          </div>
        </section>

        {/* EDITOR */}

        <section className="rounded-xl border bg-card">
          {!creating &&
          !selectedCategory ? (
            <div className="flex min-h-[500px] flex-col items-center justify-center p-8 text-center">
              <FolderTree className="mb-4 h-12 w-12 text-muted-foreground/50" />

              <h2 className="text-lg font-semibold">
                Select a
                category
              </h2>

              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Select an
                existing category
                to edit it, or
                create a new
                category.
              </p>

              <Button
                type="button"
                className="mt-5"
                onClick={
                  startCreate
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b p-4">
                <div>
                  <h2 className="font-semibold">
                    {creating
                      ? "Add Category"
                      : `Edit ${selectedCategory?.name ?? "Category"}`}
                  </h2>

                  {!creating &&
                    selectedCategory && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {
                          selectedCategory.productCount
                        }{" "}
                        assigned
                        product
                        {selectedCategory.productCount ===
                        1
                          ? ""
                          : "s"}
                      </div>
                    )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={
                    cancelEditor
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-8 p-5">
                {/* BASIC INFORMATION */}

                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">
                      Category
                      Information
                    </h3>

                    <p className="text-sm text-muted-foreground">
                      Name,
                      hierarchy and
                      storefront
                      visibility.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium">
                        Category
                        Name *
                      </span>

                      <Input
                        value={
                          form.name
                        }
                        onChange={(
                          event,
                        ) =>
                          handleNameChange(
                            event
                              .target
                              .value,
                          )
                        }
                        placeholder="Men's Clothing"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium">
                        Slug *
                      </span>

                      <Input
                        value={
                          form.slug
                        }
                        onChange={(
                          event,
                        ) =>
                          updateForm(
                            "slug",
                            makeSlug(
                              event
                                .target
                                .value,
                            ),
                          )
                        }
                        placeholder="mens-clothing"
                      />
                    </label>
                  </div>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium">
                      Parent
                      Category
                    </span>

                    <select
                      value={
                        form.parentId
                      }
                      onChange={(
                        event,
                      ) =>
                        updateForm(
                          "parentId",
                          event
                            .target
                            .value,
                        )
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">
                        No parent —
                        Main Category
                      </option>

                      {availableParents.map(
                        (
                          category,
                        ) => (
                          <option
                            key={
                              category.id
                            }
                            value={
                              category.id
                            }
                          >
                            {
                              category.name
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium">
                      Description
                    </span>

                    <textarea
                      value={
                        form.description
                      }
                      onChange={(
                        event,
                      ) =>
                        updateForm(
                          "description",
                          event
                            .target
                            .value,
                        )
                      }
                      rows={4}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Optional category description..."
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="space-y-2">
                      <span className="text-sm font-medium">
                        Sort Order
                      </span>

                      <Input
                        type="number"
                        value={
                          form.sortOrder
                        }
                        onChange={(
                          event,
                        ) =>
                          updateForm(
                            "sortOrder",
                            event
                              .target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label className="flex items-center gap-3 rounded-lg border p-3">
                      <input
                        type="checkbox"
                        checked={
                          form.active
                        }
                        onChange={(
                          event,
                        ) =>
                          updateForm(
                            "active",
                            event
                              .target
                              .checked,
                          )
                        }
                        className="h-4 w-4"
                      />

                      <div>
                        <div className="text-sm font-medium">
                          Active
                        </div>

                        <div className="text-xs text-muted-foreground">
                          Show in
                          store
                        </div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 rounded-lg border p-3">
                      <input
                        type="checkbox"
                        checked={
                          form.featured
                        }
                        onChange={(
                          event,
                        ) =>
                          updateForm(
                            "featured",
                            event
                              .target
                              .checked,
                          )
                        }
                        className="h-4 w-4"
                      />

                      <div>
                        <div className="text-sm font-medium">
                          Featured
                        </div>

                        <div className="text-xs text-muted-foreground">
                          Feature on
                          store
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* CATEGORY IMAGES */}

                <div className="space-y-4 border-t pt-6">
                  <div>
                    <h3 className="font-medium">
                      Category Images
                    </h3>

                    <p className="text-sm text-muted-foreground">
                      These images
                      can be used
                      for category
                      cards,
                      navigation
                      and store
                      promotions.
                    </p>
                  </div>

                  <ImageField
                    title="Category Image"
                    description="Main image for this category."
                    value={
                      form.imageUrl
                    }
                    loading={
                      uploadTarget ===
                      "imageUrl"
                    }
                    onUpload={(
                      event,
                    ) =>
                      void handleFileChange(
                        "imageUrl",
                        event,
                      )
                    }
                    onRemove={() =>
                      updateForm(
                        "imageUrl",
                        "",
                      )
                    }
                  />

                  <ImageField
                    title="Navigation / Category Button Image"
                    description="Image used on category navigation cards and buttons."
                    value={
                      form.navigationImageUrl
                    }
                    loading={
                      uploadTarget ===
                      "navigationImageUrl"
                    }
                    onUpload={(
                      event,
                    ) =>
                      void handleFileChange(
                        "navigationImageUrl",
                        event,
                      )
                    }
                    onRemove={() =>
                      updateForm(
                        "navigationImageUrl",
                        "",
                      )
                    }
                  />

                  <ImageField
                    title="Desktop Banner"
                    description="Wide banner image for this category."
                    value={
                      form.bannerImageUrl
                    }
                    loading={
                      uploadTarget ===
                      "bannerImageUrl"
                    }
                    wide
                    onUpload={(
                      event,
                    ) =>
                      void handleFileChange(
                        "bannerImageUrl",
                        event,
                      )
                    }
                    onRemove={() =>
                      updateForm(
                        "bannerImageUrl",
                        "",
                      )
                    }
                  />

                  <ImageField
                    title="Mobile Banner"
                    description="Optional mobile-specific category banner."
                    value={
                      form.mobileBannerImageUrl
                    }
                    loading={
                      uploadTarget ===
                      "mobileBannerImageUrl"
                    }
                    onUpload={(
                      event,
                    ) =>
                      void handleFileChange(
                        "mobileBannerImageUrl",
                        event,
                      )
                    }
                    onRemove={() =>
                      updateForm(
                        "mobileBannerImageUrl",
                        "",
                      )
                    }
                  />
                </div>

                {/* ACTIONS */}

                <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    {!creating &&
                      selectedCategory && (
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() =>
                            void deleteCategory()
                          }
                          disabled={
                            deleting ||
                            saving
                          }
                        >
                          {deleting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                          )}

                          Delete
                          Category
                        </Button>
                      )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={
                        cancelEditor
                      }
                      disabled={
                        saving
                      }
                    >
                      Cancel
                    </Button>

                    <Button
                      type="button"
                      onClick={() =>
                        void saveCategory()
                      }
                      disabled={
                        saving ||
                        uploadTarget !==
                          null
                      }
                    >
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}

                      {creating
                        ? "Create Category"
                        : "Save Changes"}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

type ImageFieldProps = {
  title: string
  description: string
  value: string
  loading: boolean
  wide?: boolean

  onUpload: (
    event: ChangeEvent<HTMLInputElement>,
  ) => void

  onRemove: () => void
}

function ImageField({
  title,
  description,
  value,
  loading,
  wide = false,
  onUpload,
  onRemove,
}: ImageFieldProps) {
  return (
    <div className="rounded-xl border p-4">
      <div className="grid gap-4 md:grid-cols-[minmax(180px,260px)_1fr]">
        <div
          className={[
            "overflow-hidden rounded-lg border bg-muted",
            wide
              ? "aspect-[16/7]"
              : "aspect-square",
          ].join(" ")}
        >
          {value ? (
            <img
              src={value}
              alt={title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-muted-foreground">
              <ImageIcon className="mb-2 h-7 w-7" />

              <span className="text-xs">
                No image
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center">
          <div className="font-medium">
            {title}
          </div>

          <div className="mt-1 text-sm text-muted-foreground">
            {description}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={
                  loading
                }
                onChange={
                  onUpload
                }
              />

              <span className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Image
                  </>
                )}
              </span>
            </label>

            {value && (
              <Button
                type="button"
                variant="outline"
                onClick={
                  onRemove
                }
                disabled={
                  loading
                }
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </Button>
            )}
          </div>

          {value && (
            <div className="mt-3 break-all text-xs text-muted-foreground">
              {value}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}