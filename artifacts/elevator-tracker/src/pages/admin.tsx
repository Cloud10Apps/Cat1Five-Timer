import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useListUsers,
  getListUsersQueryKey,
  useUpdateUser,
  useInviteUser,
  User,
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ShieldAlert, UserPlus, Mail, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import dayjs from "dayjs";

const inviteSchema = z.object({
  email: z.string().email("Invalid email"),
  role: z.enum(["ADMIN", "USER"]),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

function getToken() {
  return localStorage.getItem("token") ?? "";
}

interface CustomerAccessState {
  allCustomers: boolean;
  customerIds: number[];
}

interface CustomerItem {
  id: number;
  name: string;
}

function CustomerAccessDialog({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [access, setAccess] = useState<CustomerAccessState>({ allCustomers: true, customerIds: [] });
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      fetch("/api/customers", { headers: { Authorization: `Bearer ${getToken()}` } }).then(r => r.json()),
      fetch(`/api/users/${user.id}/customers`, { headers: { Authorization: `Bearer ${getToken()}` } }).then(r => r.json()),
    ]).then(([custs, acc]) => {
      setCustomers(custs as CustomerItem[]);
      setAccess(acc as CustomerAccessState);
    }).catch(() => {
      toast({ title: "Failed to load access settings", variant: "destructive" });
    }).finally(() => setLoading(false));
  }, [open, user.id]);

  const toggleCustomer = (id: number, checked: boolean) => {
    setAccess(prev => ({
      ...prev,
      customerIds: checked ? [...prev.customerIds, id] : prev.customerIds.filter(c => c !== id),
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}/customers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(access),
      });
      if (!res.ok) throw new Error("Save failed");
      toast({ title: "Customer access updated" });
      setOpen(false);
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = user.role === "ADMIN";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
          <Building2 className="h-3.5 w-3.5" />
          Access
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Customer Access — {user.email}</DialogTitle>
        </DialogHeader>
        {isAdmin ? (
          <p className="text-sm text-muted-foreground py-4">
            Admin users always have access to all customers.
          </p>
        ) : loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">All Customers</p>
                <p className="text-xs text-muted-foreground">Grant access to every customer</p>
              </div>
              <Switch
                checked={access.allCustomers}
                onCheckedChange={(v) => setAccess(prev => ({ ...prev, allCustomers: v }))}
              />
            </div>

            {!access.allCustomers && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Allowed Customers</p>
                {customers.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No customers found.</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
                    {customers.map(c => (
                      <div key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                        <Checkbox
                          id={`cust-${c.id}`}
                          checked={access.customerIds.includes(c.id)}
                          onCheckedChange={(checked) => toggleCustomer(c.id, !!checked)}
                        />
                        <Label htmlFor={`cust-${c.id}`} className="cursor-pointer text-sm font-normal">
                          {c.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save Access"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Admin() {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const { data: users, isLoading } = useListUsers({}, { query: { queryKey: getListUsersQueryKey() } });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateMutation = useUpdateUser();
  const inviteMutation = useInviteUser();

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "USER", password: "" },
  });

  const onSubmit = (data: InviteFormValues) => {
    inviteMutation.mutate(
      { data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          setIsInviteOpen(false);
          form.reset();
          toast({ title: "User invited successfully" });
        },
        onError: (err) => {
          toast({ title: "Failed to invite user", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const toggleStatus = (user: User) => {
    updateMutation.mutate(
      { id: user.id, data: { isActive: !user.isActive } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          toast({ title: `User ${!user.isActive ? 'activated' : 'deactivated'}` });
        },
      }
    );
  };

  const changeRole = (user: User, newRole: "ADMIN" | "USER") => {
    updateMutation.mutate(
      { id: user.id, data: { role: newRole } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          toast({ title: "User role updated" });
        },
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <ShieldAlert className="h-8 w-8" />
            Administration
          </h1>
          <p className="text-muted-foreground">Manage organization users and permissions.</p>
        </div>

        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="user@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USER">User (Standard Access)</SelectItem>
                          <SelectItem value="ADMIN">Admin (Full Access)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? "Inviting..." : "Send Invite"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Customer Access</TableHead>
              <TableHead className="text-right">Active Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Spinner />
                </TableCell>
              </TableRow>
            ) : users?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users?.map((u) => (
                <TableRow key={u.id} className={!u.isActive ? "opacity-60" : ""}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      {u.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={u.role}
                      onValueChange={(val: "ADMIN" | "USER") => changeRole(u, val)}
                      disabled={updateMutation.isPending}
                    >
                      <SelectTrigger className="w-[120px] h-8 border-none bg-transparent hover:bg-muted p-0 focus:ring-0 px-2">
                        <SelectValue>
                          <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                            {u.role}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USER">USER</SelectItem>
                        <SelectItem value="ADMIN">ADMIN</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {dayjs(u.createdAt).format("MMM D, YYYY")}
                  </TableCell>
                  <TableCell>
                    <CustomerAccessDialog user={u} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={u.isActive}
                      onCheckedChange={() => toggleStatus(u)}
                      disabled={updateMutation.isPending}
                      aria-label="Toggle user active status"
                    />
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
