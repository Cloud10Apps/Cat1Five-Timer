import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useListContacts,
  getListContactsQueryKey,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  useListCustomers,
  getListCustomersQueryKey,
  Contact,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Building2,
  KeyRound,
  UserCog,
  ShieldCheck,
  User,
  Mail,
  Phone,
  ContactRound,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { useDebounce } from "@/hooks/use-debounce";

type ContactType = "elevator_company" | "building_owner" | "property_manager" | "state_inspector" | "other";

const CONTACT_TYPE_ORDER: ContactType[] = [
  "elevator_company",
  "building_owner",
  "property_manager",
  "state_inspector",
  "other",
];

const CONTACT_TYPE_META: Record<ContactType, { label: string; singular: string; icon: typeof Building2 }> = {
  elevator_company: { label: "Elevator Companies", singular: "Elevator Company", icon: Building2 },
  building_owner:   { label: "Building Owners",    singular: "Building Owner",   icon: KeyRound },
  property_manager: { label: "Property Managers",  singular: "Property Manager", icon: UserCog },
  state_inspector:  { label: "State Inspectors",   singular: "State Inspector",  icon: ShieldCheck },
  other:            { label: "Other",              singular: "Other",            icon: User },
};

const contactSchema = z
  .object({
    customerId: z.coerce.number().min(1, "Customer is required"),
    contactType: z.enum([
      "elevator_company",
      "building_owner",
      "property_manager",
      "state_inspector",
      "other",
    ]),
    companyName: z.string().optional(),
    contactName: z.string().optional(),
    email: z.string().email("Valid email required"),
    phone: z.string().optional(),
  })
  .refine((d) => !!((d.companyName ?? "").trim() || (d.contactName ?? "").trim()), {
    message: "Either company name or contact name is required",
    path: ["companyName"],
  });

type ContactFormValues = z.infer<typeof contactSchema>;

function contactDisplayName(c: Contact): string {
  return c.companyName?.trim() || c.contactName?.trim() || c.email;
}

function buildingPreview(c: Contact): string | null {
  const count = c.buildingCount ?? 0;
  if (count === 0) return null;
  const preview = c.buildingNamesPreview?.[0];
  if (!preview) return `${count} building${count === 1 ? "" : "s"}`;
  const extra = count - 1;
  if (extra <= 0) return `${count} building — ${preview}`;
  return `${count} buildings — ${preview}, +${extra} more`;
}

interface ContactCardProps {
  contact: Contact;
  onEdit: () => void;
  onDelete: () => void;
}

function ContactCard({ contact, onEdit, onDelete }: ContactCardProps) {
  const meta = CONTACT_TYPE_META[contact.contactType as ContactType] ?? CONTACT_TYPE_META.other;
  const Icon = meta.icon;
  const primary = contactDisplayName(contact);
  const secondaryParts: string[] = [];
  if (contact.companyName && contact.contactName) secondaryParts.push(contact.contactName);
  const preview = buildingPreview(contact);

  return (
    <div className="flex items-center gap-4 rounded-xl border bg-white px-4 py-3 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 text-amber-600 shrink-0">
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-zinc-900 truncate">{primary}</div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-500 mt-0.5">
          {secondaryParts.map((p) => (
            <span key={p} className="truncate">{p}</span>
          ))}
          <span className="inline-flex items-center gap-1 min-w-0 truncate">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{contact.email}</span>
          </span>
          {contact.phone && (
            <span className="inline-flex items-center gap-1 shrink-0">
              <Phone className="h-3 w-3" />
              {contact.phone}
            </span>
          )}
          {contact.customerName && (
            <span className="text-zinc-400 truncate">· {contact.customerName}</span>
          )}
        </div>
      </div>

      <div className="hidden sm:block text-xs text-zinc-500 text-right shrink-0 max-w-[14rem]">
        {preview ?? <span className="text-zinc-300">No buildings</span>}
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} title="Edit">
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete} title="Delete">
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

interface ContactGroupProps {
  type: ContactType;
  contacts: Contact[];
  defaultOpen: boolean;
  onEdit: (c: Contact) => void;
  onDelete: (c: Contact) => void;
}

