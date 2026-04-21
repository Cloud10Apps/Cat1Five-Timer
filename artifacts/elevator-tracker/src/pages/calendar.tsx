import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useListInspections,
  getListInspectionsQueryKey,
  useUpdateInspection,
  useListElevators,
  getListElevatorsQueryKey,
  useListCustomers,
  getListCustomersQueryKey,
  useListBuildings,
  getListBuildingsQueryKey,
  Inspection,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { DatePickerField } from "@/components/ui/date-picker-field";
import {
  ChevronLeft, ChevronRight, Pencil, Layers, AlertTriangle, X, Search,
} from "lucide-react";
import dayjs from "dayjs";
import { Spinner } from "@/components/ui/spinner";
import { InspectionTypeBadge } from "@/components/inspection-type-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { FilterCombobox } from "@/components/filter-combobox";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { fireCompletionConfetti } from "@/lib/confetti";
import { isValidDateStr } from "@/lib/inspection-utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE = 3;

/* ── Filter constants ──────────────────────────────────────────────── */
const INSP_TYPE_OPTIONS = [{ value: "CAT1", label: "CAT 1" }, { value: "CAT5", label: "CAT 5" }];

/* ── Edit form schema ────────────────────────────────────────────── */
const editSchema = z.object({
  inspectionType: z.enum(["CAT1", "CAT5"] as const),
  recurrenceYears: z.coerce.number().min(1),
  status: z.enum(["NOT_STARTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"] as const),
  lastInspectionDate: z.string().optional(),
  nextDueDate: z.string().optional(),
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

type ActivityType = "due" | "scheduled" | "completed";
type CalendarActivity = { insp: Inspection; activityType: ActivityType };

const ACTIVITY_CHIP: Record<ActivityType, { label: string; chip: string; pill: string }> = {
  due:       { label: "Due",       chip: "border-l-[3px] border-amber-400 bg-amber-50  text-amber-900",  pill: "bg-amber-500  text-white border-amber-500"  },
  scheduled: { label: "Scheduled", chip: "border-l-[3px] border-blue-400  bg-blue-50   text-blue-900",   pill: "bg-blue-500   text-white border-blue-500"   },
  completed: { label: "Completed", chip: "border-l-[3px] border-green-500 bg-green-50  text-green-900",  pill: "bg-green-500  text-white border-green-500"  },
};

function ActivityTypePill({ type }: { type: ActivityType }) {
  const meta = ACTIVITY_CHIP[type];
  return (
    <span className={`inline-flex items-center rounded-full border px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide shrink-0 ${meta.pill}`}>
      {meta.label}
    </span>
  );
}

function EventChip({ activity, onClick }: { activity: CalendarActivity; onClick: () => void }) {
  const { insp, activityType } = activity;
  const header = [insp.customerName, insp.buildingName].filter(Boolean).join(" · ");
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-full text-left rounded px-2 py-1.5 leading-tight ${ACTIVITY_CHIP[activityType].chip} hover:brightness-95 transition-all`}
    >
      {header && (
        <p className="text-xs opacity-60 truncate font-normal mb-0.5">{header}</p>
      )}
      <div className="flex items-center gap-1 min-w-0">
        <span className="truncate flex-1 min-w-0 text-xs font-semibold">{insp.elevatorName ?? "Elevator"}</span>
        <span className="shrink-0 text-xs font-bold opacity-80">{insp.inspectionType}</span>
        <ActivityTypePill type={activityType} />
      </div>
    </button>
  );
}

function DayListRow({ activity, onClick }: { activity: CalendarActivity; onClick: () => void }) {
  const { insp, activityType } = activity;
  const dateLabel = activityType === "due"
    ? insp.nextDueDate ? `Due ${dayjs(insp.nextDueDate).format("MMM D, YYYY")}` : null
    : activityType === "scheduled"
    ? insp.scheduledDate ? `Scheduled ${dayjs(insp.scheduledDate).format("MMM D, YYYY")}` : null
    : insp.completionDate ? `Completed ${dayjs(insp.completionDate).format("MMM D, YYYY")}` : null;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg p-4 flex items-start gap-3 border group ${ACTIVITY_CHIP[activityType].chip} hover:brightness-95 transition-all`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-base truncate">{insp.elevatorName}</span>
          <InspectionTypeBadge type={insp.inspectionType} />
          <ActivityTypePill type={activityType} />
        </div>
        <p className="text-sm opacity-75 mt-1">{insp.buildingName} · {insp.customerName}</p>
        {dateLabel && <p className="text-sm opacity-60 mt-0.5">{dateLabel}</p>}
      </div>
      <Pencil className="h-4 w-4 opacity-40 group-hover:opacity-80 shrink-0 mt-0.5 transition-opacity" />
    </button>
  );
}

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
  const [editingInsp, setEditingInsp] = useState<Inspection | null>(null);

  /* ── Filter state ── */
  const [selectedCustomerIds,  setSelectedCustomerIds]  = useState<string[]>([]);
  const [selectedBuildingIds,  setSelectedBuildingIds]  = useState<string[]>([]);
  const [selectedInspTypes,    setSelectedInspTypes]    = useState<string[]>([]);
  const [searchQuery,          setSearchQuery]          = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const today = dayjs();
  const startOfMonth = currentDate.startOf("month");
  const endOfMonth = currentDate.endOf("month");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateMutation = useUpdateInspection();

  const queryKey = getListInspectionsQueryKey({ month: currentDate.month() + 1, year: currentDate.year() });

  const { data: rawInspections, isLoading } = useListInspections(
    { month: currentDate.month() + 1, year: currentDate.year() },
    { query: { queryKey } }
  );
  const { data: elevators } = useListElevators({}, { query: { queryKey: getListElevatorsQueryKey({}) } });
  const { data: customers } = useListCustomers({}, { query: { queryKey: getListCustomersQueryKey({}) } });
  const { data: buildings } = useListBuildings({}, { query: { queryKey: getListBuildingsQueryKey({}) } });

  /* ── Elevator meta map ── */
  const elevatorMeta = useMemo(() => {
    const map = new Map<number, { bank: string; type: string; customerId: number; buildingId: number; name: string }>();
    for (const e of elevators ?? []) map.set(e.id, { bank: e.bank ?? "", type: e.type ?? "", customerId: e.customerId ?? 0, buildingId: e.buildingId, name: e.name });
    return map;
  }, [elevators]);

  const handleCustomerChange = (val: string[]) => { setSelectedCustomerIds(val); setSelectedBuildingIds([]); };
  const handleBuildingChange = (val: string[]) => setSelectedBuildingIds(val);

  /* ── Cascade filter options ── */
  const customerOptions = useMemo(() => (customers ?? []).map(c => ({ value: String(c.id), label: c.name })), [customers]);
  const buildingOptions = useMemo(() => {
    const list = selectedCustomerIds.length > 0 ? (buildings ?? []).filter(b => selectedCustomerIds.includes(String(b.customerId))) : (buildings ?? []);
    return list.map(b => ({ value: String(b.id), label: b.name }));
  }, [buildings, selectedCustomerIds]);

  /* ── Client-side filtering ── */
  const inspections = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return (rawInspections ?? []).filter(insp => {
      const meta = elevatorMeta.get(insp.elevatorId);
      if (selectedCustomerIds.length > 0 && (!meta || !selectedCustomerIds.includes(String(meta.customerId)))) return false;
      if (selectedBuildingIds.length > 0 && (!meta || !selectedBuildingIds.includes(String(meta.buildingId)))) return false;
      if (selectedInspTypes.length   > 0 && !selectedInspTypes.includes(insp.inspectionType))                  return false;
      if (q) {
        const name = (meta?.name ?? "").toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });
  }, [rawInspections, elevatorMeta, selectedCustomerIds, selectedBuildingIds, selectedInspTypes, debouncedSearch]);

  /* ── Edit form ── */
  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { inspectionType: "CAT1", recurrenceYears: 1, status: "NOT_STARTED", notes: "", nextDueDate: "" },
  });

  const watchLastDate    = form.watch("lastInspectionDate");
  const watchRecurrence  = form.watch("recurrenceYears");
  const watchStatus      = form.watch("status");
  const watchScheduled   = form.watch("scheduledDate");
  const watchCompletion  = form.watch("completionDate");

  const nextDuePreview = watchLastDate && watchRecurrence
    ? dayjs(watchLastDate).add(Number(watchRecurrence), "year").format("YYYY-MM-DD")
    : null;

  const completionYearMismatch = !!(
    isValidDateStr(watchCompletion) && nextDuePreview &&
    dayjs(watchCompletion, "YYYY-MM-DD", true).year() !== dayjs(nextDuePreview).year()
  );

  useEffect(() => {
    if (watchStatus === "NOT_STARTED" && watchScheduled) {
      form.setValue("status", "SCHEDULED");
    }
  }, [watchScheduled]);

  useEffect(() => {
    if (watchCompletion) {
      form.setValue("status", "COMPLETED");
    }
  }, [watchCompletion]);

  const openEdit = (insp: Inspection) => {
    setSelectedDate(null);
    setEditingInsp(insp);
    const hasLast = !!insp.lastInspectionDate;
    form.reset({
      inspectionType: insp.inspectionType,
      recurrenceYears: insp.recurrenceYears,
      status: (insp as any).trueStatus ?? insp.status,
      lastInspectionDate: hasLast ? dayjs(insp.lastInspectionDate).format("YYYY-MM-DD") : "",
      nextDueDate: !hasLast && insp.nextDueDate ? dayjs(insp.nextDueDate).format("YYYY-MM-DD") : "",
      scheduledDate: insp.scheduledDate ? dayjs(insp.scheduledDate).format("YYYY-MM-DD") : "",
      completionDate: insp.completionDate ? dayjs(insp.completionDate).format("YYYY-MM-DD") : "",
      notes: insp.notes ?? "",
    });
  };

  const onSubmit = (data: EditFormValues) => {
    if (!editingInsp) return;
    updateMutation.mutate(
      { id: editingInsp.id, data: {
        ...data,
        elevatorId: editingInsp.elevatorId,
        lastInspectionDate: data.lastInspectionDate || undefined,
        nextDueDate: data.lastInspectionDate ? undefined : (data.nextDueDate || undefined),
        scheduledDate: data.scheduledDate || undefined,
        completionDate: data.completionDate || undefined,
      }},
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey() });
          setEditingInsp(null);
          form.reset();
          if (data.status === "COMPLETED") fireCompletionConfetti();
          toast({ title: "Inspection updated" });
        },
        onError: () => {
          toast({ title: "Failed to update inspection", variant: "destructive" });
        },
      }
    );
  };

  /* ── Calendar grid ── */
  const startDay = startOfMonth.day();
  const daysInMonth = endOfMonth.date();
  const calendarDays: (dayjs.Dayjs | null)[] = [];
  for (let i = 0; i < startDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(currentDate.date(i));
  const weeks = Math.ceil(calendarDays.length / 7);

  const getDayActivities = (date: dayjs.Dayjs): CalendarActivity[] => {
    if (!inspections) return [];
    const activities: CalendarActivity[] = [];
    for (const insp of inspections) {
      const isCompleted = insp.status === "COMPLETED" || !!insp.completionDate;

      if (!isCompleted && insp.nextDueDate && dayjs(insp.nextDueDate).isSame(date, "day"))
        activities.push({ insp, activityType: "due" });

      if (!isCompleted && insp.scheduledDate && dayjs(insp.scheduledDate).isSame(date, "day"))
        activities.push({ insp, activityType: "scheduled" });

      if (insp.completionDate && dayjs(insp.completionDate).isSame(date, "day"))
        activities.push({ insp, activityType: "completed" });
    }
    return activities;
  };

  const selectedDayActivities = selectedDate ? getDayActivities(selectedDate) : [];
  const visibleCount = inspections?.length ?? 0;

  return (
    <div className="flex flex-col animate-in fade-in duration-500 gap-4" style={{ height: "calc(100vh - 96px)" }}>

      {/* ── Header ── */}
      <div className="flex justify-between items-start shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compliance Calendar</h1>
          <p className="mt-2 mb-4 text-sm text-zinc-500 leading-snug">Each unit appears on its Due Date, Scheduled Date, and Completion Date — so a single unit may appear multiple times across the calendar.</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(dayjs())}>Today</Button>
          <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setCurrentDate(d => d.subtract(1, "month"))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-lg min-w-[160px] text-center">
            {currentDate.format("MMMM YYYY")}
          </span>
          <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setCurrentDate(d => d.add(1, "month"))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="bg-white border border-zinc-200 rounded-lg shadow-sm">
          <div className="flex items-center gap-1.5 px-3 py-2 min-h-[48px]">
            <FilterCombobox value={selectedCustomerIds} onValueChange={handleCustomerChange} options={customerOptions} placeholder="All Customers" searchPlaceholder="Search customers..." width="w-[155px]" />
            <FilterCombobox value={selectedBuildingIds} onValueChange={handleBuildingChange} options={buildingOptions} placeholder="All Buildings" searchPlaceholder="Search buildings..." width="w-[140px]" />
            <FilterCombobox value={selectedInspTypes} onValueChange={setSelectedInspTypes} options={INSP_TYPE_OPTIONS} placeholder="CAT1 / CAT5" searchPlaceholder="Search..." width="w-[130px]" />
            <div className="relative shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search units..."
                className="h-8 pl-8 pr-3 w-[180px] text-xs text-zinc-700 placeholder-zinc-400 border border-zinc-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
              />
            </div>
            <div className="flex-1 min-w-0" />
            <span className="text-xs tabular-nums whitespace-nowrap shrink-0">
              <span className="font-bold text-zinc-700">{visibleCount}</span>
              <span className="text-zinc-400 ml-1">{visibleCount === 1 ? "inspection" : "inspections"}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Calendar grid ── */}
      <div className="flex-1 flex flex-col border rounded-lg overflow-hidden bg-card min-h-0">
        <div className="grid grid-cols-7 border-b shrink-0 bg-muted/40">
          {DAYS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground border-r last:border-r-0">
              {d}
            </div>
          ))}
        </div>

        {isLoading && !rawInspections ? (
          <div className="flex-1 flex items-center justify-center"><Spinner className="h-8 w-8" /></div>
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
              const dayActivities = getDayActivities(date);
              const visible = dayActivities.slice(0, MAX_VISIBLE);
              const overflow = dayActivities.length - MAX_VISIBLE;

              return (
                <div
                  key={date.format("YYYY-MM-DD")}
                  onClick={() => { setEditingInsp(null); setSelectedDate(date); }}
                  className={`border-r border-b last:border-r-0 p-1.5 cursor-pointer flex flex-col gap-1 overflow-hidden transition-colors
                    ${isToday ? "bg-amber-50/60" : "bg-card hover:bg-muted/30"}`}
                  style={{ minHeight: "100px" }}
                >
                  <div className="shrink-0 flex items-center justify-between mb-0.5">
                    <span className={`text-xs font-semibold h-6 w-6 flex items-center justify-center rounded-full leading-none
                      ${isToday ? "bg-amber-500 text-white font-bold" : "text-foreground"}`}>
                      {date.date()}
                    </span>
                    {dayActivities.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">{dayActivities.length}</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1 min-h-0 overflow-hidden">
                    {visible.map((activity, i) => (
                      <EventChip key={`${activity.insp.id}-${activity.activityType}-${i}`} activity={activity} onClick={() => openEdit(activity.insp)} />
                    ))}
                    {overflow > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingInsp(null); setSelectedDate(date); }}
                        className="text-xs text-primary font-medium px-1 text-left hover:underline"
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
            {selectedDayActivities.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground text-sm">No inspections on this date.</p>
            ) : (
              <div className="space-y-2 pr-2 py-1">
                {selectedDayActivities.map((activity, i) => (
                  <DayListRow key={`${activity.insp.id}-${activity.activityType}-${i}`} activity={activity} onClick={() => openEdit(activity.insp)} />
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingInsp} onOpenChange={(open) => { if (!open) { setEditingInsp(null); form.reset(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">

          {/* ── Header ── */}
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="flex items-center gap-2.5 text-xl">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 shrink-0">
                <Layers className="h-4 w-4" />
              </span>
              {editingInsp?.elevatorName ?? "Edit Inspection"}
            </DialogTitle>
            {editingInsp && (
              <p className="text-sm text-muted-foreground pl-10">
                {editingInsp.buildingName} · {editingInsp.customerName}
              </p>
            )}
          </DialogHeader>

          {editingInsp && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-1">

                {/* ── Section: Inspection Definition ── */}
                <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-4 space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Inspection Definition</p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="inspectionType" render={({ field }) => (
                      <FormItem><FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="CAT1">CAT1 (Annual)</SelectItem>
                            <SelectItem value="CAT5">CAT5 (5-Year)</SelectItem>
                          </SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="recurrenceYears" render={({ field }) => (
                      <FormItem><FormLabel>Recurrence (Years)</FormLabel>
                        <FormControl><Input type="number" min="1" className="bg-white" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="lastInspectionDate" render={({ field }) => (
                      <FormItem><FormLabel>Last Inspection Date</FormLabel>
                        <FormControl><DatePickerField value={field.value} onChange={field.onChange} placeholder="Pick a date" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    {watchLastDate ? (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium leading-none">Next Due Date</label>
                        <div className={`flex items-center h-9 px-3 rounded-md border text-sm tabular-nums font-semibold transition-colors ${nextDuePreview ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-zinc-200 text-zinc-400"}`}>
                          {nextDuePreview
                            ? new Date(nextDuePreview + "T00:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
                            : <span className="italic font-normal text-sm">Auto-calculated</span>}
                        </div>
                        <p className="text-xs text-zinc-400 leading-none">From last date + recurrence</p>
                      </div>
                    ) : (
                      <FormField control={form.control} name="nextDueDate" render={({ field }) => (
                        <FormItem><FormLabel>Next Due Date</FormLabel>
                          <FormControl><DatePickerField value={field.value} onChange={field.onChange} placeholder="Pick a date" /></FormControl>
                          <p className="text-xs text-zinc-400 leading-none">Enter manually or add Last Inspection Date to auto-calculate</p>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}
                  </div>
                </div>

                {/* ── Section: Schedule ── */}
                <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-4 space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Schedule</p>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem><FormLabel>Inspection Status</FormLabel>
                        <Select value={field.value} onValueChange={(val) => {
                          field.onChange(val);
                          if (val === "SCHEDULED") { form.setValue("scheduledDate", dayjs().format("YYYY-MM-DD")); form.setValue("completionDate", ""); }
                          else if (val === "COMPLETED") { form.setValue("completionDate", dayjs().format("YYYY-MM-DD")); }
                          else { form.setValue("completionDate", ""); }
                        }}>
                          <FormControl><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="NOT_STARTED">Not Scheduled</SelectItem>
                            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                          </SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="scheduledDate" render={({ field }) => (
                      <FormItem><FormLabel>Scheduled Date <span className="font-normal text-muted-foreground text-xs">(Optional)</span></FormLabel>
                        <FormControl><DatePickerField value={field.value} onChange={field.onChange} placeholder="Pick a date" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="completionDate" render={({ field }) => (
                      <FormItem><FormLabel>Completion Date <span className="font-normal text-muted-foreground text-xs">(Optional)</span></FormLabel>
                        <FormControl><DatePickerField value={field.value} onChange={field.onChange} placeholder="Pick a date" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                {/* ── Year mismatch warning ── */}
                {completionYearMismatch && isValidDateStr(watchCompletion) && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-3 text-amber-900">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                    <div className="text-sm leading-snug">
                      <span className="font-semibold">Are you sure?</span>{" "}
                      The completion year ({dayjs(watchCompletion, "YYYY-MM-DD", true).year()}) doesn't match the expected next due year ({nextDuePreview ? dayjs(nextDuePreview).year() : "unknown"}). Double-check the dates before saving.
                    </div>
                  </div>
                )}

                {/* ── Notes ── */}
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>Notes</FormLabel>
                    <FormControl><Textarea placeholder="Inspector notes, compliance details..." className="resize-none h-20" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <Button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-900 font-semibold"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Saving..." : "Save Inspection"}
                </Button>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
