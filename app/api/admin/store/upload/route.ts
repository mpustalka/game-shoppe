import {
  NextRequest,
  NextResponse,
} from "next/server"

import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

const BUCKET = "store-products"

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

const MAX_FILE_SIZE =
  10 * 1024 * 1024

function extensionForFile(
  file: File,
) {
  const extension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") ?? ""

  if (extension) {
    return extension
  }

  switch (file.type) {
    case "image/png":
      return "png"

    case "image/webp":
      return "webp"

    case "image/gif":
      return "gif"

    default:
      return "jpg"
  }
}

export async function POST(
  request: NextRequest,
) {
  const gate = await requireAdmin()

  if (gate instanceof NextResponse) {
    return gate
  }

  try {
    const formData =
      await request.formData()

    const file =
      formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error:
            "No image file was provided.",
        },
        {
          status: 400,
        },
      )
    }

    if (
      !ALLOWED_TYPES.has(
        file.type,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Only JPG, PNG, WebP and GIF images are allowed.",
        },
        {
          status: 400,
        },
      )
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            "Images must be 10 MB or smaller.",
        },
        {
          status: 400,
        },
      )
    }

    const extension =
      extensionForFile(file)

    const folder =
      new Date()
        .toISOString()
        .slice(0, 7)

    const filename =
      `${crypto.randomUUID()}.${extension}`

    const path =
      `${folder}/${filename}`

    const supabase =
      createAdminClient()

    const arrayBuffer =
      await file.arrayBuffer()

    const { error } =
      await supabase.storage
        .from(BUCKET)
        .upload(
          path,
          arrayBuffer,
          {
            contentType:
              file.type,
            cacheControl:
              "31536000",
            upsert: false,
          },
        )

    if (error) {
      console.error(
        "Store image upload error:",
        error,
      )

      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 500,
        },
      )
    }

    const {
      data: publicUrlData,
    } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path)

    return NextResponse.json(
      {
        image: {
          url:
            publicUrlData.publicUrl,
          path,
        },
      },
      {
        status: 201,
      },
    )
  } catch (error) {
    console.error(
      "Store upload exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Unable to upload image.",
      },
      {
        status: 500,
      },
    )
  }
}