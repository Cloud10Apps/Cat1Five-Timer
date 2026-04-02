import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
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
  disabled,
  className,
}: DatePickerFieldProps) {
  const safeValue = value ?? "";

  const parsed = React.useMemo(() => {
    if (!safeValue) return { month: "", day: "", year: "" };
    const match = safeValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return { month: "", day: "", year: "" };
    return {
      year: match[1],
      month: String(parseInt(match[2], 10)),
      day: String(parseInt(match[3], 10)),
    };
  }, [safeValue]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 41 }, (_, i) => currentYear - 10 + i);

  const monthNum = parseInt(parsed.month, 10) || 0;
  const yearNum = parseInt(parsed.year, 10) || currentYear;
  const maxDays = monthNum ? daysInMonth(monthNum, yearNum) : 31;
  const days = Array.from({ length: maxDays }, (_, i) => i + 1);

  const emit = (month: string, day: string, year: string) => {
    if (month && day && year) {
      const mm = month.padStart(2, "0");
      const dd = day.padStart(2, "0");
      onChange(`${year}-${mm}-${dd}`);
    } else if (!month && !day && !year) {
      onChange("");
    }
  };

  const handleMonth = (val: string) => {
    const newMax = daysInMonth(parseInt(val, 10), yearNum);
    const clampedDay = parsed.day && parseInt(parsed.day, 10) > newMax ? String(newMax) : parsed.day;
    emit(val, clampedDay, parsed.year);
  };
  const handleDay = (val: string) => emit(parsed.month, val, parsed.year);
  const handleYear = (val: string) => {
    const newMax = monthNum ? daysInMonth(monthNum, parseInt(val, 10)) : 31;
    const clampedDay = parsed.day && parseInt(parsed.day, 10) > newMax ? String(newMax) : parsed.day;
    emit(parsed.month, clampedDay, val);
  };

  return (
    <div className={cn("flex gap-1.5", className)}>
      <Select value={parsed.month} onValueChange={handleMonth} disabled={disabled}>
        <SelectTrigger className="flex-[3] min-w-0">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((name, i) => (
            <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={parsed.day} onValueChange={handleDay} disabled={disabled || !parsed.month}>
        <SelectTrigger className="flex-[2] min-w-0">
          <SelectValue placeholder="Day" />
        </SelectTrigger>
        <SelectContent>
          {days.map(d => (
            <SelectItem key={d} value={String(d)}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={parsed.year} onValueChange={handleYear} disabled={disabled}>
        <SelectTrigger className="flex-[2] min-w-0">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {years.map(y => (
            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
