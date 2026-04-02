import { useState } from "react";
import { useListInspections, getListInspectionsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import dayjs from "dayjs";
import { Spinner } from "@/components/ui/spinner";
import { InspectionTypeBadge } from "@/components/inspection-type-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE = 3;

function statusStyle(status: string): string {
  switch (status) {
    case "OVERDUE":      return "border-l-[3px] border-red-500 bg-red-50 text-red-700";
    case "COMPLETED":    return "border-l-[3px] border-green-500 bg-green-50 text-green-700";
    case "IN_PROGRESS":  return "border-l-[3px] border-amber-500 bg-amber-50 text-amber-700";
    case "SCHEDULED":    return "border-l-[3px] border-blue-500 bg-blue-50 text-blue-700";
    default:             return "border-l-[3px] border-zinc-400 bg-zinc-100 text-zinc-600";
  }
}

function statusDot(status: string): string {
  switch (status) {
    case "OVERDUE":     return "bg-red-500";
    case "COMPLETED":   return "bg-green-500";
    case "IN_PROGRESS": return "bg-amber-500";
    case "SCHEDULED":   return "bg-blue-500";
    default:            return "bg-zinc-400";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "OVERDUE":      return "Overdue";
    case "COMPLETED":    return "Completed";
    case "IN_PROGRESS":  return "In Progress";
    case "SCHEDULED":    return "Scheduled";
    case "NOT_STARTED":  return "Not Started";
    default:             return status;
  }
}

type Inspection = NonNullable<ReturnType<typeof useListInspections>["data"]>[number];

interface EventChipProps {
  insp: Inspection;
  onClick: () => void;
}

function EventChip({ insp, onClick }: EventChipProps) {
  const header = [insp.customerName, insp.buildingName].filter(Boolean).join(" · ");
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-full text-left rounded px-2 py-1 leading-tight ${statusStyle(insp.status)} hover:brightness-95 transition-all`}
    >
      {header && (
        <p className="text-[10px] opacity-60 truncate font-normal mb-0.5">{header}</p>
      )}
      <div className="flex items-center gap-1 min-w-0">
        <span className="truncate flex-1 min-w-0 text-xs font-semibold">{insp.elevatorName ?? "Elevator"}</span>
        <span className="shrink-0 text-[10px] font-bold opacity-70">{insp.inspectionType}</span>
      </div>
    </button>
  );
}

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
  const [selectedInsp, setSelectedInsp] = useState<Inspection | null>(null);

  const today = dayjs();
  const startOfMonth = currentDate.startOf("month");
  const endOfMonth = currentDate.endOf("month");

  const { data: inspections, isLoading } = useListInspections(
    { month: currentDate.month() + 1, year: currentDate.year() },
    { query: { queryKey: getListInspectionsQueryKey({ month: currentDate.month() + 1, year: currentDate.year() }) } }
  );

  const prevMonth = () => setCurrentDate(d => d.subtract(1, "month"));
  const nextMonth = () => setCurrentDate(d => d.add(1, "month"));
  const goToday   = () => setCurrentDate(dayjs());

  // Build calendar grid: leading blanks + days of month
  const startDay = startOfMonth.day();
  const daysInMonth = endOfMonth.date();
  const calendarDays: (dayjs.Dayjs | null)[] = [];
  for (let i = 0; i < startDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(currentDate.date(i));

  const getDayInspections = (date: dayjs.Dayjs): Inspection[] => {
    if (!inspections) return [];
    return inspections.filter(insp => {
      const ref = insp.status === "COMPLETED" && insp.completionDate
        ? insp.completionDate
        : insp.scheduledDate ?? insp.nextDueDate;
      return ref ? dayjs(ref).isSame(date, "day") : false;
    });
  };

  const selectedDayInspections = selectedDate ? getDayInspections(selectedDate) : [];

  const openDayDetail = (date: dayjs.Dayjs) => {
    setSelectedInsp(null);
    setSelectedDate(date);
  };

  // How many weeks?
  const totalCells = calendarDays.length;
  const weeks = Math.ceil(totalCells / 7);

  return (
    <div className="flex flex-col animate-in fade-in duration-500" style={{ height: "calc(100vh - 112px)" }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">Inspection schedule and due dates.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-lg min-w-[160px] text-center">
            {currentDate.format("MMMM YYYY")}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 flex flex-col border rounded-lg overflow-hidden bg-card min-h-0">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b shrink-0 bg-muted/40">
          {DAYS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground border-r last:border-r-0">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        {isLoading && !inspections ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <div
            className="flex-1 grid grid-cols-7 min-h-0"
            style={{ gridTemplateRows: `repeat(${weeks}, 1fr)` }}
          >
            {calendarDays.map((date, idx) => {
              if (!date) {
                return (
                  <div
                    key={`blank-${idx}`}
                    className="border-r border-b last:border-r-0 bg-muted/20 p-1.5"
                  />
                );
              }

              const isToday = today.isSame(date, "day");
              const isCurrentMonth = date.month() === currentDate.month();
              const dayInsps = getDayInspections(date);
              const visible = dayInsps.slice(0, MAX_VISIBLE);
              const overflow = dayInsps.length - MAX_VISIBLE;

              return (
                <div
                  key={date.format("YYYY-MM-DD")}
                  onClick={() => openDayDetail(date)}
                  className={`border-r border-b last:border-r-0 p-1.5 cursor-pointer flex flex-col gap-1 min-h-0 overflow-hidden transition-colors
                    ${isToday ? "bg-amber-50/60" : "bg-card hover:bg-muted/30"}
                    ${!isCurrentMonth ? "opacity-50" : ""}
                  `}
                >
                  {/* Day number */}
                  <div className="shrink-0 flex items-center justify-between mb-0.5">
                    <span
                      className={`text-xs font-semibold h-5 w-5 flex items-center justify-center rounded-full leading-none
                        ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}
                      `}
                    >
                      {date.date()}
                    </span>
                    {dayInsps.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">{dayInsps.length}</span>
                    )}
                  </div>

                  {/* Event chips */}
                  <div className="flex flex-col gap-0.5 flex-1 min-h-0 overflow-hidden">
                    {visible.map(insp => (
                      <EventChip
                        key={insp.id}
                        insp={insp}
                        onClick={() => { setSelectedInsp(insp); setSelectedDate(null); }}
                      />
                    ))}
                    {overflow > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openDayDetail(date); }}
                        className="text-[11px] text-primary font-medium px-1 text-left hover:underline"
                      >
                        +{overflow} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Day detail dialog */}
      <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {selectedDate?.format("dddd, MMMM D, YYYY")}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {selectedDayInspections.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground text-sm">
                No inspections on this date.
              </p>
            ) : (
              <div className="space-y-2 pr-2 py-1">
                {selectedDayInspections.map(insp => (
                  <InspectionDetailRow
                    key={insp.id}
                    insp={insp}
                    onClick={() => { setSelectedDate(null); setSelectedInsp(insp); }}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Single inspection detail dialog */}
      <Dialog open={!!selectedInsp} onOpenChange={(open) => !open && setSelectedInsp(null)}>
        <DialogContent className="max-w-md">
          {selectedInsp && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${statusDot(selectedInsp.status)}`} />
                  {selectedInsp.elevatorName}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <InspectionTypeBadge type={selectedInsp.inspectionType} />
                  <Badge
                    className="text-xs"
                    style={{ background: "transparent", border: "1px solid currentColor" }}
                  >
                    {statusLabel(selectedInsp.status)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Customer</p>
                    <p className="font-medium">{selectedInsp.customerName ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Building</p>
                    <p className="font-medium">{selectedInsp.buildingName ?? "—"}</p>
                  </div>
                  {selectedInsp.nextDueDate && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Due Date</p>
                      <p className="font-medium">{dayjs(selectedInsp.nextDueDate).format("MMM D, YYYY")}</p>
                    </div>
                  )}
                  {selectedInsp.scheduledDate && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Scheduled</p>
                      <p className="font-medium">{dayjs(selectedInsp.scheduledDate).format("MMM D, YYYY")}</p>
                    </div>
                  )}
                  {selectedInsp.lastInspectionDate && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Last Inspection</p>
                      <p className="font-medium">{dayjs(selectedInsp.lastInspectionDate).format("MMM D, YYYY")}</p>
                    </div>
                  )}
                  {selectedInsp.completionDate && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Completed</p>
                      <p className="font-medium">{dayjs(selectedInsp.completionDate).format("MMM D, YYYY")}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Cycle</p>
                    <p className="font-medium">{selectedInsp.recurrenceYears} yr</p>
                  </div>
                </div>
                {selectedInsp.notes && (
                  <div className="rounded-md bg-muted/50 border p-3 text-sm">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Notes</p>
                    <p>{selectedInsp.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InspectionDetailRow({ insp, onClick }: { insp: Inspection; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg p-3 flex items-start gap-3 border hover:brightness-95 transition-all ${statusStyle(insp.status)}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm truncate">{insp.elevatorName}</span>
          <InspectionTypeBadge type={insp.inspectionType} />
        </div>
        <p className="text-xs opacity-75 mt-0.5">{insp.buildingName} · {insp.customerName}</p>
        {insp.nextDueDate && (
          <p className="text-xs opacity-60 mt-0.5">Due {dayjs(insp.nextDueDate).format("MMM D")}</p>
        )}
      </div>
    </button>
  );
}