function ContactGroup({ type, contacts, defaultOpen, onEdit, onDelete }: ContactGroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = CONTACT_TYPE_META[type];
  const Icon = meta.icon;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center gap-3 px-1 py-2 hover:bg-zinc-50 rounded-md transition-colors">
          {open ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
          <Icon className="h-4 w-4 text-zinc-500" />
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-700">{meta.label}</span>
          <span className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full bg-zinc-100 text-zinc-600 text-xs font-bold">
            {contacts.length}
          </span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-2 pl-7 pr-1 pt-2 pb-3">
          {contacts.map((c) => (
            <ContactCard key={c.id} contact={c} onEdit={() => onEdit(c)} onDelete={() => onDelete(c)} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function Contacts() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteContact, setDeleteContact] = useState<Contact | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const listParams = useMemo(() => {
    const p: { customerId?: number; contactType?: ContactType; search?: string } = {};
    if (customerFilter !== "all") p.customerId = Number(customerFilter);
    if (typeFilter !== "all") p.contactType = typeFilter as ContactType;
    if (debouncedSearch) p.search = debouncedSearch;
    return p;
  }, [customerFilter, typeFilter, debouncedSearch]);

  const { data: contacts, isLoading } = useListContacts(listParams, {
    query: { queryKey: getListContactsQueryKey(listParams) },
  });

  const { data: customers } = useListCustomers(
    {},
    { query: { queryKey: getListCustomersQueryKey() } },
  );

  const createMutation = useCreateContact();
  const updateMutation = useUpdateContact();
  const deleteMutation = useDeleteContact();

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      customerId: 0,
      contactType: "elevator_company",
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
    },
  });

  const openAdd = () => {
    setEditingContact(null);
    form.reset({
      customerId: customerFilter !== "all" ? Number(customerFilter) : 0,
      contactType: "elevator_company",
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
    });
    setIsAddOpen(true);
  };

  const openEdit = (c: Contact) => {
    setEditingContact(c);
    form.reset({
      customerId: c.customerId,
      contactType: (c.contactType as ContactType),
      companyName: c.companyName ?? "",
      contactName: c.contactName ?? "",
      email: c.email,
      phone: c.phone ?? "",
    });
    setIsAddOpen(true);
  };

  const onSubmit = (data: ContactFormValues) => {
    const body = {
      customerId: data.customerId,
      contactType: data.contactType,
      companyName: data.companyName?.trim() || undefined,
      contactName: data.contactName?.trim() || undefined,
      email: data.email.trim(),
      phone: data.phone?.trim() || undefined,
    };
    const onDone = (msg: string) => {
      queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() });
      setIsAddOpen(false);
      setEditingContact(null);
      form.reset();
      toast({ title: msg });
    };
    if (editingContact) {
      updateMutation.mutate(
        { id: editingContact.id, data: body },
        {
          onSuccess: () => onDone("Contact updated"),
          onError: () => toast({ title: "Failed to update contact", variant: "destructive" }),
        },
      );
    } else {
      createMutation.mutate(
        { data: body },
        {
          onSuccess: () => onDone("Contact added"),
          onError: () => toast({ title: "Failed to add contact", variant: "destructive" }),
        },
      );
    }
  };

  const confirmDelete = () => {
    if (!deleteContact) return;
    deleteMutation.mutate(
      { id: deleteContact.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() });
          toast({ title: "Contact deleted" });
          setDeleteContact(null);
        },
        onError: () => {
          toast({ title: "Failed to delete contact", variant: "destructive" });
          setDeleteContact(null);
        },
      },
    );
  };

  const grouped = useMemo(() => {
    const map = new Map<ContactType, Contact[]>();
    for (const t of CONTACT_TYPE_ORDER) map.set(t, []);
    for (const c of contacts ?? []) {
      const t = (c.contactType as ContactType);
      if (!map.has(t)) map.set(t, []);
      map.get(t)!.push(c);
    }
    return map;
  }, [contacts]);

  const totalCount = contacts?.length ?? 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-sm text-zinc-500 mt-1 max-w-2xl">
            Manage elevator companies, property managers, and other contacts. Assign them to buildings to receive inspection notifications.
          </p>
        </div>

        <Dialog
          open={isAddOpen}
          onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) {
              setEditingContact(null);
              form.reset();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-zinc-900"
              onClick={openAdd}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingContact ? "Edit Contact" : "Add New Contact"}</DialogTitle>
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
                        value={field.value ? String(field.value) : ""}
                        onValueChange={(v) => field.onChange(Number(v))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(customers ?? []).map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CONTACT_TYPE_ORDER.map((t) => (
                            <SelectItem key={t} value={t}>{CONTACT_TYPE_META[t].singular}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Schindler Elevator" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Marco Trevino" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="dispatch@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 555-0100" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-900"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingContact ? "Save Changes" : "Save Contact"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[14rem] max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or company..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="w-[14rem]">
            <SelectValue placeholder="All Customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {(customers ?? []).map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[14rem]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {CONTACT_TYPE_ORDER.map((t) => (
              <SelectItem key={t} value={t}>{CONTACT_TYPE_META[t].singular}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {totalCount > 0 && (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {totalCount} contact{totalCount === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ContactRound className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">No contacts found.</p>
          <p className="text-xs text-zinc-400 mt-1">Click <span className="font-medium">Add Contact</span> to create your first one.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {CONTACT_TYPE_ORDER.map((t) => {
            const list = grouped.get(t) ?? [];
            if (list.length === 0) return null;
            return (
              <ContactGroup
                key={t}
                type={t}
                contacts={list}
                defaultOpen
                onEdit={openEdit}
                onDelete={(c) => setDeleteContact(c)}
              />
            );
          })}
        </div>
      )}

      <AlertDialog open={deleteContact !== null} onOpenChange={(open) => { if (!open) setDeleteContact(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteContact ? contactDisplayName(deleteContact) : "contact"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This contact will be removed from all assigned buildings. This action cannot be undone.
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
