import type { PokemonSet } from "./types"

// Sets that aren't (yet) served by the public Pokémon TCG API but that we want
// browsable in the app right away — brand-new releases, promos, and regional
// exclusives. These are merged into the live set list so they show up on the
// Sets page the moment they're announced, without waiting for the upstream API
// to catch up.
//
// A custom set uses a `customSet: true` marker so the rest of the app can tell
// it apart from an API-backed set (its card list is curated/empty until the
// upstream API adds the cards).
export interface CustomPokemonSet extends PokemonSet {
  customSet: true
}

export const CUSTOM_SETS: CustomPokemonSet[] = [
  {
    id: "me1-pitch-black",
    name: "Pitch Black",
    series: "Mega Evolution",
    printedTotal: 190,
    total: 190,
    releaseDate: "2026/07/18",
    updatedAt: "2026/07/18 00:00:00",
    images: {
      // No upstream art yet — the set card falls back to a placeholder logo.
      symbol: "",
      logo: "",
    },
    customSet: true,
  },
]

export function isCustomSetId(setId: string): boolean {
  return CUSTOM_SETS.some((set) => set.id === setId)
}

export function getCustomSetById(setId: string): CustomPokemonSet | null {
  return CUSTOM_SETS.find((set) => set.id === setId) ?? null
}
