import { useMemo, useState } from "react";
import {
  useListContacts,
  getListContactsQueryKey,
  useDeleteContact,
  useListCustomers,
  getListCustomersQueryKey,
  Contact,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ContactRound,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { useDebounce } from "@/hooks/use-debounce";
import {
  ContactRow,
  CONTACT_TYPE_ORDER,
  CONTACT_TYPE_META,
  contactDisplayName,
  type ContactType,
} from "@/components/contact-row";
import { ContactFormDialog } from "@/components/contact-form-dialog";

function buildingPreview(c: Contact): string | null {
  const count = c.buildingCount ?? 0;
  if (count === 0) return null;
  const preview = c.buildingNamesPreview?.[0];
  if (!preview) return `${count} building${count === 1 ? "" : "s"}`;
  const extra = count - 1;
  if (extra <= 0) return `${count} building — ${preview}`;
  return `${count} buildings — ${preview}, +${extra} more`;
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
          {contacts.map((c) => {
            const preview = buildingPreview(c);
            return (
              <ContactRow
                key={c.id}
                contactType={c.contactType}
                companyName={c.companyName}
                contactName={c.contactName}
                email={c.email}
                phone={c.phone}
                customerName={c.customerName}
                rightDetail={preview ?? <span className="text-zinc-300">No buildings</span>}
                trailingActions={
                  <>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(c)} title="Edit">
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(c)} title="Delete">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </>
                }
              />
            );
          })}
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

  const [isFormOpen, setIsFormOpen] = useState(false);
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

  const deleteMutation = useDeleteContact();

  const openAdd = () => {
    setEditingContact(null);
    setIsFormOpen(true);
  };

  const openEdit = (c: Contact) => {
    setEditingContact(c);
    setIsFormOpen(true);
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
  const defaultCustomerId = customerFilter !== "all" ? Number(customerFilter) : undefined;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-sm text-zinc-500 mt-1 max-w-2xl">
            Manage elevator companies, property managers, and other contacts. Assign them to buildings to receive inspection notifications.
          </p>
        </div>

        <Button
          className="bg-amber-500 hover:bg-amber-600 text-zinc-900"
          onClick={openAdd}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </div>

      <ContactFormDialog
        open={isFormOpen}
        onOpenChange={(o) => {
          setIsFormOpen(o);
          if (!o) setEditingContact(null);
        }}
        editingContact={editingContact}
        defaultCustomerId={editingContact ? undefined : defaultCustomerId}
      />

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
              Delete {deleteContact ? contactDisplayName({
                companyName: deleteContact.companyName,
                contactName: deleteContact.contactName,
                email: deleteContact.email,
              }) : "contact"}?
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
