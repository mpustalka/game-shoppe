import { NextRequest, NextResponse } from "next/server"
import TCGdex from "@tcgdex/sdk"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SYNC_SECRET = process.env.POKEMON_SYNC_SECRET

function isAuthorized(request: NextRequest) {
  if (!SYNC_SECRET) {
    return false
  }

  return (
    request.headers.get("x-pokemon-sync-secret") ===
    SYNC_SECRET
  )
}

function safeObject(value: unknown) {
  if (!value || typeof value !== "object") {
    return value ?? null
  }

  try {
    /*
     * Copy enumerable properties into a plain object while
     * removing SDK references that create circular JSON.
     */
    const source = value as Record<string, unknown>

    const result: Record<string, unknown> = {}

    for (const [key, item] of Object.entries(source)) {
      /*
       * TCGdex SDK objects contain a reference back to the
       * SDK instance. Never serialize that.
       */
      if (
        key === "tcgdex" ||
        key === "sdk" ||
        key === "_tcgdex"
      ) {
        continue
      }

      /*
       * Keep primitive values and normal nested data.
       * JSON serialization below gives us another safety
       * check for individual properties.
       */
      try {
        JSON.stringify(item)
        result[key] = item
      } catch {
        result[key] = "[non-serializable SDK value]"
      }
    }

    return result
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized",
      },
      { status: 401 },
    )
  }

  try {
    const tcgdex = new TCGdex("en")

    const set = await tcgdex.set.get("me04")

    if (!set) {
      return NextResponse.json(
        {
          ok: false,
          error: "TCGdex set me04 was not found",
        },
        { status: 404 },
      )
    }

    const cards = Array.isArray(set.cards)
      ? set.cards
      : []

    if (!cards.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "TCGdex returned no cards for me04",
        },
        { status: 404 },
      )
    }

    const firstResume = cards[0]

    const fullCard =
      await firstResume.getCard()

    if (!fullCard) {
      return NextResponse.json(
        {
          ok: false,
          error: `Unable to load ${firstResume.id}`,
        },
        { status: 404 },
      )
    }

    let imageHighPng: string | null = null
    let imageLowWebp: string | null = null

    try {
      imageHighPng =
        fullCard.getImageURL(
          "high",
          "png",
        ) ?? null
    } catch {
      imageHighPng = null
    }

    try {
      imageLowWebp =
        fullCard.getImageURL(
          "low",
          "webp",
        ) ?? null
    } catch {
      imageLowWebp = null
    }

    /*
     * Do NOT return `fullCard` directly.
     *
     * It's an SDK class instance containing circular
     * references.
     */
    const raw =
      fullCard as unknown as Record<
        string,
        unknown
      >

    return NextResponse.json({
      ok: true,

      mapping: {
        cardVaultSetId: "me4",
        tcgdexSetId: set.id,
      },

      set: {
        id: set.id,
        name: set.name,
        cardCount: cards.length,
      },

      resume: {
        id: firstResume.id,
        localId: firstResume.localId,
        name: firstResume.name,
      },

      card: {
        id: raw.id ?? null,
        localId: raw.localId ?? null,
        name: raw.name ?? null,

        category:
          raw.category ?? null,

        illustrator:
          raw.illustrator ?? null,

        rarity:
          raw.rarity ?? null,

        hp:
          raw.hp ?? null,

        types:
          raw.types ?? null,

        stage:
          raw.stage ?? null,

        suffix:
          raw.suffix ?? null,

        variants:
          safeObject(raw.variants),

        set:
          safeObject(raw.set),

        pricing:
          safeObject(raw.pricing),

        images: {
          highPng: imageHighPng,
          lowWebp: imageLowWebp,
        },
      },

      /*
       * Very useful for us:
       *
       * This shows every enumerable property actually
       * present on the installed SDK's card object without
       * trying to serialize the circular SDK itself.
       */
      availableKeys:
        Object.keys(raw).filter(
          (key) =>
            key !== "tcgdex" &&
            key !== "sdk" &&
            key !== "_tcgdex",
        ),
    })
  } catch (error) {
    console.error(
      "TCGdex full-card test failed:",
      error,
    )

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Unknown TCGdex error",
      },
      { status: 500 },
    )
  }
}