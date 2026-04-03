import { useState, useEffect, useMemo, useRef, Fragment } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Plus, Search, Pencil, Trash2, ArrowUpSquare, Download, ClipboardList, X, CalendarDays, Clock, ArrowRight, ChevronDown, ChevronRight, Building as BuildingIcon, Users } from "lucide-react";
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
  const toggleCustomer = (id: number) => setCollapsedCustomers(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });
  const toggleBuilding = (id: number) => setCollapsedBuildings(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

  // Inspection panel state (inside elevator dialog)
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null);
  const [showInspForm, setShowInspForm] = useState(false);
  const [inspDeleteId, setInspDeleteId] = useState<number | null>(null);
  const autoLoadedForElevator = useRef<number | null>(null);

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

  // Map: elevatorId → { NOT_STARTED, OVERDUE, SCHEDULED, IN_PROGRESS, COMPLETED }
  type StatusCounts = Record<string, number>;
  const inspCountsByElevator = useMemo(() => {
    const map = new Map<number, StatusCounts>();
    for (const insp of allInspections ?? []) {
      if (!insp.elevatorId) continue;
      const existing = map.get(insp.elevatorId) ?? {};
      const key = insp.status ?? "NOT_STARTED";
      existing[key] = (existing[key] ?? 0) + 1;
      map.set(insp.elevatorId, existing);
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

  // Group filtered elevators: customer → building → elevator[]
  const grouped = useMemo(() => {
    type BuildingGroup = { buildingId: number; buildingName: string; elevators: NonNullable<typeof filteredElevators>[number][] };
    type CustomerGroup = { customerId: number; customerName: string; buildings: BuildingGroup[] };
    const customerMap = new Map<number, { customerName: string; buildingMap: Map<number, BuildingGroup> }>();
    for (const el of filteredElevators ?? []) {
      if (!customerMap.has(el.customerId)) {
        customerMap.set(el.customerId, { customerName: el.customerName ?? "Unknown", buildingMap: new Map() });
      }
      const cust = customerMap.get(el.customerId)!;
      if (!cust.buildingMap.has(el.buildingId)) {
        cust.buildingMap.set(el.buildingId, { buildingId: el.buildingId, buildingName: el.buildingName ?? "Unknown", elevators: [] });
      }
      cust.buildingMap.get(el.buildingId)!.elevators.push(el);
    }
    const result: CustomerGroup[] = [];
    for (const [customerId, { customerName, buildingMap }] of customerMap) {
      const buildings = Array.from(buildingMap.values()).sort((a, b) => a.buildingName.localeCompare(b.buildingName));
      result.push({ customerId, customerName, buildings });
    }
    return result.sort((a, b) => a.customerName.localeCompare(b.customerName));
  }, [filteredElevators]);

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

  const watchLastDate = inspForm.watch("lastInspectionDate");
  const watchRecurrence = inspForm.watch("recurrenceYears");
  const watchCompletionDate = inspForm.watch("completionDate");
  const watchScheduledDate = inspForm.watch("scheduledDate");
  const watchInspStatus = inspForm.watch("status");
  const nextDuePreview = watchLastDate && watchRecurrence
    ? dayjs(watchLastDate).add(Number(watchRecurrence), "year").format("YYYY-MM-DD")
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


  // Auto-load the most current NOT_STARTED inspection when the dialog opens
  useEffect(() => {
    if (!editingElevator || !elevatorInspections) return;
    if (autoLoadedForElevator.current === editingElevator.id) return;
    autoLoadedForElevator.current = editingElevator.id;

    const STATUS_PRIORITY = ["NOT_STARTED", "SCHEDULED", "IN_PROGRESS", "OVERDUE"];
    const toLoad = STATUS_PRIORITY.reduce<typeof elevatorInspections[0] | null>((found, status) => {
      if (found) return found;
      return elevatorInspections.find(i => i.status === status) ?? null;
    }, null);

    if (toLoad) {
      openEditInsp(toLoad);
    }
  }, [elevatorInspections, editingElevator]);

  const resetInspForm = () => {
    inspForm.reset({ inspectionType: "CAT1", recurrenceYears: 1, status: "NOT_STARTED", notes: "" });
    setEditingInspection(null);
    setShowInspForm(false);
  };

  const openEditInsp = (insp: Inspection) => {
    setEditingInspection(insp);
    setShowInspForm(true);
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
            toast({ title: "Inspection updated" });
            resetInspForm();
          },
          onError: () => toast({ title: "Failed to update inspection", variant: "destructive" }),
        }
      );
    } else {
      createInspMutation.mutate(
        { data: payload },
        {
          onSuccess: () => {
            invalidateInspections();
            toast({ title: "Inspection added" });
            resetInspForm();
          },
          onError: () => toast({ title: "Failed to add inspection", variant: "destructive" }),
        }
      );
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
    autoLoadedForElevator.current = null;
    resetInspForm();
    form.reset({
      name: elevator.name,
      internalId: elevator.internalId || "",
      stateId: elevator.stateId || "",
      buildingId: elevator.buildingId,
      description: elevator.description || "",
      bank: elevator.bank || "",
      type: elevator.type,
    });
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
          <p className="text-muted-foreground">Manage your elevator inventory.</p>
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

            <DialogContent className={editingElevator ? "max-w-4xl max-h-[90vh] overflow-y-auto" : "max-w-xl"}>
              <DialogHeader className="pb-2 border-b">
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                    <ArrowUpSquare className="h-4 w-4" />
                  </span>
                  {editingElevator ? editingElevator.name : "Add New Unit"}
                </DialogTitle>
                {editingElevator && (
                  <p className="text-sm text-muted-foreground pl-10">{editingElevator.buildingName}</p>
                )}
              </DialogHeader>

              {editingElevator ? (
                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="w-full">
                    <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                    <TabsTrigger value="inspections" className="flex-1">
                      Inspections
                      {elevatorInspections && elevatorInspections.length > 0 && (
                        <span className="ml-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
                          {elevatorInspections.length}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="pt-2">
                    {elevatorFormFields}
                  </TabsContent>

                  <TabsContent value="inspections" className="pt-2 space-y-4">
                    {/* Inline inspection form — always visible */}
                    <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold">
                            {editingInspection ? "Edit Inspection" : "New Inspection"}
                          </h3>
                          {editingInspection && (
                            <Button variant="ghost" size="icon" onClick={resetInspForm}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <Form {...inspForm}>
                          <form onSubmit={inspForm.handleSubmit(onSubmitInsp)} className="space-y-3">
                            {/* Type — full width up top */}
                            <FormField
                              control={inspForm.control}
                              name="inspectionType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Inspection Type</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="w-full sm:w-56">
                                        <SelectValue />
                                      </SelectTrigger>
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

                            {/* Timeline section: Past | Future */}
                            <div className="relative pt-5 pb-4 px-4 bg-slate-50 rounded-lg border border-slate-200">
                              <div className="grid grid-cols-2 gap-4">

                                {/* Past card */}
                                <div className="relative bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-3">
                                  <div className="absolute -top-3 left-3 bg-white px-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border border-slate-200 rounded-full">
                                    <Clock className="w-3 h-3" /> Past
                                  </div>
                                  <FormField
                                    control={inspForm.control}
                                    name="lastInspectionDate"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Last Inspection</FormLabel>
                                        <FormControl>
                                          <DatePickerField value={field.value} onChange={field.onChange} placeholder="Pick a date" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={inspForm.control}
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
                                </div>

                                {/* Future card */}
                                <div className="relative bg-amber-50/40 rounded-lg border border-amber-100 shadow-sm p-4 space-y-3">
                                  <div className="absolute -top-3 left-3 bg-white px-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-amber-600 border border-amber-100 rounded-full">
                                    <ArrowRight className="w-3 h-3" /> Future
                                  </div>
                                  {/* Next Due — computed read-only */}
                                  <div className="space-y-1">
                                    <span className="text-sm font-medium leading-none">Next Due</span>
                                    {nextDuePreview ? (
                                      <div className="flex items-center h-10 px-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 font-semibold text-base">
                                        {dayjs(nextDuePreview).format("MMM D, YYYY")}
                                      </div>
                                    ) : (
                                      <div className="flex items-center h-10 px-3 bg-muted border border-dashed rounded-md text-muted-foreground text-sm">
                                        Set last date + recurrence
                                      </div>
                                    )}
                                    <p className="text-[11px] text-amber-600/80">Calculated from Last Inspection + Recurrence</p>
                                  </div>
                                  <FormField
                                    control={inspForm.control}
                                    name="scheduledDate"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Scheduled Date</FormLabel>
                                        <FormControl>
                                          <DatePickerField value={field.value} onChange={field.onChange} placeholder="Pick a date" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>

                              </div>
                            </div>

                            {/* Outcomes: Status + Completion Date */}
                            <div className="grid grid-cols-2 gap-3">
                              <FormField
                                control={inspForm.control}
                                name="status"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select
                                      value={field.value}
                                      onValueChange={(val) => {
                                        field.onChange(val);
                                        if (val !== "COMPLETED") inspForm.setValue("completionDate", "");
                                      }}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
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
                              <FormField
                                control={inspForm.control}
                                name="completionDate"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Completion Date</FormLabel>
                                    <FormControl>
                                      <DatePickerField value={field.value} onChange={field.onChange} placeholder="Pick a date" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={inspForm.control}
                              name="notes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Notes</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Inspector notes, compliance details..."
                                      className="resize-none h-20"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                              <Button type="button" variant="outline" size="sm" onClick={resetInspForm}>
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                size="sm"
                                className="bg-amber-500 hover:bg-amber-600 text-zinc-900"
                                disabled={createInspMutation.isPending || updateInspMutation.isPending}
                              >
                                {(createInspMutation.isPending || updateInspMutation.isPending)
                                  ? "Saving..."
                                  : editingInspection ? "Update Inspection" : "Save Inspection"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </div>

                    {/* Inspection history list */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-sm font-semibold text-foreground">Inspection History</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    {inspLoading ? (
                      <div className="flex justify-center py-6"><Spinner /></div>
                    ) : !elevatorInspections || elevatorInspections.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
                        <ClipboardList className="h-8 w-8 mb-2 opacity-20" />
                        <p>No inspection records yet.</p>
                      </div>
                    ) : (
                      <div className="rounded-md border divide-y">
                          {elevatorInspections.map((insp) => (
                            <div key={insp.id} className="flex items-start justify-between gap-3 px-4 py-3">
                              <div className="flex flex-col gap-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <InspectionTypeBadge type={insp.inspectionType} />
                                  <StatusBadge status={insp.status || "NOT_STARTED"} />
                                </div>
                                <div className="flex gap-3 text-xs text-muted-foreground flex-wrap mt-0.5">
                                  <span>Last: {insp.lastInspectionDate ? dayjs(insp.lastInspectionDate).format("MMM D, YYYY") : <span className="text-muted-foreground/40">—</span>}</span>
                                  <span>Due: {insp.nextDueDate ? dayjs(insp.nextDueDate).format("MMM D, YYYY") : <span className="text-muted-foreground/40">—</span>}</span>
                                  <span>Scheduled: {insp.scheduledDate ? dayjs(insp.scheduledDate).format("MMM D, YYYY") : <span className="text-muted-foreground/40">—</span>}</span>
                                  <span>Completed: {insp.completionDate ? dayjs(insp.completionDate).format("MMM D, YYYY") : <span className="text-muted-foreground/40">—</span>}</span>
                                </div>
                                {insp.notes && (
                                  <p className="text-xs text-muted-foreground truncate max-w-xs">{insp.notes}</p>
                                )}
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => openEditInsp(insp)}
                                >
                                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => setInspDeleteId(insp.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              ) : (
                elevatorFormFields
              )}
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


      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-16">Elevator</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>Next Due</TableHead>
              <TableHead className="text-center">Inspection Activity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Spinner />
                </TableCell>
              </TableRow>
            ) : grouped.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <ArrowUpSquare className="h-10 w-10 mb-2 opacity-20" />
                    <p>No elevators found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              grouped.map((customer) => {
                const isCustomerCollapsed = collapsedCustomers.has(customer.customerId);
                const totalElevators = customer.buildings.reduce((sum, b) => sum + b.elevators.length, 0);
                return (
                  <Fragment key={customer.customerId}>
                    {/* ── Customer header row ── */}
                    <TableRow
                      className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer select-none border-t-2 border-zinc-300 dark:border-zinc-600"
                      onClick={() => toggleCustomer(customer.customerId)}
                    >
                      <TableCell colSpan={6} className="py-2.5">
                        <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
                          {isCustomerCollapsed
                            ? <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
                            : <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />}
                          <Users className="h-4 w-4 shrink-0 text-zinc-400" />
                          <span className="font-bold text-sm">{customer.customerName}</span>
                          <span className="ml-auto text-xs font-normal text-zinc-400">
                            {customer.buildings.length} {customer.buildings.length === 1 ? "building" : "buildings"} · {totalElevators} {totalElevators === 1 ? "elevator" : "elevators"}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>

                    {!isCustomerCollapsed && customer.buildings.map((building) => {
                      const isBuildingCollapsed = collapsedBuildings.has(building.buildingId);
                      return (
                        <Fragment key={building.buildingId}>
                          {/* ── Building header row ── */}
                          <TableRow
                            className="bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 cursor-pointer select-none"
                            onClick={() => toggleBuilding(building.buildingId)}
                          >
                            <TableCell colSpan={6} className="py-2 pl-8">
                              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                                {isBuildingCollapsed
                                  ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                                  : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" />}
                                <BuildingIcon className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                                <span className="font-semibold text-sm">{building.buildingName}</span>
                                <span className="ml-auto text-xs font-normal text-zinc-400">
                                  {building.elevators.length} {building.elevators.length === 1 ? "elevator" : "elevators"}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* ── Elevator rows ── */}
                          {!isBuildingCollapsed && building.elevators.map((elevator) => {
                            const counts = inspCountsByElevator.get(elevator.id) ?? {};
                            const STATUS_DOTS = [
                              { key: "OVERDUE",     label: "Overdue",     dot: "bg-red-500"   },
                              { key: "IN_PROGRESS", label: "In Progress", dot: "bg-amber-500" },
                              { key: "SCHEDULED",   label: "Scheduled",   dot: "bg-sky-500"   },
                              { key: "NOT_STARTED", label: "Not Started", dot: "bg-slate-400" },
                              { key: "COMPLETED",   label: "Completed",   dot: "bg-green-500" },
                            ] as const;
                            const activeBadges = STATUS_DOTS.filter(s => (counts[s.key] ?? 0) > 0);
                            return (
                              <TableRow key={elevator.id} className="hover:bg-amber-50/40 dark:hover:bg-amber-900/10 transition-colors">
                                <TableCell className="py-2 pl-16 pr-4">
                                  <div className="flex items-stretch gap-0">
                                    <div className="w-1 rounded-full bg-amber-400/70 mr-3 shrink-0 self-stretch min-h-[2rem]" />
                                    <div className="min-w-0">
                                      <div className="text-base font-bold tracking-tight leading-snug">{elevator.name}</div>
                                      {(elevator.internalId || elevator.stateId) && (
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                          {elevator.internalId && (
                                            <span className="text-sm text-muted-foreground">Unit&nbsp;{elevator.internalId}</span>
                                          )}
                                          {elevator.internalId && elevator.stateId && (
                                            <span className="text-muted-foreground/40 text-sm">·</span>
                                          )}
                                          {elevator.stateId && (
                                            <span className="text-sm text-muted-foreground">State&nbsp;{elevator.stateId}</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="py-2 capitalize">{elevator.type}</TableCell>
                                <TableCell className="py-2">{elevator.bank || "—"}</TableCell>
                                <TableCell className="py-2">
                                  {(() => {
                                    const due = nextDueDateByElevator.get(elevator.id);
                                    if (!due) return <span className="text-muted-foreground">—</span>;
                                    const today = new Date().toISOString().slice(0, 10);
                                    const isOverdue = due < today;
                                    const isSoon = !isOverdue && due <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
                                    return (
                                      <span className={
                                        isOverdue ? "text-red-600 font-semibold" :
                                        isSoon    ? "text-amber-600 font-medium" :
                                                    "text-foreground"
                                      }>
                                        {new Date(due + "T00:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
                                      </span>
                                    );
                                  })()}
                                </TableCell>
                                <TableCell className="py-2 text-center">
                                  {activeBadges.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 justify-center">
                                      {activeBadges.map(({ key, label, dot }) => (
                                        <span
                                          key={key}
                                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-muted/60 border border-border/50 whitespace-nowrap"
                                        >
                                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                                          {counts[key]} {label}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                  <Button variant="ghost" size="icon" onClick={() => {
                                    openEdit(elevator);
                                    setIsAddOpen(true);
                                  }}>
                                    <Pencil className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(elevator.id)}
                                    disabled={deleteMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

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
