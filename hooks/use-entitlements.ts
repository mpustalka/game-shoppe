"use client"

import { useEffect, useState } from "react"

import {
  DEFAULT_ENTITLEMENTS,
  type Entitlements,
} from "@/lib/entitlements"

interface EntitlementsState {
  entitlements: Entitlements
  loading: boolean
  signedIn: boolean
  email: string | null
}

// Client hook that loads the signed-in account's billing entitlements from
// /api/subscription (computed server-side). Feature gating in the UI reads
// from here. While loading it returns the permissive defaults so the app never
// flashes a locked state for a user who actually has access.
export function useEntitlements(): EntitlementsState {
  const [state, setState] = useState<EntitlementsState>({
    entitlements: DEFAULT_ENTITLEMENTS,
    loading: true,
    signedIn: false,
    email: null,
  })

  useEffect(() => {
    let active = true

    fetch("/api/subscription")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return
        setState({
          entitlements: data.entitlements ?? DEFAULT_ENTITLEMENTS,
          loading: false,
          signedIn: Boolean(data.signedIn),
          email: data.email ?? null,
        })
      })
      .catch(() => {
        if (!active) return
        setState((prev) => ({ ...prev, loading: false }))
      })

    return () => {
      active = false
    }
  }, [])

  return state
}
