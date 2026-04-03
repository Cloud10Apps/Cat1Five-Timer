import { Badge } from "@/components/ui/badge";

export const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-muted text-muted-foreground hover:bg-muted/80",
  SCHEDULED: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  IN_PROGRESS: "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20",
  COMPLETED: "bg-green-500/10 text-green-600 hover:bg-green-500/20",
  OVERDUE: "bg-destructive/10 text-destructive hover:bg-destructive/20",
};

export const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Not Started",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  OVERDUE: "Overdue",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={`border-0 font-medium text-sm ${STATUS_COLORS[status] || STATUS_COLORS.NOT_STARTED}`}>
      {STATUS_LABELS[status] || status}
    </Badge>
  );
}
