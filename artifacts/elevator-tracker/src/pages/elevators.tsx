import { useState } from "react";
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
  CreateElevatorBodyType,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Search, Pencil, Trash2, ArrowUpSquare, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { useDebounce } from "@/hooks/use-debounce";

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

export default function Elevators() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("all");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedBank, setSelectedBank] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingElevator, setEditingElevator] = useState<Elevator | null>(null);

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

  // Separate query without bank filter to populate the bank dropdown options,
  // filtered by the other active filters so options stay contextually relevant.
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

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useCreateElevator();
  const updateMutation = useUpdateElevator();
  const deleteMutation = useDeleteElevator();

  const form = useForm<ElevatorFormValues>({
    resolver: zodResolver(elevatorSchema),
    defaultValues: { name: "", internalId: "", stateId: "", buildingId: 0, description: "", bank: "", type: "traction" },
  });

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

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this elevator?")) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListElevatorsQueryKey() });
            toast({ title: "Elevator deleted successfully" });
          },
          onError: () => {
            toast({ title: "Failed to delete elevator", variant: "destructive" });
          },
        }
      );
    }
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
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Elevator
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingElevator ? "Edit Elevator" : "Add New Elevator"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                                {building.name} ({building.customerName})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                          <FormLabel>Internal ID</FormLabel>
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
                          <FormLabel>Bank</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. High Rise" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Additional details..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save Elevator"}
                  </Button>
                </form>
              </Form>
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
          setSelectedBuildingId("all"); // reset building when customer changes
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
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Elevator</TableHead>
              <TableHead>Building</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Bank</TableHead>
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
            ) : elevators?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <ArrowUpSquare className="h-10 w-10 mb-2 opacity-20" />
                    <p>No elevators found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              elevators?.map((elevator) => (
                <TableRow key={elevator.id}>
                  <TableCell>
                    <div className="font-medium">{elevator.name}</div>
                    <div className="flex gap-2 mt-0.5">
                      {elevator.internalId && (
                        <span className="text-xs text-muted-foreground">Int: {elevator.internalId}</span>
                      )}
                      {elevator.stateId && (
                        <span className="text-xs text-muted-foreground">State: {elevator.stateId}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{elevator.buildingName}</TableCell>
                  <TableCell>{elevator.customerName}</TableCell>
                  <TableCell className="capitalize">{elevator.type}</TableCell>
                  <TableCell>{elevator.bank || "-"}</TableCell>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}