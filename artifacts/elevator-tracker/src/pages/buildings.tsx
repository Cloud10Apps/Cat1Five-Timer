import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useListBuildings,
  getListBuildingsQueryKey,
  useCreateBuilding,
  useUpdateBuilding,
  useDeleteBuilding,
  useListCustomers,
  getListCustomersQueryKey,
  useListInspections,
  getListInspectionsQueryKey,
  Building,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Pencil, Trash2, Building2, MapPin, Users } from "lucide-react";
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

const buildingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  locationId: z.string().optional(),
  customerId: z.coerce.number().min(1, "Customer is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
});

type BuildingFormValues = z.infer<typeof buildingSchema>;

const AVATAR_PALETTE = [
  { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-200" },
  { bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-200"   },
  { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200" },
  { bg: "bg-teal-100",   text: "text-teal-700",   border: "border-teal-200"   },
  { bg: "bg-emerald-100",text: "text-emerald-700",border: "border-emerald-200"},
  { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  { bg: "bg-rose-100",   text: "text-rose-700",   border: "border-rose-200"   },
  { bg: "bg-amber-100",  text: "text-amber-700",  border: "border-amber-200"  },
];

function getAvatarStyle(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function formatAddress(building: Building): string | null {
  const parts: string[] = [];
  if (building.address) parts.push(building.address);
  const cityState = [building.city, building.state].filter(Boolean).join(", ");
  if (cityState) parts.push(cityState);
  if (building.zip) parts.push(building.zip);
  return parts.length > 0 ? parts.join(", ") : null;
}

interface BuildingCardProps {
  building: Building;
  onEdit: () => void;
  onDelete: () => void;
  hideCustomer?: boolean;
}

function BuildingCard({ building, onEdit, onDelete, hideCustomer }: BuildingCardProps) {
  const avatar = getAvatarStyle(building.name);
  const initials = building.name.slice(0, 2).toUpperCase();
  const address = formatAddress(building);
  const elevatorCount = building.elevatorCount ?? 0;

  const { data: inspections } = useListInspections(
    { buildingId: building.id },
    { query: { queryKey: getListInspectionsQueryKey({ buildingId: building.id }), staleTime: 5 * 60 * 1000 } }
  );

  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const overdueCount = (inspections ?? []).filter((i: any) => i.status === "OVERDUE").length;
  const dueSoonCount = (inspections ?? []).filter(
    (i: any) => i.status !== "OVERDUE" && i.nextDueDate >= today && i.nextDueDate <= in30
  ).length;

  let complianceBadge: React.ReactNode = null;
  if (elevatorCount > 0 && inspections !== undefined) {
    if (overdueCount > 0) {
      complianceBadge = (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-red-50 text-red-700 border border-red-200 shrink-0">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block shrink-0" />
          {overdueCount} Overdue
        </span>
      );
    } else if (dueSoonCount > 0) {
      complianceBadge = (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block shrink-0" />
          Due Soon
        </span>
      );
    } else {
      complianceBadge = (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-green-50 text-green-700 border border-green-200 shrink-0">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block shrink-0" />
          Compliant
        </span>
      );
    }
  }

  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="pb-4 px-6 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-4 min-w-0">
            <div className={`flex items-center justify-center w-16 h-16 rounded-2xl border-2 text-xl font-black uppercase shrink-0 ${avatar.bg} ${avatar.text} ${avatar.border}`}>
              {initials}
            </div>
            <div className="min-w-0 pt-1">
              <CardTitle className="text-xl font-bold leading-snug truncate">{building.name}</CardTitle>
              {(building as any).locationId && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-500 text-xs font-medium mt-1">
                  LOC: {(building as any).locationId}
                </span>
              )}
              {!hideCustomer && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Users className="h-3 w-3 text-zinc-400 shrink-0" />
                  <span className="text-sm text-muted-foreground truncate">{building.customerName}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            {complianceBadge && <div>{complianceBadge}</div>}
            <div className="flex items-center gap-0.5 -mr-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-6 px-6 pt-0 flex flex-col gap-3">
        {address ? (
          <div className="flex items-start gap-2">
            <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0 mt-0.5" />
            <span className="text-sm text-muted-foreground leading-snug">{address}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-zinc-300 shrink-0" />
            <span className="text-sm text-zinc-300 italic">No address on file</span>
          </div>
        )}

        <div className="flex items-center pt-3 border-t">
          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-1 text-xs font-semibold shrink-0">
            <Building2 className="h-3 w-3" />
            {elevatorCount} {elevatorCount === 1 ? "Unit" : "Units"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Buildings() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const customerIdFilter = selectedCustomerId !== "all" ? Number(selectedCustomerId) : undefined;

  const { data: buildings, isLoading } = useListBuildings(
    { search: debouncedSearch || undefined, customerId: customerIdFilter },
    { query: { queryKey: getListBuildingsQueryKey({ search: debouncedSearch || undefined, customerId: customerIdFilter }) } }
  );

  const { data: customers } = useListCustomers({}, { query: { queryKey: getListCustomersQueryKey({}) } });

  // Group buildings by customer, sorted alphabetically
  const grouped = useMemo(() => {
    const map = new Map<number, { customerId: number; customerName: string; buildings: typeof buildings }>();
    for (const b of buildings ?? []) {
      if (!map.has(b.customerId)) {
        map.set(b.customerId, { customerId: b.customerId, customerName: b.customerName ?? "Unknown Customer", buildings: [] });
      }
      map.get(b.customerId)!.buildings!.push(b);
    }
    return Array.from(map.values()).sort((a, b) => a.customerName.localeCompare(b.customerName));
  }, [buildings]);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useCreateBuilding();
  const updateMutation = useUpdateBuilding();
  const deleteMutation = useDeleteBuilding();

  const form = useForm<BuildingFormValues>({
    resolver: zodResolver(buildingSchema),
    defaultValues: { name: "", locationId: "", customerId: 0, address: "", city: "", state: "", zip: "" },
  });

  const onSubmit = (data: BuildingFormValues) => {
    if (editingBuilding) {
      updateMutation.mutate(
        { id: editingBuilding.id, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListBuildingsQueryKey() });
            setEditingBuilding(null);
            setIsAddOpen(false);
            form.reset();
            toast({ title: "Building updated successfully" });
          },
          onError: () => {
            toast({ title: "Failed to update building", variant: "destructive" });
          },
        }
      );
    } else {
      createMutation.mutate(
        { data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListBuildingsQueryKey() });
            setIsAddOpen(false);
            form.reset();
            toast({ title: "Building added successfully" });
          },
          onError: () => {
            toast({ title: "Failed to add building", variant: "destructive" });
          },
        }
      );
    }
  };

  const confirmDelete = () => {
    if (deleteId === null) return;
    deleteMutation.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBuildingsQueryKey() });
          toast({ title: "Building deleted successfully" });
          setDeleteId(null);
        },
        onError: () => {
          toast({ title: "Failed to delete building", variant: "destructive" });
          setDeleteId(null);
        },
      }
    );
  };

  const openEdit = (building: Building) => {
    setEditingBuilding(building);
    form.reset({
      name: building.name,
      locationId: (building as any).locationId || "",
      customerId: building.customerId,
      address: building.address || "",
      city: building.city || "",
      state: building.state || "",
      zip: building.zip || "",
    });
    setIsAddOpen(true);
  };

  const buildingForm = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="customerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value ? field.value.toString() : ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Building Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Downtown Tower" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="locationId"
            render={({ field }) => (
              <FormItem className="w-32">
                <FormLabel>Location / ID <span className="font-normal text-muted-foreground">(Optional)</span></FormLabel>
                <FormControl>
                  <Input placeholder="e.g. LOC-101" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="123 Main St" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input placeholder="New York" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl>
                  <Input placeholder="NY" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save Building"}
        </Button>
      </form>
    </Form>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Buildings</h1>
          <p className="text-sm text-zinc-500 mt-1">Your building locations and their compliance status at a glance.</p>
        </div>

        <Dialog
          open={isAddOpen}
          onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) {
              form.reset({ name: "", locationId: "", customerId: 0, address: "", city: "", state: "", zip: "" });
              setEditingBuilding(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-zinc-900 font-semibold"
              onClick={() => {
                setEditingBuilding(null);
                form.reset({ name: "", locationId: "", customerId: 0, address: "", city: "", state: "", zip: "" });
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Building
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBuilding ? "Edit Building" : "Add New Building"}</DialogTitle>
            </DialogHeader>
            {buildingForm}
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search buildings..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={selectedCustomerId}
          onChange={(e) => setSelectedCustomerId(e.target.value)}
          className="h-9 rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 min-w-[180px] w-full sm:w-auto"
        >
          <option value="all">All Customers</option>
          {customers?.map((c) => (
            <option key={c.id} value={c.id.toString()}>{c.name}</option>
          ))}
        </select>
        {buildings && buildings.length > 0 && (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {buildings.length} building{buildings.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Building2 className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">No buildings found.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <div key={group.customerId}>
              {/* Customer section header */}
              <div className="flex items-center gap-3 mt-8 first:mt-0 mb-4">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-zinc-900 text-white text-sm font-bold shrink-0">
                  {group.customerName.slice(0, 2).toUpperCase()}
                </div>
                <span className="font-bold text-zinc-900 text-lg tracking-tight">{group.customerName}</span>
                <div className="flex-1 h-px bg-zinc-200" />
                <span className="text-xs text-zinc-400 font-medium">{group.buildings?.length ?? 0} buildings</span>
              </div>
              {/* Building cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {group.buildings?.map((building) => (
                  <BuildingCard
                    key={building.id}
                    building={building}
                    onEdit={() => openEdit(building)}
                    onDelete={() => setDeleteId(building.id)}
                    hideCustomer
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Building</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this building? This action cannot be undone and will also remove all associated elevators and inspections.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
