import { NextResponse } from "next/server"
import { isSquareConfigured } from "@/lib/square"

export async function GET() {
  const configured = isSquareConfigured()
  
  return NextResponse.json({
    configured,
    environment: process.env.SQUARE_ENVIRONMENT || "sandbox",
  })
}
