"use client"

import type {
  ReactNode,
} from "react"

import {
  StoreCartProvider,
} from "@/lib/store-cart"

export default function StoreCartProviderWrapper({
  children,
}: {
  children: ReactNode
}) {
  return (
    <StoreCartProvider>
      {children}
    </StoreCartProvider>
  )
}