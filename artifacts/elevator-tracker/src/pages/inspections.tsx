import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useListInspections, getListInspectionsQueryKey,
  useCreateInspection, useUpdateInspection, useDeleteInspection,
  useListElevators, getListElevatorsQueryKey,
  useListBuildings, getListBuildingsQueryKey,
  useListCustomers, getListCustomersQueryKey,
  Inspection,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Pencil, Trash2, ClipboardList, Download, CalendarDays,
  X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  ChevronsUpDown, Check, SlidersHorizontal, Building2, Layers, AlertTriangle, Info,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { DatePickerField } from "@/components/ui/date-picker-field";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/status-badge";
import { FilterCombobox } from "@/components/filter-combobox";
import dayjs from "dayjs";

/* ─── Constants ─────────────────────────────────────────────── */
const PAGE_GROUPS = 20; // elevator cards per page

const MONTH_OPTIONS = [
  { value: "01", label: "January" },  { value: "02", label: "February" },
  { value: "03", label: "March" },    { value: "04", label: "April" },
  { value: "05", label: "May" },      { value: "06", label: "June" },
  { value: "07", label: "July" },     { value: "08", label: "August" },
  { value: "09", label: "September" },{ value: "10", label: "October" },
  { value: "11", label: "November" }, { value: "12", label: "December" },
];

const AGING_BUCKET_OPTIONS = [
  { value: "due-today",     label: "Due Today"   },
  { value: "due-1-7",       label: "Next 7 Days"  },
  { value: "due-8-14",      label: "Next 14 Days" },
  { value: "due-15-30",     label: "Next 30 Days" },
  { value: "due-31-60",     label: "Next 60 Days" },
  { value: "due-61-90",     label: "Next 90 Days" },
  { value: "overdue-1-30",  label: "Overdue 1–30 Days"   },
  { value: "overdue-31-60", label: "Overdue 31–60 Days"  },
  { value: "overdue-61-90", label: "Overdue 61–90 Days"  },
  { value: "overdue-91+",   label: "Overdue 91+ Days"    },
];

