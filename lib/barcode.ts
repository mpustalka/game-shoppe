import QRCode from "qrcode"
import type { QRCodeData, CardCondition, PokemonCard } from "./types"
import { CONDITION_ABBREVIATIONS } from "./types"

// Generate a unique SKU for an inventory item
export function generateSKU(
  card: PokemonCard,
  condition: CardCondition,
  timestamp?: number
): string {
  const setAbbrev = card.set.id.toUpperCase().slice(0, 6)
  const cardNum = card.number.padStart(3, "0")
  const condAbbrev = CONDITION_ABBREVIATIONS[condition]
  const ts = timestamp || Date.now()
  const uniqueId = ts.toString(36).toUpperCase().slice(-4)
  
  return `PKM-${setAbbrev}-${cardNum}-${condAbbrev}-${uniqueId}`
}

// Generate a unique SKU for manually entered cards
export function generateManualSKU(
  cardName: string,
  setName: string,
  condition: CardCondition,
  timestamp?: number
): string {
  // Create abbreviation from card name (first 3 chars)
  const cardAbbrev = cardName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 3) || "XXX"
  // Create abbreviation from set name (first 4 chars)
  const setAbbrev = setName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4) || "MANU"
  const condAbbrev = CONDITION_ABBREVIATIONS[condition]
  const ts = timestamp || Date.now()
  const uniqueId = ts.toString(36).toUpperCase().slice(-4)
  
  return `MAN-${setAbbrev}-${cardAbbrev}-${condAbbrev}-${uniqueId}`
}

// Generate a unique barcode string
export function generateBarcodeString(sku: string): string {
  // Create a numeric barcode from SKU for scanning compatibility
  // Format: timestamp-based unique ID
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0")
  return `${timestamp}${random}`
}

// Generate QR code data
export function createQRCodeData(
  id: string,
  sku: string,
  card: PokemonCard,
  condition: CardCondition,
  price: number,
  printFinish?: string
): QRCodeData {
  return {
    id,
    sku,
    cardName: card.name,
    setName: card.set.name,
    condition,
    price,
    printFinish,
  }
}

// Generate QR code as data URL
export async function generateQRCodeDataURL(
  data: QRCodeData,
  options: {
    width?: number
    margin?: number
    color?: { dark?: string; light?: string }
  } = {}
): Promise<string> {
  const { width = 200, margin = 2, color } = options
  
  const qrData = JSON.stringify(data)
  
  return QRCode.toDataURL(qrData, {
    width,
    margin,
    color: {
      dark: color?.dark || "#000000",
      light: color?.light || "#ffffff",
    },
    errorCorrectionLevel: "M",
  })
}

// Generate QR code as SVG string
export async function generateQRCodeSVG(
  data: QRCodeData,
  options: {
    width?: number
    margin?: number
    color?: { dark?: string; light?: string }
  } = {}
): Promise<string> {
  const { width = 200, margin = 2, color } = options
  
  const qrData = JSON.stringify(data)
  
  return QRCode.toString(qrData, {
    type: "svg",
    width,
    margin,
    color: {
      dark: color?.dark || "#000000",
      light: color?.light || "#ffffff",
    },
    errorCorrectionLevel: "M",
  })
}

// Parse QR code data from scanned string
export function parseQRCodeData(scannedData: string): QRCodeData | null {
  try {
    const data = JSON.parse(scannedData)
    
    // Validate required fields
    if (
      typeof data.id === "string" &&
      typeof data.sku === "string" &&
      typeof data.cardName === "string"
    ) {
      return data as QRCodeData
    }
    
    return null
  } catch {
    return null
  }
}
