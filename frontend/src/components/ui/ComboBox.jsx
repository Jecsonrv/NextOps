import PropTypes from 'prop-types';
"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "../../lib/utils";
import { Button } from "./Button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./Command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./Popover";

export function Combobox({ options = [], value, onChange, placeholder, searchPlaceholder }) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  // Filtrar opciones manualmente
  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options

    const search = searchValue.toLowerCase()
    return options.filter(option =>
      option.label.toLowerCase().includes(search) ||
      option.value.toLowerCase().includes(search)
    )
  }, [options, searchValue])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value
            ? options.find((option) => option.value === value)?.label
            : placeholder || "Select option..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder || "Search option..."}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandEmpty>No option found.</CommandEmpty>
          <CommandList className="max-h-60 overflow-y-auto">
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  disabled={false}
                  className="cursor-pointer hover:bg-gray-100 aria-selected:bg-gray-100"
                  onSelect={() => {
                    onChange(option.value)
                    setSearchValue("")
                    setOpen(false)
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    onChange(option.value)
                    setSearchValue("")
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

Combobox.propTypes = {
    options: PropTypes.arrayOf(PropTypes.shape({
        value: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
    })),
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
    searchPlaceholder: PropTypes.string,
};
