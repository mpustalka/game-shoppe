"use client"

import {
  useEffect,
  useMemo,
  useState,
} from "react"
import {
  ImageIcon,
} from "lucide-react"

type ProductGalleryProps = {
  name: string

  imageUrl?:
    | string
    | null

  imageUrls?:
    | string[]
    | null

  selectedImage?:
    | string
    | null
}

export default function ProductGallery({
  name,
  imageUrl,
  imageUrls,
  selectedImage,
}: ProductGalleryProps) {
  const images =
    useMemo(() => {
      const values = [
        imageUrl,
        ...(imageUrls ??
          []),
      ].filter(
        (
          value,
        ): value is string =>
          Boolean(
            value?.trim(),
          ),
      )

      return [
        ...new Set(values),
      ]
    }, [
      imageUrl,
      imageUrls,
    ])

  const [
    activeImage,
    setActiveImage,
  ] = useState<
    string | null
  >(
    selectedImage ??
      images[0] ??
      null,
  )

  useEffect(() => {
    if (
      selectedImage &&
      selectedImage !==
        activeImage
    ) {
      setActiveImage(
        selectedImage,
      )
    }
  }, [
    selectedImage,
    activeImage,
  ])

  useEffect(() => {
    if (
      !activeImage &&
      images[0]
    ) {
      setActiveImage(
        images[0],
      )
    }
  }, [
    activeImage,
    images,
  ])

  return (
    <div className="space-y-4">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-3xl border bg-muted/20">
        {activeImage ? (
          <img
            src={activeImage}
            alt={name}
            className="h-full w-full object-contain p-4"
          />
        ) : (
          <div className="text-center text-muted-foreground">
            <ImageIcon className="mx-auto h-16 w-16 opacity-30" />

            <p className="mt-3 text-sm">
              No product image
            </p>
          </div>
        )}
      </div>

      {images.length >
        1 && (
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
          {images.map(
            (image) => (
              <button
                key={
                  image
                }
                type="button"
                onClick={() =>
                  setActiveImage(
                    image,
                  )
                }
                className={`aspect-square overflow-hidden rounded-xl border bg-muted/20 transition ${
                  activeImage ===
                  image
                    ? "ring-2 ring-rose-500"
                    : "hover:border-rose-500/50"
                }`}
              >
                <img
                  src={
                    image
                  }
                  alt=""
                  className="h-full w-full object-contain p-1"
                />
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}