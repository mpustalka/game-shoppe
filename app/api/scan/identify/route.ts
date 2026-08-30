import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const RAPIDAPI_URL =
  "https://pokemon-card-image-reader-api-identify-card-from-photo.p.rapidapi.com/"
const RAPIDAPI_HOST =
  "pokemon-card-image-reader-api-identify-card-from-photo.p.rapidapi.com"

const TCGDEX_BASE = "https://api.tcgdex.net/v2/en"
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_CHOICES = 24

type RapidCard = {
  id?: string
  name?: string
  number?: string
  set?: {
    id?: string
    name?: string
  }
  hp?: string
  images?: {
    small?: string
    large?: string
  }
}

type RapidPayload = {
  success?: boolean
  confidence?: string
  card?: {
    name?: string
    matchedCards?: number
    variants?: RapidCard[]
    primary?: RapidCard
  }
  metadata?: {
    totalVariantsInDatabase?: number
    confidence?: number
  }
  error?: {
    code?: string
    message?: string
  }
}

type TCGdexBrief = {
  id: string
  localId: string | number
  name: string
  image?: string
}

type TCGdexDetail = {
  id: string
  localId: string | number
  name: string
  image?: string
  rarity?: string
  hp?: number | string
  set?: {
    id?: string
    name?: string
  }
  variants?: Record<string, boolean>
}

type ScannerMatch = {
  id: string
  localId: string
  name: string
  image: string
  setId: string
  setName: string
  rarity: string
  variants: string[]
  hp: string
  score: number
  source: "rapidapi" | "tcgdex"
}

function decodeDataUrl(image: string) {
  const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) throw new Error("Invalid card image")

  const mimeType = match[1]
  const buffer = Buffer.from(match[2], "base64")

  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Card image exceeds the 10 MB limit")
  }

  return { mimeType, buffer }
}

function normalizeNumber(value?: string | number) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/^0+/, "")
}

function rapidToMatch(card: RapidCard, confidence: number): ScannerMatch {
  return {
    id: card.id ?? "",
    localId: card.number ?? "",
    name: card.name ?? "Unknown card",
    image: card.images?.large || card.images?.small || "",
    setId: card.set?.id ?? "",
    setName: card.set?.name ?? card.set?.id ?? "",
    rarity: "",
    variants: [],
    hp: card.hp ?? "",
    score: confidence + 100,
    source: "rapidapi",
  }
}

function tcgdexImage(image?: string) {
  if (!image) return ""
  if (image.startsWith("http")) return `${image}/high.webp`
  return image
}

async function searchTCGdex(name: string): Promise<TCGdexBrief[]> {
  const url = new URL(`${TCGDEX_BASE}/cards`)
  url.searchParams.set("name", name)
  url.searchParams.set("pagination:itemsPerPage", "100")

  const response = await fetch(url.toString(), {
    cache: "no-store",
  })

  if (!response.ok) return []

  const data = await response.json().catch(() => [])
  return Array.isArray(data) ? data : []
}

