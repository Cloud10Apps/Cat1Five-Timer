import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import {
  useListElevators,
  getListElevatorsQueryKey,
  useCreateElevator,
  useUpdateElevator,
  useDeleteElevator,
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

import { Plus, Pencil, Trash2, ArrowUpSquare, Download, X, ChevronDown, ChevronUp, ChevronRight, Building as BuildingIcon, Users, Layers, SlidersHorizontal, Check, ChevronsUpDown, AlertTriangle, Info, CalendarDays, ClipboardList } from "lucide-react";
import { FilterCombobox } from "@/components/filter-combobox";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { fireCompletionConfetti } from "@/lib/confetti";

function isValidDateStr(value: string | undefined): boolean {
  if (!value) return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year  = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day   = parseInt(match[3], 10);
  if (year < 1900 || year > 2200) return false;
  if (month < 1   || month > 12)  return false;
  if (day < 1     || day > 31)    return false;
  return dayjs(value, "YYYY-MM-DD", true).isValid();
}

const elevatorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  internalId: z.string().optional(),
  stateId: z.string().optional(),
  buildingId: z.coerce.number().min(1, "Building is required"),
  description: z.string().optional(),
  bank: z.string().optional(),
  type: z.enum(["traction", "hydraulic", "other"] as const),
});

