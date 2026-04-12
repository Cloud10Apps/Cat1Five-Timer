import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import {
  useListElevators,
  getListElevatorsQueryKey,
  useListBuildings,
  getListBuildingsQueryKey,
  useListCustomers,
  getListCustomersQueryKey,
  useListInspections,
  getListInspectionsQueryKey,
  useCreateInspection,
  useUpdateInspection,
  useDeleteInspection,
  Elevator,
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

import { Link } from "wouter";
import { Pencil, ArrowUpSquare, Download, X, ChevronDown, ChevronUp, ChevronRight, Building as BuildingIcon, Users, Layers, AlertTriangle, ClipboardList, ArrowRight, Search } from "lucide-react";
import { FilterCombobox } from "@/components/filter-combobox";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { useDebounce } from "@/hooks/use-debounce";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { fireCompletionConfetti } from "@/lib/confetti";
import { isValidDateStr, getAgingBucketValue, AGING_BUCKET_OPTIONS, MONTH_OPTIONS } from "@/lib/inspection-utils";


const inspectionSchema = z.object({
  inspectionType: z.enum(["CAT1", "CAT5"] as const),
  recurrenceYears: z.coerce.number().min(1, "Recurrence is required"),
  lastInspectionDate: z.string().optional(),
  scheduledDate: z.string().optional(),
  completionDate: z.string().optional(),
  status: z.enum(["NOT_STARTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "OVERDUE"] as const).optional(),
  notes: z.string().optional(),
});

type InspectionFormValues = z.infer<typeof inspectionSchema>;

/* ── Due status helpers ── */

function AgingBucketPill({ due, status }: { due: string | null | undefined; status?: string }) {
  const bucket = getAgingBucketValue(due, status);
  if (!bucket) return <span className="text-zinc-300 text-xs">—</span>;
  const label = bucket === "due-future" && due
    ? `Due ${dayjs(due).format("YYYY")}`
    : AGING_BUCKET_OPTIONS.find(b => b.value === bucket)?.label ?? "—";
  const cls =
    bucket === "due-future"    ? "bg-zinc-100   text-zinc-500   border-zinc-200"   :
    bucket === "due-today"     ? "bg-red-600    text-white      border-red-700"    :
    bucket === "due-1-7"       ? "bg-orange-100 text-orange-700 border-orange-300" :
    bucket === "due-8-14"      ? "bg-amber-100  text-amber-700  border-amber-300"  :
    bucket === "due-15-30"     ? "bg-blue-100   text-blue-700   border-blue-300"   :
    bucket === "due-31-60"     ? "bg-indigo-100 text-indigo-700 border-indigo-300" :
    bucket === "due-61-90"     ? "bg-slate-100  text-slate-600  border-slate-200"  :
    bucket === "overdue-1-30"  ? "bg-amber-100  text-amber-700  border-amber-200"  :
    bucket === "overdue-31-60" ? "bg-orange-100 text-orange-700 border-orange-200" :
    bucket === "overdue-61-90" ? "bg-red-100    text-red-700    border-red-200"    :
                                 "bg-red-200    text-red-800    border-red-300";
  return (
    <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-md border whitespace-nowrap tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

export default function Elevators() {
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<string[]>([]);
  const [selectedInspTypes,   setSelectedInspTypes]   = useState<string[]>([]);
  const [searchQuery,         setSearchQuery]         = useState("");
  const [showMeFilter,        setShowMeFilter]        = useState("all");
  const [filterDueYears,      setFilterDueYears]      = useState<string[]>([]);
  const [filterDueMonths,     setFilterDueMonths]     = useState<string[]>([]);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingElevator, setEditingElevator] = useState<Elevator | null>(null);

  // Collapsible group state
  const [collapsedCustomers, setCollapsedCustomers] = useState<Set<number>>(new Set());
  const [collapsedBuildings, setCollapsedBuildings] = useState<Set<number>>(new Set());
  const [collapsedBanks, setCollapsedBanks] = useState<Set<string>>(new Set());
  const toggleCustomer = (id: number) => setCollapsedCustomers(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });
  const toggleBuilding = (id: number) => setCollapsedBuildings(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });
  const toggleBank = (key: string) => setCollapsedBanks(prev => {
    const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next;
  });

  // Inspection panel state (inside elevator dialog)
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null);
  const [inspDeleteId, setInspDeleteId] = useState<number | null>(null);

  const { data: elevators, isLoading } = useListElevators({}, { query: { queryKey: getListElevatorsQueryKey({}) } });
  const { data: customers }  = useListCustomers({}, { query: { queryKey: getListCustomersQueryKey({}) } });
  const { data: allBuildings } = useListBuildings({}, { query: { queryKey: getListBuildingsQueryKey({}) } });
  // alias for form use
  const buildings = allBuildings;

  // Filter combobox option arrays
  const customerOptions = useMemo(() =>
    (customers ?? []).map((c) => ({ value: c.id.toString(), label: c.name })),
    [customers]);

  // Buildings cascade: show only buildings belonging to selected customers
  const buildingOptions = useMemo(() => {
    const list = selectedCustomerIds.length > 0
      ? (allBuildings ?? []).filter(b => selectedCustomerIds.includes(String(b.customerId)))
      : (allBuildings ?? []);
    return list.map(b => ({ value: b.id.toString(), label: b.name }));
  }, [allBuildings, selectedCustomerIds]);

  // Inspections for the currently-edited elevator
  const { data: elevatorInspections, isLoading: inspLoading } = useListInspections(
    { elevatorId: editingElevator?.id },
    { query: { 
      enabled: !!editingElevator,
      queryKey: getListInspectionsQueryKey({ elevatorId: editingElevator?.id }),
      staleTime: 0,
      refetchOnMount: "always",
    }}
  );

  // All inspections (unfiltered) — used to compute per-elevator status counts in the table
  const { data: allInspections } = useListInspections(
    {},
    { query: { queryKey: getListInspectionsQueryKey({}) } }
  );

  // Map: elevatorId → most-relevant inspection
  // Among OPEN (no completion date): earliest due year → CAT5 before CAT1 → earliest due date
  // Elevators with no open inspections are absent from this map (aging shows "—")
  const latestInspByElevator = useMemo(() => {
    const TYPE_PRIORITY: Record<string, number> = { CAT5: 0, CAT1: 1 };
    const isOpen = (insp: Inspection) => !insp.completionDate;

    const beatsOpen = (challenger: Inspection, champion: Inspection): boolean => {
      const ny = (challenger.nextDueDate ?? "9999").slice(0, 4);
      const cy = (champion.nextDueDate ?? "9999").slice(0, 4);
      if (ny !== cy) return ny < cy;
      const np = TYPE_PRIORITY[challenger.inspectionType ?? ""] ?? 99;
      const cp = TYPE_PRIORITY[champion.inspectionType ?? ""] ?? 99;
      if (np !== cp) return np < cp;
      return (challenger.nextDueDate ?? "") < (champion.nextDueDate ?? "");
    };

    const openMap = new Map<number, Inspection>();

    for (const insp of allInspections ?? []) {
      if (!insp.elevatorId || !isOpen(insp)) continue;
      const cur = openMap.get(insp.elevatorId);
      if (!cur || beatsOpen(insp, cur)) openMap.set(insp.elevatorId, insp);
    }

    return openMap;
  }, [allInspections]);

  const dueYearOptions = useMemo(() => {
    const years = new Set<string>();
    for (const insp of latestInspByElevator.values()) {
      if (insp.nextDueDate) years.add(insp.nextDueDate.slice(0, 4));
    }
    return Array.from(years).sort().map(y => ({ value: y, label: y }));
  }, [latestInspByElevator]);

  // Map: elevatorId → lastInspectionDate (for display in the table row)
  const lastCompletedByElevator = useMemo(() => {
    const map = new Map<number, string>();
    for (const [elevatorId, insp] of latestInspByElevator.entries()) {
      if (insp.lastInspectionDate) map.set(elevatorId, insp.lastInspectionDate.slice(0, 10));
    }
    return map;
  }, [latestInspByElevator]);

  // Client-side filtering
  const filteredElevators = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    const today = dayjs().format("YYYY-MM-DD");

    return (elevators ?? []).filter((el) => {
      if (selectedCustomerIds.length > 0 && !selectedCustomerIds.includes(String(el.customerId))) return false;
      if (selectedBuildingIds.length > 0 && !selectedBuildingIds.includes(String(el.buildingId))) return false;

      const rowInsp = latestInspByElevator.get(el.id);
      const rowDue  = rowInsp?.nextDueDate?.slice(0, 10);

      // CAT1/CAT5
      if (selectedInspTypes.length > 0 && (!rowInsp || !selectedInspTypes.includes(rowInsp.inspectionType))) return false;

      // Search
      if (q) {
        const haystack = [el.name, el.buildingName, el.customerName, el.bank].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      // Show Me
      if (showMeFilter !== "all") {
        switch (showMeFilter) {
          case "overdue": {
            if (!rowDue || rowDue >= today) return false; break;
          }
          case "due-7": {
            const in7d = dayjs().add(7, "day").format("YYYY-MM-DD");
            if (!rowDue || rowDue < today || rowDue > in7d) return false; break;
          }
          case "due-14": {
            const in14 = dayjs().add(14, "day").format("YYYY-MM-DD");
            if (!rowDue || rowDue < today || rowDue > in14) return false; break;
          }
          case "due-30": {
            const in30d = dayjs().add(30, "day").format("YYYY-MM-DD");
            if (!rowDue || rowDue < today || rowDue > in30d) return false; break;
          }
          case "due-60": {
            const in60 = dayjs().add(60, "day").format("YYYY-MM-DD");
            if (!rowDue || rowDue < today || rowDue > in60) return false; break;
          }
          case "due-90": {
            const in90 = dayjs().add(90, "day").format("YYYY-MM-DD");
            if (!rowDue || rowDue < today || rowDue > in90) return false; break;
          }
          case "appt-7": {
            const appt7 = dayjs().add(7, "day").format("YYYY-MM-DD");
            const sched7 = rowInsp?.scheduledDate?.slice(0, 10);
            if (!sched7 || sched7 < today || sched7 > appt7) return false; break;
          }
          case "appt-14": {
            const appt14 = dayjs().add(14, "day").format("YYYY-MM-DD");
            const sched14 = rowInsp?.scheduledDate?.slice(0, 10);
            if (!sched14 || sched14 < today || sched14 > appt14) return false; break;
          }
          case "appt-30": {
            const appt30 = dayjs().add(30, "day").format("YYYY-MM-DD");
            const sched30 = rowInsp?.scheduledDate?.slice(0, 10);
            if (!sched30 || sched30 < today || sched30 > appt30) return false; break;
          }
          case "appt-60": {
            const appt60 = dayjs().add(60, "day").format("YYYY-MM-DD");
            const sched60 = rowInsp?.scheduledDate?.slice(0, 10);
            if (!sched60 || sched60 < today || sched60 > appt60) return false; break;
          }
          case "appt-90": {
            const appt90 = dayjs().add(90, "day").format("YYYY-MM-DD");
            const sched90 = rowInsp?.scheduledDate?.slice(0, 10);
            if (!sched90 || sched90 < today || sched90 > appt90) return false; break;
          }
          case "not-scheduled": {
            if (rowInsp?.scheduledDate ||
                rowInsp?.status === "SCHEDULED" ||
                rowInsp?.status === "IN_PROGRESS" ||
                rowInsp?.status === "COMPLETED")
              return false;
            break;
          }
          case "scheduled": {
            if (!rowInsp?.scheduledDate) return false; break;
          }
        }
      }

      if (filterDueYears.length > 0) {
        if (!rowDue || !filterDueYears.includes(rowDue.slice(0, 4))) return false;
      }
      if (filterDueMonths.length > 0) {
        if (!rowDue || !filterDueMonths.includes(rowDue.slice(5, 7))) return false;
      }

      return true;
    });
  }, [elevators, selectedCustomerIds, selectedBuildingIds, selectedInspTypes, debouncedSearch, showMeFilter, filterDueYears, filterDueMonths, latestInspByElevator]);

  // Group filtered elevators: customer → building → bank → elevator[]
  const grouped = useMemo(() => {
    type ElevatorItem = NonNullable<typeof filteredElevators>[number];
    type BankGroup = { bankName: string; elevators: ElevatorItem[] };
    type BuildingGroup = { buildingId: number; buildingName: string; banks: BankGroup[] };
    type CustomerGroup = { customerId: number; customerName: string; buildings: BuildingGroup[] };
    type BuildingEntry = { buildingName: string; bankMap: Map<string, ElevatorItem[]> };
    const customerMap = new Map<number, { customerName: string; buildingMap: Map<number, BuildingEntry> }>();
    for (const el of filteredElevators ?? []) {
      const custId = el.customerId ?? 0;
      const bldgId = el.buildingId;
      if (!customerMap.has(custId)) {
        customerMap.set(custId, { customerName: el.customerName ?? "Unknown", buildingMap: new Map() });
      }
      const cust = customerMap.get(custId)!;
      if (!cust.buildingMap.has(bldgId)) {
        cust.buildingMap.set(bldgId, { buildingName: el.buildingName ?? "Unknown", bankMap: new Map() });
      }
      const bldg = cust.buildingMap.get(bldgId)!;
      const bankKey = el.bank || "";
      if (!bldg.bankMap.has(bankKey)) bldg.bankMap.set(bankKey, []);
      bldg.bankMap.get(bankKey)!.push(el);
    }
    const result: CustomerGroup[] = [];
    for (const [customerId, { customerName, buildingMap }] of customerMap) {
      const buildings: BuildingGroup[] = [];
      for (const [buildingId, { buildingName, bankMap }] of buildingMap) {
        const banks: BankGroup[] = Array.from(bankMap.entries())
          .sort(([a], [b]) => {
            if (a === "" && b !== "") return 1;
            if (a !== "" && b === "") return -1;
            return a.localeCompare(b);
          })
          .map(([bankName, elevators]) => ({ bankName, elevators }));
        buildings.push({ buildingId, buildingName, banks });
      }
      buildings.sort((a, b) => a.buildingName.localeCompare(b.buildingName));
      result.push({ customerId, customerName, buildings });
    }
    return result.sort((a, b) => a.customerName.localeCompare(b.customerName));
  }, [filteredElevators]);

  // Bulk expand/collapse helpers
  const allCustomerIds = useMemo(() => grouped.map(c => c.customerId), [grouped]);
  const allBuildingIds = useMemo(() => grouped.flatMap(c => c.buildings.map(b => b.buildingId)), [grouped]);
  const allBankKeys   = useMemo(() => grouped.flatMap(c =>
    c.buildings.flatMap(b =>
      b.banks.map(bk => `${b.buildingId}::${bk.bankName}`)
    )
  ), [grouped]);

  const [activeDepth, setActiveDepth] = useState<"customers"|"buildings"|"banks"|"units">("units");

  const collapseAll    = () => { setCollapsedCustomers(new Set(allCustomerIds)); setCollapsedBuildings(new Set(allBuildingIds)); setCollapsedBanks(new Set(allBankKeys)); setActiveDepth("customers"); };
  const expandCustomers = () => { setCollapsedCustomers(new Set()); setCollapsedBuildings(new Set(allBuildingIds)); setCollapsedBanks(new Set(allBankKeys)); setActiveDepth("buildings"); };
  const expandBuildings = () => { setCollapsedCustomers(new Set()); setCollapsedBuildings(new Set()); setCollapsedBanks(new Set(allBankKeys)); setActiveDepth("banks"); };
  const expandAll      = () => { setCollapsedCustomers(new Set()); setCollapsedBuildings(new Set()); setCollapsedBanks(new Set()); setActiveDepth("units"); };

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createInspMutation = useCreateInspection();
  const updateInspMutation = useUpdateInspection();
  const deleteInspMutation = useDeleteInspection();

  const inspForm = useForm<InspectionFormValues>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: { inspectionType: "CAT1", recurrenceYears: 1, status: "NOT_STARTED", notes: "" },
  });

  const inspCat5Form = useForm<InspectionFormValues>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: { inspectionType: "CAT5", recurrenceYears: 5, status: "NOT_STARTED", notes: "" },
  });

  const watchLastDate = inspForm.watch("lastInspectionDate");
  const watchRecurrence = inspForm.watch("recurrenceYears");
  const watchCompletionDate = inspForm.watch("completionDate");
  const watchScheduledDate = inspForm.watch("scheduledDate");
  const watchInspStatus = inspForm.watch("status");
  const nextDuePreview = watchLastDate && watchRecurrence
    ? dayjs(watchLastDate).add(Number(watchRecurrence), "year").format("YYYY-MM-DD")
    : null;

  const completionYearMismatch = !!(
    isValidDateStr(watchCompletionDate) && nextDuePreview &&
    dayjs(watchCompletionDate, "YYYY-MM-DD", true).year() !== dayjs(nextDuePreview).year()
  );

  const watchLastDateCat5 = inspCat5Form.watch("lastInspectionDate");
  const watchRecurrenceCat5 = inspCat5Form.watch("recurrenceYears");
  const watchCompletionDateCat5 = inspCat5Form.watch("completionDate");
  const watchScheduledDateCat5 = inspCat5Form.watch("scheduledDate");
  const watchInspStatusCat5 = inspCat5Form.watch("status");
  const nextDuePreviewCat5 = watchLastDateCat5 && watchRecurrenceCat5
    ? dayjs(watchLastDateCat5).add(Number(watchRecurrenceCat5), "year").format("YYYY-MM-DD")
    : null;

  useEffect(() => {
    if (watchScheduledDate && watchInspStatus === "NOT_STARTED") {
      inspForm.setValue("status", "SCHEDULED");
    }
  }, [watchScheduledDate]);

  useEffect(() => {
    if (watchCompletionDate) {
      inspForm.setValue("status", "COMPLETED");
    }
  }, [watchCompletionDate]);

  useEffect(() => {
    if (watchScheduledDateCat5 && watchInspStatusCat5 === "NOT_STARTED") {
      inspCat5Form.setValue("status", "SCHEDULED");
    }
  }, [watchScheduledDateCat5]);

  useEffect(() => {
    if (watchCompletionDateCat5) {
      inspCat5Form.setValue("status", "COMPLETED");
    }
  }, [watchCompletionDateCat5]);

  const resetInspForm = () => {
    inspForm.reset({ inspectionType: "CAT1", recurrenceYears: 1, status: "NOT_STARTED", notes: "" });
    inspCat5Form.reset({ inspectionType: "CAT5", recurrenceYears: 5, status: "NOT_STARTED", notes: "" });
    setEditingInspection(null);
  };

  const openEditInsp = (insp: Inspection) => {
    setEditingInspection(insp);
    inspForm.reset({
      inspectionType: insp.inspectionType,
      recurrenceYears: insp.recurrenceYears,
      status: insp.status === "OVERDUE" ? "NOT_STARTED" : insp.status,
      lastInspectionDate: insp.lastInspectionDate ? dayjs(insp.lastInspectionDate).format("YYYY-MM-DD") : "",
      scheduledDate: insp.scheduledDate ? dayjs(insp.scheduledDate).format("YYYY-MM-DD") : "",
      completionDate: insp.completionDate ? dayjs(insp.completionDate).format("YYYY-MM-DD") : "",
      notes: insp.notes || "",
    });
  };

  const onSubmitInsp = (data: InspectionFormValues) => {
    if (!editingElevator) return;
    const payload = {
      ...data,
      elevatorId: editingElevator.id,
      lastInspectionDate: data.lastInspectionDate || undefined,
      scheduledDate: data.scheduledDate || undefined,
      completionDate: data.completionDate || undefined,
    };

    const invalidateInspections = () => {
      queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey() });
      if (editingElevator) {
        queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey({ elevatorId: editingElevator.id }), exact: false });
      }
    };

    if (editingInspection) {
      updateInspMutation.mutate(
        { id: editingInspection.id, data: payload as any },
        {
          onSuccess: (data: any) => {
            invalidateInspections();
            if (payload.status === "COMPLETED") fireCompletionConfetti();
            toast({ title: "Inspection saved" });
            if (data?._warning) toast({ title: "Follow-up not auto-created", description: data._warning, variant: "destructive", duration: 10000 });
            setIsAddOpen(false);
          },
          onError: (error: any) => { const msg = error?.data?.error; const hint = msg?.includes("already exists") ? " To resolve, delete the conflicting record from the Inspection History menu first." : ""; toast({ title: "Could not save inspection", description: msg ? msg + hint : undefined, variant: "destructive" }); },
        }
      );
    } else {
      createInspMutation.mutate(
        { data: payload as any },
        {
          onSuccess: (created: any) => {
            invalidateInspections();
            toast({ title: "Inspection created" });
            if (created?._warning) toast({ title: "Follow-up not auto-created", description: created._warning, variant: "destructive", duration: 10000 });
            if (created?.id) setEditingInspection(created as Inspection);
          },
          onError: (error: any) => { const msg = error?.data?.error; const hint = msg?.includes("already exists") ? " To resolve, delete the conflicting record from the Inspection History menu first." : ""; toast({ title: "Could not create inspection", description: msg ? msg + hint : undefined, variant: "destructive" }); },
        }
      );
    }
  };

  const onSubmitBothInsp = async () => {
    if (!editingElevator) return;
    const elevatorId = editingElevator.id;

    const [cat1Valid, cat5Valid] = await Promise.all([inspForm.trigger(), inspCat5Form.trigger()]);
    if (!cat1Valid || !cat5Valid) return;
    const cat1Data = inspForm.getValues();
    const cat5Data = inspCat5Form.getValues();
    const deriveStatusBoth = (v: InspectionFormValues): InspectionFormValues["status"] => {
      if (v.completionDate) return "COMPLETED";
      if (v.scheduledDate && (!v.status || v.status === "NOT_STARTED")) return "SCHEDULED";
      return v.status ?? "NOT_STARTED";
    };
    try {
      const [cat1Result, cat5Result]: any[] = await Promise.all([
        createInspMutation.mutateAsync({ data: { ...cat1Data, status: deriveStatusBoth(cat1Data), elevatorId, recurrenceYears: Number(cat1Data.recurrenceYears), lastInspectionDate: cat1Data.lastInspectionDate || undefined, scheduledDate: cat1Data.scheduledDate || undefined, completionDate: cat1Data.completionDate || undefined } as any }),
        createInspMutation.mutateAsync({ data: { ...cat5Data, status: deriveStatusBoth(cat5Data), elevatorId, recurrenceYears: Number(cat5Data.recurrenceYears), lastInspectionDate: cat5Data.lastInspectionDate || undefined, scheduledDate: cat5Data.scheduledDate || undefined, completionDate: cat5Data.completionDate || undefined } as any }),
      ]);
      queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey() });
      if (editingElevator) queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey({ elevatorId }), exact: false });
      toast({ title: editingElevator ? "Both inspections created" : "Unit and inspections created" });
      if (cat1Result?._warning) toast({ title: "CAT 1 follow-up not auto-created", description: cat1Result._warning, variant: "destructive", duration: 10000 });
      if (cat5Result?._warning) toast({ title: "CAT 5 follow-up not auto-created", description: cat5Result._warning, variant: "destructive", duration: 10000 });
      setIsAddOpen(false);
    } catch {
      toast({ title: "Failed to create inspections", variant: "destructive" });
    }
  };

  const confirmDeleteInsp = () => {
    if (inspDeleteId === null) return;
    deleteInspMutation.mutate(
      { id: inspDeleteId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey() });
          if (editingElevator) {
            queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey({ elevatorId: editingElevator.id }), exact: false });
          }
          toast({ title: "Inspection deleted" });
          setInspDeleteId(null);
        },
        onError: () => {
          toast({ title: "Failed to delete inspection", variant: "destructive" });
          setInspDeleteId(null);
        },
      }
    );
  };

  const openInspDialog = (elevator: Elevator) => {
    setEditingElevator(elevator);
    const latestInsp = latestInspByElevator.get(elevator.id);
    if (latestInsp) {
      openEditInsp(latestInsp);
    } else {
      resetInspForm();
    }
  };

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (selectedCustomerIds.length === 1) params.append("customerId", selectedCustomerIds[0]);
    if (selectedBuildingIds.length === 1) params.append("buildingId", selectedBuildingIds[0]);

    const token = localStorage.getItem("token");
    const res = await fetch(`/api/export/elevators?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      console.error("Export failed", res.status);
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `elevators_export_${date}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };


  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Active Inspections</h1>
          <p className="text-sm text-zinc-500 mt-1">Your open inspection records by unit. Completed inspections move automatically to Inspection History.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Link href="/units">
            <Button variant="outline" className="gap-1.5">
              Manage Units
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Inspection editing dialog — opened from row pencil buttons */}
      <Dialog open={isAddOpen} onOpenChange={(open) => {
        setIsAddOpen(open);
        if (!open) {
          setEditingElevator(null);
          resetInspForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <ArrowUpSquare className="h-4 w-4" />
              </span>
              {editingElevator?.name ?? "Inspection"}
            </DialogTitle>
            {editingElevator && (
              <p className="text-sm text-muted-foreground pl-10">{editingElevator.buildingName} · {editingElevator.customerName}</p>
            )}
          </DialogHeader>

          <div className="pt-2">
            {editingInspection ? (
                      /* ── EDIT MODE: single form ── */
                      <Form {...inspForm}>
                        <form onSubmit={inspForm.handleSubmit(onSubmitInsp)} className="space-y-5">
                          {/* Section: Inspection Definition */}
                          <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-4 space-y-4">
                            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Inspection Definition</p>
                            {/* Row 1: Type | Recurrence */}
                            <div className="grid grid-cols-2 gap-4">
                              <FormField control={inspForm.control} name="inspectionType" render={({ field }) => (
                                <FormItem><FormLabel>Type</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      <SelectItem value="CAT1">CAT1 (Annual)</SelectItem>
                                      <SelectItem value="CAT5">CAT5 (5-Year)</SelectItem>
                                    </SelectContent>
                                  </Select><FormMessage /></FormItem>
                              )} />
                              <FormField control={inspForm.control} name="recurrenceYears" render={({ field }) => (
                                <FormItem><FormLabel>Recurrence (Years)</FormLabel>
                                  <FormControl><Input type="number" min="1" className="bg-white" {...field} /></FormControl>
                                  <FormMessage /></FormItem>
                              )} />
                            </div>
                            {/* Row 2: Last Inspection Date | Next Due Date */}
                            <div className="grid grid-cols-2 gap-4">
                              <FormField control={inspForm.control} name="lastInspectionDate" render={({ field }) => (
                                <FormItem><FormLabel>Last Inspection Date</FormLabel>
                                  <FormControl><DatePickerField value={field.value} onChange={field.onChange} placeholder="Pick a date" /></FormControl>
                                  <FormMessage /></FormItem>
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

                          {/* Section: Schedule */}
                          <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-4 space-y-4">
                            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Schedule</p>
                            {/* Row 3: Status | Scheduled Date | Completion Date */}
                            <div className="grid grid-cols-3 gap-4">
                              <FormField control={inspForm.control} name="status" render={({ field }) => (
                                <FormItem><FormLabel>Inspection Status</FormLabel>
                                  <Select value={field.value} onValueChange={(val) => { field.onChange(val); if (val === "SCHEDULED") { inspForm.setValue("scheduledDate", dayjs().format("YYYY-MM-DD")); inspForm.setValue("completionDate", ""); } else if (val === "COMPLETED") { inspForm.setValue("completionDate", dayjs().format("YYYY-MM-DD")); } else { inspForm.setValue("completionDate", ""); } }}>
                                    <FormControl><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      <SelectItem value="NOT_STARTED">Not Scheduled</SelectItem>
                                      <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                      <SelectItem value="COMPLETED">Completed</SelectItem>
                                    </SelectContent>
                                  </Select><FormMessage /></FormItem>
                              )} />
                              <FormField control={inspForm.control} name="scheduledDate" render={({ field }) => (
                                <FormItem><FormLabel>Scheduled Date <span className="font-normal text-muted-foreground text-xs">(Optional)</span></FormLabel>
                                  <FormControl><DatePickerField value={field.value} onChange={field.onChange} placeholder="Pick a date" /></FormControl>
                                  <FormMessage /></FormItem>
                              )} />
                              <FormField control={inspForm.control} name="completionDate" render={({ field }) => (
                                <FormItem><FormLabel>Completion Date <span className="font-normal text-muted-foreground text-xs">(Optional)</span></FormLabel>
                                  <FormControl><DatePickerField value={field.value} onChange={field.onChange} placeholder="Pick a date" /></FormControl>
                                  <FormMessage /></FormItem>
                              )} />
                            </div>
                          </div>

                          {/* Year mismatch warning */}
                          {completionYearMismatch && isValidDateStr(watchCompletionDate) && (
                            <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-3 text-amber-900">
                              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                              <div className="text-sm leading-snug">
                                <span className="font-semibold">Are you sure?</span>{" "}
                                The completion year ({dayjs(watchCompletionDate, "YYYY-MM-DD", true).year()}) doesn't match the expected next due year ({nextDuePreview ? dayjs(nextDuePreview).year() : "unknown"}). Double-check the dates before saving.
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          <FormField control={inspForm.control} name="notes" render={({ field }) => (
                            <FormItem><FormLabel>Notes</FormLabel>
                              <FormControl><Textarea placeholder="Inspector notes, compliance details..." className="resize-none h-16" {...field} /></FormControl>
                              <FormMessage /></FormItem>
                          )} />
                          <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-900 font-semibold" disabled={updateInspMutation.isPending}>
                            {updateInspMutation.isPending ? "Saving..." : "Save Inspection"}
                          </Button>
                        </form>
                      </Form>
                    ) : (
                      /* ── CREATE MODE: two forms — CAT1 + CAT5 ── */
                      <div className="space-y-6">
                        {/* CAT1 section */}
                        <div className="rounded-lg border border-zinc-200 p-4 space-y-4">
                          <div className="flex items-center gap-2">
                            <InspectionTypeBadge type="CAT1" />
                            <span className="text-sm font-medium text-zinc-700">Annual Inspection</span>
                          </div>
                          <Form {...inspForm}>
                            <div className="space-y-4">
                              {/* Row 1: Recurrence → Last Inspection Date → Next Due */}
                              <div className="grid grid-cols-3 gap-4">
                                <FormField control={inspForm.control} name="recurrenceYears" render={({ field }) => (
                                  <FormItem><FormLabel>Recurrence (Years)</FormLabel>
                                    <FormControl><Input type="number" min="1" {...field} /></FormControl>
                                    <FormMessage /></FormItem>
                                )} />
                                <FormField control={inspForm.control} name="lastInspectionDate" render={({ field }) => (
                                  <FormItem><FormLabel>Last Inspection Date</FormLabel>
                                    <FormControl><DatePickerField value={field.value} onChange={field.onChange} placeholder="Pick a date" /></FormControl>
                                    <FormMessage /></FormItem>
                                )} />
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-sm font-medium leading-none">Next Due Date</label>
                                  <div className={`flex items-center h-9 px-3 rounded-md border text-sm tabular-nums transition-colors ${nextDuePreview ? "bg-blue-50 border-blue-200 text-blue-800 font-semibold" : "bg-zinc-50 border-zinc-200 text-zinc-400"}`}>
                                    {nextDuePreview
                                      ? new Date(nextDuePreview + "T00:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
                                      : <span className="italic font-normal text-sm">Auto-calculated</span>}
                                  </div>
                                  <p className="text-xs text-zinc-400 leading-none">From last date + recurrence</p>
                                </div>
                              </div>
                              {/* Row 2: Status + Scheduled Date */}
                              <div className="grid grid-cols-2 gap-4">
                                <FormField control={inspForm.control} name="status" render={({ field }) => (
                                  <FormItem><FormLabel>Inspection Status</FormLabel>
                                    <Select value={field.value} onValueChange={(val) => { field.onChange(val); if (val === "SCHEDULED") { inspForm.setValue("scheduledDate", dayjs().format("YYYY-MM-DD")); inspForm.setValue("completionDate", ""); } else { inspForm.setValue("completionDate", ""); } }}>
                                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                      <SelectContent>
                                        <SelectItem value="NOT_STARTED">Not Scheduled</SelectItem>
                                        <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                      </SelectContent>
                                    </Select><FormMessage /></FormItem>
                                )} />
                                <FormField control={inspForm.control} name="scheduledDate" render={({ field }) => (
                                  <FormItem><FormLabel>Scheduled Date <span className="font-normal text-muted-foreground">(Optional)</span></FormLabel>
                                    <FormControl><DatePickerField value={field.value} onChange={field.onChange} placeholder="Pick a date" /></FormControl>
                                    <FormMessage /></FormItem>
                                )} />
                              </div>
                              {/* Notes */}
                              <FormField control={inspForm.control} name="notes" render={({ field }) => (
                                <FormItem><FormLabel>Notes</FormLabel>
                                  <FormControl><Textarea placeholder="Inspector notes, compliance details..." className="resize-none h-16" {...field} /></FormControl>
                                  <FormMessage /></FormItem>
                              )} />
                            </div>
                          </Form>
                        </div>

                        {/* CAT5 section */}
                        <div className="rounded-lg border border-yellow-300 p-4 space-y-4">
                          <div className="flex items-center gap-2">
                            <InspectionTypeBadge type="CAT5" />
                            <span className="text-sm font-medium text-zinc-700">5-Year Inspection</span>
                          </div>
                          <Form {...inspCat5Form}>
                            <div className="space-y-4">
                              {/* Row 1: Recurrence → Last Inspection Date → Next Due */}
                              <div className="grid grid-cols-3 gap-4">
                                <FormField control={inspCat5Form.control} name="recurrenceYears" render={({ field }) => (
                                  <FormItem><FormLabel>Recurrence (Years)</FormLabel>
                                    <FormControl><Input type="number" min="1" {...field} /></FormControl>
                                    <FormMessage /></FormItem>
                                )} />
                                <FormField control={inspCat5Form.control} name="lastInspectionDate" render={({ field }) => (
                                  <FormItem><FormLabel>Last Inspection Date</FormLabel>
                                    <FormControl><DatePickerField value={field.value} onChange={field.onChange} placeholder="Pick a date" /></FormControl>
                                    <FormMessage /></FormItem>
                                )} />
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-sm font-medium leading-none">Next Due Date</label>
                                  <div className={`flex items-center h-9 px-3 rounded-md border text-sm tabular-nums transition-colors ${nextDuePreviewCat5 ? "bg-blue-50 border-blue-200 text-blue-800 font-semibold" : "bg-zinc-50 border-zinc-200 text-zinc-400"}`}>
                                    {nextDuePreviewCat5
                                      ? new Date(nextDuePreviewCat5 + "T00:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
                                      : <span className="italic font-normal text-sm">Auto-calculated</span>}
                                  </div>
                                  <p className="text-xs text-zinc-400 leading-none">From last date + recurrence</p>
                                </div>
                              </div>
                              {/* Row 2: Status + Scheduled Date */}
                              <div className="grid grid-cols-2 gap-4">
                                <FormField control={inspCat5Form.control} name="status" render={({ field }) => (
                                  <FormItem><FormLabel>Inspection Status</FormLabel>
                                    <Select value={field.value} onValueChange={(val) => { field.onChange(val); if (val === "SCHEDULED") { inspCat5Form.setValue("scheduledDate", dayjs().format("YYYY-MM-DD")); inspCat5Form.setValue("completionDate", ""); } else { inspCat5Form.setValue("completionDate", ""); } }}>
                                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                      <SelectContent>
                                        <SelectItem value="NOT_STARTED">Not Scheduled</SelectItem>
                                        <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                      </SelectContent>
                                    </Select><FormMessage /></FormItem>
                                )} />
                                <FormField control={inspCat5Form.control} name="scheduledDate" render={({ field }) => (
                                  <FormItem><FormLabel>Scheduled Date <span className="font-normal text-muted-foreground">(Optional)</span></FormLabel>
                                    <FormControl><DatePickerField value={field.value} onChange={field.onChange} placeholder="Pick a date" /></FormControl>
                                    <FormMessage /></FormItem>
                                )} />
                              </div>
                              {/* Notes */}
                              <FormField control={inspCat5Form.control} name="notes" render={({ field }) => (
                                <FormItem><FormLabel>Notes</FormLabel>
                                  <FormControl><Textarea placeholder="Inspector notes, compliance details..." className="resize-none h-16" {...field} /></FormControl>
                                  <FormMessage /></FormItem>
                              )} />
                            </div>
                          </Form>
                        </div>

                        <Button
                          type="button"
                          className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-900 font-semibold"
                          disabled={createInspMutation.isPending}
                          onClick={onSubmitBothInsp}
                        >
                          {createInspMutation.isPending ? "Creating..." : "Create Both Inspections"}
                        </Button>
                      </div>
                    )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Filters ── */}
      {(() => {
        const activeFilterCount = [selectedCustomerIds, selectedBuildingIds, selectedInspTypes, filterDueYears, filterDueMonths].filter(v => v.length > 0).length + (showMeFilter !== "all" ? 1 : 0) + (searchQuery ? 1 : 0);
        const clearAll = () => { setSelectedCustomerIds([]); setSelectedBuildingIds([]); setSelectedInspTypes([]); setShowMeFilter("all"); setSearchQuery(""); setFilterDueYears([]); setFilterDueMonths([]); };

        return (
      <div className="flex flex-col gap-2 sticky top-0 z-10 bg-zinc-100 pb-2 pt-1 -mx-4 px-4">

        {/* Filter row */}
        <div className="bg-white border border-zinc-200 rounded-lg shadow-sm">
          <div className="flex items-center gap-1.5 px-3 py-2 min-h-[48px]">

            {/* Search */}
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

            <FilterCombobox value={selectedCustomerIds} onValueChange={(val) => { setSelectedCustomerIds(val); setSelectedBuildingIds([]); }} options={customerOptions} placeholder="All Customers" searchPlaceholder="Search customers..." width="w-[155px]" />
            <FilterCombobox value={selectedBuildingIds} onValueChange={(val) => setSelectedBuildingIds(val)} options={buildingOptions} placeholder="All Buildings" searchPlaceholder="Search buildings..." width="w-[140px]" />

            {/* Show Me */}
            <select
              value={showMeFilter}
              onChange={e => setShowMeFilter(e.target.value)}
              className={cn(
                "h-8 px-2 pr-7 text-xs rounded-md border appearance-none focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 bg-white shrink-0",
                showMeFilter !== "all" ? "border-blue-300 text-blue-700 bg-blue-50" : "border-zinc-200 text-zinc-600"
              )}
            >
              <option value="all">Show Me: All</option>
              <optgroup label="BY DUE DATE">
                <option value="overdue">Overdue (past due date)</option>
                <option value="due-7">Due in Next 7 Days</option>
                <option value="due-14">Due in Next 14 Days</option>
                <option value="due-30">Due in Next 30 Days</option>
                <option value="due-60">Due in Next 60 Days</option>
                <option value="due-90">Due in Next 90 Days</option>
              </optgroup>
              <optgroup label="BY SCHEDULED APPOINTMENT">
                <option value="appt-7">Appointment in Next 7 Days</option>
                <option value="appt-14">Appointment in Next 14 Days</option>
                <option value="appt-30">Appointment in Next 30 Days</option>
                <option value="appt-60">Appointment in Next 60 Days</option>
                <option value="appt-90">Appointment in Next 90 Days</option>
              </optgroup>
              <optgroup label="BY STATUS">
                <option value="not-scheduled">Not Scheduled</option>
                <option value="scheduled">Scheduled</option>
              </optgroup>
            </select>

            <FilterCombobox value={filterDueYears} onValueChange={setFilterDueYears} options={dueYearOptions} placeholder="Due Year" searchPlaceholder="Search years..." width="w-[115px]" />
            <FilterCombobox value={filterDueMonths} onValueChange={setFilterDueMonths} options={MONTH_OPTIONS} placeholder="Due Month" searchPlaceholder="Search months..." width="w-[130px]" />

            {/* CAT1 / CAT5 */}
            <FilterCombobox value={selectedInspTypes} onValueChange={setSelectedInspTypes} options={[{ value: "CAT1", label: "CAT 1" }, { value: "CAT5", label: "CAT 5" }]} placeholder="CAT1 / CAT5" searchPlaceholder="Search..." width="w-[130px]" />

            <div className="flex-1 min-w-0" />

            {/* Right: result count + clear all */}
            <div className="flex items-center gap-2 pl-2 shrink-0">
              <span className="text-xs tabular-nums whitespace-nowrap">
                <span className="font-bold text-zinc-700">{filteredElevators.length}</span>
                <span className="text-zinc-400 ml-1">{filteredElevators.length === 1 ? "elevator" : "elevators"}</span>
              </span>
              {activeFilterCount > 0 && (
                <button onClick={clearAll} className="flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-red-600 bg-zinc-100 hover:bg-red-50 border border-zinc-200 hover:border-red-200 px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap">
                  <X className="h-3 w-3" /> Clear all
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Expand/collapse depth selector */}
        {!isLoading && grouped.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <nav className="flex items-center gap-1 bg-zinc-100 rounded-lg p-1">
              {([
                { key: "customers", label: "Customers", action: collapseAll },
                { key: "buildings", label: "Buildings", action: expandCustomers },
                { key: "banks",     label: "Banks",     action: expandBuildings },
                { key: "units",     label: "Units",     action: expandAll },
              ] as const).map(({ key, label, action }) => {
                const isActive = activeDepth === key;
                return (
                  <button
                    key={key}
                    onClick={action}
                    className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>
        );
      })()}

      {/* ── Accordion tree: Customer → Building → Bank → Elevator ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center border rounded-lg bg-white">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
            <ClipboardList className="h-6 w-6 text-zinc-400" />
          </div>
          <p className="text-sm font-semibold text-zinc-600">No units found</p>
          {(selectedCustomerIds.length > 0 || selectedBuildingIds.length > 0 || selectedInspTypes.length > 0 || showMeFilter !== "all" || searchQuery || filterDueYears.length > 0 || filterDueMonths.length > 0) ? (
            <button
              onClick={() => { setSelectedCustomerIds([]); setSelectedBuildingIds([]); setSelectedInspTypes([]); setShowMeFilter("all"); setSearchQuery(""); setFilterDueYears([]); setFilterDueMonths([]); }}
              className="text-sm text-amber-600 hover:text-amber-700 font-semibold underline-offset-2 hover:underline"
            >
              Clear all filters
            </button>
          ) : (
            <p className="text-xs text-zinc-400">Add your first unit to get started</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((customer) => {
            const isCustomerCollapsed = collapsedCustomers.has(customer.customerId);
            return (
              <div key={customer.customerId} className="rounded-lg border border-zinc-200 overflow-x-auto shadow-sm">
                {/* Customer header — grid matches elevator row grid-cols exactly */}
                <button
                  className="w-full grid min-w-[1440px] bg-gradient-to-r from-zinc-900 to-zinc-800 text-white border-t border-amber-500/30 cursor-pointer select-none text-left grid-cols-[minmax(280px,1fr)_90px_90px_95px_110px_150px_145px_155px_160px_145px_85px]"
                  onClick={() => toggleCustomer(customer.customerId)}
                >
                  <div className="flex items-center gap-2 min-w-0 px-4 py-4">
                    {isCustomerCollapsed
                      ? <ChevronRight className="h-5 w-5 shrink-0 text-zinc-400" />
                      : <ChevronDown className="h-5 w-5 shrink-0 text-zinc-400" />}
                    <Users className="h-5 w-5 shrink-0 text-zinc-400" />
                    <span className="font-bold text-lg tracking-tight truncate">{customer.customerName}</span>
                    <span className="text-sm font-medium bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full ml-1 shrink-0">
                      {customer.buildings.reduce((sum, b) => sum + b.banks.reduce((s, bk) => s + bk.elevators.length, 0), 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-center px-3 py-3 border-l border-zinc-700">
                    <span className="text-sm font-semibold text-white text-center">Unit ID</span>
                  </div>
                  <div className="flex items-center justify-center px-3 py-3 border-l border-zinc-700">
                    <span className="text-sm font-semibold text-white text-center">State ID</span>
                  </div>
                  <div className="flex items-center justify-center px-3 py-3 border-l border-zinc-700">
                    <span className="text-sm font-semibold text-white text-center">Unit Type</span>
                  </div>
                  <div className="flex items-center justify-center px-4 py-3 border-l border-zinc-700">
                    <span className="text-sm font-semibold text-white text-center">Insp Type</span>
                  </div>
                  <div className="flex items-center justify-center px-4 py-3 border-l border-zinc-700">
                    <span className="text-sm font-semibold text-white text-center">Last Insp.</span>
                  </div>
                  <div className="flex items-center justify-center px-4 py-3 border-l border-zinc-700">
                    <span className="text-sm font-semibold text-white text-center">Next Due</span>
                  </div>
                  <div className="flex items-center justify-center px-3 py-3 border-l border-zinc-700">
                    <span className="text-sm font-semibold text-white text-center">Timeline</span>
                  </div>
                  <div className="flex items-center justify-center px-4 py-3 border-l border-zinc-700">
                    <span className="text-sm font-semibold text-white text-center">Inspection Status</span>
                  </div>
                  <div className="flex items-center justify-center px-4 py-3 border-l border-zinc-700">
                    <span className="text-sm font-semibold text-white text-center">Scheduled Date</span>
                  </div>
                  <div className="flex items-center justify-center px-4 py-3 border-l border-zinc-700">
                    <span className="text-sm font-semibold text-white text-center">Actions</span>
                  </div>
                </button>

                {!isCustomerCollapsed && (
                  <div>
                    {customer.buildings.map((building) => {
                      const isBuildingCollapsed = collapsedBuildings.has(building.buildingId);
                      return (
                        <div key={building.buildingId}>
                          {/* Building header */}
                          <button
                            className="w-full flex items-center gap-2 px-4 py-3.5 pl-8 bg-zinc-100 border-l-[3px] border-zinc-600 hover:bg-zinc-200/60 transition-colors text-left border-b border-zinc-200"
                            onClick={() => toggleBuilding(building.buildingId)}
                          >
                            {isBuildingCollapsed
                              ? <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
                              : <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />}
                            <BuildingIcon className="h-4 w-4 shrink-0 text-zinc-600" />
                            <span className="font-semibold text-base text-zinc-800">{building.buildingName}</span>
                          </button>

                          {!isBuildingCollapsed && (
                            <div>
                              {building.banks.map((bank) => {
                                const bankKey = `${building.buildingId}::${bank.bankName}`;
                                const isBankCollapsed = collapsedBanks.has(bankKey);
                                const bankLabel = bank.bankName !== "" ? bank.bankName : "No Bank";
                                return (
                                  <div key={bank.bankName}>
                                    {/* Bank header — always shown; "No Bank" for unassigned elevators */}
                                    <button
                                      className="w-full flex items-center gap-2 px-4 py-2 pl-12 bg-white border-l-[2px] border-zinc-200 hover:bg-zinc-50 transition-colors text-left border-b border-zinc-100"
                                      onClick={() => toggleBank(bankKey)}
                                    >
                                      {isBankCollapsed
                                        ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-300" />
                                        : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-300" />}
                                      <Layers className={`h-4 w-4 shrink-0 ${bank.bankName !== "" ? "text-zinc-300" : "text-zinc-200"}`} />
                                      <span className={`text-sm font-semibold uppercase tracking-wide ${bank.bankName !== "" ? "text-zinc-500" : "text-zinc-400 italic"}`}>
                                        {bankLabel}
                                      </span>
                                    </button>

                                    {/* Elevator rows — fixed-width right columns for alignment */}
                                    {!isBankCollapsed && bank.elevators.map((elevator) => {
                                      const latestInsp = latestInspByElevator.get(elevator.id);
                                      const due = latestInsp?.nextDueDate?.slice(0, 10);
                                      const today = new Date().toISOString().slice(0, 10);
                                      const isOverdue = !!due && due < today;
                                      const isSoon = !isOverdue && !!due && due <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
                                      const scheduledDate = latestInsp?.scheduledDate?.slice(0, 10);
                                      const completionDate = lastCompletedByElevator.get(elevator.id);
                                      const nameIndent = "pl-20";
                                      return (
                                        <div
                                          key={elevator.id}
                                          className={`grid min-w-[1440px] grid-cols-[minmax(280px,1fr)_90px_90px_95px_110px_150px_145px_155px_160px_145px_85px] group relative transition-colors border-b ${
                                            isOverdue
                                              ? "bg-red-50/60 border-red-200 hover:bg-red-50"
                                              : "hover:bg-amber-50/60 border-zinc-300"
                                          }`}
                                        >
                                          {/* Left accent bar — red when overdue, amber otherwise */}
                                          <div className={`absolute left-0 top-0 bottom-0 w-[3px] transition-colors ${
                                            isOverdue ? "bg-red-500" : "bg-amber-500 group-hover:bg-amber-400"
                                          }`} />
                                          {/* Name */}
                                          <div className={`flex items-center px-4 py-3.5 min-w-0 ${nameIndent}`}>
                                            <div>
                                              <div className="font-semibold text-base leading-snug break-words text-zinc-900" title={elevator.name}>{elevator.name}</div>
                                              {elevator.manufacturer && (
                                                <div className="text-sm text-zinc-500 truncate mt-0.5">{elevator.manufacturer}</div>
                                              )}
                                            </div>
                                          </div>
                                          {/* Unit ID — reference field, de-emphasized */}
                                          <div className="flex items-center justify-center overflow-hidden px-3 py-3.5 border-l border-zinc-200">
                                            <span className="text-sm tabular-nums text-zinc-500 truncate">{elevator.internalId ?? <span className="text-zinc-300 italic text-xs">—</span>}</span>
                                          </div>
                                          {/* State ID — reference field, de-emphasized */}
                                          <div className="flex items-center justify-center overflow-hidden px-3 py-3.5 border-l border-zinc-200">
                                            <span className="text-sm tabular-nums text-zinc-500 truncate">{elevator.stateId ?? <span className="text-zinc-300 italic text-xs">—</span>}</span>
                                          </div>
                                          {/* Unit Type */}
                                          <div className="flex items-center justify-center overflow-hidden px-3 py-3.5 border-l border-zinc-200">
                                            <span className="text-sm font-medium text-zinc-600 capitalize truncate">{elevator.type}</span>
                                          </div>
                                          {/* Insp Type */}
                                          <div className="flex items-center justify-center overflow-hidden px-4 py-3.5 border-l border-zinc-200">
                                            {latestInsp ? (
                                              <InspectionTypeBadge type={latestInsp.inspectionType} />
                                            ) : <span className="text-zinc-300 italic text-xs">—</span>}
                                          </div>
                                          {/* Last Completed */}
                                          <div className="flex items-center justify-center overflow-hidden px-4 py-3.5 border-l border-zinc-200">
                                            {completionDate ? (
                                              <span className="text-sm tabular-nums truncate text-zinc-500">
                                                {new Date(completionDate + "T00:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
                                              </span>
                                            ) : <span className="text-zinc-300 italic text-xs">—</span>}
                                          </div>
                                          {/* Next Due */}
                                          <div className="flex items-center justify-center overflow-hidden px-4 py-3.5 border-l border-zinc-200">
                                            {due ? (
                                              <span className={`text-sm tabular-nums truncate font-semibold ${isOverdue ? "text-red-600" : "text-zinc-800"}`}>
                                                {new Date(due + "T00:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
                                              </span>
                                            ) : <span className="text-zinc-300 italic text-xs">—</span>}
                                          </div>
                                          {/* Due Status — primary attention signal */}
                                          <div className="flex items-center justify-center overflow-hidden px-3 py-3.5 border-l border-zinc-300">
                                            <AgingBucketPill due={due} status={latestInsp?.status} />
                                          </div>
                                          {/* Status */}
                                          <div className="flex items-center justify-center overflow-hidden px-4 py-3.5 border-l border-zinc-200">
                                            {latestInsp
                                              ? <StatusBadge status={(latestInsp as any).trueStatus ?? latestInsp.status ?? "NOT_STARTED"} />
                                              : <span className="text-zinc-300 italic text-xs">—</span>}
                                          </div>
                                          {/* Scheduled Date */}
                                          <div className="flex items-center justify-center overflow-hidden px-4 py-3.5 border-l border-zinc-200">
                                            {scheduledDate ? (
                                              <span className="text-sm tabular-nums truncate text-zinc-500">
                                                {new Date(scheduledDate + "T00:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
                                              </span>
                                            ) : <span className="text-zinc-300 italic text-xs">—</span>}
                                          </div>
                                          {/* Actions */}
                                          <div className="flex items-center justify-center border-l border-zinc-200 gap-0.5">
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { openInspDialog(elevator); setIsAddOpen(true); }}>
                                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                                  </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Edit Inspection</TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Inspection delete confirmation */}
      <AlertDialog open={inspDeleteId !== null} onOpenChange={(open) => { if (!open) setInspDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inspection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this inspection record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteInsp} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
