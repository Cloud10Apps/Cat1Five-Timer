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
import { Plus, Pencil, Trash2, ClipboardList, Download, CalendarDays, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
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
import { FilterCombobox } from "@/components/filter-combobox";
import dayjs from "dayjs";

const PAGE_SIZE = 50;

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

const INSP_TYPE_OPTIONS = [
  { value: "CAT1", label: "CAT 1" },
  { value: "CAT5", label: "CAT 5" },
];

const UNIT_TYPE_OPTIONS = [
  { value: "traction",  label: "Traction" },
  { value: "hydraulic", label: "Hydraulic" },
  { value: "other",     label: "Other" },
];

function fmt(date?: string) {
  if (!date) return null;
  return dayjs(date).format("MM/DD/YYYY");
}

export default function Inspections() {
  const [selectedStatus,   setSelectedStatus]   = useState("all");
  const [selectedInspType, setSelectedInspType] = useState("all");
  const [selectedUnitType, setSelectedUnitType] = useState("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState("all");
  const [selectedBuildingId, setSelectedBuildingId] = useState("all");
  const [selectedElevatorId, setSelectedElevatorId] = useState("all");
  const [selectedBank, setSelectedBank] = useState("all");

  const [showDateFilters, setShowDateFilters] = useState(false);
  const [lastInspFrom, setLastInspFrom] = useState("");
  const [lastInspTo,   setLastInspTo]   = useState("");
  const [nextDueFrom,  setNextDueFrom]  = useState("");
  const [nextDueTo,    setNextDueTo]    = useState("");
  const [scheduledFrom, setScheduledFrom] = useState("");
  const [scheduledTo,   setScheduledTo]   = useState("");
  const [completionFrom, setCompletionFrom] = useState("");
  const [completionTo,   setCompletionTo]   = useState("");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const hasDateFilters = !!(lastInspFrom || lastInspTo || nextDueFrom || nextDueTo || scheduledFrom || scheduledTo || completionFrom || completionTo);
  const hasAnyFilter = selectedCustomerId !== "all" || selectedBuildingId !== "all" || selectedElevatorId !== "all" || selectedBank !== "all" || selectedStatus !== "all" || selectedInspType !== "all" || selectedUnitType !== "all" || hasDateFilters;

  const clearDateFilters = useCallback(() => {
    setLastInspFrom(""); setLastInspTo(""); setNextDueFrom(""); setNextDueTo("");
    setScheduledFrom(""); setScheduledTo(""); setCompletionFrom(""); setCompletionTo("");
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedCustomerId("all"); setSelectedBuildingId("all"); setSelectedElevatorId("all");
    setSelectedBank("all"); setSelectedStatus("all"); setSelectedInspType("all"); setSelectedUnitType("all");
    clearDateFilters();
  }, [clearDateFilters]);

  const handleCustomerChange = (val: string) => { setSelectedCustomerId(val); setSelectedBuildingId("all"); setSelectedElevatorId("all"); setCurrentPage(1); };
  const handleBuildingChange = (val: string) => { setSelectedBuildingId(val); setSelectedElevatorId("all"); setCurrentPage(1); };

  const customerIdFilter  = selectedCustomerId  !== "all" ? Number(selectedCustomerId)  : undefined;
  const buildingIdFilter  = selectedBuildingId  !== "all" ? Number(selectedBuildingId)  : undefined;
  const elevatorIdFilter  = selectedElevatorId  !== "all" ? Number(selectedElevatorId)  : undefined;
  const statusFilter      = selectedStatus      !== "all" ? (selectedStatus as any)      : undefined;
  const inspTypeFilter    = selectedInspType    !== "all" ? (selectedInspType as "CAT1" | "CAT5") : undefined;
  const bankFilter        = selectedBank        !== "all" ? selectedBank                 : undefined;

  const queryParams = {
    status: statusFilter,
    inspectionType: inspTypeFilter,
    customerId: customerIdFilter,
    buildingId: buildingIdFilter,
    elevatorId: elevatorIdFilter,
    bank: bankFilter,
    lastInspectionDateFrom: lastInspFrom || undefined,
    lastInspectionDateTo:   lastInspTo   || undefined,
    nextDueDateFrom:  nextDueFrom  || undefined,
    nextDueDateTo:    nextDueTo    || undefined,
    scheduledDateFrom: scheduledFrom || undefined,
    scheduledDateTo:   scheduledTo   || undefined,
    completionDateFrom: completionFrom || undefined,
    completionDateTo:   completionTo   || undefined,
  };

  const { data: inspections, isLoading } = useListInspections(queryParams, { query: { queryKey: getListInspectionsQueryKey(queryParams) } });
  const { data: elevators }  = useListElevators({},  { query: { queryKey: getListElevatorsQueryKey({}) } });
  const { data: customers }  = useListCustomers({},  { query: { queryKey: getListCustomersQueryKey({}) } });
  const { data: buildings }  = useListBuildings({},  { query: { queryKey: getListBuildingsQueryKey({}) } });

  const filteredBuildings  = customerIdFilter ? (buildings ?? []).filter(b => b.customerId === customerIdFilter) : (buildings ?? []);
  const filteredElevators  = buildingIdFilter
    ? (elevators ?? []).filter(e => e.buildingId === buildingIdFilter)
    : customerIdFilter
      ? (elevators ?? []).filter(e => filteredBuildings.some(b => b.id === e.buildingId))
      : (elevators ?? []);

  // Lookup map: elevatorId → { bank, type }
  const elevatorMeta = useMemo(() => {
    const map = new Map<number, { bank: string; type: string }>();
    for (const e of elevators ?? []) map.set(e.id, { bank: e.bank ?? "", type: e.type ?? "" });
    return map;
  }, [elevators]);

  const allBanks = useMemo(() => Array.from(new Set((elevators ?? []).map(e => e.bank).filter(Boolean))) as string[], [elevators]);

  // Filter options
  const customerOptions = useMemo(() => (customers ?? []).map(c => ({ value: String(c.id), label: c.name })), [customers]);
  const buildingOptions = useMemo(() => filteredBuildings.map(b => ({ value: String(b.id), label: b.name })), [filteredBuildings]);
  const bankOptions     = useMemo(() => allBanks.map(b => ({ value: b, label: b })), [allBanks]);
  const elevatorOptions = useMemo(() => filteredElevators.map(e => ({ value: String(e.id), label: e.name })), [filteredElevators]);

  // Client-side unit type filter + sort
  const processedRows = useMemo(() => {
    const filtered = (inspections ?? []).filter(insp => {
      if (selectedUnitType !== "all") {
        const meta = elevatorMeta.get(insp.elevatorId);
        if (meta?.type !== selectedUnitType) return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      const c1 = (a.customerName ?? "").localeCompare(b.customerName ?? ""); if (c1 !== 0) return c1;
      const c2 = (a.buildingName ?? "").localeCompare(b.buildingName ?? ""); if (c2 !== 0) return c2;
      const bankA = elevatorMeta.get(a.elevatorId)?.bank ?? "";
      const bankB = elevatorMeta.get(b.elevatorId)?.bank ?? "";
      const c3 = bankA.localeCompare(bankB); if (c3 !== 0) return c3;
      const c4 = (a.elevatorName ?? "").localeCompare(b.elevatorName ?? ""); if (c4 !== 0) return c4;
      const typeA = elevatorMeta.get(a.elevatorId)?.type ?? "";
      const typeB = elevatorMeta.get(b.elevatorId)?.type ?? "";
      const c5 = typeA.localeCompare(typeB); if (c5 !== 0) return c5;
      const c6 = a.inspectionType.localeCompare(b.inspectionType); if (c6 !== 0) return c6;
      return (a.nextDueDate ?? "9999").localeCompare(b.nextDueDate ?? "9999");
    });
  }, [inspections, elevatorMeta, selectedUnitType]);

  const totalPages = Math.max(1, Math.ceil(processedRows.length / PAGE_SIZE));
  const safePage   = Math.min(currentPage, totalPages);
  const pagedRows  = processedRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset to page 1 on filter/data change
  useEffect(() => { setCurrentPage(1); }, [inspections, selectedUnitType]);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createMutation = useCreateInspection();
  const updateMutation = useUpdateInspection();
  const deleteMutation = useDeleteInspection();

  const form = useForm<InspectionFormValues>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: { elevatorId: 0, inspectionType: "CAT1", recurrenceYears: 1, status: "NOT_STARTED", notes: "" },
  });

  const onSubmit = (data: InspectionFormValues) => {
    if (editingInspection) {
      updateMutation.mutate({ id: editingInspection.id, data }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey() }); setEditingInspection(null); setIsAddOpen(false); form.reset(); toast({ title: "Inspection updated" }); },
        onError:   (error: any) => { const msg = error?.data?.error; toast({ title: "Could not update inspection", description: msg, variant: "destructive" }); },
      });
    } else {
      createMutation.mutate({ data }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey() }); setIsAddOpen(false); form.reset(); toast({ title: "Inspection added" }); },
        onError:   (error: any) => { const msg = error?.data?.error; toast({ title: "Could not add inspection", description: msg, variant: "destructive" }); },
      });
    }
  };

  const confirmDelete = () => {
    if (deleteId === null) return;
    deleteMutation.mutate({ id: deleteId }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey() }); toast({ title: "Inspection deleted" }); setDeleteId(null); },
      onError:   () => { toast({ title: "Failed to delete inspection", variant: "destructive" }); setDeleteId(null); },
    });
  };

  const openEdit = (inspection: Inspection) => {
    setEditingInspection(inspection);
    form.reset({
      elevatorId: inspection.elevatorId,
      inspectionType: inspection.inspectionType,
      recurrenceYears: inspection.recurrenceYears,
      status: inspection.status === "OVERDUE" ? "NOT_STARTED" : inspection.status,
      lastInspectionDate: inspection.lastInspectionDate ? dayjs(inspection.lastInspectionDate).format("YYYY-MM-DD") : "",
      scheduledDate: inspection.scheduledDate ? dayjs(inspection.scheduledDate).format("YYYY-MM-DD") : "",
      completionDate: inspection.completionDate ? dayjs(inspection.completionDate).format("YYYY-MM-DD") : "",
      notes: inspection.notes || "",
    });
  };

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.append("status", statusFilter);
    if (inspTypeFilter) params.append("inspectionType", inspTypeFilter);
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/export/inspections?${params.toString()}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `inspections_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  const watchLastDate       = form.watch("lastInspectionDate");
  const watchRecurrence     = form.watch("recurrenceYears");
  const watchStatus         = form.watch("status");
  const watchScheduledDate  = form.watch("scheduledDate");
  const watchCompletionDate = form.watch("completionDate");
  const nextDuePreview = watchLastDate && watchRecurrence ? dayjs(watchLastDate).add(Number(watchRecurrence), "year").format("YYYY-MM-DD") : "N/A";

  useEffect(() => { if (watchCompletionDate) form.setValue("status", "COMPLETED"); }, [watchCompletionDate]);
  useEffect(() => {
    const today = dayjs().format("YYYY-MM-DD");
    if (watchStatus === "SCHEDULED" || watchStatus === "IN_PROGRESS") { if (!form.getValues("scheduledDate")) form.setValue("scheduledDate", today); }
    else if (watchStatus === "COMPLETED") { if (!form.getValues("scheduledDate")) form.setValue("scheduledDate", today); if (!form.getValues("completionDate")) form.setValue("completionDate", today); }
  }, [watchStatus]);
  useEffect(() => { if (watchScheduledDate && form.getValues("status") === "NOT_STARTED") form.setValue("status", "SCHEDULED"); }, [watchScheduledDate]);

  // Shared TH class builder
  const thBase = "px-3 py-2.5 text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider whitespace-nowrap border-b-2 border-zinc-200 bg-zinc-50 select-none";
  const stickyTh = (left: string) => `${thBase} sticky ${left} z-30`;

  // Shared TD class builder
  const tdBase = "px-3 py-2 text-xs text-zinc-700 border-b border-zinc-200 whitespace-nowrap align-middle";
  const stickyTd = (left: string, bg: string) => `${tdBase} sticky ${left} z-10 ${bg}`;

  const rowBg = (idx: number, overdue: boolean) =>
    overdue ? "bg-red-50" : idx % 2 === 0 ? "bg-white" : "bg-zinc-50/60";
  const rowBgHover = (idx: number, overdue: boolean) =>
    overdue ? "hover:bg-red-100/60" : idx % 2 === 0 ? "hover:bg-blue-50/30" : "hover:bg-blue-50/40";

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-500 h-full">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inspection History</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Complete compliance record across all elevators, buildings, and customers.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" /> Export Excel
          </Button>
          <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) { form.reset({ elevatorId: 0, inspectionType: "CAT1", recurrenceYears: 1, status: "NOT_STARTED", notes: "" }); setEditingInspection(null); } }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingInspection(null); form.reset({ elevatorId: 0, inspectionType: "CAT1", recurrenceYears: 1, status: "NOT_STARTED", notes: "" }); }} className="gap-2">
                <Plus className="h-4 w-4" /> Add Inspection
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{editingInspection ? "Edit Inspection" : "Add New Inspection"}</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="elevatorId" render={({ field }) => (
                      <FormItem className="col-span-2 md:col-span-1">
                        <FormLabel>Elevator</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value ? field.value.toString() : ""} disabled={!!editingInspection}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select an elevator" /></SelectTrigger></FormControl>
                          <SelectContent>{elevators?.map(e => <SelectItem key={e.id} value={e.id.toString()}>{e.name} ({e.buildingName})</SelectItem>)}</SelectContent>
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

          <FilterCombobox value={selectedCustomerId} onValueChange={handleCustomerChange} options={customerOptions} placeholder="All Customers" searchPlaceholder="Search customers..." width="w-[175px]" />
          <FilterCombobox value={selectedBuildingId} onValueChange={handleBuildingChange} options={buildingOptions} placeholder="All Buildings" searchPlaceholder="Search buildings..." width="w-[155px]" />
          <FilterCombobox value={selectedBank} onValueChange={(v) => { setSelectedBank(v); setCurrentPage(1); }} options={bankOptions} placeholder="All Banks" searchPlaceholder="Search banks..." disabled={bankOptions.length === 0} width="w-[130px]" />
          <FilterCombobox value={selectedElevatorId} onValueChange={(v) => { setSelectedElevatorId(v); setCurrentPage(1); }} options={elevatorOptions} placeholder="All Elevators" searchPlaceholder="Search elevators..." disabled={elevatorOptions.length === 0} width="w-[165px]" />

          <div className="h-4 w-px bg-zinc-200" />

          <FilterCombobox value={selectedStatus}   onValueChange={(v) => { setSelectedStatus(v);   setCurrentPage(1); }} options={STATUS_OPTIONS}     placeholder="All Statuses"    searchPlaceholder="Search statuses..."         width="w-[145px]" />
          <FilterCombobox value={selectedInspType} onValueChange={(v) => { setSelectedInspType(v); setCurrentPage(1); }} options={INSP_TYPE_OPTIONS}  placeholder="All Insp Types"  searchPlaceholder="Search inspection types..." width="w-[155px]" />
          <FilterCombobox value={selectedUnitType} onValueChange={(v) => { setSelectedUnitType(v); setCurrentPage(1); }} options={UNIT_TYPE_OPTIONS}  placeholder="All Unit Types"  searchPlaceholder="Search unit types..."       width="w-[150px]" />

          <div className="h-4 w-px bg-zinc-200" />

          {/* Date range toggle */}
          <button onClick={() => setShowDateFilters(v => !v)} className={`h-8 px-3 flex items-center gap-1.5 text-xs font-medium rounded-md border transition-colors ${showDateFilters || hasDateFilters ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"}`}>
            <CalendarDays className="h-3.5 w-3.5" />
            Date Ranges
            {hasDateFilters && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />}
            {showDateFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {hasAnyFilter && (
            <button onClick={clearAllFilters} className="h-8 px-3 flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 hover:border-red-300 hover:text-red-700 transition-colors">
              <X className="h-3.5 w-3.5" /> Clear filters
            </button>
          )}
        </div>

        {/* Date range panel */}
        {showDateFilters && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { label: "Last Inspection", from: lastInspFrom,  to: lastInspTo,   setFrom: setLastInspFrom,  setTo: setLastInspTo },
              { label: "Next Due",        from: nextDueFrom,   to: nextDueTo,    setFrom: setNextDueFrom,   setTo: setNextDueTo },
              { label: "Scheduled Date",  from: scheduledFrom, to: scheduledTo,  setFrom: setScheduledFrom, setTo: setScheduledTo },
              { label: "Completion Date", from: completionFrom,to: completionTo, setFrom: setCompletionFrom,setTo: setCompletionTo },
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
                <button onClick={clearDateFilters} className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"><X className="h-3 w-3" /> Clear date filters</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="relative overflow-auto rounded-xl border border-zinc-200 shadow-sm bg-white" style={{ maxHeight: "calc(100vh - 310px)" }}>
        <table className="min-w-full border-separate border-spacing-0 text-sm">

          {/* Sticky header */}
          <thead>
            <tr>
              <th className={stickyTh("top-0 left-0")}       style={{ minWidth: 150 }}>Customer</th>
              <th className={stickyTh("top-0 left-[150px]")} style={{ minWidth: 130 }}>Building</th>
              <th className={`${thBase} sticky top-0 z-20`}  style={{ minWidth: 105 }}>Bank</th>
              <th className={`${thBase} sticky top-0 z-20`}  style={{ minWidth: 200 }}>Elevator</th>
              <th className={`${thBase} sticky top-0 z-20`}  style={{ minWidth: 148 }}>Status</th>
              <th className={`${thBase} sticky top-0 z-20 text-center`} style={{ minWidth: 76 }}>Type</th>
              <th className={`${thBase} sticky top-0 z-20`}  style={{ minWidth: 112 }}>Last Insp.</th>
              <th className={`${thBase} sticky top-0 z-20 text-center`} style={{ minWidth: 68 }}>Recur.</th>
              <th className={`${thBase} sticky top-0 z-20`}  style={{ minWidth: 112 }}>Next Due</th>
              <th className={`${thBase} sticky top-0 z-20`}  style={{ minWidth: 112 }}>Scheduled</th>
              <th className={`${thBase} sticky top-0 z-20`}  style={{ minWidth: 112 }}>Completed</th>
              <th className={`${thBase} sticky top-0 z-20`}  style={{ minWidth: 60  }}></th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr><td colSpan={12} className="py-20 text-center"><Spinner /></td></tr>
            ) : pagedRows.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-2 text-zinc-400">
                    <ClipboardList className="h-10 w-10 opacity-20" />
                    <p className="text-sm font-medium">No inspections found</p>
                    <p className="text-xs text-zinc-300">Try adjusting your filters</p>
                  </div>
                </td>
              </tr>
            ) : pagedRows.map((insp, rowIdx) => {
              const today = dayjs();
              const isOverdue = insp.status !== "COMPLETED" && !!insp.nextDueDate && dayjs(insp.nextDueDate).isBefore(today);
              const bg = rowBg(rowIdx, isOverdue);
              const hoverCls = rowBgHover(rowIdx, isOverdue);
              const meta = elevatorMeta.get(insp.elevatorId);

              return (
                <tr key={insp.id} className={`group transition-colors ${bg} ${hoverCls}`}>
                  {/* Sticky: Customer */}
                  <td className={stickyTd("left-0", bg)} style={{ minWidth: 150 }}>
                    <span className="font-medium text-zinc-800 truncate block max-w-[138px]">{insp.customerName ?? "—"}</span>
                  </td>
                  {/* Sticky: Building */}
                  <td className={stickyTd("left-[150px]", bg)} style={{ minWidth: 130, borderRight: "1px solid #e4e4e7" }}>
                    <span className="text-zinc-700 truncate block max-w-[118px]">{insp.buildingName ?? "—"}</span>
                  </td>
                  {/* Bank */}
                  <td className={tdBase}>
                    <span className="text-zinc-500">{meta?.bank || <span className="text-zinc-300 italic">—</span>}</span>
                  </td>
                  {/* Elevator */}
                  <td className={tdBase}>
                    <span className="font-medium text-zinc-800 truncate block max-w-[188px]">{insp.elevatorName ?? "—"}</span>
                  </td>
                  {/* Status */}
                  <td className={tdBase}>
                    <StatusBadge status={insp.status} />
                  </td>
                  {/* Inspection Type */}
                  <td className={`${tdBase} text-center`}>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full tracking-wide ${insp.inspectionType === "CAT5" ? "bg-yellow-400 text-zinc-900" : "bg-zinc-800 text-white"}`}>
                      {insp.inspectionType}
                    </span>
                  </td>
                  {/* Last Inspection */}
                  <td className={`${tdBase} tabular-nums`}>
                    {fmt(insp.lastInspectionDate) ?? <span className="text-zinc-300">—</span>}
                  </td>
                  {/* Recurrence */}
                  <td className={`${tdBase} tabular-nums text-zinc-400 text-center`}>
                    {insp.recurrenceYears === 1 ? "1 yr" : `${insp.recurrenceYears} yrs`}
                  </td>
                  {/* Next Due */}
                  <td className={`${tdBase} tabular-nums font-medium ${isOverdue ? "text-red-600" : "text-zinc-700"}`}>
                    {fmt(insp.nextDueDate) ?? <span className="text-zinc-300 font-normal">—</span>}
                  </td>
                  {/* Scheduled */}
                  <td className={`${tdBase} tabular-nums`}>
                    {fmt(insp.scheduledDate) ?? <span className="text-zinc-300">—</span>}
                  </td>
                  {/* Completed */}
                  <td className={`${tdBase} tabular-nums`}>
                    {fmt(insp.completionDate) ?? <span className="text-zinc-300">—</span>}
                  </td>
                  {/* Actions */}
                  <td className={`${tdBase} text-right`}>
                    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { openEdit(insp); setIsAddOpen(true); }} className="p-1.5 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteId(insp.id)} disabled={deleteMutation.isPending} className="p-1.5 rounded hover:bg-red-50 text-zinc-300 hover:text-red-500 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Footer: count + pagination ── */}
      {!isLoading && processedRows.length > 0 && (
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, processedRows.length)} of <strong className="text-zinc-600">{processedRows.length}</strong> inspection{processedRows.length !== 1 ? "s" : ""}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                className="h-7 w-7 flex items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                .reduce<(number | "...")[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                  acc.push(p); return acc;
                }, [])
                .map((p, i) =>
                  p === "..." ? <span key={`ellipsis-${i}`} className="px-1 text-zinc-300">…</span> : (
                    <button key={p} onClick={() => setCurrentPage(p as number)}
                      className={`h-7 min-w-[28px] px-1.5 flex items-center justify-center rounded border text-xs transition-colors
                        ${safePage === p ? "bg-blue-600 border-blue-600 text-white font-semibold" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}>
                      {p}
                    </button>
                  )
                )
              }
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                className="h-7 w-7 flex items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Delete dialog ── */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inspection</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this inspection record? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
