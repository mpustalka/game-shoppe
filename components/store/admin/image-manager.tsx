"use client"

import {
  ChangeEvent,
  useRef,
  useState,
} from "react"

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  Link as LinkIcon,
  Loader2,
  Star,
  Trash2,
  Upload,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type ProductImage = {
  url: string
  path?: string | null
}

type Props = {
  images: ProductImage[]
  onChange: (
    images: ProductImage[],
  ) => void
}

export default function ImageManager({
  images,
  onChange,
}: Props) {
  const inputRef =
    useRef<HTMLInputElement>(
      null,
    )

  const [url, setUrl] =
    useState("")

  const [
    uploading,
    setUploading,
  ] = useState(false)

  const [error, setError] =
    useState("")

  function addUrl() {
    const cleaned =
      url.trim()

    if (!cleaned) {
      return
    }

    try {
      new URL(cleaned)
    } catch {
      setError(
        "Enter a valid image URL.",
      )
      return
    }

    if (
      images.some(
        (image) =>
          image.url === cleaned,
      )
    ) {
      setError(
        "That image is already in the gallery.",
      )
      return
    }

    onChange([
      ...images,
      {
        url: cleaned,
        path: null,
      },
    ])

    setUrl("")
    setError("")
  }

  async function uploadFiles(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const files =
      Array.from(
        event.target.files ?? [],
      )

    event.target.value = ""

    if (!files.length) {
      return
    }

    setUploading(true)
    setError("")

    const uploaded:
      ProductImage[] = []

    try {
      for (const file of files) {
        const formData =
          new FormData()

        formData.append(
          "file",
          file,
        )

        const response =
          await fetch(
            "/api/admin/store/upload",
            {
              method: "POST",
              body: formData,
            },
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ??
              `Unable to upload ${file.name}`,
          )
        }

        uploaded.push({
          url:
            data.image.url,
          path:
            data.image.path,
        })
      }

      onChange([
        ...images,
        ...uploaded,
      ])
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to upload images.",
      )
    } finally {
      setUploading(false)
    }
  }

  function removeImage(
    index: number,
  ) {
    onChange(
      images.filter(
        (_, imageIndex) =>
          imageIndex !== index,
      ),
    )
  }

  function makePrimary(
    index: number,
  ) {
    if (index === 0) {
      return
    }

    const next = [
      ...images,
    ]

    const [image] =
      next.splice(index, 1)

    next.unshift(image)

    onChange(next)
  }

  function move(
    index: number,
    direction: -1 | 1,
  ) {
    const destination =
      index + direction

    if (
      destination < 0 ||
      destination >=
        images.length
    ) {
      return
    }

    const next = [
      ...images,
    ]

    ;[
      next[index],
      next[destination],
    ] = [
      next[destination],
      next[index],
    ]

    onChange(next)
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="relative">
          <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            type="url"
            value={url}
            onChange={(
              event,
            ) =>
              setUrl(
                event.target.value,
              )
            }
            onKeyDown={(
              event,
            ) => {
              if (
                event.key ===
                "Enter"
              ) {
                event.preventDefault()
                addUrl()
              }
            }}
            placeholder="Paste an image URL..."
            className="pl-9"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={addUrl}
        >
          <ImagePlus className="mr-2 h-4 w-4" />
          Add URL
        </Button>
      </div>

      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={
            uploadFiles
          }
        />

        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() =>
            inputRef.current?.click()
          }
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Images
            </>
          )}
        </Button>

        <p className="mt-2 text-xs text-muted-foreground">
          JPG, PNG, WebP or
          GIF. Up to 10 MB each.
          You can select multiple
          files.
        </p>
      </div>

      {images.length === 0 ? (
        <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed text-center">
          <ImagePlus className="h-10 w-10 text-muted-foreground/30" />

          <p className="mt-3 font-bold">
            No product images
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Upload images or add
            them by URL.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {images.map(
            (image, index) => (
              <div
                key={`${image.url}-${index}`}
                className="overflow-hidden rounded-2xl border bg-card"
              >
                <div className="relative flex aspect-square items-center justify-center bg-white p-3">
                  <img
                    src={
                      image.url
                    }
                    alt={`Product image ${index + 1}`}
                    className="h-full w-full object-contain"
                  />

                  {index ===
                    0 && (
                    <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/80 px-2 py-1 text-[10px] font-bold text-white">
                      <Star className="h-3 w-3 fill-current" />
                      PRIMARY
                    </div>
                  )}
                </div>

                <div className="space-y-3 border-t p-3">
                  <p className="truncate text-xs text-muted-foreground">
                    {image.url}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {index !==
                      0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          makePrimary(
                            index,
                          )
                        }
                      >
                        <Check className="mr-1 h-3 w-3" />
                        Primary
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={
                        index === 0
                      }
                      onClick={() =>
                        move(
                          index,
                          -1,
                        )
                      }
                      title="Move left"
                    >
                      <ArrowLeft className="h-3 w-3" />
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={
                        index ===
                        images.length -
                          1
                      }
                      onClick={() =>
                        move(
                          index,
                          1,
                        )
                      }
                      title="Move right"
                    >
                      <ArrowRight className="h-3 w-3" />
                    </Button>

                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() =>
                        removeImage(
                          index,
                        )
                      }
                      title="Remove image"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  )
}