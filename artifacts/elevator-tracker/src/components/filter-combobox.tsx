import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterComboboxProps {
  value: string[];
  onValueChange: (val: string[]) => void;
  options: FilterOption[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  width?: string;
}

export function FilterCombobox({
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  disabled = false,
  width = "w-[160px]",
}: FilterComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const toggle = (val: string) => {
    const next = value.includes(val)
      ? value.filter((v) => v !== val)
      : [...value, val];
    onValueChange(next);
  };

  const isFiltered = value.length > 0;

  const selectedLabel =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? (options.find((o) => o.value === value[0])?.label ?? placeholder)
        : `${value.length} selected`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-8 justify-between font-medium text-xs px-2.5",
            width,
            isFiltered
              ? "border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
              : "text-zinc-800 hover:text-zinc-950"
          )}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start" style={{ width: "220px" }}>
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
              {emptyText}
            </CommandEmpty>
            <CommandGroup>
              {isFiltered && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => onValueChange([])}
                  className="text-xs text-zinc-500 italic"
                >
                  <X className="mr-2 h-3.5 w-3.5" />
                  Clear selection
                </CommandItem>
              )}
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => toggle(option.value)}
                  className="text-xs"
                >
                  <Check
                    className={cn(
                      "mr-2 h-3.5 w-3.5",
                      value.includes(option.value) ? "opacity-100" : "opacity-0"
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
  );
}
