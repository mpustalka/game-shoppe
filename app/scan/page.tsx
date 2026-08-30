"use client"

import {
  ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  ImagePlus,
  Loader2,
  RefreshCcw,
  RotateCcw,
  ScanLine,
  Sparkles,
  Upload,
  X,
  Zap,
  ZapOff,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useInventory } from "@/lib/inventory-context"
import {
  CARD_CONDITIONS,
  CARD_FINISHES,
  type CardCondition,
  type CardFinish,
  type ManualCardData,
} from "@/lib/types"
import * as binderApi from "@/lib/binders"
import { FeatureGate } from "@/components/billing/trial-banner"

type CameraFacing = "environment" | "user"
type BinderChoice = "none" | "budget" | "mid" | "premium"
type CardLanguage = "en" | "ja"

type VisionRead = {
  pokemonName: string
  cardName: string
  cardNumber: string
  printedSetName: string
  language: "en" | "ja" | "other"
  confidence: number
  notes: string
}

type ScanMatch = {
  id: string
  localId: string
  name: string
  image: string | null
  setId: string
  setName: string
  rarity: string
  variants: string[]
  score: number
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

export default function ScanPage() {
  return (
    <FeatureGate
      allowed={(e) => e.canScan}
      title="Smart Scanner is a Premium feature"
      description="Upgrade to Premium to scan English Pokémon cards with your phone camera, match the card, confirm its details, and add it directly to inventory."
    >
      <SmartScannerPage />
    </FeatureGate>
  )
}

function SmartScannerPage() {
  const { addManualItem } = useInventory()

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [starting, setStarting] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState("")
  const [facingMode, setFacingMode] =
    useState<CameraFacing>("environment")
  const [flashOn, setFlashOn] = useState(false)
  const [capturedImage, setCapturedImage] = useState("")
  const [sourceLabel, setSourceLabel] = useState("")
  const [identifying, setIdentifying] = useState(false)
  const [read, setRead] = useState<VisionRead | null>(null)
  const [matches, setMatches] = useState<ScanMatch[]>([])
  const [selected, setSelected] = useState<ScanMatch | null>(null)

  const [condition, setCondition] =
    useState<CardCondition>("Near Mint")
  const [finish, setFinish] =
    useState<CardFinish>("Normal")
  const [quantity, setQuantity] = useState("1")
  const [price, setPrice] = useState("")
  const [language, setLanguage] =
    useState<CardLanguage>("en")
  const [binderChoice, setBinderChoice] =
    useState<BinderChoice>("none")
  const [notes, setNotes] = useState("")
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  async function startCamera(nextFacing: CameraFacing = facingMode) {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Live camera is unavailable. Use Upload Photo instead.",
      )
      return
    }

    setStarting(true)
    setCameraError("")
    setFlashOn(false)
    stopStream(streamRef.current)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: nextFacing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setFacingMode(nextFacing)
      setCameraActive(true)
    } catch {
      setCameraActive(false)
      setCameraError(
        "Camera permission was denied or unavailable. Try Upload Photo.",
      )
    } finally {
      setStarting(false)
    }
  }

  function closeCamera() {
    stopStream(streamRef.current)
    streamRef.current = null
    setCameraActive(false)
    setFlashOn(false)
  }

  useEffect(() => {
    return () => stopStream(streamRef.current)
  }, [])

  async function toggleFlash() {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return

    const capabilities = track.getCapabilities?.() as
      | (MediaTrackCapabilities & { torch?: boolean })
      | undefined

    if (!capabilities?.torch) {
      toast.error("Flash is not supported by this device/browser")
      return
    }

    try {
      const next = !flashOn
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      })
      setFlashOn(next)
    } catch {
      toast.error("Unable to change flash")
    }
  }

  async function flipCamera() {
    await startCamera(
      facingMode === "environment" ? "user" : "environment",
    )
  }

  function resetResult() {
    setRead(null)
    setMatches([])
    setSelected(null)
    setAdded(false)
  }

  function resetInventoryForm() {
    setCondition("Near Mint")
    setFinish("Normal")
    setQuantity("1")
    setPrice("")
    setLanguage("en")
    setBinderChoice("none")
    setNotes("")
    setAdded(false)
  }

  function captureCard() {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      return
    }

    const vw = video.videoWidth
    const vh = video.videoHeight
    const targetRatio = 63 / 88

    let cropWidth = vw * 0.72
    let cropHeight = cropWidth / targetRatio

    if (cropHeight > vh * 0.86) {
      cropHeight = vh * 0.86
      cropWidth = cropHeight * targetRatio
    }

    const sx = (vw - cropWidth) / 2
    const sy = (vh - cropHeight) / 2

    canvas.width = 900
    canvas.height = Math.round(900 / targetRatio)

    const context = canvas.getContext("2d")
    if (!context) return

    context.drawImage(
      video,
      sx,
      sy,
      cropWidth,
      cropHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    )

    setCapturedImage(canvas.toDataURL("image/jpeg", 0.86))
    setSourceLabel("Camera capture")
    resetResult()
    closeCamera()
  }

  function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file")
      return
    }

    if (file.size > 12 * 1024 * 1024) {
      toast.error("Choose an image smaller than 12 MB")
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCapturedImage(reader.result)
        setSourceLabel(file.name)
        resetResult()
        closeCamera()
      }
    }

    reader.readAsDataURL(file)
  }

  async function identifyCard() {
    if (!capturedImage || identifying) return

    setIdentifying(true)
    resetResult()

    try {
      const response = await fetch("/api/scan/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: capturedImage }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Unable to identify card")
      }

      setRead(data.read ?? null)
      setMatches(Array.isArray(data.matches) ? data.matches : [])
      setAdded(false)

      if (Array.isArray(data.matches) && data.matches.length === 1) {
        setSelected(data.matches[0])
      }

      if (!data.matches?.length) {
        toast.error(
          "Card details were read, but no database match was found.",
        )
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to identify card",
      )
    } finally {
      setIdentifying(false)
    }
  }

  function retake() {
    setCapturedImage("")
    setSourceLabel("")
    resetResult()
    resetInventoryForm()
    void startCamera("environment")
  }

  async function addSelectedToInventory() {
    if (!selected || adding) return

    const parsedQuantity = Math.max(
      1,
      Math.floor(Number(quantity) || 1),
    )

    const parsedPrice = Math.max(0, Number(price) || 0)

    setAdding(true)

    try {
      const manualData: ManualCardData = {
        name: selected.name,
        setName: selected.setName || read?.printedSetName || "Unknown Set",
        number: selected.localId || read?.cardNumber || "",
        rarity: selected.rarity || "",
        condition,
        finish,
        price: parsedPrice,
        quantity: parsedQuantity,
        quantitySold: 0,
        notes: notes.trim(),
        customImage: selected.image || capturedImage,
        language,
      }

      const item = await addManualItem(manualData)

      if (!item) {
        throw new Error("Inventory did not return the saved card")
      }

      if (binderChoice !== "none") {
        try {
          await binderApi.addToBinder(
            binderChoice,
            item,
            language,
          )
        } catch (binderError) {
          console.error("Scanner binder add failed:", binderError)

          toast.warning(
            `${selected.name} was added to inventory, but could not be added to the binder.`,
          )

          setAdded(true)
          return
        }
      }

      toast.success(
        binderChoice === "none"
          ? `${selected.name} added to inventory`
          : `${selected.name} added to inventory and ${binderChoice} binder`,
      )

      setAdded(true)
    } catch (error) {
      console.error("Scanner inventory add failed:", error)

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to add card to inventory",
      )
    } finally {
      setAdding(false)
    }
  }

  function scanNextCard() {
    setCapturedImage("")
    setSourceLabel("")
    resetResult()
    resetInventoryForm()
    void startCamera("environment")
  }

  return (
    <main className="min-h-screen bg-[#070708] pb-24 text-white">
      <canvas ref={canvasRef} className="hidden" />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={uploadPhoto}
        className="hidden"
      />

      <div className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Button
            asChild
            variant="ghost"
            className="h-11 rounded-xl px-3 text-zinc-300 hover:bg-white/10 hover:text-white"
          >
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>

          <div className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-rose-300">
            Smart Scanner • Premium Beta
          </div>
        </div>

        <section className="mb-4 rounded-[26px] border border-white/10 bg-gradient-to-br from-zinc-950 to-rose-950/25 p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-rose-500/10 p-3">
              <ScanLine className="h-6 w-6 text-rose-400" />
            </div>

            <div>
              <h1 className="text-2xl font-black sm:text-3xl">
                Scan Pokémon Card
              </h1>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Point your phone at an English Pokémon card. Smart Scanner
                reads the card, finds likely matches, and lets you add the
                confirmed card directly to inventory.
              </p>

              <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200">
                    Beta Edition
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                    English Cards Only
                  </span>
                </div>
                <p className="mt-3 text-sm font-bold text-amber-100">
                  Currently optimized for Destined Rivals, Journey Together,
                  and older English Pokémon TCG releases.
                </p>
                <p className="mt-1 text-xs leading-5 text-amber-100/65">
                  Card recognition database updates are in progress. Newer
                  English cards may not be recognized yet.
                </p>
              </div>
            </div>
          </div>
        </section>

        {!cameraActive && !capturedImage && (
          <section className="rounded-[26px] border border-white/10 bg-zinc-950/80 p-5 sm:p-7">
            {cameraError && (
              <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
                {cameraError}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                onClick={() => void startCamera("environment")}
                disabled={starting}
                className="h-14 rounded-2xl bg-rose-600 text-base font-black hover:bg-rose-500"
              >
                {starting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Camera className="mr-2 h-5 w-5" />
                )}
                Scan Card
              </Button>

              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="h-14 rounded-2xl border-white/10 bg-white/[0.04] text-base font-bold text-zinc-200 hover:bg-white/10 hover:text-white"
              >
                <ImagePlus className="mr-2 h-5 w-5" />
                Upload Photo
              </Button>
            </div>
          </section>
        )}

        {cameraActive && (
          <section className="overflow-hidden rounded-[26px] border border-white/10 bg-black">
            <div className="relative aspect-[3/4] max-h-[72dvh] w-full overflow-hidden sm:aspect-[4/3]">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="h-full w-full object-cover"
              />

              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-5">
                <div className="relative aspect-[63/88] h-[82%] max-w-[78%] rounded-2xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.42)]">
                  <div className="absolute inset-x-4 top-1/2 h-px bg-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.8)]" />
                </div>
              </div>

              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  onClick={closeCamera}
                  className="h-11 w-11 rounded-full bg-black/60 text-white"
                >
                  <X className="h-5 w-5" />
                </Button>

                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  onClick={() => void toggleFlash()}
                  className="h-11 w-11 rounded-full bg-black/60 text-white"
                >
                  {flashOn ? (
                    <Zap className="h-5 w-5" />
                  ) : (
                    <ZapOff className="h-5 w-5" />
                  )}
                </Button>
              </div>

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-8 bg-gradient-to-t from-black/85 via-black/30 to-transparent px-4 pb-5 pt-12">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  onClick={() => fileRef.current?.click()}
                  className="h-12 w-12 rounded-full bg-white/15 text-white"
                >
                  <Upload className="h-5 w-5" />
                </Button>

                <button
                  type="button"
                  onClick={captureCard}
                  aria-label="Take photo"
                  className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-[5px] border-white bg-white/20"
                >
                  <span className="h-[58px] w-[58px] rounded-full bg-white" />
                </button>

                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  onClick={() => void flipCamera()}
                  className="h-12 w-12 rounded-full bg-white/15 text-white"
                >
                  <RefreshCcw className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </section>
        )}

        {capturedImage && (
          <section className="overflow-hidden rounded-[26px] border border-white/10 bg-zinc-950/80">
            <div className="grid gap-5 p-4 sm:p-6 md:grid-cols-[minmax(0,340px)_1fr]">
              <div className="mx-auto w-full max-w-[340px]">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={capturedImage}
                    alt="Captured Pokémon card"
                    className="aspect-[63/88] w-full rounded-xl object-contain"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-emerald-400" />
                  <p className="font-bold text-white">{sourceLabel}</p>
                </div>

                {!read && (
                  <>
                    <h2 className="mt-5 text-xl font-black">
                      Ready to identify
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      We&apos;ll read the card&apos;s printed name and number,
                      then search for matching Pokémon cards.
                    </p>

                    <Button
                      onClick={() => void identifyCard()}
                      disabled={identifying}
                      className="mt-5 h-13 w-full rounded-xl bg-rose-600 font-black text-white hover:bg-rose-500"
                    >
                      {identifying ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-5 w-5" />
                      )}
                      {identifying
                        ? "Reading & Matching..."
                        : "Identify Pokémon Card"}
                    </Button>
                  </>
                )}

                {read && (
                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">
                      Scanner Read
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-zinc-500">Name</p>
                        <p className="font-bold text-white">
                          {read.cardName || read.pokemonName || "Unknown"}
                        </p>
                      </div>

                      <div>
                        <p className="text-zinc-500">Card Number</p>
                        <p className="font-bold text-white">
                          {read.cardNumber || "Unknown"}
                        </p>
                      </div>

                      <div>
                        <p className="text-zinc-500">Language</p>
                        <p className="font-bold uppercase text-white">
                          {read.language}
                        </p>
                      </div>

                      <div>
                        <p className="text-zinc-500">Read Confidence</p>
                        <p className="font-bold text-white">
                          {Math.round(read.confidence * 100)}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {matches.length > 0 && (
                  <div className="mt-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-black text-white">
                        Choose the correct card
                      </h3>
                      <span className="text-xs text-zinc-500">
                        {matches.length} match
                        {matches.length === 1 ? "" : "es"}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {matches.map((match) => {
                        const isSelected = selected?.id === match.id

                        return (
                          <button
                            key={match.id}
                            type="button"
                            onClick={() => setSelected(match)}
                            className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                              isSelected
                                ? "border-rose-500/60 bg-rose-500/10"
                                : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                            }`}
                          >
                            <div className="h-24 w-[69px] shrink-0 overflow-hidden rounded-lg bg-black">
                              {match.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={match.image}
                                  alt={match.name}
                                  className="h-full w-full object-contain"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-[10px] text-zinc-600">
                                  No image
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate font-black text-white">
                                {match.name}
                              </p>
                              <p className="mt-1 text-sm text-zinc-400">
                                {match.setName || "Unknown set"}
                              </p>
                              <p className="mt-1 text-xs text-zinc-500">
                                #{match.localId}
                                {match.rarity
                                  ? ` • ${match.rarity}`
                                  : ""}
                              </p>
                            </div>

                            {isSelected ? (
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-600">
                                <Check className="h-5 w-5 text-white" />
                              </div>
                            ) : (
                              <ChevronRight className="h-5 w-5 shrink-0 text-zinc-600" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {selected && (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06]">
                    <div className="border-b border-white/10 p-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-300">
                        Selected Card
                      </p>

                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-24 w-[69px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black">
                          {selected.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={selected.image}
                              alt={selected.name}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] text-zinc-600">
                              No image
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <h3 className="text-xl font-black text-white">
                            {selected.name}
                          </h3>
                          <p className="mt-1 text-sm text-zinc-300">
                            {selected.setName || "Unknown set"}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            #{selected.localId || "Unknown"}
                            {selected.rarity
                              ? ` • ${selected.rarity}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    {!added ? (
                      <div className="space-y-5 p-4">
                        <div>
                          <h4 className="font-black text-white">
                            Inventory Details
                          </h4>
                          <p className="mt-1 text-xs leading-5 text-zinc-400">
                            Confirm the physical card before saving it.
                          </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-zinc-300">
                              Condition
                            </Label>
                            <Select
                              value={condition}
                              onValueChange={(value) =>
                                setCondition(value as CardCondition)
                              }
                            >
                              <SelectTrigger className="h-12 border-white/10 bg-black/30 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CARD_CONDITIONS.map((value) => (
                                  <SelectItem key={value} value={value}>
                                    {value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-zinc-300">
                              Finish
                            </Label>
                            <Select
                              value={finish}
                              onValueChange={(value) =>
                                setFinish(value as CardFinish)
                              }
                            >
                              <SelectTrigger className="h-12 border-white/10 bg-black/30 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CARD_FINISHES.map((value) => (
                                  <SelectItem key={value} value={value}>
                                    {value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="scan-quantity" className="text-zinc-300">
                              Quantity
                            </Label>
                            <Input
                              id="scan-quantity"
                              type="number"
                              min={1}
                              step={1}
                              inputMode="numeric"
                              value={quantity}
                              onChange={(event) =>
                                setQuantity(event.target.value)
                              }
                              className="h-12 border-white/10 bg-black/30 text-white"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="scan-price" className="text-zinc-300">
                              Price
                            </Label>
                            <div className="relative">
                              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                                $
                              </span>
                              <Input
                                id="scan-price"
                                type="number"
                                min={0}
                                step="0.01"
                                inputMode="decimal"
                                value={price}
                                onChange={(event) =>
                                  setPrice(event.target.value)
                                }
                                placeholder="0.00"
                                className="h-12 border-white/10 bg-black/30 pl-7 text-white"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-zinc-300">
                              Language
                            </Label>
                            <Select
                              value={language}
                              onValueChange={(value) =>
                                setLanguage(value as CardLanguage)
                              }
                            >
                              <SelectTrigger className="h-12 border-white/10 bg-black/30 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="ja">Japanese</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-zinc-300">
                              Collection Binder
                            </Label>
                            <Select
                              value={binderChoice}
                              onValueChange={(value) =>
                                setBinderChoice(value as BinderChoice)
                              }
                            >
                              <SelectTrigger className="h-12 border-white/10 bg-black/30 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">
                                  Inventory only
                                </SelectItem>
                                <SelectItem value="budget">
                                  Budget Binder
                                </SelectItem>
                                <SelectItem value="mid">
                                  Mid Binder
                                </SelectItem>
                                <SelectItem value="premium">
                                  Premium Binder
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="scan-notes" className="text-zinc-300">
                            Notes
                          </Label>
                          <Input
                            id="scan-notes"
                            value={notes}
                            onChange={(event) =>
                              setNotes(event.target.value)
                            }
                            placeholder="Optional notes about this copy"
                            className="h-12 border-white/10 bg-black/30 text-white"
                          />
                        </div>

                        <Button
                          type="button"
                          onClick={() => void addSelectedToInventory()}
                          disabled={adding}
                          className="h-14 w-full rounded-xl bg-emerald-600 text-base font-black text-white hover:bg-emerald-500"
                        >
                          {adding ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          ) : (
                            <Check className="mr-2 h-5 w-5" />
                          )}
                          {adding
                            ? "Adding to Inventory..."
                            : "Add to Inventory"}
                        </Button>
                      </div>
                    ) : (
                      <div className="p-4">
                        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
                            <Check className="h-6 w-6 text-emerald-300" />
                          </div>

                          <h4 className="mt-3 text-lg font-black text-white">
                            Card Added
                          </h4>

                          <p className="mt-1 text-sm text-zinc-400">
                            {selected.name} is now in your inventory.
                          </p>

                          <Button
                            type="button"
                            onClick={scanNextCard}
                            className="mt-4 h-14 w-full rounded-xl bg-rose-600 text-base font-black text-white hover:bg-rose-500"
                          >
                            <ScanLine className="mr-2 h-5 w-5" />
                            Scan Next Card
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={retake}
                    className="h-12 border-white/10 bg-white/[0.04] text-zinc-200 hover:bg-white/10 hover:text-white"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Retake
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                    className="h-12 border-white/10 bg-white/[0.04] text-zinc-200 hover:bg-white/10 hover:text-white"
                  >
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Different Photo
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}