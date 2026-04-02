import { useState } from "react";
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
  Building,
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
import { Plus, Search, Pencil, Trash2, Building as BuildingIcon } from "lucide-react";
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
  customerId: z.coerce.number().min(1, "Customer is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
});

type BuildingFormValues = z.infer<typeof buildingSchema>;

export default function Buildings() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  
  const customerIdFilter = selectedCustomerId !== "all" ? Number(selectedCustomerId) : undefined;

  const { data: buildings, isLoading } = useListBuildings(
    { search: debouncedSearch || undefined, customerId: customerIdFilter },
    { query: { queryKey: getListBuildingsQueryKey({ search: debouncedSearch || undefined, customerId: customerIdFilter }) } }
  );

  const { data: customers } = useListCustomers({}, { query: { queryKey: getListCustomersQueryKey({}) } });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useCreateBuilding();
  const updateMutation = useUpdateBuilding();
  const deleteMutation = useDeleteBuilding();

  const form = useForm<BuildingFormValues>({
    resolver: zodResolver(buildingSchema),
    defaultValues: { name: "", customerId: 0, address: "", city: "", state: "", zip: "" },
  });

  const onSubmit = (data: BuildingFormValues) => {
    if (editingBuilding) {
      updateMutation.mutate(
        { id: editingBuilding.id, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListBuildingsQueryKey() });
            setEditingBuilding(null);
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

  const [deleteId, setDeleteId] = useState<number | null>(null);

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

  const handleDelete = (id: number) => {
    setDeleteId(id);
  };

  const openEdit = (building: Building) => {
    setEditingBuilding(building);
    form.reset({
      name: building.name,
      customerId: building.customerId,
      address: building.address || "",
      city: building.city || "",
      state: building.state || "",
      zip: building.zip || "",
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Buildings</h1>
          <p className="text-muted-foreground">Manage your building locations.</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) {
            form.reset({ name: "", customerId: 0, address: "", city: "", state: "", zip: "" });
            setEditingBuilding(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Building
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBuilding ? "Edit Building" : "Add New Building"}</DialogTitle>
            </DialogHeader>
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
                        defaultValue={field.value ? field.value.toString() : ""}
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save Building"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search buildings..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by customer" />
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
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Building</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <Spinner />
                </TableCell>
              </TableRow>
            ) : buildings?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <BuildingIcon className="h-10 w-10 mb-2 opacity-20" />
                    <p>No buildings found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              buildings?.map((building) => (
                <TableRow key={building.id}>
                  <TableCell className="font-medium">{building.name}</TableCell>
                  <TableCell>{building.customerName}</TableCell>
                  <TableCell>
                    {building.city} {building.state && `, ${building.state}`}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => {
                      openEdit(building);
                      setIsAddOpen(true);
                    }}>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(building.id)}
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
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}