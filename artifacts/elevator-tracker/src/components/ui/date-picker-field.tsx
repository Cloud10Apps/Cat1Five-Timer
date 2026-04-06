import * as React from "react";
import ReactDatePicker from "react-datepicker";
import { createPortal } from "react-dom";
import { parse, isValid, format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "react-datepicker/dist/react-datepicker.css";

/** Convert our internal YYYY-MM-DD string to a Date, or null */
function toDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = parse(value, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : null;
}

/**
 * Renders the react-datepicker calendar directly into document.body.
 *
 * Why: Using strategy:"fixed" on the Popper causes a race between Popper's
 * async ResizeObserver/rAF position updates and React's dialog unmount sequence.
 * That race throws a non-Error value that Vite surfaces as an overlay crash.
 *
 * With popperContainer the calendar lives outside the Dialog DOM tree, so
 * Popper uses the default strategy:"absolute" relative to the document — no
 * async fixed-position tracking, no crash.
 *
 * The Dialog's onPointerDownOutside / onInteractOutside guards (in dialog.tsx)
 * detect clicks on ".react-datepicker*" elements and call e.preventDefault()
 * so the dialog stays open while the user selects a date.
 */
const DatePickerPortal: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  if (typeof document === "undefined") return null;
  return createPortal(children ?? null, document.body);
};

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
  const selected = React.useMemo(() => toDate(value), [value]);

  const handleChange = (date: Date | null) => {
    if (!date || !isValid(date)) {
      onChange("");
      return;
    }
    try {
      onChange(format(date, "yyyy-MM-dd"));
    } catch {
      onChange("");
    }
  };

  return (
    <div className={cn("relative datepicker-wrapper", className)}>
      <ReactDatePicker
        selected={selected}
        onChange={handleChange}
        disabled={disabled}
        placeholderText={placeholder}
        dateFormat="MM/dd/yyyy"
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        yearDropdownItemNumber={20}
        scrollableYearDropdown
        popperContainer={DatePickerPortal}
        popperPlacement="bottom-start"
        popperClassName="z-[9999]"
        isClearable
        autoComplete="off"
        customInput={
          <CustomInput
            disabled={disabled}
            onClear={() => handleChange(null)}
            hasValue={!!selected}
          />
        }
      />
    </div>
  );
}

/** Styled input that matches the rest of the app */
const CustomInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    onClear?: () => void;
    hasValue?: boolean;
  }
>(({ onClear, hasValue, disabled, className, ...props }, ref) => (
  <div className="flex gap-1">
    <div className="relative flex-1">
      <input
        ref={ref}
        {...props}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-xs",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      />
      {hasValue && !disabled && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClear?.(); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          tabIndex={-1}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={disabled}
      className="shrink-0 pointer-events-none"
      tabIndex={-1}
      aria-hidden
    >
      <CalendarIcon className="h-4 w-4" />
    </Button>
  </div>
));
CustomInput.displayName = "CustomInput";
