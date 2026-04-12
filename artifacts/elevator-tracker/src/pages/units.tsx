import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
  Elevator,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Plus, Pencil, Trash2, Download, X, ChevronDown, ChevronRight,
  Building as BuildingIcon, Users, Layers, Check, ChevronsUpDown,
} from "lucide-react";
import { FilterCombobox } from "@/components/filter-combobox";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const elevatorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  internalId: z.string().optional(),
  stateId: z.string().optional(),
  buildingId: z.coerce.number().min(1, "Building is required"),
  description: z.string().optional(),
  bank: z.string().optional(),
  type: z.enum(["traction", "hydraulic", "other"] as const),
  manufacturer: z.string().optional(),
  elevatorType: z.enum(["passenger", "freight"]).optional(),
  oemSerialNumber: z.string().optional(),
  capacity: z.string().optional(),
  speed: z.string().optional(),
  yearInstalled: z.preprocess(v => (v === "" || v == null) ? undefined : Number(v), z.number().int().positive().optional()),
  numLandings: z.preprocess(v => (v === "" || v == null) ? undefined : Number(v), z.number().int().positive().optional()),
  numOpenings: z.preprocess(v => (v === "" || v == null) ? undefined : Number(v), z.number().int().positive().optional()),
});

type ElevatorFormValues = z.infer<typeof elevatorSchema>;


