import { useState, useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useListInspections,
  getListInspectionsQueryKey,
  useCreateInspection,
  useUpdateInspection,
  useDeleteInspection,
  useListElevators,
  getListElevatorsQueryKey,
  useListBuildings,
  getListBuildingsQueryKey,
  useListCustomers,
  getListCustomersQueryKey,
  Inspection,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Search, Pencil, Trash2, ClipboardCheck, Download, CalendarDays, X, ChevronDown, ChevronUp } from "lucide-react";
import { DatePickerField } from "@/components/ui/date-picker-field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/status-badge";
import { InspectionTypeBadge } from "@/components/inspection-type-badge";
import { FilterCombobox } from "@/components/filter-combobox";
import dayjs from "dayjs";
import { useDebounce } from "@/hooks/use-debounce";

const inspectionSchema = z.object({
  elevatorId: z.coerce.number().min(1, "Elevator is required"),
  inspectionType: z.enum(["CAT1", "CAT5"] as const),
  recurrenceYears: z.coerce.number().min(1, "Recurrence is required"),
  lastInspectionDate: z.string().optional(),
  scheduledDate: z.string().optional(),
  completionDate: z.string().optional(),
  status: z.enum(["NOT_STARTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"] as const).optional(),
  notes: z.string().optional(),
});

type InspectionFormValues = z.infer<typeof inspectionSchema>;

