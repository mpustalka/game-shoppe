"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { useInventory } from "@/lib/inventory-context"
import { CARD_CONDITIONS, type CardCondition, type ManualCardData, type ImportResult } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ExternalLink,
  ArrowLeft,
  FileText
} from "lucide-react"

import { FeatureGate } from "@/components/billing/trial-banner"

// Parse condition string to CardCondition type
function parseCondition(str: string): CardCondition {
  const normalized = str.toLowerCase().trim()
  
  const conditionMap: Record<string, CardCondition> = {
    "nm": "Near Mint",
    "near mint": "Near Mint",
    "nearmint": "Near Mint",
    "mint": "Near Mint",
    "lp": "Lightly Played",
    "light play": "Lightly Played",
    "lightly played": "Lightly Played",
    "lightlyplayed": "Lightly Played",
    "mp": "Moderately Played",
    "moderate play": "Moderately Played",
    "moderately played": "Moderately Played",
    "moderatelyplayed": "Moderately Played",
    "hp": "Heavily Played",
    "heavy play": "Heavily Played",
    "heavily played": "Heavily Played",
    "heavilyplayed": "Heavily Played",
    "dmg": "Damaged",
    "damaged": "Damaged",
  }

  return conditionMap[normalized] || "Near Mint"
}

// Parse CSV string into rows
function parseCSV(csvText: string): string[][] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim())
  return lines.map(line => {
    const values: string[] = []
    let current = ""
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === "," && !inQuotes) {
        values.push(current.trim())
        current = ""
      } else {
        current += char
      }
    }
    values.push(current.trim())
    
    return values
  })
}

export default function ImportPage() {
  return (
    <FeatureGate
      allowed={(e) => e.canImport}
      title="Premium Import"
      description="Bulk inventory import is included with Premium. Upgrade to import your collection from CSV or Google Sheets."
    >
      <ImportPageInner />
    </FeatureGate>
  )
}

