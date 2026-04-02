import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Parse user-typed text in common formats: MM/DD/YYYY, YYYY-MM-DD, M/D/YYYY
function parseTypedDate(text: string): Date | null {
  const trimmed = text.trim();
  const formats = ["MM/dd/yyyy", "M/d/yyyy", "yyyy-MM-dd", "MM-dd-yyyy"];
  for (const fmt of formats) {
    const d = parse(trimmed, fmt, new Date());
    if (isValid(d) && d.getFullYear() > 1900 && d.getFullYear() < 2100) return d;
  }
  return null;
}

interface DatePickerFieldProps {
  value?: string;          // stored value: YYYY-MM-DD or ""
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePickerField({
  value,
  onChange,
  placeholder = "MM/DD/YYYY",
  disabled,
  className,
}: DatePickerFieldProps) {
  const safeValue = value ?? "";

  // The text shown in the input — either the user's live typing or formatted stored value
  const [inputText, setInputText] = React.useState(() =>
    safeValue ? format(parse(safeValue, "yyyy-MM-dd", new Date()), "MM/dd/yyyy") : ""
  );
  const [open, setOpen] = React.useState(false);

  // Keep inputText in sync when value changes externally (e.g. form reset, clear)
  React.useEffect(() => {
    if (!safeValue) {
      setInputText("");
      return;
    }
    const d = parse(safeValue, "yyyy-MM-dd", new Date());
    if (isValid(d)) {
      setInputText(format(d, "MM/dd/yyyy"));
    }
  }, [safeValue]);

  const selectedDate = React.useMemo(() => {
    if (!safeValue) return undefined;
    const d = parse(safeValue, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : undefined;
  }, [safeValue]);

  // User types in the text box
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);
    if (text === "") {
      onChange("");
      return;
    }
    const parsed = parseTypedDate(text);
    if (parsed) {
      onChange(format(parsed, "yyyy-MM-dd"));
    }
  };

  // User picks from calendar
  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      const formatted = format(date, "yyyy-MM-dd");
      onChange(formatted);
      setInputText(format(date, "MM/dd/yyyy"));
    }
    setOpen(false);
  };

  // Clear button
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setInputText("");
  };

  return (
    <div className={cn("flex gap-1", className)}>
      <div className="relative flex-1">
        <Input
          value={inputText}
          onChange={handleTextChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("pr-7", selectedDate ? "" : "text-muted-foreground")}
        />
        {inputText && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            className="shrink-0"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 z-[9999]"
          align="end"
          side="bottom"
          sideOffset={4}
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleCalendarSelect}
            captionLayout="dropdown"
            fromYear={2000}
            toYear={2040}
            defaultMonth={selectedDate ?? new Date()}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
