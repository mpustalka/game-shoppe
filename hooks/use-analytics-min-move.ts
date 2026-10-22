"use client"

import { useCallback, useEffect, useState } from "react"

import { createClient } from "@/lib/supabase/client"

// Minimum price move (in dollars) a card needs before Analytics lists it as a
// gainer or drop. Saved on the signed-in account (Supabase user metadata), so
// the choice follows the user across devices.
export const MIN_MOVE_OPTIONS = [
  { value: 0, label: "Any change" },
  { value: 0.05, label: "$0.05+" },
  { value: 0.25, label: "$0.25+" },
  { value: 1, label: "$1.00+" },
] as const

export const DEFAULT_MIN_MOVE = 0.05

const METADATA_KEY = "analytics_min_move"

function parse(value: unknown): number | null {
  const n = Number(value)
  return MIN_MOVE_OPTIONS.some((option) => option.value === n) ? n : null
}

export function useAnalyticsMinMove() {
  const [minMove, setMinMoveState] = useState(DEFAULT_MIN_MOVE)
  // False until the saved value is known, so pages don't fetch twice.
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        const saved = parse(data.user?.user_metadata?.[METADATA_KEY])
        if (active && saved !== null) setMinMoveState(saved)
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true)
      })
    return () => {
      active = false
    }
  }, [])

  const setMinMove = useCallback((value: number) => {
    setMinMoveState(value)
    createClient()
      .auth.updateUser({ data: { [METADATA_KEY]: value } })
      .catch((error) => console.error("Unable to save price-move setting", error))
  }, [])

  return { minMove, setMinMove, ready }
}
