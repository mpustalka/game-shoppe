"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Library } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface SetOption {
  id: string
  name: string
}

interface SetFilterProps {
  sets: SetOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}

/**
 * Searchable set picker. Type to filter the list of sets — much faster than a
 * plain dropdown when the catalog spans dozens of sets. "all" clears the filter.
 */
export function SetFilter({ sets, value, onChange, className }: SetFilterProps) {
  const [open, setOpen] = useState(false)
  const selected = sets.find((s) => s.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between font-normal", className)}
        >
          <span className="flex min-w-0 items-center">
            <Library className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">
              {selected ? selected.name : "All Sets"}
            </span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search sets..." />
          <CommandList>
            <CommandEmpty>No sets found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="All Sets"
                onSelect={() => {
                  onChange("all")
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === "all" ? "opacity-100" : "opacity-0",
                  )}
                />
                All Sets
              </CommandItem>
              {sets.map((set) => (
                <CommandItem
                  key={set.id}
                  value={set.name}
                  onSelect={() => {
                    onChange(set.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === set.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{set.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
