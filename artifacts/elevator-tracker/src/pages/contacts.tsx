import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  useListContacts,
  getListContactsQueryKey,
  useDeleteContact,
  useListCustomers,
  getListCustomersQueryKey,
  useListBuildings,
  getListBuildingsQueryKey,
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
  Trash2,
  ChevronDown,
  ChevronRight,
  ContactRound,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import {
  ContactRow,
  CONTACT_TYPE_ORDER,
  CONTACT_TYPE_META,
  contactDisplayName,
  type ContactType,
} from "@/components/contact-row";
import { CreateContactDialog } from "@/components/contact-form-dialog";

interface ContactGroupProps {
  type: ContactType;
  contacts: Contact[];
  defaultOpen: boolean;
  onRowClick: (c: Contact) => void;
  onDelete: (c: Contact) => void;
}

function ContactGroup({ type, contacts, defaultOpen, onRowClick, onDelete }: ContactGroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = CONTACT_TYPE_META[type];
  const Icon = meta.icon;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center gap-3 px-1 py-2 hover:bg-zinc-50 rounded-md transition-colors">
          {open ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
          <Icon className={cn("h-[18px] w-[18px]", meta.iconColorClass)} />
          <span className="text-xs font-medium uppercase tracking-[0.06em] text-zinc-700">{meta.label}</span>
          <span className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-[9px] rounded-full bg-zinc-100 text-zinc-600 text-xs font-medium">
            {contacts.length}
          </span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-2 pl-7 pr-1 pt-2 pb-3">
          {contacts.map((c) => {
            const cCount = c.customers?.length ?? 0;
            const bCount = c.buildingCount ?? c.buildings?.length ?? 0;
            return (
              <ContactRow
                key={c.id}
                contactType={c.contactType}
                companyName={c.companyName}
                contactName={c.contactName}
                email={c.email}
                phone={c.phone}
                size="lg"
                onClick={() => onRowClick(c)}
                rightDetail={
                  <div className="flex flex-col items-end gap-0.5 text-zinc-500 leading-tight">
                    <div>
                      <span className="text-[14px] font-medium text-zinc-900">{cCount}</span>{" "}
                      <span className="text-[12px]">customer{cCount === 1 ? "" : "s"}</span>
                    </div>
                    <div>
                      <span className="text-[14px] font-medium text-zinc-900">{bCount}</span>{" "}
                      <span className="text-[12px]">building{bCount === 1 ? "" : "s"}</span>
                    </div>
                  </div>
                }
                trailingActions={
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); onDelete(c); }}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-zinc-400" />
                    </Button>
                    <ChevronRight className="h-[18px] w-[18px] text-zinc-300 ml-1" />
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
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteContact, setDeleteContact] = useState<Contact | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const listParams = useMemo(() => {
    const p: { customerId?: number; buildingId?: number; contactType?: ContactType; search?: string } = {};
    if (customerFilter !== "all") p.customerId = Number(customerFilter);
    if (buildingFilter !== "all") p.buildingId = Number(buildingFilter);
    if (typeFilter !== "all") p.contactType = typeFilter as ContactType;
    if (debouncedSearch) p.search = debouncedSearch;
    return p;
  }, [customerFilter, buildingFilter, typeFilter, debouncedSearch]);

  const { data: contacts, isLoading } = useListContacts(listParams, {
    query: { queryKey: getListContactsQueryKey(listParams) },
  });

  // Unfiltered count for the "Showing X of Y" line.
  const { data: allContacts } = useListContacts(
    {},
    { query: { queryKey: getListContactsQueryKey({}) } },
  );

  const { data: customers } = useListCustomers(
    {},
    { query: { queryKey: getListCustomersQueryKey() } },
  );

  const buildingsParams = useMemo(() => {
    return customerFilter !== "all" ? { customerId: Number(customerFilter) } : {};
  }, [customerFilter]);
  const { data: buildings } = useListBuildings(
    buildingsParams,
    { query: { queryKey: getListBuildingsQueryKey(buildingsParams) } },
  );

  const deleteMutation = useDeleteContact();

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

  const totalShown = contacts?.length ?? 0;
  const totalAll = allContacts?.length ?? 0;

  // Portfolio-wide stats (filter-agnostic).
  const contactCount = allContacts?.length ?? 0;
  const customersServed = useMemo(() => {
    const set = new Set<number>();
    for (const c of allContacts ?? []) {
      for (const x of c.customers ?? []) set.add(x.id);
    }
    return set.size;
  }, [allContacts]);
  const buildingAssignments = useMemo(
    () =>
      (allContacts ?? []).reduce(
        (sum, c) => sum + (c.buildingCount ?? c.buildings?.length ?? 0),
        0,
      ),
    [allContacts],
  );

  const hasActiveFilters =
    search !== "" ||
    customerFilter !== "all" ||
    buildingFilter !== "all" ||
    typeFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setCustomerFilter("all");
    setBuildingFilter("all");
    setTypeFilter("all");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[24px] font-medium tracking-tight">Contacts</h1>
          <p className="text-[14px] text-zinc-500 mt-1 max-w-[480px]">
            Manage elevator companies, property managers, and other contacts. Assign them to buildings to receive inspection notifications.
          </p>
        </div>

        <Button
          className="h-10 px-[18px] bg-[#EF9F27] hover:bg-amber-600 text-[#412402] font-medium"
          onClick={() => setIsAddOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </div>

      <CreateContactDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={(c) => navigate(`/contacts/${c.id}`)}
      />

      <div className="flex items-baseline gap-6 text-[13px] text-zinc-500">
        <span>
          <span className="text-[16px] font-medium text-zinc-900">{contactCount}</span>{" "}
          contact{contactCount === 1 ? "" : "s"}
        </span>
        <span className="text-zinc-300" aria-hidden="true">·</span>
        <span>
          <span className="text-[16px] font-medium text-zinc-900">{customersServed}</span>{" "}
          customer{customersServed === 1 ? "" : "s"} served
        </span>
        <span className="text-zinc-300" aria-hidden="true">·</span>
        <span>
          <span className="text-[16px] font-medium text-zinc-900">{buildingAssignments}</span>{" "}
          building assignment{buildingAssignments === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[14rem] max-w-md">
          <Search className="absolute left-2.5 top-[9px] h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or company..."
            className="pl-8 h-9 text-[14px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
            Customer
          </label>
          <Select value={customerFilter} onValueChange={(v) => { setCustomerFilter(v); setBuildingFilter("all"); }}>
            <SelectTrigger className="w-[12rem] h-9 text-[14px]">
              <SelectValue placeholder="All customers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All customers</SelectItem>
              {(customers ?? []).map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
            Building
          </label>
          <Select value={buildingFilter} onValueChange={setBuildingFilter}>
            <SelectTrigger className="w-[12rem] h-9 text-[14px]">
              <SelectValue placeholder="All buildings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All buildings</SelectItem>
              {(buildings ?? []).map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
            Type
          </label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[12rem] h-9 text-[14px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {CONTACT_TYPE_ORDER.map((t) => (
                <SelectItem key={t} value={t}>{CONTACT_TYPE_META[t].singular}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between text-[13px]">
        <span className="text-zinc-500">
          {hasActiveFilters
            ? <>Showing <span className="font-medium text-zinc-700">{totalShown}</span> of {totalAll} contact{totalAll === 1 ? "" : "s"}</>
            : <>{totalAll} contact{totalAll === 1 ? "" : "s"}</>
          }
        </span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" />
            Clear filters
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : totalShown === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ContactRound className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">{hasActiveFilters ? "No contacts match your filters." : "No contacts found."}</p>
          {!hasActiveFilters && (
            <p className="text-xs text-zinc-400 mt-1">Click <span className="font-medium">Add Contact</span> to create your first one.</p>
          )}
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
                onRowClick={(c) => navigate(`/contacts/${c.id}`)}
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
              This contact will be removed from all assigned buildings and customer associations. This action cannot be undone.
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