const STATUS_OPTIONS = [
  { value: "NOT_STARTED", label: "Not Scheduled" },
  { value: "SCHEDULED",   label: "Scheduled" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED",   label: "Completed" },
];

const INSP_TYPE_OPTIONS   = [{ value: "CAT1", label: "CAT 1" }, { value: "CAT5", label: "CAT 5" }];
const UNIT_TYPE_OPTIONS   = [{ value: "traction", label: "Traction" }, { value: "hydraulic", label: "Hydraulic" }, { value: "other", label: "Other" }];

/* ─── Helpers ────────────────────────────────────────────────── */
function fmt(date?: string | null) { return date ? dayjs(date).format("MM/DD/YYYY") : null; }

function getAgingBucketValue(due: string | null | undefined, status?: string): string | null {
  if (status === "COMPLETED") return null;
  if (!due) return null;
  const days = dayjs().startOf("day").diff(dayjs(due).startOf("day"), "day");
  if (days === 0)   return "due-today";
  if (days > 90)    return "overdue-91+";
  if (days > 60)    return "overdue-61-90";
  if (days > 30)    return "overdue-31-60";
  if (days > 0)     return "overdue-1-30";
  if (days >= -7)   return "due-1-7";
  if (days >= -14)  return "due-8-14";
  if (days >= -30)  return "due-15-30";
  if (days >= -60)  return "due-31-60";
  if (days >= -90)  return "due-61-90";
  return null;
}

function AgingPill({ due, status }: { due?: string | null; status?: string }) {
  const bucket = getAgingBucketValue(due, status);
  if (!bucket) return <span className="text-zinc-300 text-sm">—</span>;
  const label = AGING_BUCKET_OPTIONS.find(b => b.value === bucket)?.label ?? "—";
  const cls =
    bucket === "due-today"     ? "bg-blue-900   text-white      border-blue-900"   :
    bucket === "due-1-7"       ? "bg-blue-100   text-blue-900   border-blue-300"   :
    bucket === "due-8-14"      ? "bg-blue-100   text-blue-800   border-blue-200"   :
    bucket === "due-15-30"     ? "bg-sky-100    text-sky-800    border-sky-200"    :
    bucket === "due-31-60"     ? "bg-sky-50     text-sky-700    border-sky-200"    :
    bucket === "due-61-90"     ? "bg-slate-100  text-slate-600  border-slate-200"  :
    bucket === "overdue-1-30"  ? "bg-amber-100  text-amber-700  border-amber-200"  :
    bucket === "overdue-31-60" ? "bg-orange-100 text-orange-700 border-orange-200" :
    bucket === "overdue-61-90" ? "bg-red-100    text-red-700    border-red-200"    :
                                 "bg-red-200    text-red-800    border-red-300";
  return (
    <span className={`inline-flex items-center text-sm font-semibold px-2 py-0.5 rounded border whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

/* ─── Form schema ────────────────────────────────────────────── */
const inspectionSchema = z.object({
  elevatorId:        z.coerce.number().min(1, "Elevator is required"),
  inspectionType:    z.enum(["CAT1", "CAT5"] as const),
  recurrenceYears:   z.coerce.number().min(1, "Recurrence is required"),
  lastInspectionDate: z.string().optional(),
  scheduledDate:     z.string().optional(),
  completionDate:    z.string().optional(),
  status:            z.enum(["NOT_STARTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"] as const).optional(),
  notes:             z.string().optional(),
});
type InspectionFormValues = z.infer<typeof inspectionSchema>;

/* ─── Grouped type ───────────────────────────────────────────── */
type ElevGroup = {
  elevatorId:   number;
  elevatorName: string;
  elevatorType: string;
  bank:         string;
  unitId:       string;
  stateId:      string;
  customerId:   number;
  customerName: string;
  buildingId:   number;
  buildingName: string;
  rows:         Inspection[];
};

/* ═══════════════════════════════════════════════════════════════ */
export default function Inspections() {

  /* ── Filter state ── */
  const [selectedStatuses,     setSelectedStatuses]     = useState<string[]>([]);
  const [selectedInspTypes,    setSelectedInspTypes]    = useState<string[]>([]);
  const [selectedUnitTypes,    setSelectedUnitTypes]    = useState<string[]>([]);
  const [selectedCustomerIds,  setSelectedCustomerIds]  = useState<string[]>([]);
  const [selectedBuildingIds,  setSelectedBuildingIds]  = useState<string[]>([]);
  const [selectedElevatorIds,  setSelectedElevatorIds]  = useState<string[]>([]);
  const [selectedBanks,        setSelectedBanks]        = useState<string[]>([]);
  const [filterDueMonths,      setFilterDueMonths]      = useState<string[]>([]);
  const [filterDueYears,       setFilterDueYears]       = useState<string[]>([]);
  const [filterAgingBuckets,   setFilterAgingBuckets]   = useState<string[]>([]);

  /* ── Date range panel ── */
  const [showDateFilters, setShowDateFilters] = useState(false);
  const [lastInspFrom,   setLastInspFrom]   = useState("");
  const [lastInspTo,     setLastInspTo]     = useState("");
  const [nextDueFrom,    setNextDueFrom]    = useState("");
  const [nextDueTo,      setNextDueTo]      = useState("");
  const [scheduledFrom,  setScheduledFrom]  = useState("");
  const [scheduledTo,    setScheduledTo]    = useState("");
  const [completionFrom, setCompletionFrom] = useState("");
  const [completionTo,   setCompletionTo]   = useState("");

  /* ── Dialog / delete / bulk state ── */
  const [isAddOpen,         setIsAddOpen]         = useState(false);
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null);
  const [deleteId,          setDeleteId]          = useState<number | null>(null);
  const [bulkDeleteOpen,    setBulkDeleteOpen]    = useState(false);
  const [selectedIds,       setSelectedIds]        = useState<Set<number>>(new Set());

  /* ── Form cascade selectors ── */
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formBuildingId, setFormBuildingId] = useState("");
  const [currentPage,    setCurrentPage]    = useState(1);

  /* ── Derived ── */
  const hasDateFilters = !!(lastInspFrom || lastInspTo || nextDueFrom || nextDueTo || scheduledFrom || scheduledTo || completionFrom || completionTo);

  /* ── Clear helpers ── */
  const clearDateFilters = useCallback(() => {
    setLastInspFrom(""); setLastInspTo(""); setNextDueFrom(""); setNextDueTo("");
    setScheduledFrom(""); setScheduledTo(""); setCompletionFrom(""); setCompletionTo("");
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedCustomerIds([]); setSelectedBuildingIds([]); setSelectedElevatorIds([]);
    setSelectedBanks([]); setSelectedStatuses([]); setSelectedInspTypes([]);
    setSelectedUnitTypes([]); setFilterDueMonths([]); setFilterDueYears([]);
    setFilterAgingBuckets([]); clearDateFilters();
  }, [clearDateFilters]);

  const handleCustomerChange = (val: string[]) => { setSelectedCustomerIds(val); setSelectedBuildingIds([]); setSelectedElevatorIds([]); setCurrentPage(1); };
  const handleBuildingChange = (val: string[]) => { setSelectedBuildingIds(val); setSelectedElevatorIds([]); setCurrentPage(1); };

  /* ── Data fetching ── */
  const dateQueryParams = {
    lastInspectionDateFrom: lastInspFrom || undefined, lastInspectionDateTo: lastInspTo || undefined,
    nextDueDateFrom: nextDueFrom || undefined,         nextDueDateTo: nextDueTo || undefined,
    scheduledDateFrom: scheduledFrom || undefined,     scheduledDateTo: scheduledTo || undefined,
    completionDateFrom: completionFrom || undefined,   completionDateTo: completionTo || undefined,
  };
  const { data: allInspections, isLoading } = useListInspections(dateQueryParams, { query: { queryKey: getListInspectionsQueryKey(dateQueryParams) } });
  const { data: elevators } = useListElevators({}, { query: { queryKey: getListElevatorsQueryKey({}) } });
  const { data: customers } = useListCustomers({}, { query: { queryKey: getListCustomersQueryKey({}) } });
  const { data: buildings } = useListBuildings({}, { query: { queryKey: getListBuildingsQueryKey({}) } });

  /* ── Elevator meta map ── */
  const elevatorMeta = useMemo(() => {
    const map = new Map<number, { bank: string; type: string; customerId: number; buildingId: number; name: string; unitId: string; stateId: string }>();
    for (const e of elevators ?? []) map.set(e.id, { bank: e.bank ?? "", type: e.type ?? "", customerId: e.customerId, buildingId: e.buildingId, name: e.name, unitId: e.internalId ?? "", stateId: e.stateId ?? "" });
    return map;
  }, [elevators]);

  /* ── Client-side filtering ── */
  const inspections = useMemo(() => {
    return (allInspections ?? []).filter(insp => {
      const meta = elevatorMeta.get(insp.elevatorId);
      if (selectedCustomerIds.length  > 0 && (!meta || !selectedCustomerIds.includes(String(meta.customerId))))  return false;
      if (selectedBuildingIds.length  > 0 && (!meta || !selectedBuildingIds.includes(String(meta.buildingId))))  return false;
      if (selectedBanks.length        > 0 && (!meta || !selectedBanks.includes(meta.bank)))                      return false;
      if (selectedElevatorIds.length  > 0 && !selectedElevatorIds.includes(String(insp.elevatorId)))             return false;
      if (selectedStatuses.length     > 0 && !selectedStatuses.includes((insp as any).trueStatus ?? insp.status)) return false;
      if (selectedInspTypes.length    > 0 && !selectedInspTypes.includes(insp.inspectionType))                   return false;
      if (selectedUnitTypes.length    > 0 && (!meta || !selectedUnitTypes.includes(meta.type)))                  return false;
      if (filterDueMonths.length      > 0) { const m = insp.nextDueDate ? dayjs(insp.nextDueDate).format("MM") : null; if (!m || !filterDueMonths.includes(m)) return false; }
      if (filterDueYears.length       > 0) { const y = insp.nextDueDate ? dayjs(insp.nextDueDate).format("YYYY") : null; if (!y || !filterDueYears.includes(y)) return false; }
      if (filterAgingBuckets.length   > 0) { const b = getAgingBucketValue(insp.nextDueDate, insp.status); if (!b || !filterAgingBuckets.includes(b)) return false; }
      return true;
    });
  }, [allInspections, elevatorMeta, selectedCustomerIds, selectedBuildingIds, selectedBanks, selectedElevatorIds, selectedStatuses, selectedInspTypes, selectedUnitTypes, filterDueMonths, filterDueYears, filterAgingBuckets]);

  /* ── Cascade filter options ── */
  const customerOptions = useMemo(() => (customers ?? []).map(c => ({ value: String(c.id), label: c.name })), [customers]);
  const buildingOptions = useMemo(() => {
    const list = selectedCustomerIds.length > 0 ? (buildings ?? []).filter(b => selectedCustomerIds.includes(String(b.customerId))) : (buildings ?? []);
    return list.map(b => ({ value: String(b.id), label: b.name }));
  }, [buildings, selectedCustomerIds]);
  const bankOptions = useMemo(() => {
    let src = elevators ?? [];
    if (selectedCustomerIds.length > 0) src = src.filter(e => selectedCustomerIds.includes(String(e.customerId)));
    if (selectedBuildingIds.length > 0) src = src.filter(e => selectedBuildingIds.includes(String(e.buildingId)));
    return Array.from(new Set(src.map(e => e.bank).filter(Boolean) as string[])).sort().map(b => ({ value: b, label: b }));
  }, [elevators, selectedCustomerIds, selectedBuildingIds]);
  const elevatorOptions = useMemo(() => {
    let src = elevators ?? [];
    if (selectedCustomerIds.length > 0) src = src.filter(e => selectedCustomerIds.includes(String(e.customerId)));
    if (selectedBuildingIds.length > 0) src = src.filter(e => selectedBuildingIds.includes(String(e.buildingId)));
    if (selectedBanks.length       > 0) src = src.filter(e => selectedBanks.includes(e.bank ?? ""));
    return [...src].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")).map(e => ({ value: String(e.id), label: e.name + (e.buildingName ? ` – ${e.buildingName}` : "") }));
  }, [elevators, selectedCustomerIds, selectedBuildingIds, selectedBanks]);
  const yearFilterOptions = useMemo(() => {
    const years = new Set<string>();
    for (const insp of allInspections ?? []) { if (insp.nextDueDate) years.add(dayjs(insp.nextDueDate).format("YYYY")); }
    return Array.from(years).sort().map(y => ({ value: y, label: y }));
  }, [allInspections]);

  /* ── Form cascade options ── */
  const formBuildingList = useMemo(() =>
    formCustomerId ? (buildings ?? []).filter(b => String(b.customerId) === formCustomerId) : (buildings ?? []),
    [buildings, formCustomerId]);
  const formElevatorList = useMemo(() => {
    if (formBuildingId) return (elevators ?? []).filter(e => String(e.buildingId) === formBuildingId);
    if (formCustomerId) return (elevators ?? []).filter(e => formBuildingList.some(b => b.id === e.buildingId));
    return elevators ?? [];
  }, [elevators, formBuildingId, formCustomerId, formBuildingList]);

  /* ── Build elevator groups (sort + group) ── */
  const allGroups = useMemo((): ElevGroup[] => {
    const map = new Map<number, ElevGroup>();
    const sorted = [...(inspections ?? [])].sort((a, b) => {
      const c1 = (a.customerName ?? "").localeCompare(b.customerName ?? ""); if (c1 !== 0) return c1;
      const c2 = (a.buildingName ?? "").localeCompare(b.buildingName ?? ""); if (c2 !== 0) return c2;
      const bkA = elevatorMeta.get(a.elevatorId)?.bank ?? "", bkB = elevatorMeta.get(b.elevatorId)?.bank ?? "";
      const c3 = bkA.localeCompare(bkB); if (c3 !== 0) return c3;
      const c4 = (a.elevatorName ?? "").localeCompare(b.elevatorName ?? ""); if (c4 !== 0) return c4;
      return a.inspectionType.localeCompare(b.inspectionType);
    });
    for (const insp of sorted) {
      const meta = elevatorMeta.get(insp.elevatorId);
      if (!map.has(insp.elevatorId)) {
        map.set(insp.elevatorId, {
          elevatorId:   insp.elevatorId,
          elevatorName: insp.elevatorName ?? `Elevator #${insp.elevatorId}`,
          elevatorType: (insp as any).elevatorType ?? meta?.type ?? "",
          bank:         meta?.bank ?? "",
          unitId:       meta?.unitId ?? "",
          stateId:      meta?.stateId ?? "",
          customerId:   meta?.customerId ?? 0,
          customerName: insp.customerName ?? "—",
          buildingId:   meta?.buildingId ?? 0,
          buildingName: insp.buildingName ?? "—",
          rows: [],
        });
      }
      map.get(insp.elevatorId)!.rows.push(insp);
    }
    // Sort groups explicitly: customer → building → bank → elevator
    return Array.from(map.values()).sort((a, b) => {
      const c1 = a.customerName.localeCompare(b.customerName); if (c1 !== 0) return c1;
      const c2 = a.buildingName.localeCompare(b.buildingName); if (c2 !== 0) return c2;
      const c3 = a.bank.localeCompare(b.bank);                 if (c3 !== 0) return c3;
      return a.elevatorName.localeCompare(b.elevatorName);
    });
  }, [inspections, elevatorMeta]);

  /* ── Pagination over groups ── */
  const totalGroupPages = Math.max(1, Math.ceil(allGroups.length / PAGE_GROUPS));
  const safePage        = Math.min(currentPage, totalGroupPages);
  const pagedGroups     = allGroups.slice((safePage - 1) * PAGE_GROUPS, safePage * PAGE_GROUPS);

  useEffect(() => { setCurrentPage(1); }, [inspections]);

  /* ── Select helpers ── */
  const pagedIds = useMemo(() => pagedGroups.flatMap(g => g.rows.map(r => r.id)), [pagedGroups]);
  const allPageSelected = pagedIds.length > 0 && pagedIds.every(id => selectedIds.has(id));
  const somePageSelected = pagedIds.some(id => selectedIds.has(id));
  const toggleOne = (id: number) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => {
    if (allPageSelected) { setSelectedIds(prev => { const n = new Set(prev); pagedIds.forEach(id => n.delete(id)); return n; }); }
    else { setSelectedIds(prev => { const n = new Set(prev); pagedIds.forEach(id => n.add(id)); return n; }); }
  };

  /* ── Mutations ── */
  const queryClient     = useQueryClient();
  const { toast }       = useToast();
  const createMutation  = useCreateInspection();
  const updateMutation  = useUpdateInspection();
  const deleteMutation  = useDeleteInspection();

  const form = useForm<InspectionFormValues>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: { elevatorId: 0, inspectionType: "CAT1", recurrenceYears: 1, status: "NOT_STARTED", notes: "" },
  });

  const onSubmit = (data: InspectionFormValues) => {
    if (editingInspection) {
      updateMutation.mutate({ id: editingInspection.id, data }, {
        onSuccess: (res: any) => { queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey() }); setEditingInspection(null); setIsAddOpen(false); form.reset(); toast({ title: "Inspection updated" }); if (res?._warning) toast({ title: "Follow-up not auto-created", description: res._warning, variant: "destructive", duration: 10000 }); },
        onError:   (err: any)  => { const msg = err?.data?.error; toast({ title: "Could not update inspection", description: msg ? msg + (msg.includes("already exists") ? " Delete the conflicting record first." : "") : undefined, variant: "destructive" }); },
      });
    } else {
      createMutation.mutate({ data }, {
        onSuccess: (res: any) => { queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey() }); setIsAddOpen(false); form.reset(); toast({ title: "Inspection added" }); if (res?._warning) toast({ title: "Follow-up not auto-created", description: res._warning, variant: "destructive", duration: 10000 }); },
        onError:   (err: any)  => { const msg = err?.data?.error; toast({ title: "Could not add inspection", description: msg ? msg + (msg.includes("already exists") ? " Delete the conflicting record first." : "") : undefined, variant: "destructive" }); },
      });
    }
  };

  const confirmDelete = () => {
    if (deleteId === null) return;
    deleteMutation.mutate({ id: deleteId }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey() }); toast({ title: "Inspection deleted" }); setDeleteId(null); },
      onError:   () => { toast({ title: "Failed to delete", variant: "destructive" }); setDeleteId(null); },
    });
  };

  const confirmBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    let failed = 0;
    for (const id of ids) {
      try { await deleteMutation.mutateAsync({ id }); }
      catch { failed++; }
    }
    queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey() });
    setSelectedIds(new Set()); setBulkDeleteOpen(false);
    if (failed > 0) toast({ title: `Deleted ${ids.length - failed}; ${failed} failed`, variant: "destructive" });
    else toast({ title: `Deleted ${ids.length} inspection${ids.length !== 1 ? "s" : ""}` });
  };

  const openEdit = (insp: Inspection) => {
    setEditingInspection(insp);
    const elev = elevators?.find(e => e.id === insp.elevatorId);
    const bldg = buildings?.find(b => b.id === elev?.buildingId);
    setFormCustomerId(bldg?.customerId ? String(bldg.customerId) : "");
    setFormBuildingId(elev?.buildingId ? String(elev.buildingId) : "");
    form.reset({
      elevatorId: insp.elevatorId, inspectionType: insp.inspectionType,
      recurrenceYears: insp.recurrenceYears,
      status: (insp as any).trueStatus ?? insp.status,
      lastInspectionDate: insp.lastInspectionDate ? dayjs(insp.lastInspectionDate).format("YYYY-MM-DD") : "",
      scheduledDate:  insp.scheduledDate  ? dayjs(insp.scheduledDate).format("YYYY-MM-DD")  : "",
      completionDate: insp.completionDate ? dayjs(insp.completionDate).format("YYYY-MM-DD") : "",
      notes: insp.notes || "",
    });
  };

  const handleExport = async () => {
    const params = new URLSearchParams();
    // Pass all active filters so the export mirrors exactly what's visible on screen
    selectedStatuses.forEach(s     => params.append("status",         s));
    selectedInspTypes.forEach(t    => params.append("inspectionType", t));
    selectedCustomerIds.forEach(id => params.append("customerId",     id));
    selectedBuildingIds.forEach(id => params.append("buildingId",     id));
    selectedElevatorIds.forEach(id => params.append("elevatorId",     id));
    selectedBanks.forEach(b        => params.append("bank",           b));
    selectedUnitTypes.forEach(t    => params.append("elevatorType",   t));
    filterDueMonths.forEach(m      => params.append("dueMonth",       m));
    filterDueYears.forEach(y       => params.append("dueYear",        y));
    filterAgingBuckets.forEach(b   => params.append("agingBucket",    b));
    if (lastInspFrom)   params.set("lastInspectionDateFrom", lastInspFrom);
    if (lastInspTo)     params.set("lastInspectionDateTo",   lastInspTo);
    if (nextDueFrom)    params.set("nextDueDateFrom",        nextDueFrom);
    if (nextDueTo)      params.set("nextDueDateTo",          nextDueTo);
    if (scheduledFrom)  params.set("scheduledDateFrom",      scheduledFrom);
    if (scheduledTo)    params.set("scheduledDateTo",        scheduledTo);
    if (completionFrom) params.set("completionDateFrom",     completionFrom);
    if (completionTo)   params.set("completionDateTo",       completionTo);
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/export/inspections?${params.toString()}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) return;
    const blob = await res.blob(); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `inspections_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  const watchLastDate      = form.watch("lastInspectionDate");
  const watchRecurrence    = form.watch("recurrenceYears");
  const watchStatus        = form.watch("status");
  const watchScheduled     = form.watch("scheduledDate");
  const watchCompletion    = form.watch("completionDate");
  const nextDuePreview = watchLastDate && watchRecurrence
    ? dayjs(watchLastDate).add(Number(watchRecurrence), "year").format("YYYY-MM-DD") : null;

  const completionYearMismatch = !!(
    watchCompletion && nextDuePreview &&
    dayjs(watchCompletion).year() !== dayjs(nextDuePreview).year()
  );

  useEffect(() => { if (watchCompletion) form.setValue("status", "COMPLETED"); }, [watchCompletion]);
  useEffect(() => {
    const today = dayjs().format("YYYY-MM-DD");
    if (watchStatus === "SCHEDULED" || watchStatus === "IN_PROGRESS") { if (!form.getValues("scheduledDate")) form.setValue("scheduledDate", today); }
    else if (watchStatus === "COMPLETED") { if (!form.getValues("scheduledDate")) form.setValue("scheduledDate", today); if (!form.getValues("completionDate")) form.setValue("completionDate", today); }
  }, [watchStatus]);
  useEffect(() => { if (watchScheduled && form.getValues("status") === "NOT_STARTED") form.setValue("status", "SCHEDULED"); }, [watchScheduled]);

  /* ── Filter bar chips ── */
  const activeFilterCount = [
    selectedCustomerIds, selectedBuildingIds, selectedBanks, selectedElevatorIds,
    selectedUnitTypes, selectedInspTypes, filterDueMonths, filterDueYears,
    selectedStatuses, filterAgingBuckets,
  ].filter(v => v.length > 0).length + (hasDateFilters ? 1 : 0);

  const chipLabel = (arr: string[], opts: { value: string; label: string }[], single: string) =>
    arr.length === 1 ? (opts.find(o => o.value === arr[0])?.label ?? arr[0]) : `${arr.length} ${single}`;

  const activeChips: { label: string; value: string; onRemove: () => void }[] = [];
  if (selectedCustomerIds.length  > 0) activeChips.push({ label: "Customer",  value: chipLabel(selectedCustomerIds, customerOptions,      "customers"), onRemove: () => { setSelectedCustomerIds([]); setSelectedBuildingIds([]); setSelectedBanks([]); setSelectedElevatorIds([]); } });
  if (selectedBuildingIds.length  > 0) activeChips.push({ label: "Building",  value: chipLabel(selectedBuildingIds, buildingOptions,      "buildings"), onRemove: () => { setSelectedBuildingIds([]); setSelectedBanks([]); setSelectedElevatorIds([]); } });
  if (selectedBanks.length        > 0) activeChips.push({ label: "Bank",      value: chipLabel(selectedBanks,       bankOptions,          "banks"),     onRemove: () => { setSelectedBanks([]); setSelectedElevatorIds([]); } });
  if (selectedUnitTypes.length    > 0) activeChips.push({ label: "Unit Type", value: chipLabel(selectedUnitTypes,   UNIT_TYPE_OPTIONS,    "types"),     onRemove: () => setSelectedUnitTypes([]) });
  if (selectedInspTypes.length    > 0) activeChips.push({ label: "Insp Type", value: chipLabel(selectedInspTypes,   INSP_TYPE_OPTIONS,    "types"),     onRemove: () => setSelectedInspTypes([]) });
  if (filterDueMonths.length      > 0) activeChips.push({ label: "Due Month", value: chipLabel(filterDueMonths,     MONTH_OPTIONS,        "months"),    onRemove: () => setFilterDueMonths([]) });
  if (filterDueYears.length       > 0) activeChips.push({ label: "Due Year",  value: chipLabel(filterDueYears,      yearFilterOptions,    "years"),     onRemove: () => setFilterDueYears([]) });
  if (selectedStatuses.length     > 0) activeChips.push({ label: "Inspection Status", value: chipLabel(selectedStatuses, STATUS_OPTIONS, "statuses"), onRemove: () => setSelectedStatuses([]) });
  if (filterAgingBuckets.length   > 0) activeChips.push({ label: "Due Status", value: chipLabel(filterAgingBuckets, AGING_BUCKET_OPTIONS, "buckets"),   onRemove: () => setFilterAgingBuckets([]) });
  if (hasDateFilters)                  activeChips.push({ label: "Date Range", value: "Active",                                                         onRemove: () => clearDateFilters() });

  /* ── Section header helpers ── */
  const totalInspCount = allGroups.reduce((s, g) => s + g.rows.length, 0);

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-500">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inspection History</h1>
          <div className="mt-2 flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40 px-3 py-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400" />
            <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
              A complete list of inspections across all customers, buildings, and elevators.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" /> Export Excel
          </Button>
          <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) { form.reset({ elevatorId: 0, inspectionType: "CAT1", recurrenceYears: 1, status: "NOT_STARTED", notes: "" }); setEditingInspection(null); setFormCustomerId(""); setFormBuildingId(""); } }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingInspection(null); form.reset({ elevatorId: 0, inspectionType: "CAT1", recurrenceYears: 1, status: "NOT_STARTED", notes: "" }); setFormCustomerId(""); setFormBuildingId(""); }} className="gap-2">
                <Plus className="h-4 w-4" /> Add Inspection
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* ── Header ── */}
              <DialogHeader className="pb-3 border-b">
                <DialogTitle className="flex items-center gap-2.5 text-xl">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 shrink-0">
                    <Layers className="h-4 w-4" />
                  </span>
                  {editingInspection ? editingInspection.elevatorName ?? "Edit Inspection" : "Add New Inspection"}
                </DialogTitle>
                {editingInspection && (
                  <p className="text-sm text-muted-foreground pl-10">
                    {editingInspection.buildingName} · {editingInspection.customerName}
                  </p>
                )}
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-1">

                  {/* ── Unit selector (Add mode only) ── */}
                  {!editingInspection && (
                    <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-4 space-y-4">
                      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Unit</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-medium leading-none">Customer</label>
                          <Select value={formCustomerId} onValueChange={(v) => { setFormCustomerId(v); setFormBuildingId(""); form.setValue("elevatorId", 0); }}>
                            <SelectTrigger className="bg-white"><SelectValue placeholder="Select a customer" /></SelectTrigger>
                            <SelectContent>{(customers ?? []).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-medium leading-none">Building</label>
                          <Select value={formBuildingId} onValueChange={(v) => { setFormBuildingId(v); form.setValue("elevatorId", 0); }} disabled={!formCustomerId}>
                            <SelectTrigger className="bg-white"><SelectValue placeholder={!formCustomerId ? "Select a customer first" : "Select a building"} /></SelectTrigger>
                            <SelectContent>{formBuildingList.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <FormField control={form.control} name="elevatorId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Elevator</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant="outline" role="combobox" disabled={!formBuildingId}
                                  className={cn("w-full justify-between font-normal bg-white", !field.value && "text-muted-foreground")}>
                                  {field.value ? (() => { const e = elevators?.find(e => e.id === Number(field.value)); return e ? e.name : "Select an elevator"; })() : (!formBuildingId ? "Select a building first" : "Select an elevator")}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[380px] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Search elevators..." />
                                <CommandList>
                                  <CommandEmpty>No elevator found.</CommandEmpty>
                                  <CommandGroup>
                                    {formElevatorList.map(e => (
                                      <CommandItem key={e.id} value={`${e.name} ${e.buildingName}`} onSelect={() => field.onChange(e.id.toString())}>
                                        <Check className={cn("mr-2 h-4 w-4", Number(field.value) === e.id ? "opacity-100" : "opacity-0")} />
                                        {e.name}{e.buildingName && <span className="ml-1.5 text-muted-foreground text-xs">{e.buildingName}</span>}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  )}

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
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium leading-none">Next Due Date</label>
                        <div className={`flex items-center h-9 px-3 rounded-md border text-sm tabular-nums font-semibold transition-colors ${nextDuePreview ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-zinc-200 text-zinc-400"}`}>
                          {nextDuePreview
                            ? new Date(nextDuePreview + "T00:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
                            : <span className="italic font-normal text-sm">Auto-calculated</span>}
                        </div>
                        <p className="text-xs text-zinc-400 leading-none">From last date + recurrence</p>
                      </div>
                    </div>
                  </div>

                  {/* ── Section: Schedule ── */}
                  <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-4 space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Schedule</p>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem><FormLabel>Inspection Status</FormLabel>
                          <Select value={field.value} onValueChange={(val) => { field.onChange(val); if (val === "SCHEDULED") { form.setValue("scheduledDate", dayjs().format("YYYY-MM-DD")); form.setValue("completionDate", ""); } else if (val === "COMPLETED") { form.setValue("completionDate", dayjs().format("YYYY-MM-DD")); } else { form.setValue("completionDate", ""); } }}>
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
                  {completionYearMismatch && (
                    <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-3 text-amber-900">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                      <div className="text-sm leading-snug">
                        <span className="font-semibold">Are you sure?</span>{" "}
                        The completion year ({dayjs(watchCompletion).year()}) doesn't match the expected next due year ({dayjs(nextDuePreview!).year()}). Double-check the dates before saving.
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

                  <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-900 font-semibold" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save Inspection"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-col gap-3">
        <div className="bg-white border border-zinc-200 rounded-lg shadow-sm">
          <div className="flex items-center gap-0 px-3 py-2.5 min-h-[52px]">

            {/* Left label */}
            <div className="flex items-center gap-2 pr-3 mr-2 border-r border-zinc-200 shrink-0 self-stretch py-0.5">
              <SlidersHorizontal className="h-[15px] w-[15px] text-zinc-400" />
              <span className="text-sm font-bold text-zinc-900 uppercase tracking-[0.12em] whitespace-nowrap">Filters</span>
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold leading-none">{activeFilterCount}</span>
              )}
            </div>

            {/* Middle combobox groups */}
            <div className="flex flex-wrap items-center gap-1.5 flex-1">
              {/* Group 1 — Location */}
              <FilterCombobox value={selectedCustomerIds} onValueChange={handleCustomerChange}           options={customerOptions}     placeholder="All Customers"  searchPlaceholder="Search customers..."  width="w-[175px]" />
              <FilterCombobox value={selectedBuildingIds} onValueChange={handleBuildingChange}           options={buildingOptions}     placeholder="All Buildings"  searchPlaceholder="Search buildings..."  width="w-[150px]" />
              <FilterCombobox value={selectedBanks}       onValueChange={(v) => { setSelectedBanks(v); setSelectedElevatorIds([]); setCurrentPage(1); }}  options={bankOptions}        placeholder="All Banks"      searchPlaceholder="Search banks..."      disabled={bankOptions.length === 0}      width="w-[150px]" />
              <FilterCombobox value={selectedElevatorIds} onValueChange={(v) => { setSelectedElevatorIds(v); setCurrentPage(1); }}   options={elevatorOptions}    placeholder="All Elevators" searchPlaceholder="Search elevators..."  disabled={elevatorOptions.length === 0}  width="w-[160px]" />
              <div className="h-5 w-px bg-zinc-200 mx-0.5 shrink-0" />
              {/* Group 2 — Type */}
              <FilterCombobox value={selectedUnitTypes}   onValueChange={(v) => { setSelectedUnitTypes(v); setCurrentPage(1); }}     options={UNIT_TYPE_OPTIONS}  placeholder="All Unit Types" searchPlaceholder="Search unit types..."  width="w-[175px]" />
              <FilterCombobox value={selectedInspTypes}   onValueChange={(v) => { setSelectedInspTypes(v); setCurrentPage(1); }}     options={INSP_TYPE_OPTIONS}  placeholder="All Insp Types" searchPlaceholder="Search insp types..."  width="w-[170px]" />
              <div className="h-5 w-px bg-zinc-200 mx-0.5 shrink-0" />
              {/* Group 3 — Schedule & Status */}
              <FilterCombobox value={filterDueMonths}     onValueChange={(v) => { setFilterDueMonths(v); setCurrentPage(1); }}       options={MONTH_OPTIONS}      placeholder="Due Month"     searchPlaceholder="Search months..."     width="w-[150px]" />
              <FilterCombobox value={filterDueYears}      onValueChange={(v) => { setFilterDueYears(v); setCurrentPage(1); }}        options={yearFilterOptions}  placeholder="Due Year"      searchPlaceholder="Search years..."      width="w-[130px]" />
              <FilterCombobox value={selectedStatuses}    onValueChange={(v) => { setSelectedStatuses(v); setCurrentPage(1); }}      options={STATUS_OPTIONS}     placeholder="Insp. Status"  searchPlaceholder="Search statuses..."   width="w-[150px]" />
              <FilterCombobox value={filterAgingBuckets}  onValueChange={(v) => { setFilterAgingBuckets(v); setCurrentPage(1); }}    options={AGING_BUCKET_OPTIONS} placeholder="Due Status"   searchPlaceholder="Search buckets..."   width="w-[165px]" />
              <div className="h-5 w-px bg-zinc-200 mx-0.5 shrink-0" />
              {/* Date Ranges toggle */}
              <button onClick={() => setShowDateFilters(v => !v)}
                className={cn("h-8 px-3 flex items-center gap-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap",
                  showDateFilters || hasDateFilters ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-zinc-200 hover:border-zinc-300 hover:text-zinc-700 text-[#09090b]")}>
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                Date Ranges
                {hasDateFilters && (
                  <span role="button" aria-label="Clear date filters"
                    onClick={e => { e.stopPropagation(); clearDateFilters(); }}
                    className="h-[14px] w-[14px] rounded-full bg-blue-500 flex items-center justify-center hover:bg-blue-700 transition-colors cursor-pointer shrink-0">
                    <X className="h-2 w-2 text-white" />
                  </span>
                )}
                {showDateFilters ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
              </button>
            </div>

            {/* Right: count + clear */}
            <div className="flex items-center gap-2 pl-3 ml-2 border-l border-zinc-200 shrink-0">
              <span className="text-xs tabular-nums whitespace-nowrap">
                <span className="font-bold text-zinc-700">{totalInspCount}</span>
                <span className="text-zinc-400 ml-1">{totalInspCount === 1 ? "inspection" : "inspections"}</span>
              </span>
              {activeFilterCount > 0 && (
                <button onClick={clearAllFilters}
                  className="flex items-center gap-1.5 text-sm font-semibold text-zinc-500 hover:text-red-600 bg-zinc-100 hover:bg-red-50 border border-zinc-200 hover:border-red-200 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap">
                  <X className="h-3.5 w-3.5" /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Active chips */}
          {activeChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2.5 pt-0 border-t border-zinc-100">
              <span className="text-sm font-medium text-zinc-400 mr-0.5 mt-2.5">Active:</span>
              {activeChips.map(chip => (
                <span key={chip.label}
                  className="inline-flex items-center gap-1 mt-2.5 pl-2 pr-1 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-sm font-medium text-blue-700 leading-none whitespace-nowrap">
                  <span className="text-blue-400 font-normal">{chip.label}:</span>{chip.value}
                  <button onClick={chip.onRemove}
                    className="ml-0.5 flex items-center justify-center h-[14px] w-[14px] rounded-full hover:bg-red-100 hover:text-red-500 text-blue-400 transition-colors">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Date range panel */}
        {showDateFilters && (
          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-bold text-zinc-900 uppercase tracking-[0.12em]">Date Ranges</span>
              </div>
              {hasDateFilters && (
                <button onClick={clearDateFilters}
                  className="flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-red-600 bg-zinc-100 hover:bg-red-50 border border-zinc-200 hover:border-red-200 px-2.5 py-[5px] rounded-md transition-colors">
                  <X className="h-3.5 w-3.5" /> Clear dates
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { label: "Last Inspection", from: lastInspFrom,   to: lastInspTo,    setFrom: setLastInspFrom,   setTo: setLastInspTo },
                { label: "Next Due",        from: nextDueFrom,    to: nextDueTo,     setFrom: setNextDueFrom,    setTo: setNextDueTo },
                { label: "Scheduled Date",  from: scheduledFrom,  to: scheduledTo,   setFrom: setScheduledFrom,  setTo: setScheduledTo },
                { label: "Completion Date", from: completionFrom, to: completionTo,  setFrom: setCompletionFrom, setTo: setCompletionTo },
              ].map(({ label, from, to, setFrom, setTo }) => (
                <div key={label} className="space-y-1.5">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-[0.1em]">{label}</p>
                  <div className="flex gap-1.5 items-center">
                    <input type="date" className="h-9 text-sm border border-zinc-200 rounded-md px-2 bg-white flex-1 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 min-w-0" value={from} onChange={e => setFrom(e.target.value)} />
                    <span className="text-zinc-300 text-sm shrink-0">–</span>
                    <input type="date" className="h-9 text-sm border border-zinc-200 rounded-md px-2 bg-white flex-1 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 min-w-0" value={to}   onChange={e => setTo(e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Bulk-select action bar ── */}
      {selectedIds.size > 0 && (
        <div className="sticky top-2 z-40 flex items-center justify-between bg-zinc-900 text-white rounded-lg px-5 py-3.5 shadow-xl border border-zinc-700">
          <div className="flex items-center gap-4">
            <span className="text-base font-semibold">{selectedIds.size} inspection{selectedIds.size !== 1 ? "s" : ""} selected</span>
            <button onClick={() => setSelectedIds(new Set())} className="text-zinc-400 hover:text-white text-base underline">Deselect all</button>
          </div>
          <Button variant="destructive" onClick={() => setBulkDeleteOpen(true)} className="gap-2 text-base">
            <Trash2 className="h-4 w-4" /> Delete Selected
          </Button>
        </div>
      )}

      {/* ── Card view ── */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : allGroups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-zinc-400">
          <ClipboardList className="h-12 w-12 opacity-20" />
          <p className="text-base font-medium">No inspections found</p>
          <p className="text-sm text-zinc-400">Try adjusting your filters or add a new inspection</p>
        </div>
      ) : (
        <>
          {/* Select-all row */}
          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allPageSelected}
                ref={el => { if (el) el.indeterminate = somePageSelected && !allPageSelected; }}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm text-zinc-500">
                {allPageSelected ? "Deselect all on page" : "Select all on page"}
                <span className="ml-1.5 text-zinc-400">({pagedIds.length} records)</span>
              </span>
            </label>
            <span className="text-sm text-zinc-400">
              Showing <span className="font-semibold text-zinc-600">{allGroups.length}</span> elevator{allGroups.length !== 1 ? "s" : ""}
              {" · "}<span className="font-semibold text-zinc-600">{totalInspCount}</span> inspection{totalInspCount !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Groups */}
          {(() => {
            const sections: React.ReactElement[] = [];
            let lastCustomerId = -1;
            let lastBuildingId = -1;

            pagedGroups.forEach((group) => {
              /* Customer section header */
              if (group.customerId !== lastCustomerId) {
                lastCustomerId = group.customerId;
                lastBuildingId = -1;
                sections.push(
                  <div key={`cust-${group.customerId}`}
                    className="flex items-center gap-3 mt-4 first:mt-0 px-1 pb-1 border-b-2 border-zinc-900">
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-zinc-900 text-white text-sm font-bold shrink-0">
                      {group.customerName.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="font-bold text-zinc-900 tracking-tight text-[25px]">{group.customerName}</span>
                  </div>
                );
              }

              /* Building sub-header */
              if (group.buildingId !== lastBuildingId) {
                lastBuildingId = group.buildingId;
                sections.push(
                  <div key={`bldg-${group.buildingId}-under-${group.customerId}`}
                    className="flex items-center gap-2 mt-3 px-1">
                    <Building2 className="h-4 w-4 text-zinc-400 shrink-0" />
                    <span className="font-semibold text-zinc-600 text-[25px]">{group.buildingName}</span>
                  </div>
                );
              }

              /* Elevator card */
              const hasOverdue = group.rows.some(r => r.status !== "COMPLETED" && r.nextDueDate && dayjs(r.nextDueDate).isBefore(dayjs()));
              const hasNoNextDue = group.rows.some(r => !r.nextDueDate && r.status !== "COMPLETED");
              const cardBorder = hasNoNextDue ? "border-red-300" : hasOverdue ? "border-red-200" : "border-zinc-200";

              sections.push(
                <div key={`elev-${group.elevatorId}`}
                  className={`bg-white rounded-xl border ${cardBorder} shadow-sm overflow-hidden mt-2`}>
                  {/* Card header */}
                  <div className={`flex items-center justify-between px-4 py-3.5 ${hasNoNextDue ? "bg-red-50" : hasOverdue ? "bg-amber-50/60" : "bg-gradient-to-r from-slate-50 to-white"} border-b border-zinc-100`}>
                    <div className="flex items-center gap-3">
                      {/* Icon */}
                      <div className={`flex items-center justify-center h-10 w-10 rounded-xl shrink-0 shadow-sm
                        ${hasNoNextDue ? "bg-red-100 text-red-600" : hasOverdue ? "bg-amber-100 text-amber-600" : "bg-blue-600 text-white"}`}>
                        <Layers className="h-5 w-5" />
                      </div>
                      {/* Name + metadata */}
                      <div>
                        <span className="font-bold text-zinc-900 text-[25px] leading-tight">{group.elevatorName}</span>
                        {/* Single metadata row */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {group.bank && (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2.5 py-1 text-[17px] font-medium text-zinc-600 ring-1 ring-zinc-200">
                              <span className="text-zinc-400 font-normal">Bank</span>
                              {group.bank}
                            </span>
                          )}
                          {group.elevatorType && (
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-[17px] font-medium text-blue-700 ring-1 ring-blue-200 capitalize">
                              {group.elevatorType}
                            </span>
                          )}
                          {group.unitId && (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2.5 py-1 text-[17px] font-medium text-zinc-600 ring-1 ring-zinc-200">
                              <span className="text-zinc-400 font-normal">Unit</span>
                              {group.unitId}
                            </span>
                          )}
                          {group.stateId && (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2.5 py-1 text-[17px] font-medium text-zinc-600 ring-1 ring-zinc-200">
                              <span className="text-zinc-400 font-normal">State</span>
                              {group.stateId}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Record count badge */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-500 ring-1 ring-zinc-200">
                        {group.rows.length} record{group.rows.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Inspection rows */}
                  <div className="divide-y divide-zinc-200">
                    {/* Column header row */}
                    <div className="grid items-center gap-3 px-4 py-2 bg-zinc-50/80 border-b border-zinc-200"
                      style={{ gridTemplateColumns: "28px 36px 110px 1fr 1fr 1.1fr 1fr 0.75fr 1fr 0.75fr 1.5fr 72px" }}>
                      <div />
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">#</span>
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">Type</span>
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">Last Insp.</span>
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">Next Due</span>
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">Inspection Status</span>
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">Scheduled</span>
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center leading-tight">Days to<br/>Schedule</span>
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">Completed</span>
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center leading-tight">Days to<br/>Complete</span>
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">Due Status</span>
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">Actions</span>
                    </div>

                    {(() => {
                      // Compute row numbers: PARTITION BY inspectionType ORDER BY nextDueDate
                      const rowNumMap = new Map<number, number>();
                      const byType = new Map<string, Inspection[]>();
                      for (const row of group.rows) {
                        if (!byType.has(row.inspectionType)) byType.set(row.inspectionType, []);
                        byType.get(row.inspectionType)!.push(row);
                      }
                      for (const [, rows] of byType) {
                        [...rows]
                          .sort((a, b) => (a.nextDueDate ?? "9999").localeCompare(b.nextDueDate ?? "9999"))
                          .forEach((r, i) => rowNumMap.set(r.id, i + 1));
                      }

                      return group.rows.map((insp) => {
                        const isOverdue  = insp.status !== "COMPLETED" && !!insp.nextDueDate && dayjs(insp.nextDueDate).isBefore(dayjs());
                        const noNextDue  = !insp.nextDueDate && insp.status !== "COMPLETED";
                        const isSelected = selectedIds.has(insp.id);
                        const rowBg = noNextDue ? "bg-red-50" : isOverdue ? "bg-orange-50/40" : isSelected ? "bg-blue-50/50" : "bg-white hover:bg-zinc-50/70";
                        const inspNum = rowNumMap.get(insp.id);



                        const daysToSchedule = (insp.scheduledDate && insp.nextDueDate)
                          ? dayjs(insp.scheduledDate).startOf("day").diff(dayjs(insp.nextDueDate).startOf("day"), "day")
                          : null;
                        const daysToComplete = (insp.completionDate && insp.nextDueDate)
                          ? dayjs(insp.completionDate).startOf("day").diff(dayjs(insp.nextDueDate).startOf("day"), "day")
                          : null;

                        return (
                          <div key={insp.id}
                            className={`grid items-center gap-3 px-4 py-2 transition-colors ${rowBg}`}
                            style={{ gridTemplateColumns: "28px 36px 110px 1fr 1fr 1.1fr 1fr 0.75fr 1fr 0.75fr 1.5fr 72px" }}>

                            {/* Checkbox */}
                            <input type="checkbox" checked={isSelected} onChange={() => toggleOne(insp.id)}
                              className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />

                            {/* Row number */}
                            <span className="text-sm tabular-nums text-zinc-400 font-medium text-center">{inspNum ?? "—"}</span>

                            {/* Insp type */}
                            <span className={`inline-flex items-center justify-center text-sm font-bold px-2.5 py-0.5 rounded-full tracking-wide w-fit
                              ${insp.inspectionType === "CAT5" ? "bg-yellow-400 text-zinc-900" : "bg-zinc-800 text-white"}`}>
                              {insp.inspectionType}
                            </span>

                            {/* Last Inspection */}
                            <div className="flex justify-center">
                              <span className="text-sm tabular-nums text-zinc-700">
                                {fmt(insp.lastInspectionDate) ?? <span className="text-zinc-300">—</span>}
                              </span>
                            </div>

                            {/* Next Due */}
                            <div className="flex justify-center">
                              <span className={`text-sm tabular-nums font-medium ${isOverdue ? "text-red-600" : noNextDue ? "text-red-500" : "text-zinc-800"}`}>
                                {fmt(insp.nextDueDate) ?? <span className={`font-normal ${noNextDue ? "text-red-400" : "text-zinc-300"}`}>{noNextDue ? "Not set" : "—"}</span>}
                              </span>
                            </div>

                            {/* Status */}
                            <div className="flex justify-center"><StatusBadge status={(insp as any).trueStatus ?? insp.status} /></div>

                            {/* Scheduled */}
                            <div className="flex justify-center">
                              <span className="text-sm tabular-nums text-zinc-600">
                                {fmt(insp.scheduledDate) ?? <span className="text-zinc-300">—</span>}
                              </span>
                            </div>

                            {/* Days to Schedule */}
                            <div className="flex justify-center">
                              {daysToSchedule === null
                                ? <span className="text-zinc-300 text-sm">—</span>
                                : <span className={`text-sm tabular-nums font-medium ${daysToSchedule < 0 ? "text-green-600" : daysToSchedule === 0 ? "text-zinc-600" : "text-orange-600"}`}>
                                    {daysToSchedule > 0 ? `+${daysToSchedule}` : daysToSchedule}
                                  </span>
                              }
                            </div>

                            {/* Completed */}
                            <div className="flex justify-center">
                              <span className="text-sm tabular-nums text-zinc-600">
                                {fmt(insp.completionDate) ?? <span className="text-zinc-300">—</span>}
                              </span>
                            </div>

                            {/* Days to Complete */}
                            <div className="flex justify-center">
                              {daysToComplete === null
                                ? <span className="text-zinc-300 text-sm">—</span>
                                : <span className={`text-sm tabular-nums font-medium ${daysToComplete < 0 ? "text-green-600" : daysToComplete === 0 ? "text-zinc-600" : "text-orange-600"}`}>
                                    {daysToComplete > 0 ? `+${daysToComplete}` : daysToComplete}
                                  </span>
                              }
                            </div>

                            {/* Due Status */}
                            <div className="flex items-center justify-center">
                              <AgingPill due={insp.nextDueDate} status={(insp as any).trueStatus ?? insp.status} />
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-0.5">
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                                onClick={() => { openEdit(insp); setIsAddOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-700" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                                onClick={() => setDeleteId(insp.id)} disabled={deleteMutation.isPending}>
                                <Trash2 className="h-3.5 w-3.5 text-zinc-400 hover:text-red-600" />
                              </Button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              );
            });

            return sections;
          })()}

          {/* ── Pagination ── */}
          {totalGroupPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-zinc-400">
                Page <span className="font-semibold text-zinc-600">{safePage}</span> of <span className="font-semibold text-zinc-600">{totalGroupPages}</span>
                <span className="ml-2 text-zinc-300">·</span>
                <span className="ml-2">{allGroups.length} elevators total</span>
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                  className="h-8 w-8 flex items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalGroupPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalGroupPages || Math.abs(p - safePage) <= 2)
                  .reduce<(number | "...")[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                    acc.push(p); return acc;
                  }, [])
                  .map((p, i) => p === "..."
                    ? <span key={`e-${i}`} className="px-1 text-zinc-300 text-sm">…</span>
                    : <button key={p} onClick={() => setCurrentPage(p as number)}
                        className={cn("h-8 min-w-[32px] px-2 flex items-center justify-center rounded border text-sm transition-colors",
                          safePage === p ? "bg-blue-600 border-blue-600 text-white font-semibold" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50")}>
                        {p}
                      </button>
                  )
                }
                <button onClick={() => setCurrentPage(p => Math.min(totalGroupPages, p + 1))} disabled={safePage === totalGroupPages}
                  className="h-8 w-8 flex items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Single delete dialog ── */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inspection</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bulk delete dialog ── */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Inspection{selectedIds.size !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete all {selectedIds.size} selected inspection records. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete {selectedIds.size} Record{selectedIds.size !== 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