async function getTCGdexCard(id: string): Promise<TCGdexDetail | null> {
  const response = await fetch(
    `${TCGDEX_BASE}/cards/${encodeURIComponent(id)}`,
    { cache: "no-store" },
  )

  if (!response.ok) return null
  return (await response.json().catch(() => null)) as TCGdexDetail | null
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const apiKey = process.env.RAPIDAPI_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: "RAPIDAPI_KEY is not configured" },
      { status: 500 },
    )
  }

  const body = await request.json().catch(() => null)
  const image = typeof body?.image === "string" ? body.image : ""

  if (!image.startsWith("data:image/")) {
    return NextResponse.json({ error: "Invalid card image" }, { status: 400 })
  }

  try {
    const { mimeType, buffer } = decodeDataUrl(image)

    const extension =
      mimeType === "image/png"
        ? "png"
        : mimeType === "image/webp"
          ? "webp"
          : mimeType === "image/heic"
            ? "heic"
            : "jpg"

    const formData = new FormData()

    formData.append(
      "image",
      new Blob([buffer], { type: mimeType }),
      `pokemon-card.${extension}`,
    )

    const rapidResponse = await fetch(RAPIDAPI_URL, {
      method: "POST",
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": RAPIDAPI_HOST,
      },
      body: formData,
      cache: "no-store",
    })

    const rawText = await rapidResponse.text()

    let payload: RapidPayload | null = null

    try {
      payload = rawText ? (JSON.parse(rawText) as RapidPayload) : null
    } catch {
      payload = null
    }

    if (!rapidResponse.ok || !payload?.success) {
      const code =
        payload?.error?.code ||
        (rapidResponse.status === 404
          ? "CARD_NOT_RECOGNIZED"
          : "CARD_RECOGNITION_FAILED")

      const message =
        payload?.error?.message ||
        (rapidResponse.status === 404
          ? "The card reader could not recognize this card."
          : `Card recognition failed (${rapidResponse.status})`)

      return NextResponse.json(
        { error: message, code, rapidApiStatus: rapidResponse.status },
        { status: rapidResponse.status || 502 },
      )
    }

    const confidence = payload.metadata?.confidence ?? 0
    const primary = payload.card?.primary ?? null
    const rapidVariants = Array.isArray(payload.card?.variants)
      ? payload.card.variants
      : []

    const pokemonName =
      primary?.name ||
      payload.card?.name ||
      rapidVariants[0]?.name ||
      ""

    const readNumber = primary?.number || rapidVariants[0]?.number || ""

    const matches: ScannerMatch[] = []
    const seen = new Set<string>()

    const addMatch = (match: ScannerMatch) => {
      const key = match.id || `${match.name}|${match.setId}|${match.localId}`
      if (!key || seen.has(key)) return
      seen.add(key)
      matches.push(match)
    }

    // Always keep every RapidAPI candidate.
    if (primary) {
      addMatch(rapidToMatch(primary, confidence))
    }

    for (const card of rapidVariants) {
      addMatch(rapidToMatch(card, confidence))
    }

    // Then expand the choices using TCGdex so the user can manually choose
    // the exact print when OCR picked the wrong collector number/set.
    if (pokemonName) {
      let briefs: TCGdexBrief[] = []

      try {
        briefs = await searchTCGdex(pokemonName)
      } catch (error) {
        // TCGdex is only a fallback/expansion source. Never fail a successful
        // RapidAPI recognition just because TCGdex is temporarily unreachable.
        console.warn("[SCAN] TCGdex expansion unavailable; using RapidAPI matches only", {
          error: error instanceof Error ? error.message : String(error),
        })
      }

      const scored = briefs
        .map((brief) => {
          const exactName =
            brief.name.trim().toLowerCase() === pokemonName.trim().toLowerCase()

          const exactNumber =
            normalizeNumber(brief.localId) === normalizeNumber(readNumber)

          let score = 0
          if (exactName) score += 50
          if (exactNumber) score += 40

          return { brief, score }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_CHOICES)

      const details = await Promise.all(
        scored.map(async ({ brief, score }) => {
          const detail = await getTCGdexCard(brief.id)

          if (!detail) {
            return {
              id: brief.id,
              localId: String(brief.localId ?? ""),
              name: brief.name,
              image: tcgdexImage(brief.image),
              setId: "",
              setName: "",
              rarity: "",
              variants: [],
              hp: "",
              score,
              source: "tcgdex" as const,
            }
          }

          return {
            id: detail.id,
            localId: String(detail.localId ?? ""),
            name: detail.name,
            image: tcgdexImage(detail.image),
            setId: detail.set?.id ?? "",
            setName: detail.set?.name ?? "",
            rarity: detail.rarity ?? "",
            variants: Object.entries(detail.variants ?? {})
              .filter(([, enabled]) => enabled)
              .map(([variant]) => variant),
            hp: String(detail.hp ?? ""),
            score,
            source: "tcgdex" as const,
          }
        }),
      )

      for (const detail of details) {
        addMatch(detail)
      }
    }

    const finalMatches = matches.slice(0, MAX_CHOICES)

    const read = {
      pokemonName,
      cardName: pokemonName,
      cardNumber: readNumber,
      printedSetName: primary?.set?.name ?? primary?.set?.id ?? "",
      language: "en",
      confidence,
      confidenceLabel: payload.confidence ?? "",
      notes: `${finalMatches.length} possible prints found. Choose the exact card below.`,
    }

    console.log("[SCAN] Card recognized + expanded", {
      name: pokemonName,
      rapidApiMatches: rapidVariants.length + (primary ? 1 : 0),
      finalChoices: finalMatches.length,
      confidence,
    })

    return NextResponse.json({
      read,
      matches: finalMatches,
      success: true,
      confidenceLabel: payload.confidence ?? "",
      confidence,
      matchedCards: finalMatches.length,
      totalVariantsInDatabase:
        payload.metadata?.totalVariantsInDatabase ?? null,
      primary,
      variants: rapidVariants,
    })
  } catch (error) {
    console.error("[SCAN] Scanner route error:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to identify card",
      },
      { status: 500 },
    )
  }
}