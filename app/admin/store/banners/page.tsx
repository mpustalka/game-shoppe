"use client"

import Image from "next/image"
import Link from "next/link"

import {
  ChangeEvent,
  useCallback,
  useEffect,
  useState,
} from "react"

import {
  ArrowLeft,
  CalendarDays,
  Edit,
  Eye,
  EyeOff,
  ImageIcon,
  Loader2,
  Monitor,
  Plus,
  Save,
  Smartphone,
  Trash2,
  Upload,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type StoreBanner = {
  id: string

  title: string
  subtitle: string | null

  image_url: string
  mobile_image_url:
    | string
    | null

  button_text:
    | string
    | null

  button_url:
    | string
    | null

  active: boolean
  sort_order: number

  starts_at:
    | string
    | null

  ends_at:
    | string
    | null

  created_at: string
  updated_at: string
}

type BannerForm = {
  title: string
  subtitle: string

  image_url: string
  mobile_image_url: string

  button_text: string
  button_url: string

  active: boolean

  sort_order: string

  starts_at: string
  ends_at: string
}

const emptyForm: BannerForm = {
  title: "",
  subtitle: "",

  image_url: "",
  mobile_image_url: "",

  button_text: "",
  button_url: "",

  active: true,

  sort_order: "0",

  starts_at: "",
  ends_at: "",
}

function toLocalDateTime(
  value:
    | string
    | null,
) {
  if (!value) {
    return ""
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return ""
  }

  const offset =
    date.getTimezoneOffset()

  const local =
    new Date(
      date.getTime() -
        offset * 60000,
    )

  return local
    .toISOString()
    .slice(0, 16)
}

function toIsoDateTime(
  value: string,
) {
  if (!value) {
    return null
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null
  }

  return date.toISOString()
}

export default function AdminStoreBannersPage() {
  const [
    banners,
    setBanners,
  ] =
    useState<
      StoreBanner[]
    >([])

  const [
    form,
    setForm,
  ] =
    useState<BannerForm>(
      emptyForm,
    )

  const [
    editingId,
    setEditingId,
  ] =
    useState<
      string | null
    >(null)

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const [
    saving,
    setSaving,
  ] =
    useState(false)

  const [
    desktopUploading,
    setDesktopUploading,
  ] =
    useState(false)

  const [
    mobileUploading,
    setMobileUploading,
  ] =
    useState(false)

  const [
    deletingId,
    setDeletingId,
  ] =
    useState<
      string | null
    >(null)

  const [
    error,
    setError,
  ] =
    useState("")

  const [
    message,
    setMessage,
  ] =
    useState("")

  const loadBanners =
    useCallback(
      async () => {
        setLoading(true)
        setError("")

        try {
          const response =
            await fetch(
              "/api/admin/store/banners",
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
                "Unable to load banners.",
            )
          }

          setBanners(
            data.banners ??
              [],
          )
        } catch (error) {
          setError(
            error instanceof
              Error
              ? error.message
              : "Unable to load banners.",
          )
        } finally {
          setLoading(false)
        }
      },
      [],
    )

  useEffect(() => {
    void loadBanners()
  }, [loadBanners])

  function updateForm<
    K extends keyof BannerForm,
  >(
    key: K,
    value: BannerForm[K],
  ) {
    setForm(
      (current) => ({
        ...current,
        [key]: value,
      }),
    )
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
    setError("")
    setMessage("")
  }

  function editBanner(
    banner: StoreBanner,
  ) {
    setEditingId(
      banner.id,
    )

    setForm({
      title:
        banner.title,

      subtitle:
        banner.subtitle ??
        "",

      image_url:
        banner.image_url,

      mobile_image_url:
        banner.mobile_image_url ??
        "",

      button_text:
        banner.button_text ??
        "",

      button_url:
        banner.button_url ??
        "",

      active:
        banner.active,

      sort_order:
        String(
          banner.sort_order ??
            0,
        ),

      starts_at:
        toLocalDateTime(
          banner.starts_at,
        ),

      ends_at:
        toLocalDateTime(
          banner.ends_at,
        ),
    })

    setError("")
    setMessage("")

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  async function uploadImage(
    file: File,
    type:
      | "desktop"
      | "mobile",
  ) {
    const setUploading =
      type === "desktop"
        ? setDesktopUploading
        : setMobileUploading

    setUploading(true)
    setError("")

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
            method: "POST",
            body: uploadData,
          },
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Image upload failed.",
        )
      }

      const url =
        data.image?.url

      if (!url) {
        throw new Error(
          "Upload completed without an image URL.",
        )
      }

      if (
        type ===
        "desktop"
      ) {
        updateForm(
          "image_url",
          url,
        )
      } else {
        updateForm(
          "mobile_image_url",
          url,
        )
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Image upload failed.",
      )
    } finally {
      setUploading(false)
    }
  }

  function handleUpload(
    event: ChangeEvent<HTMLInputElement>,
    type:
      | "desktop"
      | "mobile",
  ) {
    const file =
      event.target
        .files?.[0]

    if (file) {
      void uploadImage(
        file,
        type,
      )
    }

    event.target.value =
      ""
  }

  async function saveBanner() {
    setError("")
    setMessage("")

    if (
      !form.title.trim()
    ) {
      setError(
        "Banner title is required.",
      )

      return
    }

    if (
      !form.image_url
    ) {
      setError(
        "Upload a desktop banner image.",
      )

      return
    }

    setSaving(true)

    try {
      const payload = {
        title:
          form.title,

        subtitle:
          form.subtitle,

        image_url:
          form.image_url,

        mobile_image_url:
          form.mobile_image_url,

        button_text:
          form.button_text,

        button_url:
          form.button_url,

        active:
          form.active,

        sort_order:
          Number(
            form.sort_order,
          ) || 0,

        starts_at:
          toIsoDateTime(
            form.starts_at,
          ),

        ends_at:
          toIsoDateTime(
            form.ends_at,
          ),
      }

      const url =
        editingId
          ? `/api/admin/store/banners/${editingId}`
          : "/api/admin/store/banners"

      const response =
        await fetch(
          url,
          {
            method:
              editingId
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

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Unable to save banner.",
        )
      }

      setMessage(
        editingId
          ? "Banner updated."
          : "Banner created.",
      )

      setForm(emptyForm)
      setEditingId(null)

      await loadBanners()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to save banner.",
      )
    } finally {
      setSaving(false)
    }
  }

  async function toggleBanner(
    banner: StoreBanner,
  ) {
    setError("")

    try {
      const response =
        await fetch(
          `/api/admin/store/banners/${banner.id}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                ...banner,

                active:
                  !banner.active,
              }),
          },
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Unable to update banner.",
        )
      }

      await loadBanners()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to update banner.",
      )
    }
  }

  async function deleteBanner(
    banner: StoreBanner,
  ) {
    const confirmed =
      window.confirm(
        `Delete "${banner.title}"? This cannot be undone.`,
      )

    if (!confirmed) {
      return
    }

    setDeletingId(
      banner.id,
    )

    setError("")

    try {
      const response =
        await fetch(
          `/api/admin/store/banners/${banner.id}`,
          {
            method:
              "DELETE",
          },
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Unable to delete banner.",
        )
      }

      if (
        editingId ===
        banner.id
      ) {
        resetForm()
      }

      await loadBanners()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to delete banner.",
      )
    } finally {
      setDeletingId(
        null,
      )
    }
  }

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      {/* HEADER */}

      <div className="mb-8">
        <Button
          asChild
          variant="ghost"
          className="-ml-3 mb-3"
        >
          <Link href="/admin/store">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Store Products
          </Link>
        </Button>

        <p className="text-sm font-bold uppercase tracking-wider text-rose-500">
          Storefront
        </p>

        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
          Store Banners
        </h1>

        <p className="mt-2 max-w-3xl text-muted-foreground">
          Manage storefront
          promotions, hero images,
          scheduled campaigns and
          mobile-specific artwork.
        </p>
      </div>

      {/* MESSAGES */}

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600">
          {message}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[480px_minmax(0,1fr)]">
        {/* EDITOR */}

        <div>
          <div className="sticky top-6 rounded-2xl border bg-card">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="font-black">
                  {editingId
                    ? "Edit Banner"
                    : "New Banner"}
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  Desktop image is
                  required.
                </p>
              </div>

              {editingId && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={
                    resetForm
                  }
                >
                  <X className="mr-1 h-4 w-4" />
                  Cancel
                </Button>
              )}
            </div>

            <div className="space-y-5 p-5">
              <Field
                label="Banner Title"
                required
              >
                <Input
                  value={
                    form.title
                  }
                  onChange={(
                    event,
                  ) =>
                    updateForm(
                      "title",
                      event.target
                        .value,
                    )
                  }
                  placeholder="Fall Pokémon Collection"
                />
              </Field>

              <Field label="Subtitle">
                <Input
                  value={
                    form.subtitle
                  }
                  onChange={(
                    event,
                  ) =>
                    updateForm(
                      "subtitle",
                      event.target
                        .value,
                    )
                  }
                  placeholder="New hoodies, collectibles and more"
                />
              </Field>

              {/* DESKTOP */}

              <Field
                label="Desktop Banner"
                required
              >
                {form.image_url ? (
                  <div className="relative overflow-hidden rounded-xl border bg-muted">
                    <div className="relative aspect-[16/6]">
                      <Image
                        src={
                          form.image_url
                        }
                        alt="Desktop banner"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>

                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute right-2 top-2"
                      onClick={() =>
                        updateForm(
                          "image_url",
                          "",
                        )
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <UploadBox
                    icon={
                      Monitor
                    }
                    label="Upload Desktop Banner"
                    loading={
                      desktopUploading
                    }
                    onChange={(
                      event,
                    ) =>
                      handleUpload(
                        event,
                        "desktop",
                      )
                    }
                  />
                )}
              </Field>

              {/* MOBILE */}

              <Field label="Mobile Banner">
                {form.mobile_image_url ? (
                  <div className="relative mx-auto max-w-[220px] overflow-hidden rounded-xl border bg-muted">
                    <div className="relative aspect-[4/5]">
                      <Image
                        src={
                          form.mobile_image_url
                        }
                        alt="Mobile banner"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>

                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute right-2 top-2"
                      onClick={() =>
                        updateForm(
                          "mobile_image_url",
                          "",
                        )
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <UploadBox
                    icon={
                      Smartphone
                    }
                    label="Upload Mobile Banner"
                    loading={
                      mobileUploading
                    }
                    onChange={(
                      event,
                    ) =>
                      handleUpload(
                        event,
                        "mobile",
                      )
                    }
                  />
                )}

                <p className="mt-2 text-xs text-muted-foreground">
                  Optional. Desktop
                  image will be used
                  when no mobile
                  image is supplied.
                </p>
              </Field>

              {/* CTA */}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Button Text">
                  <Input
                    value={
                      form.button_text
                    }
                    onChange={(
                      event,
                    ) =>
                      updateForm(
                        "button_text",
                        event.target
                          .value,
                      )
                    }
                    placeholder="Shop Now"
                  />
                </Field>

                <Field label="Button URL">
                  <Input
                    value={
                      form.button_url
                    }
                    onChange={(
                      event,
                    ) =>
                      updateForm(
                        "button_url",
                        event.target
                          .value,
                      )
                    }
                    placeholder="/store/category/apparel"
                  />
                </Field>
              </div>

              <Field label="Sort Order">
                <Input
                  type="number"
                  value={
                    form.sort_order
                  }
                  onChange={(
                    event,
                  ) =>
                    updateForm(
                      "sort_order",
                      event.target
                        .value,
                    )
                  }
                />
              </Field>

              {/* SCHEDULE */}

              <div className="rounded-xl border p-4">
                <div className="mb-4 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-rose-500" />

                  <p className="font-bold">
                    Schedule
                  </p>
                </div>

                <div className="space-y-4">
                  <Field label="Starts">
                    <Input
                      type="datetime-local"
                      value={
                        form.starts_at
                      }
                      onChange={(
                        event,
                      ) =>
                        updateForm(
                          "starts_at",
                          event.target
                            .value,
                        )
                      }
                    />
                  </Field>

                  <Field label="Ends">
                    <Input
                      type="datetime-local"
                      value={
                        form.ends_at
                      }
                      onChange={(
                        event,
                      ) =>
                        updateForm(
                          "ends_at",
                          event.target
                            .value,
                        )
                      }
                    />
                  </Field>
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  Leave both empty
                  to show the banner
                  indefinitely.
                </p>
              </div>

              {/* ACTIVE */}

              <label className="flex cursor-pointer items-center justify-between rounded-xl border p-4">
                <div>
                  <p className="font-bold">
                    Active
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Allow this banner
                    to appear on the
                    storefront.
                  </p>
                </div>

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
                      event.target
                        .checked,
                    )
                  }
                  className="h-5 w-5"
                />
              </label>

              <Button
                className="w-full bg-rose-600 text-white hover:bg-rose-500"
                size="lg"
                disabled={
                  saving ||
                  desktopUploading ||
                  mobileUploading
                }
                onClick={() =>
                  void saveBanner()
                }
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {editingId
                      ? "Update Banner"
                      : "Create Banner"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* EXISTING */}

        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black">
                Existing Banners
              </h2>

              <p className="text-sm text-muted-foreground">
                {
                  banners.length
                }{" "}
                banner
                {banners.length ===
                1
                  ? ""
                  : "s"}
              </p>
            </div>

            <Button
              variant="outline"
              onClick={
                resetForm
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              New Banner
            </Button>
          </div>

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center rounded-2xl border bg-card">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
          ) : banners.length ===
            0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border bg-card p-8 text-center">
              <ImageIcon className="h-10 w-10 text-muted-foreground" />

              <h3 className="mt-4 font-black">
                No banners yet
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Create your first
                storefront banner
                using the editor.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {banners.map(
                (banner) => (
                  <BannerCard
                    key={
                      banner.id
                    }
                    banner={
                      banner
                    }
                    deleting={
                      deletingId ===
                      banner.id
                    }
                    onEdit={() =>
                      editBanner(
                        banner,
                      )
                    }
                    onToggle={() =>
                      void toggleBanner(
                        banner,
                      )
                    }
                    onDelete={() =>
                      void deleteBanner(
                        banner,
                      )
                    }
                  />
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function BannerCard({
  banner,
  deleting,
  onEdit,
  onToggle,
  onDelete,
}: {
  banner: StoreBanner
  deleting: boolean
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const now =
    Date.now()

  const starts =
    banner.starts_at
      ? new Date(
          banner.starts_at,
        ).getTime()
      : null

  const ends =
    banner.ends_at
      ? new Date(
          banner.ends_at,
        ).getTime()
      : null

  const scheduled =
    starts !== null &&
    starts > now

  const expired =
    ends !== null &&
    ends < now

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="relative aspect-[16/5] bg-muted">
        <Image
          src={
            banner.image_url
          }
          alt={
            banner.title
          }
          fill
          className="object-cover"
          unoptimized
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
          <div className="mb-2 flex flex-wrap gap-2">
            {banner.active ? (
              <Badge className="bg-emerald-600 text-white">
                ACTIVE
              </Badge>
            ) : (
              <Badge variant="secondary">
                INACTIVE
              </Badge>
            )}

            {scheduled && (
              <Badge className="bg-sky-600 text-white">
                SCHEDULED
              </Badge>
            )}

            {expired && (
              <Badge variant="destructive">
                EXPIRED
              </Badge>
            )}

            <Badge variant="secondary">
              ORDER{" "}
              {
                banner.sort_order
              }
            </Badge>
          </div>

          <h3 className="text-xl font-black">
            {banner.title}
          </h3>

          {banner.subtitle && (
            <p className="mt-1 text-sm text-white/80">
              {
                banner.subtitle
              }
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col justify-between gap-4 p-4 lg:flex-row lg:items-center">
        <div className="space-y-1 text-xs text-muted-foreground">
          {banner.button_text && (
            <p>
              CTA:{" "}
              <span className="font-semibold text-foreground">
                {
                  banner.button_text
                }
              </span>
              {banner.button_url
                ? ` → ${banner.button_url}`
                : ""}
            </p>
          )}

          {banner.starts_at && (
            <p>
              Starts:{" "}
              {new Date(
                banner.starts_at,
              ).toLocaleString()}
            </p>
          )}

          {banner.ends_at && (
            <p>
              Ends:{" "}
              {new Date(
                banner.ends_at,
              ).toLocaleString()}
            </p>
          )}

          {banner.mobile_image_url && (
            <p>
              Mobile artwork
              configured
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={
              onToggle
            }
          >
            {banner.active ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                Disable
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Enable
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={
              onEdit
            }
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>

          <Button
            size="sm"
            variant="destructive"
            disabled={
              deleting
            }
            onClick={
              onDelete
            }
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children:
    React.ReactNode
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold">
        {label}

        {required && (
          <span className="ml-1 text-rose-500">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  )
}

function UploadBox({
  icon: Icon,
  label,
  loading,
  onChange,
}: {
  icon:
    typeof Upload

  label: string

  loading: boolean

  onChange: (
    event: ChangeEvent<HTMLInputElement>,
  ) => void
}) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-7 text-center transition hover:border-rose-500/60 hover:bg-rose-500/5">
      {loading ? (
        <Loader2 className="h-7 w-7 animate-spin text-rose-500" />
      ) : (
        <Icon className="h-7 w-7 text-muted-foreground" />
      )}

      <span className="mt-3 text-sm font-bold">
        {loading
          ? "Uploading..."
          : label}
      </span>

      <span className="mt-1 text-xs text-muted-foreground">
        JPEG, PNG, WEBP or GIF
      </span>

      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        disabled={
          loading
        }
        onChange={
          onChange
        }
      />
    </label>
  )
}