export default function Units() {
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<string[]>([]);
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingElevator, setEditingElevator] = useState<Elevator | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formCustomerId, setFormCustomerId] = useState<string>("all");
  const [formCustomerOpen, setFormCustomerOpen] = useState(false);
  const [formBuildingOpen, setFormBuildingOpen] = useState(false);

  const [collapsedCustomers, setCollapsedCustomers] = useState<Set<number>>(new Set());
  const [collapsedBuildings, setCollapsedBuildings] = useState<Set<number>>(new Set());
  const [collapsedBanks, setCollapsedBanks] = useState<Set<string>>(new Set());
  const toggleCustomer = (id: number) => setCollapsedCustomers(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleBuilding = (id: number) => setCollapsedBuildings(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleBank = (key: string) => setCollapsedBanks(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });

  const { data: elevators, isLoading } = useListElevators({}, { query: { queryKey: getListElevatorsQueryKey({}) } });
  const { data: customers } = useListCustomers({}, { query: { queryKey: getListCustomersQueryKey({}) } });
  const { data: allBuildings } = useListBuildings({}, { query: { queryKey: getListBuildingsQueryKey({}) } });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useCreateElevator();
  const updateMutation = useUpdateElevator();
  const deleteMutation = useDeleteElevator();

  const form = useForm<ElevatorFormValues>({
    resolver: zodResolver(elevatorSchema),
    defaultValues: { name: "", internalId: "", stateId: "", buildingId: 0, description: "", bank: "", type: "traction" },
  });

  const customerOptions = useMemo(() =>
    (customers ?? []).map((c) => ({ value: c.id.toString(), label: c.name })),
    [customers]);

  const buildingOptions = useMemo(() => {
    const list = selectedCustomerIds.length > 0
      ? (allBuildings ?? []).filter(b => selectedCustomerIds.includes(String(b.customerId)))
      : (allBuildings ?? []);
    return list.map(b => ({ value: b.id.toString(), label: b.name }));
  }, [allBuildings, selectedCustomerIds]);

  const bankFilterOptions = useMemo(() => {
    let src = elevators ?? [];
    if (selectedCustomerIds.length > 0) src = src.filter(e => selectedCustomerIds.includes(String(e.customerId)));
    if (selectedBuildingIds.length > 0) src = src.filter(e => selectedBuildingIds.includes(String(e.buildingId)));
    const banks = Array.from(new Set(src.map(e => e.bank).filter(Boolean) as string[])).sort();
    return banks.map(b => ({ value: b, label: b }));
  }, [elevators, selectedCustomerIds, selectedBuildingIds]);

  const filteredElevators = useMemo(() => {
    return (elevators ?? []).filter((el) => {
      if (selectedCustomerIds.length > 0 && !selectedCustomerIds.includes(String(el.customerId))) return false;
      if (selectedBuildingIds.length > 0 && !selectedBuildingIds.includes(String(el.buildingId))) return false;
      if (selectedBanks.length > 0       && !selectedBanks.includes(el.bank ?? ""))               return false;
      if (selectedTypes.length > 0       && !selectedTypes.includes(el.type ?? ""))                return false;
      return true;
    });
  }, [elevators, selectedCustomerIds, selectedBuildingIds, selectedBanks, selectedTypes]);

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
      if (!customerMap.has(custId)) customerMap.set(custId, { customerName: el.customerName ?? "Unknown", buildingMap: new Map() });
      const cust = customerMap.get(custId)!;
      if (!cust.buildingMap.has(bldgId)) cust.buildingMap.set(bldgId, { buildingName: el.buildingName ?? "Unknown", bankMap: new Map() });
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

  const allCustomerIds = useMemo(() => grouped.map(c => c.customerId), [grouped]);
  const allBuildingIds = useMemo(() => grouped.flatMap(c => c.buildings.map(b => b.buildingId)), [grouped]);
  const allBankKeys   = useMemo(() => grouped.flatMap(c => c.buildings.flatMap(b => b.banks.map(bk => `${b.buildingId}::${bk.bankName}`))), [grouped]);

  const [activeDepth, setActiveDepth] = useState<"customers"|"buildings"|"banks"|"units">("units");
  const collapseAll     = () => { setCollapsedCustomers(new Set(allCustomerIds)); setCollapsedBuildings(new Set(allBuildingIds)); setCollapsedBanks(new Set(allBankKeys)); setActiveDepth("customers"); };
  const expandCustomers = () => { setCollapsedCustomers(new Set()); setCollapsedBuildings(new Set(allBuildingIds)); setCollapsedBanks(new Set(allBankKeys)); setActiveDepth("buildings"); };
  const expandBuildings = () => { setCollapsedCustomers(new Set()); setCollapsedBuildings(new Set()); setCollapsedBanks(new Set(allBankKeys)); setActiveDepth("banks"); };
  const expandAll       = () => { setCollapsedCustomers(new Set()); setCollapsedBuildings(new Set()); setCollapsedBanks(new Set()); setActiveDepth("units"); };

  const onSubmit = async (data: ElevatorFormValues) => {
    if (editingElevator) {
      updateMutation.mutate(
        { id: editingElevator.id, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListElevatorsQueryKey() });
            setEditingElevator(null);
            setIsAddOpen(false);
            form.reset();
            toast({ title: "Unit updated" });
          },
          onError: () => { toast({ title: "Failed to update unit", variant: "destructive" }); },
        }
      );
    } else {
      try {
        await createMutation.mutateAsync({ data });
        queryClient.invalidateQueries({ queryKey: getListElevatorsQueryKey() });
        setIsAddOpen(false);
        form.reset();
        toast({ title: "Unit added" });
      } catch {
        toast({ title: "Failed to add unit", variant: "destructive" });
      }
    }
  };

  const confirmDelete = () => {
    if (deleteId === null) return;
    deleteMutation.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListElevatorsQueryKey() });
          toast({ title: "Unit deleted" });
          setDeleteId(null);
        },
        onError: () => {
          toast({ title: "Failed to delete unit", variant: "destructive" });
          setDeleteId(null);
        },
      }
    );
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
      manufacturer: elevator.manufacturer || "",
      elevatorType: elevator.elevatorType || undefined,
      oemSerialNumber: elevator.oemSerialNumber || "",
      capacity: elevator.capacity || "",
      speed: elevator.speed || "",
      yearInstalled: elevator.yearInstalled ?? undefined,
      numLandings: elevator.numLandings ?? undefined,
      numOpenings: elevator.numOpenings ?? undefined,
    });
  };

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (selectedCustomerIds.length === 1) params.append("customerId", selectedCustomerIds[0]);
    if (selectedBuildingIds.length === 1) params.append("buildingId", selectedBuildingIds[0]);
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/export/elevators?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `units_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const unitTypeOpts = [
    { value: "traction",  label: "Traction" },
    { value: "hydraulic", label: "Hydraulic" },
    { value: "other",     label: "Other" },
  ];

  const clearAll = () => { setSelectedCustomerIds([]); setSelectedBuildingIds([]); setSelectedBanks([]); setSelectedTypes([]); };
  const activeFilterCount = [selectedCustomerIds, selectedBuildingIds, selectedBanks, selectedTypes].filter(v => v.length > 0).length;

  const chipLabel = (arr: string[], opts: {value:string;label:string}[], single: string) =>
    arr.length === 1 ? (opts.find(o => o.value === arr[0])?.label ?? arr[0]) : `${arr.length} ${single}`;
  const activeChips: { label: string; value: string; onRemove: () => void }[] = [];
  if (selectedCustomerIds.length > 0) activeChips.push({ label: "Customer", value: chipLabel(selectedCustomerIds, customerOptions, "customers"), onRemove: () => { setSelectedCustomerIds([]); setSelectedBuildingIds([]); setSelectedBanks([]); } });
  if (selectedBuildingIds.length > 0) activeChips.push({ label: "Building", value: chipLabel(selectedBuildingIds, buildingOptions, "buildings"), onRemove: () => { setSelectedBuildingIds([]); setSelectedBanks([]); } });
  if (selectedBanks.length > 0)       activeChips.push({ label: "Bank",      value: chipLabel(selectedBanks, bankFilterOptions, "banks"),   onRemove: () => setSelectedBanks([]) });
  if (selectedTypes.length > 0)       activeChips.push({ label: "Unit Type", value: chipLabel(selectedTypes, unitTypeOpts, "types"),         onRemove: () => setSelectedTypes([]) });

  const elevatorFormFields = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        {/* Customer picker */}
        <div className="space-y-2">
          <p className="text-sm font-medium leading-none">Customer</p>
          <Popover open={formCustomerOpen} onOpenChange={setFormCustomerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                className={cn("w-full justify-between font-normal", formCustomerId === "all" && "text-muted-foreground")}
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
                      <CommandItem key={c.id} value={c.name} onSelect={() => { setFormCustomerId(c.id.toString()); form.setValue("buildingId", 0); setFormCustomerOpen(false); }}>
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

        {/* Building picker */}
        <div className="space-y-2 mt-2">
          <FormField
            control={form.control}
            name="buildingId"
            render={({ field }) => {
              const filteredBuildings = (allBuildings ?? []).filter(b => formCustomerId === "all" || b.customerId === Number(formCustomerId));
              const selectedBuilding = (allBuildings ?? []).find(b => b.id === field.value);
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
                          className={cn("w-full justify-between font-normal", !field.value && "text-muted-foreground")}
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
                              <CommandItem key={b.id} value={b.name} onSelect={() => { field.onChange(b.id); setFormBuildingOpen(false); }}>
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

        <div className="space-y-5">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>Unit Name</FormLabel>
              <FormControl><Input placeholder="e.g. Main Lobby Elevator" className="h-11" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="border-t border-zinc-100 my-2" />
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">Identification</p>
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="internalId" render={({ field }) => (
              <FormItem>
                <FormLabel>Unit ID</FormLabel>
                <FormControl><Input placeholder="e.g. PE-1" className="h-11" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="stateId" render={({ field }) => (
              <FormItem>
                <FormLabel>State ID</FormLabel>
                <FormControl><Input placeholder="e.g. NY-12345" className="h-11" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="traction">Traction</SelectItem>
                    <SelectItem value="hydraulic">Hydraulic</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="bank" render={({ field }) => (
              <FormItem>
                <FormLabel>Bank / Group</FormLabel>
                <FormControl><Input placeholder="e.g. High Rise" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        {/* Unit Profile */}
        <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 pt-3 pb-4 space-y-5">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-1 h-4 rounded-full bg-amber-400 shrink-0" />
            <span className="text-sm font-semibold text-zinc-700 tracking-tight">Unit Profile</span>
            <span className="text-xs text-zinc-400 font-normal">— all fields optional</span>
          </div>

          {/* Row 1: Manufacturer (60%) | Elevator Type (40%) */}
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-3">
              <FormField control={form.control} name="manufacturer" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-zinc-600">Manufacturer</FormLabel>
                  <FormControl><Input placeholder="Otis, KONE, Schindler, ThyssenKrupp…" className="bg-white" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="col-span-2">
              <FormField control={form.control} name="elevatorType" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-zinc-600">Elevator Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="Passenger / Freight" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="passenger">Passenger</SelectItem>
                      <SelectItem value="freight">Freight</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </div>

          {/* Row 2: OEM Serial | Year Installed */}
          <div className="grid grid-cols-2 gap-3">
            <FormField control={form.control} name="oemSerialNumber" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-zinc-600">OEM Serial Number</FormLabel>
                <FormControl><Input placeholder="Manufacturer serial no." className="bg-white" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="yearInstalled" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-zinc-600">Year Installed</FormLabel>
                <FormControl><Input type="number" placeholder="e.g. 2005" className="bg-white" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value)} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* Row 3: Capacity | Speed */}
          <div className="grid grid-cols-2 gap-3">
            <FormField control={form.control} name="capacity" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-zinc-600">Capacity</FormLabel>
                <FormControl><Input placeholder="e.g. 2500 lbs / 3500 lbs" className="bg-white" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="speed" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-zinc-600">Speed</FormLabel>
                <FormControl><Input placeholder="e.g. 150 fpm / 350 fpm" className="bg-white" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* Row 4: # Landings | # Openings */}
          <div className="grid grid-cols-2 gap-3">
            <FormField control={form.control} name="numLandings" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-zinc-600"># Landings</FormLabel>
                <FormControl><Input type="number" placeholder="Number of landings" className="bg-white" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value)} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="numOpenings" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-zinc-600"># Openings</FormLabel>
                <FormControl><Input type="number" placeholder="Number of openings" className="bg-white" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value)} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Description <span className="font-normal text-muted-foreground">(Optional)</span></FormLabel>
            <FormControl><Textarea placeholder="Additional details about this unit..." className="resize-none h-20" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <Button
          type="submit"
          className="w-full mt-6 h-12 text-base bg-amber-500 hover:bg-amber-600 text-zinc-900 font-semibold"
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
          <h1 className="text-2xl font-bold tracking-tight">Units</h1>
          <p className="mt-1 text-sm text-zinc-500">Elevator unit inventory. Use <span className="font-medium text-zinc-600">Active Inspections</span> to track compliance status.</p>
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
              setFormCustomerId("all");
              setFormCustomerOpen(false);
              setFormBuildingOpen(false);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-amber-500 hover:bg-amber-600 text-zinc-900 font-semibold" onClick={() => { setEditingElevator(null); setFormCustomerId("all"); form.reset({ name: "", internalId: "", stateId: "", buildingId: 0, description: "", bank: "", type: "traction" }); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add New Unit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
              <DialogHeader className="pb-2 border-b">
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                    <Layers className="h-4 w-4" />
                  </span>
                  {editingElevator ? editingElevator.name : "Add New Unit"}
                </DialogTitle>
                {editingElevator && (
                  <p className="text-sm text-muted-foreground pl-10">{editingElevator.buildingName} · {editingElevator.customerName}</p>
                )}
              </DialogHeader>
              <div className="pt-2">
                {elevatorFormFields}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-zinc-200 rounded-lg shadow-sm">
        <div className="flex items-center gap-1.5 px-3 py-2 min-h-[48px]">
          <FilterCombobox value={selectedCustomerIds} onValueChange={(val) => { setSelectedCustomerIds(val); setSelectedBuildingIds([]); setSelectedBanks([]); }} options={customerOptions} placeholder="All Customers" searchPlaceholder="Search customers..." width="w-[155px]" />
          <FilterCombobox value={selectedBuildingIds} onValueChange={(val) => { setSelectedBuildingIds(val); setSelectedBanks([]); }} options={buildingOptions} placeholder="All Buildings" searchPlaceholder="Search buildings..." width="w-[140px]" />
          <FilterCombobox value={selectedBanks} onValueChange={setSelectedBanks} options={bankFilterOptions} placeholder="All Banks" searchPlaceholder="Search banks..." disabled={bankFilterOptions.length === 0} width="w-[130px]" />
          <FilterCombobox value={selectedTypes} onValueChange={setSelectedTypes} options={unitTypeOpts} placeholder="All Unit Types" searchPlaceholder="Search types..." width="w-[155px]" />
          <div className="flex-1 min-w-0" />
          <div className="flex items-center gap-2 pl-2 shrink-0">
            <span className="text-xs tabular-nums whitespace-nowrap">
              <span className="font-bold text-zinc-700">{filteredElevators.length}</span>
              <span className="text-zinc-400 ml-1">{filteredElevators.length === 1 ? "unit" : "units"}</span>
            </span>
            {activeFilterCount > 0 && (
              <button onClick={clearAll} className="flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-red-600 bg-zinc-100 hover:bg-red-50 border border-zinc-200 hover:border-red-200 px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap">
                <X className="h-3 w-3" /> Clear all
              </button>
            )}
          </div>
        </div>
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

      {/* Expand/collapse breadcrumb */}
      {!isLoading && grouped.length > 0 && (
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1 bg-zinc-100 rounded-lg p-1">
            {([
              { key: "customers", label: "Customers", action: collapseAll },
              { key: "buildings", label: "Buildings", action: expandCustomers },
              { key: "banks",     label: "Banks",     action: expandBuildings },
              { key: "units",     label: "Units",     action: expandAll },
            ] as const).map(({ key, label, action }) => (
              <button
                key={key}
                onClick={action}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${activeDepth === key ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"}`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Accordion tree: Customer → Building → Bank → Elevator */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Spinner /></div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center border rounded-lg bg-white">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
            <Layers className="h-6 w-6 text-zinc-400" />
          </div>
          <p className="text-sm font-semibold text-zinc-600">No units found</p>
          {activeFilterCount > 0 ? (
            <button onClick={clearAll} className="text-sm text-amber-600 hover:text-amber-700 font-semibold underline-offset-2 hover:underline">Clear all filters</button>
          ) : (
            <p className="text-xs text-zinc-400">Add your first unit to get started</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((customer) => {
            const isCustomerCollapsed = collapsedCustomers.has(customer.customerId);
            return (
              <div key={customer.customerId} className="rounded-lg border border-zinc-200 overflow-hidden shadow-sm">
                {/* Customer header */}
                <button
                  className="w-full flex items-center gap-2 min-w-0 px-4 py-3 bg-gradient-to-r from-zinc-900 to-zinc-800 text-white border-t border-amber-500/30 cursor-pointer select-none text-left"
                  onClick={() => toggleCustomer(customer.customerId)}
                >
                  {isCustomerCollapsed ? <ChevronRight className="h-5 w-5 shrink-0 text-zinc-400" /> : <ChevronDown className="h-5 w-5 shrink-0 text-zinc-400" />}
                  <Users className="h-5 w-5 shrink-0 text-zinc-400" />
                  <span className="font-bold text-lg tracking-tight truncate">{customer.customerName}</span>
                  <span className="text-sm font-medium bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full ml-1 shrink-0">
                    {customer.buildings.reduce((sum, b) => sum + b.banks.reduce((s, bk) => s + bk.elevators.length, 0), 0)}
                  </span>
                </button>

                {!isCustomerCollapsed && (
                  <div>
                    {customer.buildings.map((building) => {
                      const isBuildingCollapsed = collapsedBuildings.has(building.buildingId);
                      return (
                        <div key={building.buildingId}>
                          <button
                            className="w-full flex items-center gap-2 px-4 py-2.5 pl-8 bg-zinc-100 border-l-[3px] border-zinc-600 hover:bg-zinc-200/60 transition-colors text-left border-b border-zinc-200"
                            onClick={() => toggleBuilding(building.buildingId)}
                          >
                            {isBuildingCollapsed ? <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" /> : <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />}
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
                                    <button
                                      className="w-full flex items-center gap-2 px-4 py-2.5 pl-12 bg-white hover:bg-zinc-50 transition-colors text-left border-b border-zinc-100"
                                      onClick={() => toggleBank(bankKey)}
                                    >
                                      {isBankCollapsed ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-300" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-300" />}
                                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${bank.bankName !== "" ? "bg-zinc-100 text-zinc-600 border-zinc-200" : "bg-zinc-50 text-zinc-400 border-zinc-100 italic"}`}>
                                        <Layers className="h-3 w-3 shrink-0" />
                                        {bankLabel}
                                      </span>
                                    </button>

                                    {!isBankCollapsed && bank.elevators.map((elevator, rowIdx) => (
                                      <div
                                        key={elevator.id}
                                        className={`group relative flex items-center gap-6 px-4 py-3 pl-20 border-b border-zinc-200 transition-colors hover:bg-amber-50/40 ${rowIdx % 2 === 1 ? "bg-zinc-50/20" : ""}`}
                                        style={{ minHeight: "70px" }}
                                      >
                                        <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-amber-500" />

                                        {/* LEFT ZONE — Unit Identity (45%) */}
                                        <div className="w-[45%] min-w-0 shrink-0">
                                          <div className="font-bold text-lg text-zinc-900 leading-tight truncate">{elevator.name}</div>
                                          {elevator.manufacturer && (
                                            <div className="text-sm text-zinc-400 italic truncate mt-0.5">{elevator.manufacturer}</div>
                                          )}
                                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                            {elevator.type && (
                                              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-sm font-semibold capitalize">
                                                {elevator.type}
                                              </span>
                                            )}
                                            {elevator.elevatorType && (
                                              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-sm font-semibold capitalize">
                                                {elevator.elevatorType}
                                              </span>
                                            )}
                                            {elevator.bank && (
                                              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200 text-sm font-medium">
                                                {elevator.bank}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-4 mt-1">
                                            {elevator.internalId && (
                                              <span className="text-xs text-zinc-500">Unit ID: <span className="font-mono text-sm font-semibold text-zinc-700">{elevator.internalId}</span></span>
                                            )}
                                            {elevator.stateId && (
                                              <span className="text-xs text-zinc-500">State ID: <span className="font-mono text-sm font-semibold text-zinc-700">{elevator.stateId}</span></span>
                                            )}
                                          </div>
                                        </div>

                                        {/* RIGHT ZONE — Technical Specs */}
                                        <div className="flex-1 min-w-0 grid grid-cols-5 gap-6">
                                          {/* OEM Serial */}
                                          <div className="min-w-0">
                                            <div className="text-xs uppercase text-zinc-400 mb-0.5">OEM Serial</div>
                                            {elevator.oemSerialNumber
                                              ? <div className="text-base font-bold text-zinc-800 font-mono truncate">{elevator.oemSerialNumber}</div>
                                              : <div className="text-sm text-zinc-400">—</div>}
                                          </div>
                                          {/* Year */}
                                          <div className="min-w-0">
                                            <div className="text-xs uppercase text-zinc-400 mb-0.5">Year</div>
                                            {elevator.yearInstalled
                                              ? <div className="text-base font-bold text-zinc-800">{elevator.yearInstalled}</div>
                                              : <div className="text-sm text-zinc-400">—</div>}
                                          </div>
                                          {/* Capacity */}
                                          <div className="min-w-0">
                                            <div className="text-xs uppercase text-zinc-400 mb-0.5">Capacity</div>
                                            {elevator.capacity
                                              ? <div className="text-base font-bold text-zinc-800 truncate">{elevator.capacity}</div>
                                              : <div className="text-sm text-zinc-400">—</div>}
                                          </div>
                                          {/* Speed */}
                                          <div className="min-w-0">
                                            <div className="text-xs uppercase text-zinc-400 mb-0.5">Speed</div>
                                            {elevator.speed
                                              ? <div className="text-base font-bold text-zinc-800 truncate">{elevator.speed}</div>
                                              : <div className="text-sm text-zinc-400">—</div>}
                                          </div>
                                          {/* Landings/Opens */}
                                          <div className="min-w-0">
                                            <div className="text-xs uppercase text-zinc-400 mb-0.5">Lands/Opens</div>
                                            {(elevator.numLandings || elevator.numOpenings)
                                              ? <div className="text-base font-bold text-zinc-800">{elevator.numLandings ?? "—"} / {elevator.numOpenings ?? "—"}</div>
                                              : <div className="text-sm text-zinc-400">—</div>}
                                          </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 shrink-0">
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { openEdit(elevator); setIsAddOpen(true); }}>
                                                  <Pencil className="h-3.5 w-3.5 text-zinc-500" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>Edit Unit</TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDeleteId(elevator.id)} disabled={deleteMutation.isPending}>
                                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>Delete Unit</TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        </div>
                                      </div>
                                    ))}
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

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Unit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this unit? This action cannot be undone and will also remove all associated inspection records.
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
