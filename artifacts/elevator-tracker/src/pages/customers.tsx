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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Search, Pencil, Trash2, Building2, ChevronDown, ChevronRight, Users, Info, CalendarDays } from "lucide-react";
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

const AVATAR_PALETTE = [
  { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200" },
  { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200" },
  { bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-200" },
  { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
  { bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-200" },
];

function getAvatarStyle(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function CustomerUsersPanel({ customerId }: { customerId: number }) {
  const { data: users, isLoading } = useQuery({
    queryKey: ["customer-users", customerId],
    queryFn: () => fetchCustomerUsers(customerId),
  });

  return (
    <div className="border-t bg-zinc-50/60 rounded-b-xl px-5 py-4 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-zinc-500" />
        <span className="text-sm font-semibold text-zinc-700">Associated Users</span>
      </div>
      <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
        <Info className="h-3.5 w-3.5 shrink-0 text-blue-500 mt-0.5" />
        <p className="text-xs text-blue-800 font-medium leading-snug">
          To add or remove user access for this customer, contact your system administrator.
        </p>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Spinner /> Loading users...
        </div>
      ) : !users || users.length === 0 ? (
        <p className="text-sm text-zinc-400">No users assigned to this customer.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 bg-white border border-zinc-200 rounded-md px-3 py-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-zinc-100 text-zinc-600 text-xs font-bold uppercase shrink-0">
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
    </div>
  );
}

interface CustomerCardProps {
  customer: Customer;
  isAdmin: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  editingCustomer: Customer | null;
  form: ReturnType<typeof useForm<CustomerFormValues>>;
  onSubmit: (data: CustomerFormValues) => void;
  updateIsPending: boolean;
  setEditingCustomer: (c: Customer | null) => void;
}

function CustomerCard({
  customer,
  isAdmin,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  editingCustomer,
  form,
  onSubmit,
  updateIsPending,
  setEditingCustomer,
}: CustomerCardProps) {
  const avatar = getAvatarStyle(customer.name);
  const initials = customer.name.slice(0, 2).toUpperCase();

  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex items-center justify-center w-14 h-14 rounded-2xl border-2 text-xl font-black uppercase shrink-0 ${avatar.bg} ${avatar.text} ${avatar.border}`}>
              {initials}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base leading-snug truncate">{customer.name}</CardTitle>
              <div className="flex items-center gap-1.5 mt-1">
                <CalendarDays className="h-3.5 w-3.5 text-zinc-400" />
                <CardDescription className="text-xs">
                  Since {dayjs(customer.createdAt).format("MMM D, YYYY")}
                </CardDescription>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-0.5 shrink-0 -mt-1 -mr-1">
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
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
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
                      <Button type="submit" className="w-full" disabled={updateIsPending}>
                        {updateIsPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-0 mt-auto">
        <button
          className="w-full flex items-center justify-between border-t px-0 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
          onClick={onToggleExpand}
        >
          <span className="flex items-center gap-2 font-medium">
            <Users className="h-4 w-4 group-hover:text-foreground" />
            View Users
          </span>
          {isExpanded
            ? <ChevronDown className="h-4 w-4 transition-transform" />
            : <ChevronRight className="h-4 w-4 transition-transform" />
          }
        </button>
      </CardContent>

      {isExpanded && <CustomerUsersPanel customerId={customer.id} />}
    </Card>
  );
}

export default function Customers() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground italic">
            This menu lists the customers you have access to. For any changes, please contact your system administrator.
          </p>
        </div>

        {isAdmin && (
          <Dialog
            open={isAddOpen}
            onOpenChange={(open) => {
              setIsAddOpen(open);
              if (!open) {
                form.reset({ name: "" });
                setEditingCustomer(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingCustomer(null);
                  form.reset({ name: "" });
                }}
              >
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

      {!isAdmin && (
        <div className="flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <span>
            The following customers have been assigned to you by your system administrator. Expand each customer to view associated users.
          </span>
        </div>
      )}

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
        {customers && customers.length > 0 && (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {customers.length} customer{customers.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : customers?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Building2 className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">No customers found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {customers?.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              isAdmin={isAdmin}
              isExpanded={expandedId === customer.id}
              onToggleExpand={() => setExpandedId(expandedId === customer.id ? null : customer.id)}
              onEdit={() => {
                setEditingCustomer(customer);
                form.reset({ name: customer.name });
              }}
              onDelete={() => setDeleteId(customer.id)}
              editingCustomer={editingCustomer}
              form={form}
              onSubmit={onSubmit}
              updateIsPending={updateMutation.isPending}
              setEditingCustomer={setEditingCustomer}
            />
          ))}
        </div>
      )}

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