function ImportPageInner() {
  const { bulkImport } = useInventory()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [importData, setImportData] = useState<ManualCardData[]>([])
  const [previewData, setPreviewData] = useState<string[][]>([])
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setErrors([])
    setImportResult(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const rows = parseCSV(text)
        
        if (rows.length < 2) {
          setErrors(["File must contain a header row and at least one data row"])
          return
        }

        const headers = rows[0].map(h => h.toLowerCase())
        const dataRows = rows.slice(1)
        
        // Expected headers
        const requiredHeaders = ["name", "set", "condition", "price", "quantity"]
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
        
        if (missingHeaders.length > 0) {
          setErrors([`Missing required columns: ${missingHeaders.join(", ")}`])
          return
        }

        // Get column indices
        const nameIdx = headers.indexOf("name")
        const setIdx = headers.indexOf("set")
        const numberIdx = headers.indexOf("number")
        const conditionIdx = headers.indexOf("condition")
        const priceIdx = headers.indexOf("price")
        const quantityIdx = headers.indexOf("quantity")
        const quantitySoldIdx = headers.indexOf("quantitysold") !== -1 
          ? headers.indexOf("quantitysold") 
          : headers.indexOf("sold")
        const finishIdx = headers.indexOf("finish")
        const languageIdx = headers.indexOf("language")
        const notesIdx = headers.indexOf("notes")

        // Parse rows into ManualCardData
        const parsedItems: ManualCardData[] = []
        const parseErrors: string[] = []

        dataRows.forEach((row, idx) => {
          try {
            const name = row[nameIdx]?.trim()
            const setName = row[setIdx]?.trim()
            const condition = parseCondition(row[conditionIdx] || "")
            const price = parseFloat(row[priceIdx]) || 0
            const quantity = parseInt(row[quantityIdx]) || 1

            if (!name || !setName) {
              parseErrors.push(`Row ${idx + 2}: Missing name or set`)
              return
            }
            const language =
              languageIdx >= 0 &&
              row[languageIdx]?.trim().toLowerCase() === "ja"
                ? "ja"
                : "en"

            parsedItems.push({
              name,
              setName,

              number: numberIdx >= 0 ? row[numberIdx]?.trim() : undefined,

              language,

              condition,

              finish:
                finishIdx >= 0 ? parseFinish(row[finishIdx] || "") : "Normal",

              price,
              quantity,

              quantitySold:
                quantitySoldIdx >= 0
                  ? parseInt(row[quantitySoldIdx] || "0", 10) || 0
                  : 0,

              notes: notesIdx >= 0 ? row[notesIdx]?.trim() : undefined,
            })
          } catch (err) {
            parseErrors.push(`Row ${idx + 2}: Failed to parse - ${err}`)
          }
        })

        setPreviewData(dataRows.slice(0, 5))
        setImportData(parsedItems)
        setErrors(parseErrors)

      } catch (err) {
        setErrors([`Failed to parse file: ${err}`])
      }
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (importData.length === 0) return

    setIsProcessing(true)
    
    try {
      const result = await bulkImport(importData)
      setImportResult({
        success: result.success,
        failed: result.failed,
        errors: [],
      })
      
      // Clear preview after successful import
      if (result.success > 0) {
        setImportData([])
        setPreviewData([])
      }
    } catch (err) {
      setErrors([`Import failed: ${err}`])
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadTemplate = () => {
    const template = `name,set,number,language,condition,finish,price,quantity,quantitysold,notes
"Charizard ex","Obsidian Flames","006/197","en","Near Mint","Normal",45.99,2,0,"Pack fresh"
"Pikachu VMAX","Vivid Voltage","044/185","en","Lightly Played","Holo",12.50,1,0,""
"Mewtwo V","Pokemon GO","030/078","en","Near Mint","Normal",8.99,3,1,"Promo card"`

    const blob = new Blob([template], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")

    a.href = url
    a.download = "pokemon-inventory-template.csv"
    a.click()

    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/add">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Import Inventory
          </h1>
          <p className="mt-1 text-muted-foreground">
            Bulk import cards from CSV or Google Sheets
          </p>
        </div>
      </div>

      <Tabs defaultValue="csv" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="csv">
            <FileText className="mr-2 h-4 w-4" />
            CSV Upload
          </TabsTrigger>
          <TabsTrigger value="sheets">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Google Sheets
          </TabsTrigger>
        </TabsList>

        {/* CSV Tab */}
        <TabsContent value="csv" className="space-y-6">
          {/* Template Download */}
          <Card>
            <CardHeader>
              <CardTitle>Download Template</CardTitle>
              <CardDescription>
                Use our CSV template to ensure your data imports correctly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Download CSV Template
              </Button>

              <div className="mt-4 rounded-lg bg-muted p-4">
                <p className="text-sm font-medium text-foreground mb-2">
                  Required Columns:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">name</Badge>
                  <Badge variant="secondary">set</Badge>
                  <Badge variant="secondary">condition</Badge>
                  <Badge variant="secondary">price</Badge>
                  <Badge variant="secondary">quantity</Badge>
                </div>
                <p className="mb-2 mt-4 text-sm font-medium text-foreground">
                  Optional Columns:
                </p>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">number</Badge>
                  <Badge variant="outline">language</Badge>
                  <Badge variant="outline">finish</Badge>
                  <Badge variant="outline">quantitysold</Badge>
                  <Badge variant="outline">notes</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
              <CardDescription>
                Select your inventory CSV file to import
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 px-6 py-10 transition-colors hover:border-primary/50 hover:bg-muted"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm font-medium text-foreground">
                  Click to upload CSV file
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  or drag and drop
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </CardContent>
          </Card>

          {/* Errors */}
          {errors.length > 0 && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Import Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc space-y-1 text-sm text-destructive">
                  {errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Preview */}
          {importData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Preview ({importData.length} cards)</CardTitle>
                <CardDescription>
                  Showing first 5 rows. Review before importing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-3 py-2 text-left font-medium">
                          Name
                        </th>
                        <th className="px-3 py-2 text-left font-medium">Set</th>
                        <th className="px-3 py-2 text-left font-medium">
                          Condition
                        </th>
                        <th className="px-3 py-2 text-left font-medium">
                          Price
                        </th>
                        <th className="px-3 py-2 text-left font-medium">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importData.slice(0, 5).map((item, idx) => (
                        <tr key={idx} className="border-b border-border/50">
                          <td className="px-3 py-2">{item.name}</td>
                          <td className="px-3 py-2">{item.setName}</td>
                          <td className="px-3 py-2">
                            <Badge variant="secondary" className="text-xs">
                              {item.condition}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            ${item.price.toFixed(2)}
                          </td>
                          <td className="px-3 py-2">{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button onClick={handleImport} disabled={isProcessing}>
                    {isProcessing ? (
                      "Importing..."
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Import {importData.length} Cards
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Result */}
          {importResult && (
            <Card
              className={
                importResult.failed > 0
                  ? "border-amber-500"
                  : "border-green-500"
              }
            >
              <CardContent className="flex items-center gap-4 py-6">
                {importResult.failed === 0 ? (
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-amber-500" />
                )}
                <div>
                  <p className="font-medium text-foreground">Import Complete</p>
                  <p className="text-sm text-muted-foreground">
                    {importResult.success} cards imported successfully
                    {importResult.failed > 0 &&
                      `, ${importResult.failed} failed`}
                  </p>
                </div>
                <Button asChild className="ml-auto">
                  <Link href="/inventory">View Inventory</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Google Sheets Tab */}
        <TabsContent value="sheets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Import from Google Sheets</CardTitle>
              <CardDescription>
                Export your Google Sheet as CSV and upload it
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg bg-muted p-6">
                <h3 className="font-medium text-foreground mb-4">
                  How to export from Google Sheets:
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Open your Google Sheet with inventory data</li>
                  <li>
                    Make sure your columns match the required format (name, set,
                    condition, price, quantity)
                  </li>
                  <li>
                    Click <strong>File</strong> &rarr; <strong>Download</strong>{" "}
                    &rarr; <strong>Comma Separated Values (.csv)</strong>
                  </li>
                  <li>
                    Upload the downloaded CSV file using the uploader above
                  </li>
                </ol>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card">
                <FileSpreadsheet className="h-10 w-10 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    Google Sheets Template
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Make a copy of our template to get started quickly
                  </p>
                </div>
                <Button variant="outline" asChild>
                  <a
                    href="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Template
                  </a>
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Note: Direct Google Sheets API integration coming soon. For now,
                please export as CSV.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function parseFinish(value: string): ManualCardData["finish"] {
  const normalized = value.trim().toLowerCase().replace(/[-_]/g, " ")

  if (
    normalized === "reverse" ||
    normalized === "reverse holo" ||
    normalized === "reverse holofoil"
  ) {
    return "Reverse Holo"
  }

  if (normalized === "holo" || normalized === "holofoil") {
    return "Holo"
  }

  if (normalized === "non holo" || normalized === "non holofoil") {
    return "Non Holo"
  }

  if (normalized === "cosmo" || normalized === "cosmo holo") {
    return "Cosmo Holo"
  }

  if (normalized === "stamped") {
    return "Stamped"
  }

  if (normalized === "full art") {
    return "Full Art"
  }

  return "Normal"
}
