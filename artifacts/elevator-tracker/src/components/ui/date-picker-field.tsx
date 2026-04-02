import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function parseTypedDate(text: string): Date | null {
  const trimmed = text.trim();
  const fmts = ["MM/dd/yyyy", "M/d/yyyy", "M/d/yy", "yyyy-MM-dd", "MM-dd-yyyy"];
  for (const fmt of fmts) {
    const d = parse(trimmed, fmt, new Date());
    if (isValid(d) && d.getFullYear() > 1900 && d.getFullYear() < 2100) return d;
  }
  return null;
}

interface DatePickerFieldProps {
  value?: string;
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
  const [inputText, setInputText] = React.useState(() => {
    if (!safeValue) return "";
    const d = parse(safeValue, "yyyy-MM-dd", new Date());
    return isValid(d) ? format(d, "MM/dd/yyyy") : "";
  });
  const [showCal, setShowCal] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Sync text when value changes externally (form reset, etc.)
  React.useEffect(() => {
    if (!safeValue) { setInputText(""); return; }
    const d = parse(safeValue, "yyyy-MM-dd", new Date());
    if (isValid(d)) setInputText(format(d, "MM/dd/yyyy"));
  }, [safeValue]);

  // Close calendar when clicking outside
  React.useEffect(() => {
    if (!showCal) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowCal(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showCal]);

  const selectedDate = React.useMemo(() => {
    if (!safeValue) return undefined;
    const d = parse(safeValue, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : undefined;
  }, [safeValue]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);
    if (!text) { onChange(""); return; }
    const d = parseTypedDate(text);
    if (d) onChange(format(d, "yyyy-MM-dd"));
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, "yyyy-MM-dd"));
      setInputText(format(date, "MM/dd/yyyy"));
    }
    setShowCal(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setInputText("");
    setShowCal(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="flex gap-1">
        <div className="relative flex-1">
          <Input
            value={inputText}
            onChange={handleTextChange}
            placeholder={placeholder}
            disabled={disabled}
            className="pr-7"
            onFocus={() => setShowCal(false)}
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
        <Button
          type="button"
          variant={showCal ? "default" : "outline"}
          size="icon"
          disabled={disabled}
          className="shrink-0"
          onClick={() => setShowCal(v => !v)}
        >
          <CalendarIcon className="h-4 w-4" />
        </Button>
      </div>

      {showCal && (
        <div className="absolute left-0 top-full mt-1 z-[9999] rounded-md border bg-popover shadow-lg">
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
        </div>
      )}
    </div>
  );
}
