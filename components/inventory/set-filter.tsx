"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Library, Search } from "lucide-react"
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

export function SetFilter({
  sets,
  value,
  onChange,
  className,
}: SetFilterProps) {
  const [open, setOpen] = useState(false)
  const selected = sets.find((s) => s.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-11 justify-between rounded-xl border-white/10 bg-white/[0.045] px-3 font-normal text-white hover:bg-white/[0.075] hover:text-white",
            className,
          )}
        >
          <span className="flex min-w-0 items-center">
            <Library className="mr-2 h-4 w-4 shrink-0 text-white/35" />

            <span className="truncate text-white/80">
              {selected ? selected.name : "All Sets"}
            </span>
          </span>

          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-white/30" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[min(88vw,320px)] overflow-hidden rounded-2xl border border-white/10 bg-[#111114] p-0 text-white shadow-2xl shadow-black/50"
        align="start"
      >
        <Command className="bg-transparent text-white">
          <div className="border-b border-white/10 px-2 py-2">
            <CommandInput
              placeholder="Search sets..."
              className="h-10 text-white placeholder:text-white/30"
            />
          </div>

          <CommandList className="max-h-[300px]">
            <CommandEmpty className="py-6 text-center text-sm text-white/40">
              No sets found.
            </CommandEmpty>

            <CommandGroup className="p-1.5 text-white">
              <CommandItem
                value="All Sets"
                onSelect={() => {
                  onChange("all")
                  setOpen(false)
                }}
                className="rounded-xl text-white/70 aria-selected:bg-white/10 aria-selected:text-white"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4 text-rose-400",
                    value === "all"
                      ? "opacity-100"
                      : "opacity-0",
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
                  className="rounded-xl text-white/70 aria-selected:bg-white/10 aria-selected:text-white"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 text-rose-400",
                      value === set.id
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />

                  <span className="truncate">
                    {set.name}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}