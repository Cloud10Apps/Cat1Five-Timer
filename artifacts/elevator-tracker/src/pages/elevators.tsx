import { useState, useEffect, useMemo, useRef } from "react";
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

import { Plus, Search, Pencil, Trash2, ArrowUpSquare, Download, X, CalendarDays, ChevronDown, ChevronRight, Building as BuildingIcon, Users, Layers } from "lucide-react";
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
import { useDebounce } from "@/hooks/use-debounce";
import { StatusBadge } from "@/components/status-badge";
import { InspectionTypeBadge } from "@/components/inspection-type-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export default function Elevators() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("all");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedBank, setSelectedBank] = useState<string>("all");
  const [filterDueMonth, setFilterDueMonth] = useState<string>("all");
  const [filterDueYear,  setFilterDueYear]  = useState<string>("all");
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

  const customerIdFilter = selectedCustomerId !== "all" ? Number(selectedCustomerId) : undefined;
  const buildingIdFilter = selectedBuildingId !== "all" ? Number(selectedBuildingId) : undefined;
  const typeFilter = selectedType !== "all" ? (selectedType as "traction" | "hydraulic" | "other") : undefined;
  const bankFilter = selectedBank !== "all" ? selectedBank : undefined;

  const { data: elevators, isLoading } = useListElevators(
    { 
      search: debouncedSearch || undefined, 
      customerId: customerIdFilter,
      buildingId: buildingIdFilter,
      type: typeFilter,
      bank: bankFilter,
    },
    { query: { queryKey: getListElevatorsQueryKey({ 
      search: debouncedSearch || undefined, 
      customerId: customerIdFilter,
      buildingId: buildingIdFilter,
      type: typeFilter,
      bank: bankFilter,
    }) } }
  );

  const { data: elevatorsForBankOptions } = useListElevators(
    { customerId: customerIdFilter, buildingId: buildingIdFilter, type: typeFilter },
    { query: { queryKey: getListElevatorsQueryKey({ customerId: customerIdFilter, buildingId: buildingIdFilter, type: typeFilter }) } }
  );
  const bankOptions = Array.from(
    new Set((elevatorsForBankOptions ?? []).map((e) => e.bank).filter(Boolean) as string[])
  ).sort();

  const { data: customers } = useListCustomers({}, { query: { queryKey: getListCustomersQueryKey({}) } });
  const { data: buildings } = useListBuildings(
    { customerId: customerIdFilter }, 
    { query: { queryKey: getListBuildingsQueryKey({ customerId: customerIdFilter }) } }
  );

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
  // Among OPEN (non-COMPLETED): earliest due year → CAT5 before CAT1 → earliest due date
  // Falls back to best COMPLETED inspection if no open ones exist for the elevator
  const latestInspByElevator = useMemo(() => {
    const TYPE_PRIORITY: Record<string, number> = { CAT5: 0, CAT1: 1 };
    const isOpen = (insp: Inspection) => insp.status !== "COMPLETED";

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

  // Map: elevatorId → most recent lastInspectionDate across all inspections
  const lastCompletedByElevator = useMemo(() => {
    const map = new Map<number, string>();
    for (const insp of allInspections ?? []) {
      if (!insp.elevatorId || !insp.lastInspectionDate) continue;
      const current = map.get(insp.elevatorId);
      if (!current || insp.lastInspectionDate > current) {
        map.set(insp.elevatorId, insp.lastInspectionDate.slice(0, 10));
      }
    }
    return map;
  }, [allInspections]);

  // Map: elevatorId → latest nextDueDate (YYYY-MM-DD string)
  const nextDueDateByElevator = useMemo(() => {
    const map = new Map<number, string>();
    for (const insp of allInspections ?? []) {
      if (!insp.elevatorId || !insp.nextDueDate) continue;
      const current = map.get(insp.elevatorId);
      if (!current || insp.nextDueDate > current) {
        map.set(insp.elevatorId, insp.nextDueDate.slice(0, 10));
      }
    }
    return map;
  }, [allInspections]);

  // Derive available years from actual next-due dates
  const dueYearOptions = useMemo(() => {
    const years = new Set<string>();
    for (const d of nextDueDateByElevator.values()) years.add(d.slice(0, 4));
    return Array.from(years).sort();
  }, [nextDueDateByElevator]);

  // Client-side filter by due month / year
  const filteredElevators = useMemo(() => {
    if (filterDueMonth === "all" && filterDueYear === "all") return elevators;
    return (elevators ?? []).filter((el) => {
      const due = nextDueDateByElevator.get(el.id);
      if (!due) return false;
      if (filterDueYear  !== "all" && due.slice(0, 4) !== filterDueYear)  return false;
      if (filterDueMonth !== "all" && due.slice(5, 7) !== filterDueMonth) return false;
      return true;
    });
  }, [elevators, nextDueDateByElevator, filterDueMonth, filterDueYear]);

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
      b.banks.filter(bk => bk.bankName !== "").map(bk => `${b.buildingId}::${bk.bankName}`)
    )
  ), [grouped]);

  const collapseAll    = () => { setCollapsedCustomers(new Set(allCustomerIds)); setCollapsedBuildings(new Set(allBuildingIds)); setCollapsedBanks(new Set(allBankKeys)); };
  const expandCustomers = () => { setCollapsedCustomers(new Set()); setCollapsedBuildings(new Set(allBuildingIds)); setCollapsedBanks(new Set(allBankKeys)); };
  const expandBuildings = () => { setCollapsedCustomers(new Set()); setCollapsedBuildings(new Set()); setCollapsedBanks(new Set(allBankKeys)); };
  const expandAll      = () => { setCollapsedCustomers(new Set()); setCollapsedBuildings(new Set()); setCollapsedBanks(new Set()); };

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
          onSuccess: () => {
            invalidateInspections();
            toast({ title: "Inspection saved" });
            setIsAddOpen(false);
          },
          onError: () => toast({ title: "Failed to save inspection", variant: "destructive" }),
        }
      );
    } else {
      createInspMutation.mutate(
        { data: payload },
        {
          onSuccess: (created) => {
            invalidateInspections();
            toast({ title: "Inspection created" });
            if (created && (created as any).id) setEditingInspection(created as Inspection);
          },
          onError: () => toast({ title: "Failed to create inspection", variant: "destructive" }),
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

    const cat1Data = inspForm.getValues();
    const cat5Data = inspCat5Form.getValues();
    try {
      await Promise.all([
        createInspMutation.mutateAsync({ data: { ...cat1Data, elevatorId, lastInspectionDate: cat1Data.lastInspectionDate || undefined, scheduledDate: cat1Data.scheduledDate || undefined, completionDate: cat1Data.completionDate || undefined } }),
        createInspMutation.mutateAsync({ data: { ...cat5Data, elevatorId, lastInspectionDate: cat5Data.lastInspectionDate || undefined, scheduledDate: cat5Data.scheduledDate || undefined, completionDate: cat5Data.completionDate || undefined } }),
      ]);
      queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey() });
      if (editingElevator) queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey({ elevatorId }), exact: false });
      toast({ title: editingElevator ? "Both inspections created" : "Unit and inspections created" });
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
            toast({ title: "Elevator updated successfully" });
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
            toast({ title: "Elevator added successfully" });
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
          toast({ title: "Elevator deleted successfully" });
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
    if (customerIdFilter) params.append("customerId", customerIdFilter.toString());
    if (buildingIdFilter) params.append("buildingId", buildingIdFilter.toString());

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

        <div className="space-y-3">
          <FormField
            control={form.control}
            name="buildingId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Building</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value ? field.value.toString() : ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a building" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {buildings?.map((building) => (
                      <SelectItem key={building.id} value={building.id.toString()}>
                        {building.name}
                        <span className="ml-1.5 text-muted-foreground">({building.customerName})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Elevator Name</FormLabel>
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
          <h1 className="text-3xl font-bold tracking-tight">Elevators</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl leading-relaxed italic">
            Set up new elevator units, add initial inspection records, and keep statuses current &mdash; so your compliance data stays accurate from day one.
          </p>
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
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingElevator(null);
                resetInspForm();
                form.reset({ name: "", internalId: "", stateId: "", buildingId: 0, description: "", bank: "", type: "traction" });
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Elevator
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader className="pb-2 border-b">
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                    <ArrowUpSquare className="h-4 w-4" />
                  </span>
                  {editingElevator ? editingElevator.name : "Add New Unit"}
                </DialogTitle>
                {editingElevator && (
                  <p className="text-sm text-muted-foreground pl-10">{editingElevator.buildingName} · {editingElevator.customerName}</p>
                )}
              </DialogHeader>

              <Tabs defaultValue="unit" className="pt-2">
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
                        <form onSubmit={inspForm.handleSubmit(onSubmitInsp)} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField control={inspForm.control} name="inspectionType" render={({ field }) => (
                              <FormItem><FormLabel>Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="CAT1">CAT1 (Annual)</SelectItem>
                                    <SelectItem value="CAT5">CAT5 (5-Year)</SelectItem>
                                  </SelectContent>
                                </Select><FormMessage /></FormItem>
                            )} />
                            <FormField control={inspForm.control} name="status" render={({ field }) => (
                              <FormItem><FormLabel>Status</FormLabel>
                                <Select value={field.value} onValueChange={(val) => { field.onChange(val); if (val === "SCHEDULED") { inspForm.setValue("scheduledDate", dayjs().format("YYYY-MM-DD")); inspForm.setValue("completionDate", ""); } else if (val === "COMPLETED") { inspForm.setValue("completionDate", dayjs().format("YYYY-MM-DD")); } else { inspForm.setValue("completionDate", ""); } }}>
                                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                    <SelectItem value="COMPLETED">Completed</SelectItem>
                                  </SelectContent>
                                </Select><FormMessage /></FormItem>
                            )} />
                            <FormField control={inspForm.control} name="lastInspectionDate" render={({ field }) => (
                              <FormItem><FormLabel>Last Inspection Date</FormLabel>
                                <FormControl><DatePickerField value={field.value} onChange={field.onChange} placeholder="Pick a date" /></FormControl>
                                <FormMessage /></FormItem>
                            )} />
                            <FormField control={inspForm.control} name="recurrenceYears" render={({ field }) => (
                              <FormItem><FormLabel>Recurrence (Years)</FormLabel>
                                <FormControl><Input type="number" min="1" {...field} /></FormControl>
                                <FormMessage /></FormItem>
                            )} />
                            {nextDuePreview && (
                              <div className="col-span-2 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">
                                Calculated Next Due:&nbsp;<strong>{nextDuePreview}</strong>
                              </div>
                            )}
                            <FormField control={inspForm.control} name="scheduledDate" render={({ field }) => (
                              <FormItem><FormLabel>Scheduled Date <span className="font-normal text-muted-foreground">(Optional)</span></FormLabel>
                                <FormControl><DatePickerField value={field.value} onChange={field.onChange} placeholder="Pick a date" /></FormControl>
                                <FormMessage /></FormItem>
                            )} />
                            <FormField control={inspForm.control} name="completionDate" render={({ field }) => (
                              <FormItem><FormLabel>Completion Date <span className="font-normal text-muted-foreground">(Optional)</span></FormLabel>
                                <FormControl><DatePickerField value={field.value} onChange={field.onChange} placeholder="Pick a date" /></FormControl>
                                <FormMessage /></FormItem>
                            )} />
                          </div>
                          <FormField control={inspForm.control} name="notes" render={({ field }) => (
                            <FormItem><FormLabel>Notes</FormLabel>
                              <FormControl><Textarea placeholder="Inspector notes, compliance details..." className="resize-none h-20" {...field} /></FormControl>
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
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-white tracking-wide">CAT1</span>
                            <span className="text-sm font-medium text-zinc-700">Annual Inspection</span>
                          </div>
                          <Form {...inspForm}>
                            <div className="grid grid-cols-2 gap-4">
                              <FormField control={inspForm.control} name="status" render={({ field }) => (
                                <FormItem><FormLabel>Status</FormLabel>
                                  <Select value={field.value} onValueChange={(val) => { field.onChange(val); if (val === "SCHEDULED") { inspForm.setValue("scheduledDate", dayjs().format("YYYY-MM-DD")); inspForm.setValue("completionDate", ""); } else if (val === "COMPLETED") { inspForm.setValue("completionDate", dayjs().format("YYYY-MM-DD")); } else { inspForm.setValue("completionDate", ""); } }}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                                      <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                      <SelectItem value="COMPLETED">Completed</SelectItem>
                                    </SelectContent>
                                  </Select><FormMessage /></FormItem>
                              )} />
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
                              <FormField control={inspForm.control} name="scheduledDate" render={({ field }) => (
                                <FormItem><FormLabel>Scheduled Date <span className="font-normal text-muted-foreground">(Optional)</span></FormLabel>
                                  <FormControl><DatePickerField value={field.value} onChange={field.onChange} placeholder="Pick a date" /></FormControl>
                                  <FormMessage /></FormItem>
                              )} />
                              {nextDuePreview && (
                                <div className="col-span-2 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">
                                  Calculated Next Due:&nbsp;<strong>{nextDuePreview}</strong>
                                </div>
                              )}
                            </div>
                          </Form>
                        </div>

                        {/* CAT5 section */}
                        <div className="rounded-lg border border-yellow-300 p-4 space-y-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-400 text-zinc-900 tracking-wide">CAT5</span>
                            <span className="text-sm font-medium text-zinc-700">5-Year Inspection</span>
                          </div>
                          <Form {...inspCat5Form}>
                            <div className="grid grid-cols-2 gap-4">
                              <FormField control={inspCat5Form.control} name="status" render={({ field }) => (
                                <FormItem><FormLabel>Status</FormLabel>
                                  <Select value={field.value} onValueChange={(val) => { field.onChange(val); if (val === "SCHEDULED") { inspCat5Form.setValue("scheduledDate", dayjs().format("YYYY-MM-DD")); inspCat5Form.setValue("completionDate", ""); } else if (val === "COMPLETED") { inspCat5Form.setValue("completionDate", dayjs().format("YYYY-MM-DD")); } else { inspCat5Form.setValue("completionDate", ""); } }}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                                      <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                      <SelectItem value="COMPLETED">Completed</SelectItem>
                                    </SelectContent>
                                  </Select><FormMessage /></FormItem>
                              )} />
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
                              <FormField control={inspCat5Form.control} name="scheduledDate" render={({ field }) => (
                                <FormItem><FormLabel>Scheduled Date <span className="font-normal text-muted-foreground">(Optional)</span></FormLabel>
                                  <FormControl><DatePickerField value={field.value} onChange={field.onChange} placeholder="Pick a date" /></FormControl>
                                  <FormMessage /></FormItem>
                              )} />
                              {nextDuePreviewCat5 && (
                                <div className="col-span-2 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">
                                  Calculated Next Due:&nbsp;<strong>{nextDuePreviewCat5}</strong>
                                </div>
                              )}
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

      <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4">
        <div className="relative flex-1 w-full min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search elevators..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={selectedCustomerId} onValueChange={(val) => {
          setSelectedCustomerId(val);
          setSelectedBuildingId("all");
        }}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {customers?.map((customer) => (
              <SelectItem key={customer.id} value={customer.id.toString()}>
                {customer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedBuildingId} onValueChange={setSelectedBuildingId}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Building" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Buildings</SelectItem>
            {buildings?.map((building) => (
              <SelectItem key={building.id} value={building.id.toString()}>
                {building.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="traction">Traction</SelectItem>
            <SelectItem value="hydraulic">Hydraulic</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={selectedBank}
          onValueChange={setSelectedBank}
          disabled={bankOptions.length === 0}
        >
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Bank" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Banks</SelectItem>
            {bankOptions.map((bank) => (
              <SelectItem key={bank} value={bank}>
                {bank}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Due Month filter */}
        <Select value={filterDueMonth} onValueChange={setFilterDueMonth}>
          <SelectTrigger className="w-[140px]">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground mr-1.5" />
            <SelectValue placeholder="Due Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {[
              ["01","January"],["02","February"],["03","March"],["04","April"],
              ["05","May"],["06","June"],["07","July"],["08","August"],
              ["09","September"],["10","October"],["11","November"],["12","December"],
            ].map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Due Year filter */}
        <Select value={filterDueYear} onValueChange={setFilterDueYear}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Due Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {dueYearOptions.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Reset due filters */}
        {(filterDueMonth !== "all" || filterDueYear !== "all") && (
          <button
            onClick={() => { setFilterDueMonth("all"); setFilterDueYear("all"); }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" /> Reset
          </button>
        )}
      </div>


      {/* ── Expand / Collapse controls ── */}
      {!isLoading && grouped.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider mr-1">View:</span>
          {[
            { label: "Collapse All",  action: collapseAll },
            { label: "Customers",     action: expandCustomers },
            { label: "Buildings",     action: expandBuildings },
            { label: "Expand All",    action: expandAll },
          ].map(({ label, action }) => (
            <button
              key={label}
              onClick={action}
              className="px-2.5 py-1 text-xs font-medium rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-900 transition-colors shadow-sm"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Accordion tree: Customer → Building → Bank → Elevator ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border rounded-lg">
          <ArrowUpSquare className="h-10 w-10 mb-2 opacity-20" />
          <p>No elevators found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((customer) => {
            const isCustomerCollapsed = collapsedCustomers.has(customer.customerId);
            return (
              <div key={customer.customerId} className="rounded-lg border border-zinc-200 overflow-hidden shadow-sm">
                {/* Customer header — grid matches elevator row grid-cols exactly */}
                <button
                  className="w-full grid bg-gradient-to-r from-zinc-900 to-zinc-800 text-white border-t border-amber-500/30 cursor-pointer select-none text-left grid-cols-[3fr_1fr_1fr_1fr_2fr_1fr_1.5fr_1.5fr_1.5fr_1fr]"
                  onClick={() => toggleCustomer(customer.customerId)}
                >
                  <div className="flex items-center gap-2 min-w-0 px-4 py-3">
                    {isCustomerCollapsed
                      ? <ChevronRight className="h-5 w-5 shrink-0 text-zinc-400" />
                      : <ChevronDown className="h-5 w-5 shrink-0 text-zinc-400" />}
                    <Users className="h-5 w-5 shrink-0 text-zinc-400" />
                    <span className="font-bold text-base tracking-tight truncate">{customer.customerName}</span>
                    <span className="text-xs font-medium bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full ml-1 shrink-0">
                      {customer.buildings.reduce((sum, b) => sum + b.banks.reduce((s, bk) => s + bk.elevators.length, 0), 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-center px-3 py-3 border-l border-zinc-700">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white">Unit ID</span>
                  </div>
                  <div className="flex items-center justify-center px-3 py-3 border-l border-zinc-700">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white">State ID</span>
                  </div>
                  <div className="flex items-center justify-center px-3 py-3 border-l border-zinc-700">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white">Unit Type</span>
                  </div>
                  <div className="flex items-center justify-center px-4 py-3 border-l border-zinc-700">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white">Status</span>
                  </div>
                  <div className="flex items-center justify-center px-4 py-3 border-l border-zinc-700">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white">Insp Type</span>
                  </div>
                  <div className="flex items-center justify-center px-4 py-3 border-l border-zinc-700">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white">Last Inspection</span>
                  </div>
                  <div className="flex items-center justify-center px-4 py-3 border-l border-zinc-700">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white">Next Due</span>
                  </div>
                  <div className="flex items-center justify-center px-4 py-3 border-l border-zinc-700">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white">Scheduled</span>
                  </div>
                  <div className="flex items-center justify-center px-4 py-3 border-l border-zinc-700">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white">Actions</span>
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
                            className="w-full flex items-center gap-2 px-4 py-2.5 pl-8 bg-zinc-50 border-l-[3px] border-zinc-500 hover:bg-zinc-100 transition-colors text-left border-b border-zinc-100"
                            onClick={() => toggleBuilding(building.buildingId)}
                          >
                            {isBuildingCollapsed
                              ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                              : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" />}
                            <BuildingIcon className="h-4 w-4 shrink-0 text-zinc-500" />
                            <span className="font-semibold text-sm text-zinc-700">{building.buildingName}</span>
                          </button>

                          {!isBuildingCollapsed && (
                            <div>
                              {building.banks.map((bank) => {
                                const hasBankName = bank.bankName !== "";
                                const bankKey = `${building.buildingId}::${bank.bankName}`;
                                const isBankCollapsed = hasBankName && collapsedBanks.has(bankKey);
                                return (
                                  <div key={bank.bankName}>
                                    {/* Bank header — only when elevators have a bank assigned */}
                                    {hasBankName && (
                                      <button
                                        className="w-full flex items-center gap-2 px-4 py-2 pl-12 bg-white border-l-[2px] border-zinc-200 hover:bg-zinc-50 transition-colors text-left border-b border-zinc-100"
                                        onClick={() => toggleBank(bankKey)}
                                      >
                                        {isBankCollapsed
                                          ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-300" />
                                          : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-300" />}
                                        <Layers className="h-4 w-4 shrink-0 text-zinc-300" />
                                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Bank: {bank.bankName}</span>
                                      </button>
                                    )}

                                    {/* Elevator rows — fixed-width right columns for alignment */}
                                    {!isBankCollapsed && bank.elevators.map((elevator) => {
                                      const latestInsp = latestInspByElevator.get(elevator.id);
                                      const due = latestInsp?.nextDueDate?.slice(0, 10);
                                      const today = new Date().toISOString().slice(0, 10);
                                      const isOverdue = !!due && due < today;
                                      const isSoon = !isOverdue && !!due && due <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
                                      const scheduledDate = latestInsp?.scheduledDate?.slice(0, 10);
                                      const completionDate = lastCompletedByElevator.get(elevator.id);
                                      const nameIndent = hasBankName ? "pl-24" : "pl-20";
                                      return (
                                        <div
                                          key={elevator.id}
                                          className="grid grid-cols-[3fr_1fr_1fr_1fr_2fr_1fr_1.5fr_1.5fr_1.5fr_1fr] group relative hover:bg-amber-50/60 transition-colors border-b border-zinc-300"
                                        >
                                          {/* Amber accent bar — absolute left edge */}
                                          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber-500 group-hover:bg-amber-400 transition-colors" />
                                          {/* Name */}
                                          <div className={`flex items-center px-4 py-1.5 min-w-0 ${nameIndent}`}>
                                            <div className="font-semibold text-xs leading-snug truncate text-zinc-900">{elevator.name}</div>
                                          </div>
                                          {/* Unit ID */}
                                          <div className="flex items-center justify-center px-3 py-1.5 border-l border-zinc-200">
                                            <span className="text-xs tabular-nums text-zinc-700">{elevator.internalId ?? <span className="text-zinc-300">—</span>}</span>
                                          </div>
                                          {/* State ID */}
                                          <div className="flex items-center justify-center px-3 py-1.5 border-l border-zinc-200">
                                            <span className="text-xs tabular-nums text-zinc-700">{elevator.stateId ?? <span className="text-zinc-300">—</span>}</span>
                                          </div>
                                          {/* Unit Type */}
                                          <div className="flex items-center justify-center px-3 py-1.5 border-l border-zinc-200">
                                            <span className="text-xs font-medium text-zinc-700 capitalize">{elevator.type}</span>
                                          </div>
                                          {/* Status */}
                                          <div className="flex items-center justify-center px-4 py-1.5 border-l border-zinc-200">
                                            {latestInsp
                                              ? <StatusBadge status={latestInsp.status ?? "NOT_STARTED"} />
                                              : <span className="text-zinc-400 text-sm">—</span>}
                                          </div>
                                          {/* Insp Type */}
                                          <div className="flex items-center justify-center px-4 py-1.5 border-l border-zinc-200">
                                            {latestInsp ? (
                                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full tracking-wide ${latestInsp.inspectionType === "CAT5" ? "bg-yellow-400 text-zinc-900" : "bg-zinc-800 text-white"}`}>
                                                {latestInsp.inspectionType}
                                              </span>
                                            ) : <span className="text-zinc-400 text-sm">—</span>}
                                          </div>
                                          {/* Last Completed */}
                                          <div className="flex items-center justify-center px-4 py-1.5 border-l border-zinc-200">
                                            {completionDate ? (
                                              <span className="text-xs tabular-nums whitespace-nowrap text-zinc-900">
                                                {new Date(completionDate + "T00:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
                                              </span>
                                            ) : <span className="text-sm text-zinc-400">—</span>}
                                          </div>
                                          {/* Next Due */}
                                          <div className="flex items-center justify-center px-4 py-1.5 border-l border-zinc-200">
                                            {due ? (
                                              <span className="text-xs tabular-nums whitespace-nowrap text-zinc-900">
                                                {new Date(due + "T00:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
                                              </span>
                                            ) : <span className="text-sm text-zinc-400">—</span>}
                                          </div>
                                          {/* Scheduled */}
                                          <div className="flex items-center justify-center px-4 py-1.5 border-l border-zinc-200">
                                            {scheduledDate ? (
                                              <span className="text-xs tabular-nums whitespace-nowrap text-zinc-900">
                                                {new Date(scheduledDate + "T00:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
                                              </span>
                                            ) : <span className="text-sm text-zinc-400">—</span>}
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
            <AlertDialogTitle>Delete Elevator</AlertDialogTitle>
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
