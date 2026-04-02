import * as React from "react";
import { format, parse, isValid, setMonth, setYear, startOfMonth } from "date-fns";
import { CalendarIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 41 }, (_, i) => CURRENT_YEAR - 10 + i); // ±10 yrs around today

function parseTypedDate(text: string): Date | null {
  const trimmed = text.trim();
  // Only attempt parse when a full 4-digit year is present
  const hasFullYear = /\d{4}$/.test(trimmed) || /^\d{4}-/.test(trimmed);
  if (!hasFullYear) return null;
  const fmts = ["MM/dd/yyyy", "M/d/yyyy", "yyyy-MM-dd", "MM-dd-yyyy"];
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
  const [calMonth, setCalMonth] = React.useState<Date>(
    () => {
      if (safeValue) {
        const d = parse(safeValue, "yyyy-MM-dd", new Date());
        if (isValid(d)) return startOfMonth(d);
      }
      return startOfMonth(new Date());
    }
  );
  const containerRef = React.useRef<HTMLDivElement>(null);
  const typingRef = React.useRef(false);

  // Sync text when value changes externally
  React.useEffect(() => {
    if (typingRef.current) { typingRef.current = false; return; }
    if (!safeValue) { setInputText(""); return; }
    const d = parse(safeValue, "yyyy-MM-dd", new Date());
    if (isValid(d)) {
      setInputText(format(d, "MM/dd/yyyy"));
      setCalMonth(startOfMonth(d));
    }
  }, [safeValue]);

  // Close calendar on outside click
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
    if (d) {
      typingRef.current = true;
      onChange(format(d, "yyyy-MM-dd"));
      setCalMonth(startOfMonth(d));
    }
  };

  const handleDaySelect = (date: Date | undefined) => {
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

  const handleMonthSelect = (monthStr: string) => {
    setCalMonth(prev => startOfMonth(setMonth(prev, parseInt(monthStr, 10))));
  };

  const handleYearSelect = (yearStr: string) => {
    setCalMonth(prev => startOfMonth(setYear(prev, parseInt(yearStr, 10))));
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
        <div className="absolute left-0 top-full mt-1 z-[9999] rounded-md border bg-white shadow-xl p-3 w-[280px]">
          {/* Custom month / year nav — uses our Select, no native invisible <select> */}
          <div className="flex items-center gap-1 mb-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCalMonth(prev => {
                const d = new Date(prev);
                d.setMonth(d.getMonth() - 1);
                return startOfMonth(d);
              })}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex gap-1 flex-1">
              <Select value={String(calMonth.getMonth())} onValueChange={handleMonthSelect}>
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((name, i) => (
                    <SelectItem key={i} value={String(i)} className="text-xs">{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={String(calMonth.getFullYear())} onValueChange={handleYearSelect}>
                <SelectTrigger className="h-7 text-xs w-[72px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map(y => (
                    <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCalMonth(prev => {
                const d = new Date(prev);
                d.setMonth(d.getMonth() + 1);
                return startOfMonth(d);
              })}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* DayPicker with no built-in caption — we handle navigation above */}
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleDaySelect}
            month={calMonth}
            onMonthChange={setCalMonth}
            hideNavigation
            classNames={{
              month_caption: "hidden",
              months: "flex flex-col",
              month: "w-full",
              table: "w-full border-collapse",
              weekdays: "flex",
              weekday: "text-muted-foreground flex-1 text-center text-[0.8rem] font-normal py-1",
              week: "flex mt-1",
              day: "flex-1 text-center text-sm p-0",
              day_button: cn(
                "w-full h-8 rounded-md text-sm hover:bg-accent hover:text-accent-foreground",
                "focus:outline-none focus:bg-accent"
              ),
              selected: "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary",
              today: "[&>button]:font-bold [&>button]:text-amber-600",
              outside: "opacity-40",
              disabled: "opacity-25 cursor-not-allowed",
            }}
          />
        </div>
      )}
    </div>
  );
}
