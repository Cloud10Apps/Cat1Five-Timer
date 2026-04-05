export const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-muted text-muted-foreground hover:bg-muted/80",
  SCHEDULED: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  IN_PROGRESS: "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20",
  COMPLETED: "bg-green-500/10 text-green-600 hover:bg-green-500/20",
  OVERDUE: "bg-destructive/10 text-destructive hover:bg-destructive/20",
};

export const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Not Scheduled",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  OVERDUE: "Overdue",
};

const BADGE_STYLES: Record<string, string> = {
  NOT_STARTED: "border border-zinc-200 border-l-[3px] border-l-zinc-400 bg-zinc-50 text-zinc-600",
  SCHEDULED:   "border border-blue-200 border-l-[3px] border-l-blue-500 bg-blue-50 text-blue-700",
  IN_PROGRESS: "border border-amber-200 border-l-[3px] border-l-amber-500 bg-amber-50 text-amber-700",
  COMPLETED:   "border border-green-200 border-l-[3px] border-l-green-500 bg-green-50 text-green-700",
  OVERDUE:     "border border-red-200 border-l-[3px] border-l-red-500 bg-red-50 text-red-700",
};

export function StatusBadge({ status }: { status: string }) {
  const style = BADGE_STYLES[status] ?? BADGE_STYLES.NOT_STARTED;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium tracking-tight whitespace-nowrap text-center ${style}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
