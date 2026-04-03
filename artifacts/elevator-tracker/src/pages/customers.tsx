import { Fragment, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useListCustomers,
  getListCustomersQueryKey,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  Customer,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Plus, Search, Pencil, Trash2, Building, ChevronDown, ChevronRight, Users } from "lucide-react";
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
import dayjs from "dayjs";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/components/auth-provider";
import { useDebounce } from "@/hooks/use-debounce";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

type CustomerUser = {
  id: number;
  email: string;
  role: string;
  isActive: boolean;
};

async function fetchCustomerUsers(customerId: number): Promise<CustomerUser[]> {
  const token = localStorage.getItem("token");
  const res = await fetch(`/api/customers/${customerId}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch customer users");
  return res.json();
}

function CustomerUsersRow({ customerId, colSpan }: { customerId: number; colSpan: number }) {
  const { data: users, isLoading } = useQuery({
    queryKey: ["customer-users", customerId],
    queryFn: () => fetchCustomerUsers(customerId),
  });

  return (
    <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
      <TableCell colSpan={colSpan} className="py-3 px-8">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-zinc-500" />
          <span className="text-sm font-semibold text-zinc-700">Associated Users</span>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Spinner /> Loading users...
          </div>
        ) : !users || users.length === 0 ? (
          <p className="text-sm text-zinc-400">No users assigned to this customer.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 bg-white border border-zinc-200 rounded-md px-3 py-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-100 text-zinc-600 text-xs font-bold uppercase shrink-0">
                  {u.email.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-zinc-900 truncate">{u.email}</div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${u.role === "ADMIN" ? "text-violet-600" : "text-zinc-500"}`}>
                      {u.role}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${u.isActive ? "text-green-600" : "text-red-500"}`}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

export default function Customers() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const { data: customers, isLoading } = useListCustomers(
    { search: debouncedSearch || undefined },
    { query: { queryKey: getListCustomersQueryKey({ search: debouncedSearch || undefined }) } }
  );

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "" },
  });

  const onSubmit = (data: CustomerFormValues) => {
    if (editingCustomer) {
      updateMutation.mutate(
        { id: editingCustomer.id, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
            setEditingCustomer(null);
            form.reset();
            toast({ title: "Customer updated successfully" });
          },
          onError: () => {
            toast({ title: "Failed to update customer", variant: "destructive" });
          },
        }
      );
    } else {
      createMutation.mutate(
        { data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
            setIsAddOpen(false);
            form.reset();
            toast({ title: "Customer added successfully" });
          },
          onError: () => {
            toast({ title: "Failed to add customer", variant: "destructive" });
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
          queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
          toast({ title: "Customer deleted successfully" });
          setDeleteId(null);
        },
        onError: () => {
          toast({ title: "Failed to delete customer", variant: "destructive" });
          setDeleteId(null);
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    form.reset({ name: customer.name });
  };

  const totalCols = isAdmin ? 4 : 3;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        </div>

        {isAdmin && (
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) {
              form.reset({ name: "" });
              setEditingCustomer(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingCustomer(null);
                form.reset({ name: "" });
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Customer Company Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Saving..." : "Save Customer"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Created At</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={totalCols} className="text-center py-8">
                  <Spinner />
                </TableCell>
              </TableRow>
            ) : customers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={totalCols} className="text-center py-8 text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <Building className="h-10 w-10 mb-2 opacity-20" />
                    <p>No customers found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              customers?.map((customer) => (
                <Fragment key={customer.id}>
                  <TableRow className="cursor-pointer" onClick={() => setExpandedId(expandedId === customer.id ? null : customer.id)}>
                    <TableCell className="w-10 px-3">
                      {expandedId === customer.id ? (
                        <ChevronDown className="h-4 w-4 text-zinc-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-zinc-400" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{dayjs(customer.createdAt).format("MMM D, YYYY")}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                        <Dialog
                          open={editingCustomer?.id === customer.id}
                          onOpenChange={(open) => {
                            if (!open) {
                              setEditingCustomer(null);
                              form.reset({ name: "" });
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(customer)}>
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Customer</DialogTitle>
                            </DialogHeader>
                            <Form {...form}>
                              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                  control={form.control}
                                  name="name"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Name</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                                </Button>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(customer.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                  {expandedId === customer.id && (
                    <CustomerUsersRow customerId={customer.id} colSpan={totalCols} />
                  )}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this customer? This action cannot be undone and will also remove all associated buildings, elevators, and inspections.
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
