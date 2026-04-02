import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useListInspections,
  getListInspectionsQueryKey,
  useUpdateInspection,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import dayjs from "dayjs";
import { Spinner } from "@/components/ui/spinner";
import { InspectionTypeBadge } from "@/components/inspection-type-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE = 3;

const editSchema = z.object({
  inspectionType: z.enum(["CAT1", "CAT5"] as const),
  recurrenceYears: z.coerce.number().min(1),
  status: z.enum(["NOT_STARTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "OVERDUE"] as const),
  lastInspectionDate: z.string().optional(),
  scheduledDate: z.string().optional(),
  completionDate: z.string().optional(),
  notes: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

function statusStyle(status: string): string {
  switch (status) {
    case "OVERDUE":     return "border-l-[3px] border-red-500 bg-red-50 text-red-700";
    case "COMPLETED":   return "border-l-[3px] border-green-500 bg-green-50 text-green-700";
    case "IN_PROGRESS": return "border-l-[3px] border-amber-500 bg-amber-50 text-amber-700";
    case "SCHEDULED":   return "border-l-[3px] border-blue-500 bg-blue-50 text-blue-700";
    default:            return "border-l-[3px] border-zinc-400 bg-zinc-100 text-zinc-600";
  }
}

type Inspection = NonNullable<ReturnType<typeof useListInspections>["data"]>[number];

function EventChip({ insp, onClick }: { insp: Inspection; onClick: () => void }) {
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

function DayListRow({ insp, onClick }: { insp: Inspection; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg p-3 flex items-start gap-3 border group ${statusStyle(insp.status)} hover:brightness-95 transition-all`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm truncate">{insp.elevatorName}</span>
          <InspectionTypeBadge type={insp.inspectionType} />
        </div>
        <p className="text-xs opacity-75 mt-0.5">{insp.buildingName} · {insp.customerName}</p>
        {insp.nextDueDate && (
          <p className="text-xs opacity-60 mt-0.5">Due {dayjs(insp.nextDueDate).format("MMM D, YYYY")}</p>
        )}
      </div>
      <Pencil className="h-3.5 w-3.5 opacity-40 group-hover:opacity-80 shrink-0 mt-0.5 transition-opacity" />
    </button>
  );
}

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
  const [editingInsp, setEditingInsp] = useState<Inspection | null>(null);

  const today = dayjs();
  const startOfMonth = currentDate.startOf("month");
  const endOfMonth = currentDate.endOf("month");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateMutation = useUpdateInspection();

  const queryKey = getListInspectionsQueryKey({ month: currentDate.month() + 1, year: currentDate.year() });

  const { data: inspections, isLoading } = useListInspections(
    { month: currentDate.month() + 1, year: currentDate.year() },
    { query: { queryKey } }
  );

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { inspectionType: "CAT1", recurrenceYears: 1, status: "NOT_STARTED", notes: "" },
  });

  const watchLastDate = form.watch("lastInspectionDate");
  const watchRecurrence = form.watch("recurrenceYears");
  const nextDuePreview = watchLastDate && watchRecurrence
    ? dayjs(watchLastDate).add(Number(watchRecurrence), "year").format("MMM D, YYYY")
    : "—";

  const openEdit = (insp: Inspection) => {
    setSelectedDate(null);
    setEditingInsp(insp);
    form.reset({
      inspectionType: insp.inspectionType,
      recurrenceYears: insp.recurrenceYears,
      status: insp.status,
      lastInspectionDate: insp.lastInspectionDate ? dayjs(insp.lastInspectionDate).format("YYYY-MM-DD") : "",
      scheduledDate: insp.scheduledDate ? dayjs(insp.scheduledDate).format("YYYY-MM-DD") : "",
      completionDate: insp.completionDate ? dayjs(insp.completionDate).format("YYYY-MM-DD") : "",
      notes: insp.notes ?? "",
    });
  };

  const onSubmit = (data: EditFormValues) => {
    if (!editingInsp) return;
    updateMutation.mutate(
      { id: editingInsp.id, data: { ...data, elevatorId: editingInsp.elevatorId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey() });
          setEditingInsp(null);
          form.reset();
          toast({ title: "Inspection updated" });
        },
        onError: () => {
          toast({ title: "Failed to update inspection", variant: "destructive" });
        },
      }
    );
  };

  // Build calendar grid
  const startDay = startOfMonth.day();
  const daysInMonth = endOfMonth.date();
  const calendarDays: (dayjs.Dayjs | null)[] = [];
  for (let i = 0; i < startDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(currentDate.date(i));
  const weeks = Math.ceil(calendarDays.length / 7);

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

  return (
    <div className="flex flex-col animate-in fade-in duration-500" style={{ height: "calc(100vh - 112px)" }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">Inspection schedule and due dates.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(dayjs())}>Today</Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => d.subtract(1, "month"))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-lg min-w-[160px] text-center">
            {currentDate.format("MMMM YYYY")}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => d.add(1, "month"))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 flex flex-col border rounded-lg overflow-hidden bg-card min-h-0">
        <div className="grid grid-cols-7 border-b shrink-0 bg-muted/40">
          {DAYS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground border-r last:border-r-0">
              {d}
            </div>
          ))}
        </div>

        {isLoading && !inspections ? (
          <div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>
        ) : (
          <div
            className="flex-1 grid grid-cols-7 min-h-0"
            style={{ gridTemplateRows: `repeat(${weeks}, 1fr)` }}
          >
            {calendarDays.map((date, idx) => {
              if (!date) {
                return <div key={`blank-${idx}`} className="border-r border-b last:border-r-0 bg-muted/20 p-1.5" />;
              }
              const isToday = today.isSame(date, "day");
              const dayInsps = getDayInspections(date);
              const visible = dayInsps.slice(0, MAX_VISIBLE);
              const overflow = dayInsps.length - MAX_VISIBLE;

              return (
                <div
                  key={date.format("YYYY-MM-DD")}
                  onClick={() => { setEditingInsp(null); setSelectedDate(date); }}
                  className={`border-r border-b last:border-r-0 p-1.5 cursor-pointer flex flex-col gap-1 min-h-0 overflow-hidden transition-colors
                    ${isToday ? "bg-amber-50/60" : "bg-card hover:bg-muted/30"}`}
                >
                  <div className="shrink-0 flex items-center justify-between mb-0.5">
                    <span className={`text-xs font-semibold h-5 w-5 flex items-center justify-center rounded-full leading-none
                      ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                      {date.date()}
                    </span>
                    {dayInsps.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">{dayInsps.length}</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1 min-h-0 overflow-hidden">
                    {visible.map(insp => (
                      <EventChip key={insp.id} insp={insp} onClick={() => openEdit(insp)} />
                    ))}
                    {overflow > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingInsp(null); setSelectedDate(date); }}
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

      {/* Day list dialog */}
      <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedDate?.format("dddd, MMMM D, YYYY")}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {selectedDayInspections.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground text-sm">No inspections on this date.</p>
            ) : (
              <div className="space-y-2 pr-2 py-1">
                {selectedDayInspections.map(insp => (
                  <DayListRow key={insp.id} insp={insp} onClick={() => openEdit(insp)} />
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingInsp} onOpenChange={(open) => { if (!open) { setEditingInsp(null); form.reset(); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              Edit Inspection
            </DialogTitle>
          </DialogHeader>

          {editingInsp && (
            <>
              {/* Context bar */}
              <div className={`rounded-lg px-3 py-2 text-sm ${statusStyle(editingInsp.status)}`}>
                <p className="text-[11px] opacity-60 mb-0.5">{editingInsp.customerName} · {editingInsp.buildingName}</p>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{editingInsp.elevatorName}</span>
                  <InspectionTypeBadge type={editingInsp.inspectionType} />
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Status */}
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                              <SelectItem value="COMPLETED">Completed</SelectItem>
                              <SelectItem value="OVERDUE">Overdue</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Type */}
                    <FormField
                      control={form.control}
                      name="inspectionType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="CAT1">CAT1 (Annual)</SelectItem>
                              <SelectItem value="CAT5">CAT5 (5-Year)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Recurrence */}
                    <FormField
                      control={form.control}
                      name="recurrenceYears"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recurrence (Years)</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Next due preview */}
                    <div className="flex flex-col justify-end pb-1">
                      <p className="text-xs text-muted-foreground mb-1">Calculated Next Due</p>
                      <p className="text-sm font-semibold">{nextDuePreview}</p>
                    </div>

                    {/* Last inspection */}
                    <FormField
                      control={form.control}
                      name="lastInspectionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Inspection Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Scheduled */}
                    <FormField
                      control={form.control}
                      name="scheduledDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scheduled Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Completion */}
                    <FormField
                      control={form.control}
                      name="completionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Completion Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Input placeholder="Inspector notes, compliance details…" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" type="button" className="flex-1" onClick={() => { setEditingInsp(null); form.reset(); }}>
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? "Saving…" : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
