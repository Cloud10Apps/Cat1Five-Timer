import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface InspectionTypeBadgeProps {
  type: "CAT1" | "CAT5" | string;
  className?: string;
}

export function InspectionTypeBadge({ type, className }: InspectionTypeBadgeProps) {
  if (type === "CAT5") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold tracking-wide",
          "bg-yellow-400 text-zinc-900 border border-yellow-300",
          className
        )}
      >
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
        <span>CAT5</span>
        <span className="font-medium opacity-75">· 5-Year</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide",
        "bg-zinc-100 text-zinc-600 border border-zinc-200",
        className
      )}
    >
      <span>CAT1</span>
      <span className="font-normal opacity-70">· Annual</span>
    </span>
  );
}
