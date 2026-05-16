import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
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
import { cn } from "@/lib/utils";

export interface CustomerOption {
  id: number;
  name: string;
}

interface MultiCustomerSelectProps {
  options: CustomerOption[];
  value: number[];
  onChange: (next: number[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MultiCustomerSelect({
  options,
  value,
  onChange,
  placeholder = "Select customers...",
  disabled,
}: MultiCustomerSelectProps) {
  const [open, setOpen] = useState(false);
  const byId = new Map(options.map((o) => [o.id, o]));
  const selectedIds = new Set(value);

  const toggle = (id: number) => {
    if (selectedIds.has(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  const removeChip = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(value.filter((v) => v !== id));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between min-h-[2.25rem] h-auto py-1.5",
            value.length === 0 && "text-muted-foreground",
          )}
        >
          <div className="flex flex-wrap gap-1 items-center min-w-0">
            {value.length === 0 ? (
              <span>{placeholder}</span>
            ) : (
              value.map((id) => {
                const opt = byId.get(id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-xs font-medium"
                  >
                    <span className="truncate max-w-[14rem]">{opt?.name ?? `Customer #${id}`}</span>
                    <button
                      type="button"
                      onClick={(e) => removeChip(id, e)}
                      className="hover:bg-amber-200 rounded p-0.5 -mr-1"
                      aria-label={`Remove ${opt?.name ?? `customer ${id}`}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search customers..." />
          <CommandList>
            <CommandEmpty>No customer found.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const isSelected = selectedIds.has(o.id);
                return (
                  <CommandItem
                    key={o.id}
                    value={o.name}
                    onSelect={() => toggle(o.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{o.name}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