type ElevatorFormValues = z.infer<typeof elevatorSchema>;

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
const AGING_BUCKET_OPTIONS = [
  { value: "due-future",    label: "Future (90+ Days)" },
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

function getAgingDays(due: string | null | undefined): number | null {
  if (!due) return null;
  return dayjs().startOf("day").diff(dayjs(due).startOf("day"), "day");
}

function getAgingBucketValue(due: string | null | undefined): string | null {
  const days = getAgingDays(due);
  if (days === null) return null;
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
  return "due-future";
}

function AgingBucketPill({ due }: { due: string | null | undefined }) {
  const bucket = getAgingBucketValue(due);
  if (!bucket) return <span className="text-zinc-300 text-xs">—</span>;
  const label = AGING_BUCKET_OPTIONS.find(b => b.value === bucket)?.label ?? "—";
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
  const [selectedTypes,       setSelectedTypes]       = useState<string[]>([]);
  const [selectedBanks,       setSelectedBanks]       = useState<string[]>([]);
  const [selectedElevatorIds, setSelectedElevatorIds] = useState<string[]>([]);
  const [selectedInspTypes,   setSelectedInspTypes]   = useState<string[]>([]);
  const [filterDueMonths,     setFilterDueMonths]     = useState<string[]>([]);
  const [filterDueYears,      setFilterDueYears]      = useState<string[]>([]);
  const [filterAgingBuckets,  setFilterAgingBuckets]  = useState<string[]>([]);
  const [selectedStatuses,    setSelectedStatuses]    = useState<string[]>([]);

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [lastInspFrom,    setLastInspFrom]    = useState("");
  const [lastInspTo,      setLastInspTo]      = useState("");
  const [nextDueFrom,     setNextDueFrom]     = useState("");
  const [nextDueTo,       setNextDueTo]       = useState("");
  const [scheduledFrom,   setScheduledFrom]   = useState("");
  const [scheduledTo,     setScheduledTo]     = useState("");

  const clearDateFilters = useCallback(() => {
    setLastInspFrom(""); setLastInspTo("");
    setNextDueFrom(""); setNextDueTo("");
    setScheduledFrom(""); setScheduledTo("");
  }, []);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingElevator, setEditingElevator] = useState<Elevator | null>(null);
  const [formCustomerId, setFormCustomerId] = useState<string>("all");
  const [formCustomerOpen, setFormCustomerOpen] = useState(false);
  const [formBuildingOpen, setFormBuildingOpen] = useState(false);

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

  // Banks cascade: from elevators matching selected customers + buildings
  const bankFilterOptions = useMemo(() => {
    let src = elevators ?? [];
    if (selectedCustomerIds.length > 0) src = src.filter(e => selectedCustomerIds.includes(String(e.customerId)));
    if (selectedBuildingIds.length > 0) src = src.filter(e => selectedBuildingIds.includes(String(e.buildingId)));
    const banks = Array.from(new Set(src.map(e => e.bank).filter(Boolean) as string[])).sort();
    return banks.map(b => ({ value: b, label: b }));
  }, [elevators, selectedCustomerIds, selectedBuildingIds]);

  // Elevator filter options cascade from customer + building + bank selections
  const elevatorFilterOptions = useMemo(() => {
    let src = elevators ?? [];
    if (selectedCustomerIds.length > 0) src = src.filter(e => selectedCustomerIds.includes(String(e.customerId)));
    if (selectedBuildingIds.length > 0) src = src.filter(e => selectedBuildingIds.includes(String(e.buildingId)));
    if (selectedBanks.length > 0)       src = src.filter(e => selectedBanks.includes(e.bank ?? ""));
    return [...src]
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
      .map(el => ({ value: el.id.toString(), label: el.name + (el.buildingName ? ` – ${el.buildingName}` : "") }));
  }, [elevators, selectedCustomerIds, selectedBuildingIds, selectedBanks]);
  const MONTH_OPTIONS = [
    { value: "01", label: "January" }, { value: "02", label: "February" },
    { value: "03", label: "March" },   { value: "04", label: "April" },
    { value: "05", label: "May" },     { value: "06", label: "June" },
    { value: "07", label: "July" },    { value: "08", label: "August" },
    { value: "09", label: "September"},{ value: "10", label: "October" },
    { value: "11", label: "November" },{ value: "12", label: "December" },
  ];

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

  // Map: elevatorId → lastInspectionDate from the same top-one record in latestInspByElevator.
  // Uses identical selection logic so the filter and the column always agree.
  const lastCompletedByElevator = useMemo(() => {
    const map = new Map<number, string>();
    for (const [elevatorId, insp] of latestInspByElevator.entries()) {
      if (insp.lastInspectionDate) {
        map.set(elevatorId, insp.lastInspectionDate.slice(0, 10));
      }
    }
    return map;
  }, [latestInspByElevator]);

  // Derive available years from the displayed next-due date per elevator (matches what the column and filters show)
  const dueYearOptions = useMemo(() => {
    const years = new Set<string>();
    for (const insp of latestInspByElevator.values()) {
      if (insp.nextDueDate) years.add(insp.nextDueDate.slice(0, 4));
    }
    return Array.from(years).sort();
  }, [latestInspByElevator]);

  const yearFilterOptions = useMemo(() =>
    dueYearOptions.map((y) => ({ value: y, label: y })),
    [dueYearOptions]);

  // Client-side multi-select filtering
  const filteredElevators = useMemo(() => {
    return (elevators ?? []).filter((el) => {
      if (selectedCustomerIds.length > 0 && !selectedCustomerIds.includes(String(el.customerId))) return false;
      if (selectedBuildingIds.length > 0 && !selectedBuildingIds.includes(String(el.buildingId))) return false;
      if (selectedBanks.length > 0       && !selectedBanks.includes(el.bank ?? ""))               return false;
      if (selectedElevatorIds.length > 0 && !selectedElevatorIds.includes(el.id.toString()))       return false;
      if (selectedTypes.length > 0       && !selectedTypes.includes(el.type ?? ""))                return false;

      const rowInsp = latestInspByElevator.get(el.id);
      const rowDue  = rowInsp?.nextDueDate?.slice(0, 10);

      if (filterDueYears.length > 0  && (!rowDue || !filterDueYears.includes(rowDue.slice(0, 4))))   return false;
      if (filterDueMonths.length > 0 && (!rowDue || !filterDueMonths.includes(rowDue.slice(5, 7))))  return false;
      if (selectedInspTypes.length > 0 && (!rowInsp || !selectedInspTypes.includes(rowInsp.inspectionType))) return false;
      if (filterAgingBuckets.length > 0 && !filterAgingBuckets.includes(getAgingBucketValue(rowDue) ?? ""))  return false;
      if (selectedStatuses.length > 0) {
        const trueStatus = rowInsp ? ((rowInsp as any).trueStatus ?? rowInsp.status) : "NOT_STARTED";
        if (!selectedStatuses.includes(trueStatus)) return false;
      }

      // Date range filters
      const lastInsp = lastCompletedByElevator.get(el.id) ?? null;
      const rowSched = rowInsp?.scheduledDate?.slice(0, 10) ?? null;
      if (lastInspFrom && (!lastInsp || lastInsp < lastInspFrom)) return false;
      if (lastInspTo   && (!lastInsp || lastInsp > lastInspTo))   return false;
      if (nextDueFrom  && (!rowDue   || rowDue   < nextDueFrom))  return false;
      if (nextDueTo    && (!rowDue   || rowDue   > nextDueTo))    return false;
      if (scheduledFrom && (!rowSched || rowSched < scheduledFrom)) return false;
      if (scheduledTo   && (!rowSched || rowSched > scheduledTo))   return false;

      return true;
    });
  }, [elevators, selectedCustomerIds, selectedBuildingIds, selectedBanks, selectedElevatorIds, selectedTypes, latestInspByElevator, lastCompletedByElevator, filterDueMonths, filterDueYears, selectedInspTypes, filterAgingBuckets, selectedStatuses, lastInspFrom, lastInspTo, nextDueFrom, nextDueTo, scheduledFrom, scheduledTo]);

  // Group filtered elevators: customer → building → bank → elevator[]
  const grouped = useMemo(() => {
    type ElevatorItem = NonNullable<typeof filteredElevators>[number];
    type BankGroup = { bankName: string; elevators: ElevatorItem[] };
    type BuildingGroup = { buildingId: number; buildingName: string; banks: BankGroup[] };
    type CustomerGroup = { customerId: number; customerName: string; buildings: BuildingGroup[] };
    type BuildingEntry = { buildingName: string; bankMap: Map<string, ElevatorItem[]> };
    const customerMap = new Map<number, { customerName: string; buildingMap: Map<number, BuildingEntry> }>();
    for (const el of filteredElevators ?? []) {
      if (!customerMap.has(el.customerId)) {
        customerMap.set(el.customerId, { customerName: el.customerName ?? "Unknown", buildingMap: new Map() });
      }
      const cust = customerMap.get(el.customerId)!;
      if (!cust.buildingMap.has(el.buildingId)) {
        cust.buildingMap.set(el.buildingId, { buildingName: el.buildingName ?? "Unknown", bankMap: new Map() });
      }
      const bldg = cust.buildingMap.get(el.buildingId)!;
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

  const createMutation = useCreateElevator();
  const updateMutation = useUpdateElevator();
  const deleteMutation = useDeleteElevator();

  const createInspMutation = useCreateInspection();
  const updateInspMutation = useUpdateInspection();
  const deleteInspMutation = useDeleteInspection();

  const form = useForm<ElevatorFormValues>({
    resolver: zodResolver(elevatorSchema),
    defaultValues: { name: "", internalId: "", stateId: "", buildingId: 0, description: "", bank: "", type: "traction" },
  });

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
        { id: editingInspection.id, data: payload },
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
        { data: payload },
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
    let elevatorId: number;

    if (editingElevator) {
      elevatorId = editingElevator.id;
    } else {
      const isValid = await form.trigger();
      if (!isValid) return;
      const raw = form.getValues();
      const elevatorData = {
        ...raw,
        buildingId: Number(raw.buildingId),
      };
      try {
        const created = await createMutation.mutateAsync({ data: elevatorData });
        queryClient.invalidateQueries({ queryKey: getListElevatorsQueryKey() });
        elevatorId = (created as any).id;
      } catch {
        toast({ title: "Failed to create elevator", variant: "destructive" });
        return;
      }
    }

    const [cat1Valid, cat5Valid] = await Promise.all([inspForm.trigger(), inspCat5Form.trigger()]);
    if (!cat1Valid || !cat5Valid) return;
    const cat1Data = inspForm.getValues();
    const cat5Data = inspCat5Form.getValues();
    try {
      const [cat1Result, cat5Result]: any[] = await Promise.all([
        createInspMutation.mutateAsync({ data: { ...cat1Data, elevatorId, recurrenceYears: Number(cat1Data.recurrenceYears), lastInspectionDate: cat1Data.lastInspectionDate || undefined, scheduledDate: cat1Data.scheduledDate || undefined, completionDate: cat1Data.completionDate || undefined } }),
        createInspMutation.mutateAsync({ data: { ...cat5Data, elevatorId, recurrenceYears: Number(cat5Data.recurrenceYears), lastInspectionDate: cat5Data.lastInspectionDate || undefined, scheduledDate: cat5Data.scheduledDate || undefined, completionDate: cat5Data.completionDate || undefined } }),
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

  const onSubmit = (data: ElevatorFormValues) => {
    if (editingElevator) {
      updateMutation.mutate(
        { id: editingElevator.id, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListElevatorsQueryKey() });
            setEditingElevator(null);
            setIsAddOpen(false);
            form.reset();
            toast({ title: "Unit updated successfully" });
          },
          onError: () => {
            toast({ title: "Failed to update elevator", variant: "destructive" });
          },
        }
      );
    } else {
      createMutation.mutate(
        { data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListElevatorsQueryKey() });
            setIsAddOpen(false);
            form.reset();
            toast({ title: "Unit added successfully" });
          },
          onError: () => {
            toast({ title: "Failed to add elevator", variant: "destructive" });
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
          queryClient.invalidateQueries({ queryKey: getListElevatorsQueryKey() });
          toast({ title: "Unit deleted successfully" });
          setDeleteId(null);
        },
        onError: () => {
          toast({ title: "Failed to delete elevator", variant: "destructive" });
          setDeleteId(null);
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
  };

  const openEdit = (elevator: Elevator) => {
    setEditingElevator(elevator);
    setFormCustomerId(elevator.customerId ? elevator.customerId.toString() : "all");
    form.reset({
      name: elevator.name,
      internalId: elevator.internalId || "",
      stateId: elevator.stateId || "",
      buildingId: elevator.buildingId,
      description: elevator.description || "",
      bank: elevator.bank || "",
      type: elevator.type,
    });
    // Pre-load the most actionable inspection for this elevator
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

  const elevatorFormFields = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        {/* ── Step 1: Customer picker (local state, not a form field) ── */}
        <div className="space-y-2">
          <p className="text-sm font-medium leading-none">Customer</p>
          <Popover open={formCustomerOpen} onOpenChange={setFormCustomerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                className={cn(
                  "w-full justify-between font-normal",
                  formCustomerId === "all" && "text-muted-foreground"
                )}
              >
                <span className="truncate">
                  {formCustomerId === "all"
                    ? "Select a customer…"
                    : (customers?.find((c) => c.id.toString() === formCustomerId)?.name ?? "Select a customer…")}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
              <Command>
                <CommandInput placeholder="Search customers…" className="h-9" />
                <CommandList>
                  <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">No customers found.</CommandEmpty>
                  <CommandGroup>
                    {customers?.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={c.name}
                        onSelect={() => {
                          setFormCustomerId(c.id.toString());
                          form.setValue("buildingId", 0);
                          setFormCustomerOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", formCustomerId === c.id.toString() ? "opacity-100" : "opacity-0")} />
                        {c.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* ── Step 2: Building picker (RHF field, filtered by selected customer) ── */}
        <div className="space-y-2">
          <FormField
            control={form.control}
            name="buildingId"
            render={({ field }) => {
              const filteredBuildings = (allBuildings ?? []).filter(
                (b) => formCustomerId === "all" || b.customerId === Number(formCustomerId)
              );
              const selectedBuilding = (allBuildings ?? []).find((b) => b.id === field.value);
              return (
                <FormItem>
                  <FormLabel>Building</FormLabel>
                  <Popover open={formBuildingOpen} onOpenChange={setFormBuildingOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          disabled={formCustomerId === "all"}
                          className={cn(
                            "w-full justify-between font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <span className="truncate">
                            {selectedBuilding ? selectedBuilding.name : (formCustomerId === "all" ? "Select a customer first" : "Select a building…")}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                      <Command>
                        <CommandInput placeholder="Search buildings…" className="h-9" />
                        <CommandList>
                          <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">No buildings found.</CommandEmpty>
                          <CommandGroup>
                            {filteredBuildings.map((b) => (
                              <CommandItem
                                key={b.id}
                                value={b.name}
                                onSelect={() => {
                                  field.onChange(b.id);
                                  setFormBuildingOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", field.value === b.id ? "opacity-100" : "opacity-0")} />
                                {b.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>

        <div className="space-y-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Main Lobby Elevator" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="internalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit ID</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. PE-1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State ID</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. NY-12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="traction">Traction</SelectItem>
                      <SelectItem value="hydraulic">Hydraulic</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bank"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank / Group</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. High Rise" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-3">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description <span className="font-normal text-muted-foreground">(Optional)</span></FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Additional details about this unit..."
                    className="resize-none h-20"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-900 font-semibold"
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {(createMutation.isPending || updateMutation.isPending) ? "Saving…" : editingElevator ? "Save Changes" : "Add Unit"}
        </Button>
      </form>
    </Form>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Current Inspections by Unit</h1>
          <p className="mt-2 mb-4 text-sm text-zinc-500 leading-snug">Keeps all current open inspections front and center.<br />Once completed, inspection records move automatically to <span className="font-medium text-zinc-600">Inspection History</span> for tracking.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) {
              form.reset({ name: "", internalId: "", stateId: "", buildingId: 0, description: "", bank: "", type: "traction" });
              setEditingElevator(null);
              resetInspForm();
              setFormCustomerId("all");
              setFormCustomerOpen(false);
              setFormBuildingOpen(false);
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingElevator(null);
                resetInspForm();
                setFormCustomerId("all");
                form.reset({ name: "", internalId: "", stateId: "", buildingId: 0, description: "", bank: "", type: "traction" });
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Add New Unit
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
              <DialogHeader className="pb-2 border-b">
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                    <ArrowUpSquare className="h-4 w-4" />
                  </span>
                  {editingElevator ? editingElevator.name : "Add New Unit"}
                </DialogTitle>
                {editingElevator ? (
                  <p className="text-sm text-muted-foreground pl-10">{editingElevator.buildingName} · {editingElevator.customerName}</p>
                ) : (
                  <div className="mt-1 flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40 px-3 py-2">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400" />
                    <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                      Complete the unit details on the <span className="font-semibold">Unit Details</span> tab, then switch to the <span className="font-semibold">New Inspection</span> tab to seed the system with the initial CAT 1 and CAT 5 inspection records for this unit.
                    </p>
                  </div>
                )}
              </DialogHeader>

              <Tabs key={editingElevator ? `edit-${editingElevator.id}` : "add"} defaultValue={editingElevator ? "inspection" : "unit"} className="pt-2">
                  <TabsList className="w-full mb-4">
                    <TabsTrigger value="unit" className="flex-1">Unit Details</TabsTrigger>
                    <TabsTrigger value="inspection" className="flex-1">
                      {editingInspection ? "Current Inspection" : "New Inspection"}
                    </TabsTrigger>
                  </TabsList>

                  {/* ── Tab 1: Unit Details ── */}
                  <TabsContent value="unit">
                    {elevatorFormFields}
                  </TabsContent>

                  {/* ── Tab 2: Inspection ── */}
                  <TabsContent value="inspection">
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
                  </TabsContent>
                </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Filters ── */}
      {(() => {
        const hasDateFilters = !!(lastInspFrom || lastInspTo || nextDueFrom || nextDueTo || scheduledFrom || scheduledTo);
        const activeFilterCount = [selectedCustomerIds, selectedBuildingIds, selectedBanks, selectedElevatorIds, selectedTypes, selectedInspTypes, filterDueMonths, filterDueYears, selectedStatuses, filterAgingBuckets].filter(v => v.length > 0).length + (hasDateFilters ? 1 : 0);
        const advancedFilterCount = [selectedBanks, selectedElevatorIds, selectedTypes, selectedInspTypes, filterDueMonths].filter(v => v.length > 0).length + (hasDateFilters ? 1 : 0);
        const clearAll = () => { setSelectedCustomerIds([]); setSelectedBuildingIds([]); setSelectedBanks([]); setSelectedElevatorIds([]); setSelectedTypes([]); setSelectedInspTypes([]); setFilterDueMonths([]); setFilterDueYears([]); setFilterAgingBuckets([]); setSelectedStatuses([]); clearDateFilters(); };
        const clearAdvancedFilters = () => { setSelectedBanks([]); setSelectedElevatorIds([]); setSelectedTypes([]); setSelectedInspTypes([]); setFilterDueMonths([]); clearDateFilters(); };
        const unitTypeOpts = [
          { value: "traction",  label: "Traction" },
          { value: "hydraulic", label: "Hydraulic" },
          { value: "other",     label: "Other" },
        ];
        const inspTypeOpts = [
          { value: "CAT1", label: "CAT 1" },
          { value: "CAT5", label: "CAT 5" },
        ];
        const statusOpts = [
          { value: "NOT_STARTED", label: "Not Scheduled" },
          { value: "SCHEDULED",   label: "Scheduled" },
          { value: "IN_PROGRESS", label: "In Progress" },
        ];
        const chipLabel = (arr: string[], opts: {value:string;label:string}[], single: string) =>
          arr.length === 1 ? (opts.find(o => o.value === arr[0])?.label ?? arr[0]) : `${arr.length} ${single}`;
        const activeChips: { label: string; value: string; onRemove: () => void }[] = [];
        if (selectedCustomerIds.length > 0) activeChips.push({ label: "Customer", value: chipLabel(selectedCustomerIds, customerOptions, "customers"), onRemove: () => { setSelectedCustomerIds([]); setSelectedBuildingIds([]); setSelectedBanks([]); setSelectedElevatorIds([]); } });
        if (selectedBuildingIds.length > 0) activeChips.push({ label: "Building", value: chipLabel(selectedBuildingIds, buildingOptions, "buildings"), onRemove: () => { setSelectedBuildingIds([]); setSelectedBanks([]); setSelectedElevatorIds([]); } });
        if (selectedBanks.length > 0)       activeChips.push({ label: "Bank",      value: chipLabel(selectedBanks, bankFilterOptions, "banks"),   onRemove: () => { setSelectedBanks([]); setSelectedElevatorIds([]); } });
        if (selectedElevatorIds.length > 0) activeChips.push({ label: "Elevator",  value: chipLabel(selectedElevatorIds, elevatorFilterOptions, "elevators"), onRemove: () => setSelectedElevatorIds([]) });
        if (selectedTypes.length > 0)       activeChips.push({ label: "Unit Type", value: chipLabel(selectedTypes, unitTypeOpts, "types"),         onRemove: () => setSelectedTypes([]) });
        if (selectedInspTypes.length > 0)   activeChips.push({ label: "Insp Type", value: chipLabel(selectedInspTypes, inspTypeOpts, "types"),     onRemove: () => setSelectedInspTypes([]) });
        if (filterDueMonths.length > 0)     activeChips.push({ label: "Due Month", value: chipLabel(filterDueMonths, MONTH_OPTIONS, "months"),     onRemove: () => setFilterDueMonths([]) });
        if (filterDueYears.length > 0)      activeChips.push({ label: "Due Year",  value: chipLabel(filterDueYears, yearFilterOptions, "years"),   onRemove: () => setFilterDueYears([]) });
        if (selectedStatuses.length > 0)    activeChips.push({ label: "Inspection Status", value: chipLabel(selectedStatuses, statusOpts, "statuses"), onRemove: () => setSelectedStatuses([]) });
        if (filterAgingBuckets.length > 0)  activeChips.push({ label: "Due Status", value: chipLabel(filterAgingBuckets, AGING_BUCKET_OPTIONS, "buckets"), onRemove: () => setFilterAgingBuckets([]) });
        if (hasDateFilters)                  activeChips.push({ label: "Date Range", value: "Active",                                                         onRemove: () => clearDateFilters() });

        return (
      <div className="flex flex-col gap-2">

        {/* ── Quick filter row (Tier 1 — single row, no-wrap) ── */}
        <div className="bg-white border border-zinc-200 rounded-lg shadow-sm">
          <div className="flex items-center gap-1.5 px-3 py-2 min-h-[48px]">

            {/* Tier 1: Customer, Building, Due Year, Insp Status, Due Status */}
            <FilterCombobox value={selectedCustomerIds} onValueChange={(val) => { setSelectedCustomerIds(val); setSelectedBuildingIds([]); setSelectedBanks([]); setSelectedElevatorIds([]); }} options={customerOptions} placeholder="All Customers" searchPlaceholder="Search customers..." width="w-[155px]" />
            <FilterCombobox value={selectedBuildingIds} onValueChange={(val) => { setSelectedBuildingIds(val); setSelectedBanks([]); setSelectedElevatorIds([]); }} options={buildingOptions} placeholder="All Buildings" searchPlaceholder="Search buildings..." width="w-[140px]" />
            <FilterCombobox value={filterDueYears} onValueChange={setFilterDueYears} options={yearFilterOptions} placeholder="Due Year" searchPlaceholder="Search years..." width="w-[115px]" />
            <FilterCombobox value={selectedStatuses} onValueChange={setSelectedStatuses} options={statusOpts} placeholder="Insp. Status" searchPlaceholder="Search statuses..." width="w-[150px]" />
            <FilterCombobox value={filterAgingBuckets} onValueChange={setFilterAgingBuckets} options={AGING_BUCKET_OPTIONS} placeholder="Due Status" searchPlaceholder="Search buckets..." width="w-[150px]" />

            <div className="h-5 w-px bg-zinc-200 mx-1 shrink-0" />

            {/* More Filters button */}
            <button
              onClick={() => setShowAdvancedFilters(v => !v)}
              className={cn(
                "h-8 px-3 flex items-center gap-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0",
                showAdvancedFilters || advancedFilterCount > 0
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-zinc-200 hover:border-zinc-300 hover:text-zinc-700 text-zinc-600"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
              More Filters
              {advancedFilterCount > 0 && (
                <span className="inline-flex items-center justify-center h-[16px] min-w-[16px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold leading-none">
                  {advancedFilterCount}
                </span>
              )}
              {showAdvancedFilters ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
            </button>

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

          {/* Active filter chips */}
          {activeChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2 pt-0 border-t border-zinc-100">
              <span className="text-xs font-medium text-zinc-400 mr-0.5 mt-2">Active:</span>
              {activeChips.map((chip) => (
                <span key={chip.label} className="inline-flex items-center gap-1 mt-2 pl-2 pr-1 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-medium text-blue-700 leading-none whitespace-nowrap">
                  <span className="text-blue-400 font-normal">{chip.label}:</span>
                  {chip.value}
                  <button onClick={chip.onRemove} className="ml-0.5 flex items-center justify-center h-[14px] w-[14px] rounded-full hover:bg-red-100 hover:text-red-500 text-blue-400 transition-colors">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Advanced filter panel (Tier 2) ── */}
        {showAdvancedFilters && (
          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm px-4 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Advanced Filters</span>
              {advancedFilterCount > 0 && (
                <button onClick={clearAdvancedFilters} className="flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-red-600 bg-zinc-100 hover:bg-red-50 border border-zinc-200 hover:border-red-200 px-2.5 py-[5px] rounded-md transition-colors">
                  <X className="h-3 w-3" /> Clear advanced
                </button>
              )}
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Location</p>
              <div className="flex flex-wrap gap-1.5">
                <FilterCombobox value={selectedBanks} onValueChange={(val) => { setSelectedBanks(val); setSelectedElevatorIds([]); }} options={bankFilterOptions} placeholder="All Banks" searchPlaceholder="Search banks..." disabled={bankFilterOptions.length === 0} width="w-[145px]" />
                <FilterCombobox value={selectedElevatorIds} onValueChange={setSelectedElevatorIds} options={elevatorFilterOptions} placeholder="All Units" searchPlaceholder="Search units..." disabled={elevatorFilterOptions.length === 0} width="w-[155px]" />
              </div>
            </div>

            {/* Inspection Details */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Inspection Details</p>
              <div className="flex flex-wrap gap-1.5">
                <FilterCombobox value={selectedTypes} onValueChange={setSelectedTypes} options={unitTypeOpts} placeholder="All Unit Types" searchPlaceholder="Search unit types..." width="w-[165px]" />
                <FilterCombobox value={selectedInspTypes} onValueChange={setSelectedInspTypes} options={inspTypeOpts} placeholder="All Insp Types" searchPlaceholder="Search insp types..." width="w-[160px]" />
                <FilterCombobox value={filterDueMonths} onValueChange={setFilterDueMonths} options={MONTH_OPTIONS} placeholder="Due Month" searchPlaceholder="Search months..." width="w-[140px]" />
              </div>
            </div>

            {/* Date Ranges */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Date Ranges</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Last Inspection", from: lastInspFrom,  to: lastInspTo,   setFrom: setLastInspFrom,  setTo: setLastInspTo },
                  { label: "Next Due",        from: nextDueFrom,   to: nextDueTo,    setFrom: setNextDueFrom,   setTo: setNextDueTo },
                  { label: "Scheduled Date",  from: scheduledFrom, to: scheduledTo,  setFrom: setScheduledFrom, setTo: setScheduledTo },
                ].map(({ label, from, to, setFrom, setTo }) => (
                  <div key={label} className="space-y-1.5">
                    <p className="text-xs font-medium text-zinc-400">{label}</p>
                    <div className="flex gap-1.5 items-center">
                      <input type="date" className="h-8 text-xs border border-zinc-200 rounded-md px-2 bg-white flex-1 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 min-w-0" value={from} onChange={e => setFrom(e.target.value)} />
                      <span className="text-zinc-300 text-xs shrink-0">–</span>
                      <input type="date" className="h-8 text-xs border border-zinc-200 rounded-md px-2 bg-white flex-1 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 min-w-0" value={to} onChange={e => setTo(e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Expand/collapse depth selector */}
        {!isLoading && grouped.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <nav className="flex items-center gap-0.5">
              {([
                { key: "customers", label: "Customers", action: collapseAll },
                { key: "buildings", label: "Buildings", action: expandCustomers },
                { key: "banks",     label: "Banks",     action: expandBuildings },
                { key: "units",     label: "Units",     action: expandAll },
              ] as const).map(({ key, label, action }, i) => {
                const isActive = activeDepth === key;
                return (
                  <span key={key} className="flex items-center gap-0.5">
                    {i > 0 && (
                      <span className="text-zinc-300 text-sm select-none px-0.5">/</span>
                    )}
                    <button
                      onClick={action}
                      className={`px-1.5 py-0.5 rounded text-sm transition-colors ${
                        isActive
                          ? "text-blue-600 font-semibold"
                          : "text-zinc-400 hover:text-zinc-700 font-medium"
                      }`}
                    >
                      {label}
                    </button>
                  </span>
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
          {(selectedCustomerIds.length > 0 || selectedBuildingIds.length > 0 || selectedBanks.length > 0 || selectedTypes.length > 0 || selectedElevatorIds.length > 0 || selectedInspTypes.length > 0 || filterDueMonths.length > 0 || filterDueYears.length > 0 || filterAgingBuckets.length > 0 || selectedStatuses.length > 0 || lastInspFrom || lastInspTo || nextDueFrom || nextDueTo || scheduledFrom || scheduledTo) ? (
            <button
              onClick={() => { setSelectedCustomerIds([]); setSelectedBuildingIds([]); setSelectedBanks([]); setSelectedTypes([]); setSelectedElevatorIds([]); setSelectedInspTypes([]); setFilterDueMonths([]); setFilterDueYears([]); setFilterAgingBuckets([]); setSelectedStatuses([]); setLastInspFrom(""); setLastInspTo(""); setNextDueFrom(""); setNextDueTo(""); setScheduledFrom(""); setScheduledTo(""); }}
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
                  <div className="flex items-center gap-2 min-w-0 px-4 py-3">
                    {isCustomerCollapsed
                      ? <ChevronRight className="h-5 w-5 shrink-0 text-zinc-400" />
                      : <ChevronDown className="h-5 w-5 shrink-0 text-zinc-400" />}
                    <Users className="h-5 w-5 shrink-0 text-zinc-400" />
                    <span className="font-bold text-base tracking-tight truncate">{customer.customerName}</span>
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
                    <span className="text-sm font-semibold text-white text-center">Due Status</span>
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
                            className="w-full flex items-center gap-2 px-4 py-3 pl-8 bg-zinc-100 border-l-[3px] border-zinc-600 hover:bg-zinc-200/60 transition-colors text-left border-b border-zinc-200"
                            onClick={() => toggleBuilding(building.buildingId)}
                          >
                            {isBuildingCollapsed
                              ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                              : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />}
                            <BuildingIcon className="h-4 w-4 shrink-0 text-zinc-600" />
                            <span className="font-semibold text-sm text-zinc-800">{building.buildingName}</span>
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
                                          <div className={`flex items-center px-4 py-2.5 min-w-0 ${nameIndent}`}>
                                            <div className="font-semibold text-sm leading-snug break-words text-zinc-900" title={elevator.name}>{elevator.name}</div>
                                          </div>
                                          {/* Unit ID — reference field, de-emphasized */}
                                          <div className="flex items-center justify-center overflow-hidden px-3 py-2.5 border-l border-zinc-200">
                                            <span className="text-xs tabular-nums text-zinc-400 truncate">{elevator.internalId ?? <span className="text-zinc-300">—</span>}</span>
                                          </div>
                                          {/* State ID — reference field, de-emphasized */}
                                          <div className="flex items-center justify-center overflow-hidden px-3 py-2.5 border-l border-zinc-200">
                                            <span className="text-xs tabular-nums text-zinc-400 truncate">{elevator.stateId ?? <span className="text-zinc-300">—</span>}</span>
                                          </div>
                                          {/* Unit Type */}
                                          <div className="flex items-center justify-center overflow-hidden px-3 py-2.5 border-l border-zinc-200">
                                            <span className="text-xs font-medium text-zinc-600 capitalize truncate">{elevator.type}</span>
                                          </div>
                                          {/* Insp Type */}
                                          <div className="flex items-center justify-center overflow-hidden px-4 py-2.5 border-l border-zinc-200">
                                            {latestInsp ? (
                                              <InspectionTypeBadge type={latestInsp.inspectionType} />
                                            ) : <span className="text-zinc-400 text-xs">—</span>}
                                          </div>
                                          {/* Last Completed */}
                                          <div className="flex items-center justify-center overflow-hidden px-4 py-2.5 border-l border-zinc-200">
                                            {completionDate ? (
                                              <span className="text-xs tabular-nums truncate text-zinc-500">
                                                {new Date(completionDate + "T00:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
                                              </span>
                                            ) : <span className="text-xs text-zinc-300">—</span>}
                                          </div>
                                          {/* Next Due */}
                                          <div className="flex items-center justify-center overflow-hidden px-4 py-2.5 border-l border-zinc-200">
                                            {due ? (
                                              <span className={`text-xs tabular-nums truncate font-semibold ${isOverdue ? "text-red-600" : "text-zinc-800"}`}>
                                                {new Date(due + "T00:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
                                              </span>
                                            ) : <span className="text-xs text-zinc-300">—</span>}
                                          </div>
                                          {/* Due Status — primary attention signal */}
                                          <div className="flex items-center justify-center overflow-hidden px-3 py-2.5 border-l border-zinc-300">
                                            <AgingBucketPill due={due} />
                                          </div>
                                          {/* Status */}
                                          <div className="flex items-center justify-center overflow-hidden px-4 py-2.5 border-l border-zinc-200">
                                            {latestInsp
                                              ? <StatusBadge status={(latestInsp as any).trueStatus ?? latestInsp.status ?? "NOT_STARTED"} />
                                              : <span className="text-zinc-400 text-xs">—</span>}
                                          </div>
                                          {/* Scheduled Date */}
                                          <div className="flex items-center justify-center overflow-hidden px-4 py-2.5 border-l border-zinc-200">
                                            {scheduledDate ? (
                                              <span className="text-xs tabular-nums truncate text-zinc-600">
                                                {new Date(scheduledDate + "T00:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
                                              </span>
                                            ) : <span className="text-xs text-zinc-300">—</span>}
                                          </div>
                                          {/* Actions — 100px */}
                                          <div className="flex items-center justify-center border-l border-zinc-200 gap-0.5">
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { openEdit(elevator); setIsAddOpen(true); }}>
                                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                                  </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Edit</TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(elevator.id)} disabled={deleteMutation.isPending}>
                                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                                  </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Delete</TooltipContent>
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

      {/* Elevator delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Unit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this elevator? This action cannot be undone and will also remove all associated inspection records.
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