const STATUS_OPTIONS = [
  { value: "NOT_STARTED", label: "Not Started" },
  { value: "SCHEDULED",   label: "Scheduled" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED",   label: "Completed" },
  { value: "OVERDUE",     label: "Overdue" },
];

const TYPE_OPTIONS = [
  { value: "CAT1", label: "CAT1" },
  { value: "CAT5", label: "CAT5" },
];

function statusBarColor(status: string) {
  if (status === "OVERDUE")     return "bg-red-500";
  if (status === "COMPLETED")   return "bg-emerald-500";
  if (status === "IN_PROGRESS") return "bg-amber-400";
  if (status === "SCHEDULED")   return "bg-blue-400";
  return "bg-zinc-300";
}

function rowHoverClass(status: string) {
  if (status === "OVERDUE")   return "hover:bg-red-50/50";
  if (status === "COMPLETED") return "hover:bg-emerald-50/40";
  return "hover:bg-blue-50/30";
}

const GRID = "grid-cols-[1fr_110px_85px_160px_125px_80px_125px_125px_125px_76px]";

export default function Inspections() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null);
  const [showDateFilters, setShowDateFilters] = useState(false);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("all");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("all");
  const [selectedElevatorId, setSelectedElevatorId] = useState<string>("all");
  const [selectedBank, setSelectedBank] = useState<string>("all");

  const [lastInspFrom, setLastInspFrom] = useState("");
  const [lastInspTo, setLastInspTo] = useState("");
  const [nextDueFrom, setNextDueFrom] = useState("");
  const [nextDueTo, setNextDueTo] = useState("");
  const [scheduledFrom, setScheduledFrom] = useState("");
  const [scheduledTo, setScheduledTo] = useState("");
  const [completionFrom, setCompletionFrom] = useState("");
  const [completionTo, setCompletionTo] = useState("");

  const hasDateFilters = !!(lastInspFrom || lastInspTo || nextDueFrom || nextDueTo || scheduledFrom || scheduledTo || completionFrom || completionTo);
  const hasAnyFilter = selectedCustomerId !== "all" || selectedBuildingId !== "all" || selectedElevatorId !== "all" || selectedBank !== "all" || selectedStatus !== "all" || selectedType !== "all" || search !== "" || hasDateFilters;

  const clearDateFilters = useCallback(() => {
    setLastInspFrom(""); setLastInspTo("");
    setNextDueFrom(""); setNextDueTo("");
    setScheduledFrom(""); setScheduledTo("");
    setCompletionFrom(""); setCompletionTo("");
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedCustomerId("all"); setSelectedBuildingId("all");
    setSelectedElevatorId("all"); setSelectedBank("all");
    setSelectedStatus("all"); setSelectedType("all");
    setSearch("");
    clearDateFilters();
  }, [clearDateFilters]);

  const handleCustomerChange = (val: string) => {
    setSelectedCustomerId(val);
    setSelectedBuildingId("all");
    setSelectedElevatorId("all");
  };

  const handleBuildingChange = (val: string) => {
    setSelectedBuildingId(val);
    setSelectedElevatorId("all");
  };

  const statusFilter = selectedStatus !== "all" ? (selectedStatus as any) : undefined;
  const typeFilter = selectedType !== "all" ? (selectedType as "CAT1" | "CAT5") : undefined;
  const customerIdFilter = selectedCustomerId !== "all" ? Number(selectedCustomerId) : undefined;
  const buildingIdFilter = selectedBuildingId !== "all" ? Number(selectedBuildingId) : undefined;
  const elevatorIdFilter = selectedElevatorId !== "all" ? Number(selectedElevatorId) : undefined;
  const bankFilter = selectedBank !== "all" ? selectedBank : undefined;

  const queryParams = {
    search: debouncedSearch || undefined,
    status: statusFilter,
    inspectionType: typeFilter,
    customerId: customerIdFilter,
    buildingId: buildingIdFilter,
    elevatorId: elevatorIdFilter,
    bank: bankFilter,
    lastInspectionDateFrom: lastInspFrom || undefined,
    lastInspectionDateTo: lastInspTo || undefined,
    nextDueDateFrom: nextDueFrom || undefined,
    nextDueDateTo: nextDueTo || undefined,
    scheduledDateFrom: scheduledFrom || undefined,
    scheduledDateTo: scheduledTo || undefined,
    completionDateFrom: completionFrom || undefined,
    completionDateTo: completionTo || undefined,
  };

  const { data: inspections, isLoading } = useListInspections(
    queryParams,
    { query: { queryKey: getListInspectionsQueryKey(queryParams) } }
  );

  const { data: elevators } = useListElevators({}, { query: { queryKey: getListElevatorsQueryKey({}) } });
  const { data: customers } = useListCustomers({}, { query: { queryKey: getListCustomersQueryKey({}) } });
  const { data: buildings } = useListBuildings({}, { query: { queryKey: getListBuildingsQueryKey({}) } });

  const filteredBuildings = customerIdFilter
    ? (buildings ?? []).filter(b => b.customerId === customerIdFilter)
    : (buildings ?? []);
  const filteredElevators = buildingIdFilter
    ? (elevators ?? []).filter(e => e.buildingId === buildingIdFilter)
    : customerIdFilter
      ? (elevators ?? []).filter(e => filteredBuildings.some(b => b.id === e.buildingId))
      : (elevators ?? []);
  const allBanks = useMemo(() => Array.from(new Set((elevators ?? []).map(e => e.bank).filter(Boolean))) as string[], [elevators]);

  const customerOptions = useMemo(() => (customers ?? []).map(c => ({ value: String(c.id), label: c.name })), [customers]);
  const buildingOptions = useMemo(() => filteredBuildings.map(b => ({ value: String(b.id), label: b.name })), [filteredBuildings]);
  const bankOptions     = useMemo(() => allBanks.map(b => ({ value: b, label: b })), [allBanks]);
  const elevatorOptions = useMemo(() => filteredElevators.map(e => ({ value: String(e.id), label: e.name })), [filteredElevators]);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useCreateInspection();
  const updateMutation = useUpdateInspection();
  const deleteMutation = useDeleteInspection();

  const form = useForm<InspectionFormValues>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: {
      elevatorId: 0,
      inspectionType: "CAT1",
      recurrenceYears: 1,
      status: "NOT_STARTED",
      notes: ""
    },
  });

  const onSubmit = (data: InspectionFormValues) => {
    if (editingInspection) {
      updateMutation.mutate(
        { id: editingInspection.id, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey() });
            setEditingInspection(null);
            setIsAddOpen(false);
            form.reset();
            toast({ title: "Inspection updated successfully" });
          },
          onError: () => {
            toast({ title: "Failed to update inspection", variant: "destructive" });
          },
        }
      );
    } else {
      createMutation.mutate(
        { data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey() });
            setIsAddOpen(false);
            form.reset();
            toast({ title: "Inspection added successfully" });
          },
          onError: () => {
            toast({ title: "Failed to add inspection", variant: "destructive" });
          },
        }
      );
    }
  };

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const confirmDelete = () => {
    if (deleteId === null) return;
    deleteMutation.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey() });
          toast({ title: "Inspection deleted successfully" });
          setDeleteId(null);
        },
        onError: () => {
          toast({ title: "Failed to delete inspection", variant: "destructive" });
          setDeleteId(null);
        },
      }
    );
  };

  const openEdit = (inspection: Inspection) => {
    setEditingInspection(inspection);
    form.reset({
      elevatorId: inspection.elevatorId,
      inspectionType: inspection.inspectionType,
      recurrenceYears: inspection.recurrenceYears,
      status: inspection.status === "OVERDUE" ? "NOT_STARTED" : inspection.status,
      lastInspectionDate: inspection.lastInspectionDate ? dayjs(inspection.lastInspectionDate).format('YYYY-MM-DD') : "",
      scheduledDate: inspection.scheduledDate ? dayjs(inspection.scheduledDate).format('YYYY-MM-DD') : "",
      completionDate: inspection.completionDate ? dayjs(inspection.completionDate).format('YYYY-MM-DD') : "",
      notes: inspection.notes || "",
    });
  };

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.append("status", statusFilter);
    if (typeFilter) params.append("inspectionType", typeFilter);
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/export/inspections?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) { console.error("Export failed", res.status); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inspections_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const watchLastDate      = form.watch("lastInspectionDate");
  const watchRecurrence    = form.watch("recurrenceYears");
  const watchStatus        = form.watch("status");
  const watchScheduledDate = form.watch("scheduledDate");
  const watchCompletionDate = form.watch("completionDate");
  const nextDuePreview = watchLastDate && watchRecurrence
    ? dayjs(watchLastDate).add(Number(watchRecurrence), 'year').format('YYYY-MM-DD')
    : "N/A";

  useEffect(() => {
    if (watchCompletionDate) form.setValue("status", "COMPLETED");
  }, [watchCompletionDate]);

  useEffect(() => {
    const today = dayjs().format("YYYY-MM-DD");
    if (watchStatus === "SCHEDULED" || watchStatus === "IN_PROGRESS") {
      if (!form.getValues("scheduledDate")) form.setValue("scheduledDate", today);
    } else if (watchStatus === "COMPLETED") {
      if (!form.getValues("scheduledDate")) form.setValue("scheduledDate", today);
      if (!form.getValues("completionDate")) form.setValue("completionDate", today);
    }
  }, [watchStatus]);

  useEffect(() => {
    if (watchScheduledDate && form.getValues("status") === "NOT_STARTED") {
      form.setValue("status", "SCHEDULED");
    }
  }, [watchScheduledDate]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inspections</h1>
          <p className="text-sm text-muted-foreground">Manage compliance cycles and schedules.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) {
              form.reset({ elevatorId: 0, inspectionType: "CAT1", recurrenceYears: 1, status: "NOT_STARTED", notes: "" });
              setEditingInspection(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingInspection(null);
                form.reset({ elevatorId: 0, inspectionType: "CAT1", recurrenceYears: 1, status: "NOT_STARTED", notes: "" });
              }} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Inspection
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingInspection ? "Edit Inspection" : "Add New Inspection"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="elevatorId" render={({ field }) => (
                      <FormItem className="col-span-2 md:col-span-1">
                        <FormLabel>Elevator</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value ? field.value.toString() : ""} disabled={!!editingInspection}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select an elevator" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {elevators?.map((elevator) => (
                              <SelectItem key={elevator.id} value={elevator.id.toString()}>
                                {elevator.name} ({elevator.buildingName})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem className="col-span-2 md:col-span-1">
                        <FormLabel>Status</FormLabel>
                        <Select value={field.value} onValueChange={(val) => { field.onChange(val); if (val !== "COMPLETED") form.setValue("completionDate", ""); }}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="inspectionType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="CAT1">CAT1 (Annual)</SelectItem>
                            <SelectItem value="CAT5">CAT5 (5-Year)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="recurrenceYears" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recurrence (Years)</FormLabel>
                        <FormControl><Input type="number" min="1" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="lastInspectionDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Inspection Date</FormLabel>
                        <FormControl><DatePickerField value={field.value} onChange={field.onChange} placeholder="Pick a date" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="flex flex-col justify-center pt-8 text-sm text-muted-foreground">
                      Calculated Next Due: <strong>{nextDuePreview}</strong>
                    </div>
                    <FormField control={form.control} name="scheduledDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scheduled Date (Optional)</FormLabel>
                        <FormControl><DatePickerField value={field.value} onChange={field.onChange} placeholder="Pick a date" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="completionDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Completion Date (Optional)</FormLabel>
                        <FormControl><DatePickerField value={field.value} onChange={field.onChange} placeholder="Pick a date" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl><Input placeholder="Inspector notes, compliance details..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save Inspection"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider select-none">Filters</span>
          <div className="h-4 w-px bg-zinc-200" />

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            <input
              placeholder="Search..."
              className="pl-8 h-8 text-xs border border-zinc-200 rounded-md bg-white w-[150px] focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder:text-zinc-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <FilterCombobox
            value={selectedCustomerId}
            onValueChange={handleCustomerChange}
            options={customerOptions}
            placeholder="All Customers"
            searchPlaceholder="Search customers..."
            width="w-[175px]"
          />
          <FilterCombobox
            value={selectedBuildingId}
            onValueChange={handleBuildingChange}
            options={buildingOptions}
            placeholder="All Buildings"
            searchPlaceholder="Search buildings..."
            width="w-[155px]"
          />
          <FilterCombobox
            value={selectedBank}
            onValueChange={setSelectedBank}
            options={bankOptions}
            placeholder="All Banks"
            searchPlaceholder="Search banks..."
            disabled={bankOptions.length === 0}
            width="w-[130px]"
          />
          <FilterCombobox
            value={selectedElevatorId}
            onValueChange={setSelectedElevatorId}
            options={elevatorOptions}
            placeholder="All Elevators"
            searchPlaceholder="Search elevators..."
            disabled={elevatorOptions.length === 0}
            width="w-[165px]"
          />

          <div className="h-4 w-px bg-zinc-200" />

          <FilterCombobox
            value={selectedStatus}
            onValueChange={setSelectedStatus}
            options={STATUS_OPTIONS}
            placeholder="All Statuses"
            searchPlaceholder="Search statuses..."
            width="w-[145px]"
          />
          <FilterCombobox
            value={selectedType}
            onValueChange={setSelectedType}
            options={TYPE_OPTIONS}
            placeholder="All Types"
            searchPlaceholder="Search types..."
            width="w-[120px]"
          />

          <div className="h-4 w-px bg-zinc-200" />

          {/* Date range toggle */}
          <button
            onClick={() => setShowDateFilters(v => !v)}
            className={`h-8 px-3 flex items-center gap-1.5 text-xs font-medium rounded-md border transition-colors ${
              showDateFilters || hasDateFilters
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Date Ranges
            {hasDateFilters && <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />}
            {showDateFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {hasAnyFilter && (
            <button
              onClick={clearAllFilters}
              className="h-8 px-3 flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 hover:border-red-300 hover:text-red-700 transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Clear filters
            </button>
          )}
        </div>

        {/* Date range panel */}
        {showDateFilters && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { label: "Last Inspection", from: lastInspFrom, to: lastInspTo, setFrom: setLastInspFrom, setTo: setLastInspTo },
              { label: "Next Due",        from: nextDueFrom,  to: nextDueTo,  setFrom: setNextDueFrom,  setTo: setNextDueTo },
              { label: "Scheduled Date",  from: scheduledFrom,to: scheduledTo,setFrom: setScheduledFrom,setTo: setScheduledTo },
              { label: "Completion Date", from: completionFrom,to: completionTo,setFrom: setCompletionFrom,setTo: setCompletionTo },
            ].map(({ label, from, to, setFrom, setTo }) => (
              <div key={label} className="space-y-1.5">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{label}</p>
                <div className="flex gap-1.5 items-center">
                  <input type="date" className="h-8 text-xs border border-zinc-200 rounded-md px-2 bg-white flex-1 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400" value={from} onChange={e => setFrom(e.target.value)} />
                  <span className="text-zinc-300 text-xs">–</span>
                  <input type="date" className="h-8 text-xs border border-zinc-200 rounded-md px-2 bg-white flex-1 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400" value={to} onChange={e => setTo(e.target.value)} />
                </div>
              </div>
            ))}
            {hasDateFilters && (
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                <button onClick={clearDateFilters} className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1">
                  <X className="h-3 w-3" /> Clear date filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Grid table ── */}
      <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-sm bg-white">

        {/* Column headers */}
        <div className={`grid ${GRID} bg-zinc-50 border-b border-zinc-200`}>
          {[
            { label: "Elevator / Building", cls: "pl-8" },
            { label: "Bank",      cls: "justify-center" },
            { label: "Type",      cls: "justify-center" },
            { label: "Status",    cls: "justify-center" },
            { label: "Last Insp", cls: "justify-center" },
            { label: "Recur",     cls: "justify-center" },
            { label: "Next Due",  cls: "justify-center" },
            { label: "Scheduled", cls: "justify-center" },
            { label: "Completed", cls: "justify-center" },
            { label: "",          cls: "" },
          ].map(({ label, cls }, i) => (
            <div key={i} className={`flex items-center px-3 py-2.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider ${cls} ${i > 0 ? "border-l border-zinc-200" : ""}`}>
              {label}
            </div>
          ))}
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : inspections?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <ClipboardCheck className="h-10 w-10 mb-3 opacity-25" />
            <p className="text-sm font-medium">No inspections found</p>
            <p className="text-xs mt-1 text-zinc-300">Try adjusting your filters</p>
          </div>
        ) : (
          inspections?.map((inspection) => {
            const isOverdue = inspection.status !== "COMPLETED" && inspection.nextDueDate && dayjs(inspection.nextDueDate).isBefore(dayjs());
            const displayStatus = isOverdue ? "OVERDUE" : inspection.status;
            return (
              <div
                key={inspection.id}
                className={`grid ${GRID} group relative border-b border-zinc-100 last:border-b-0 transition-colors ${rowHoverClass(displayStatus)}`}
              >
                {/* Status color bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${statusBarColor(displayStatus)} transition-colors`} />

                {/* Elevator + Building */}
                <div className="flex flex-col justify-center px-4 py-2.5 pl-6 min-w-0">
                  <span className="text-xs font-semibold text-zinc-900 truncate leading-snug">{inspection.elevatorName}</span>
                  <span className="text-[11px] text-zinc-400 truncate leading-snug mt-0.5">{inspection.buildingName}</span>
                </div>

                {/* Bank */}
                <div className="flex items-center justify-center px-2 py-2.5 border-l border-zinc-100">
                  <span className="text-xs text-zinc-500 truncate">{(inspection as any).bank || <span className="text-zinc-300">—</span>}</span>
                </div>

                {/* Type */}
                <div className="flex items-center justify-center px-2 py-2.5 border-l border-zinc-100">
                  <InspectionTypeBadge type={inspection.inspectionType} />
                </div>

                {/* Status */}
                <div className="flex items-center justify-center px-2 py-2.5 border-l border-zinc-100">
                  <StatusBadge status={inspection.status} />
                </div>

                {/* Last Inspection */}
                <div className="flex items-center justify-center px-3 py-2.5 border-l border-zinc-100">
                  <span className="text-xs tabular-nums text-zinc-600">
                    {inspection.lastInspectionDate ? dayjs(inspection.lastInspectionDate).format('MMM D, YYYY') : <span className="text-zinc-300">—</span>}
                  </span>
                </div>

                {/* Recurrence */}
                <div className="flex items-center justify-center px-3 py-2.5 border-l border-zinc-100">
                  <span className="text-xs tabular-nums text-zinc-400">
                    {inspection.recurrenceYears === 1 ? "1 yr" : `${inspection.recurrenceYears} yrs`}
                  </span>
                </div>

                {/* Next Due */}
                <div className="flex items-center justify-center px-3 py-2.5 border-l border-zinc-100">
                  <span className={`text-xs tabular-nums font-medium ${isOverdue ? "text-red-600" : "text-zinc-600"}`}>
                    {inspection.nextDueDate ? dayjs(inspection.nextDueDate).format('MMM D, YYYY') : <span className="text-zinc-300 font-normal">—</span>}
                  </span>
                </div>

                {/* Scheduled */}
                <div className="flex items-center justify-center px-3 py-2.5 border-l border-zinc-100">
                  <span className="text-xs tabular-nums text-zinc-600">
                    {inspection.scheduledDate ? dayjs(inspection.scheduledDate).format('MMM D, YYYY') : <span className="text-zinc-300">—</span>}
                  </span>
                </div>

                {/* Completion */}
                <div className="flex items-center justify-center px-3 py-2.5 border-l border-zinc-100">
                  <span className="text-xs tabular-nums text-zinc-600">
                    {inspection.completionDate ? dayjs(inspection.completionDate).format('MMM D, YYYY') : <span className="text-zinc-300">—</span>}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-0.5 px-2 py-2.5 border-l border-zinc-100">
                  <button
                    onClick={() => { openEdit(inspection); setIsAddOpen(true); }}
                    className="p-1.5 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteId(inspection.id)}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 rounded hover:bg-red-50 text-zinc-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Row count */}
      {!isLoading && (inspections?.length ?? 0) > 0 && (
        <p className="text-xs text-zinc-400 text-right">
          {inspections?.length} inspection{inspections?.length !== 1 ? "s" : ""}
        </p>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inspection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this inspection record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
