import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import {
  useGetBuilding,
  getGetBuildingQueryKey,
  useListContacts,
  getListContactsQueryKey,
  useListBuildingContacts,
  getListBuildingContactsQueryKey,
  useAssignBuildingContact,
  useUpdateBuildingContact,
  useUnassignBuildingContact,
  Contact,
  BuildingContact,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ChevronRight,
  Building2,
  MapPin,
  Users,
  Plus,
  Search,
  X,
  ContactRound,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBuildingCompliance } from "@/hooks/use-building-compliance";
import {
  ContactRow,
  CONTACT_TYPE_META,
  contactDisplayName,
  type ContactType,
} from "@/components/contact-row";
import { CreateContactDialog } from "@/components/contact-form-dialog";

function formatAddress(b: { address?: string; city?: string; state?: string; zip?: string }): string | null {
  const parts: string[] = [];
  if (b.address) parts.push(b.address);
  const cityState = [b.city, b.state].filter(Boolean).join(", ");
  if (cityState) parts.push(cityState);
  if (b.zip) parts.push(b.zip);
  return parts.length > 0 ? parts.join(", ") : null;
}

interface AssignPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: number;
  customerName: string;
  alreadyAssignedContactIds: Set<number>;
  onSelect: (contactId: number, source: "customer" | "org") => void;
  onAddNew: () => void;
}

interface PickerSectionProps {
  title: string;
  subtitle?: string;
  contacts: Contact[];
  emptyText: string;
  onSelect: (contactId: number) => void;
}

function PickerSection({ title, subtitle, contacts, emptyText, onSelect }: PickerSectionProps) {
  return (
    <div>
      <div className="px-1 pb-2">
        <div className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-700">{title}</div>
        {subtitle && <div className="text-[11px] text-zinc-500 mt-0.5">{subtitle}</div>}
      </div>
      {contacts.length === 0 ? (
        <div className="px-3 py-4 text-xs text-zinc-400 italic">{emptyText}</div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {contacts.map((c) => {
            const meta = CONTACT_TYPE_META[c.contactType as ContactType] ?? CONTACT_TYPE_META.other;
            const Icon = meta.icon;
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md border bg-white hover:bg-amber-50/40 hover:border-amber-200 transition-colors"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-amber-50 text-amber-600 shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900 truncate">
                      {contactDisplayName(c)}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase tracking-wide shrink-0">
                      {meta.singular}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 truncate">
                    {c.contactName && c.companyName ? `${c.contactName} · ` : ""}{c.email}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AssignContactPicker({
  open,
  onOpenChange,
  customerId,
  customerName,
  alreadyAssignedContactIds,
  onSelect,
  onAddNew,
}: AssignPickerProps) {
  const [search, setSearch] = useState("");

  const { data: allOrgContacts, isLoading } = useListContacts(
    {},
    {
      query: {
        queryKey: getListContactsQueryKey({}),
        enabled: open,
      },
    },
  );

  const { customerContacts, otherContacts } = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matchesSearch = (c: Contact) => {
      if (!term) return true;
      const hay = [c.companyName, c.contactName, c.email].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(term);
    };
    const customerSet: Contact[] = [];
    const otherSet: Contact[] = [];
    for (const c of allOrgContacts ?? []) {
      if (alreadyAssignedContactIds.has(c.id)) continue;
      if (!matchesSearch(c)) continue;
      const inCustomer = (c.customers ?? []).some((cu) => cu.id === customerId);
      if (inCustomer) customerSet.push(c);
      else otherSet.push(c);
    }
    return { customerContacts: customerSet, otherContacts: otherSet };
  }, [allOrgContacts, alreadyAssignedContactIds, customerId, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Contact</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="max-h-[26rem] overflow-y-auto -mx-1 px-1 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Spinner />
            </div>
          ) : (
            <>
              <PickerSection
                title={`Contacts for ${customerName}`}
                contacts={customerContacts}
                emptyText="No contacts for this customer yet."
                onSelect={(id) => onSelect(id, "customer")}
              />
              {otherContacts.length > 0 && <div className="border-t" />}
              {otherContacts.length > 0 && (
                <PickerSection
                  title="Other contacts in your organization"
                  subtitle={`Picking one will also associate it with ${customerName}.`}
                  contacts={otherContacts}
                  emptyText=""
                  onSelect={(id) => onSelect(id, "org")}
                />
              )}
              {customerContacts.length === 0 && otherContacts.length === 0 && (allOrgContacts ?? []).length > 0 && (
                <div className="py-6 text-center text-sm text-zinc-500">
                  All matching contacts are already assigned to this building.
                </div>
              )}
            </>
          )}
        </div>

        <Button
          variant="outline"
          onClick={onAddNew}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Contact
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default function BuildingDetail() {
  const params = useParams<{ id: string }>();
  const buildingId = Number(params.id);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: building, isLoading: buildingLoading, isError } = useGetBuilding(buildingId, {
    query: {
      queryKey: getGetBuildingQueryKey(buildingId),
      enabled: Number.isInteger(buildingId) && buildingId > 0,
    },
  });

  const { data: assigned, isLoading: assignedLoading } = useListBuildingContacts(
    buildingId,
    {
      query: {
        queryKey: getListBuildingContactsQueryKey(buildingId),
        enabled: Number.isInteger(buildingId) && buildingId > 0,
      },
    },
  );

  const elevatorCount = building?.elevatorCount ?? 0;
  const { overdueCount, level } = useBuildingCompliance(building?.id, elevatorCount);

  const assignMutation = useAssignBuildingContact();
  const updateMutation = useUpdateBuildingContact();
  const unassignMutation = useUnassignBuildingContact();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [unassignTarget, setUnassignTarget] = useState<BuildingContact | null>(null);

  const assignedIds = useMemo(() => new Set((assigned ?? []).map((a) => a.contactId)), [assigned]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListBuildingContactsQueryKey(buildingId) });
    queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() });
  };

  const assignExisting = (contactId: number, source: "customer" | "org" = "customer", contactName?: string) => {
    assignMutation.mutate(
      { buildingId, data: { contactId, receivesNotifications: true } },
      {
        onSuccess: () => {
          invalidate();
          if (source === "org" && building?.customerName) {
            toast({
              title: "Contact assigned",
              description: `${contactName ?? "Contact"} is now associated with ${building.customerName}.`,
            });
          } else {
            toast({ title: "Contact assigned" });
          }
          setPickerOpen(false);
        },
        onError: () => toast({ title: "Failed to assign contact", variant: "destructive" }),
      },
    );
  };

  const handleNewContactCreated = (c: Contact) => {
    setFormDialogOpen(false);
    // New contact path always pre-fills the building's customer in the form,
    // so it's already "for this customer" — use the simple toast.
    assignExisting(c.id, "customer");
  };

  const handleToggle = (bc: BuildingContact, next: boolean) => {
    updateMutation.mutate(
      { buildingId, contactId: bc.contactId, data: { receivesNotifications: next } },
      {
        onSuccess: () => invalidate(),
        onError: () => toast({ title: "Failed to update notification setting", variant: "destructive" }),
      },
    );
  };

  const confirmUnassign = () => {
    if (!unassignTarget) return;
    const target = unassignTarget;
    unassignMutation.mutate(
      { buildingId, contactId: target.contactId },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Contact unassigned" });
          setUnassignTarget(null);
        },
        onError: () => {
          toast({ title: "Failed to unassign contact", variant: "destructive" });
          setUnassignTarget(null);
        },
      },
    );
  };

  if (!Number.isInteger(buildingId) || buildingId <= 0) {
    return (
      <div className="p-10 text-center text-zinc-500">Invalid building id.</div>
    );
  }

  if (buildingLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (isError || !building) {
    return (
      <div className="space-y-4 animate-in fade-in duration-500">
        <div className="text-sm text-zinc-500">
          <Link href="/buildings" className="hover:text-zinc-900">Buildings</Link>
          <ChevronRight className="inline h-3.5 w-3.5 mx-1 text-zinc-400" />
          <span>Not found</span>
        </div>
        <div className="rounded-xl border bg-white p-10 text-center">
          <p className="text-base font-semibold text-zinc-800">Building not found</p>
          <p className="text-sm text-zinc-500 mt-1">It may have been deleted, or you don't have access.</p>
        </div>
      </div>
    );
  }

  const address = formatAddress(building);

  let complianceBadge: React.ReactNode = null;
  if (level === "overdue") {
    complianceBadge = (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-red-50 text-red-700 border border-red-200">
        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
        {overdueCount} Overdue
      </span>
    );
  } else if (level === "due-soon") {
    complianceBadge = (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
        Due Soon
      </span>
    );
  } else if (level === "compliant") {
    complianceBadge = (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-green-50 text-green-700 border border-green-200">
        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
        Compliant
      </span>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-zinc-500">
        <Link href="/buildings" className="hover:text-zinc-900 transition-colors">Buildings</Link>
        <ChevronRight className="h-3.5 w-3.5 mx-1 text-zinc-400" />
        <span className="text-zinc-900 font-medium truncate">{building.name}</span>
      </div>

      {/* Header */}
      <div className="rounded-xl border bg-white p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-zinc-100 text-zinc-700 shrink-0">
              <Building2 className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{building.name}</h1>
              {building.customerName && (
                <div className="flex items-center gap-1.5 mt-1 text-sm text-zinc-500">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{building.customerName}</span>
                </div>
              )}
              {address ? (
                <div className="flex items-start gap-1.5 mt-1 text-sm text-zinc-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{address}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-1 text-sm text-zinc-300 italic">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>No address on file</span>
                </div>
              )}
              {(building as any).locationId && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-500 text-xs font-medium mt-2">
                  LOC: {(building as any).locationId}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-1 text-xs font-semibold">
              <Building2 className="h-3 w-3" />
              {elevatorCount} {elevatorCount === 1 ? "Unit" : "Units"}
            </span>
            {complianceBadge}
          </div>
        </div>
      </div>

      {/* Contacts section */}
      <div className="rounded-xl border bg-white">
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Notification Contacts</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Who receives inspection notifications for this building.</p>
          </div>
          <Button
            className="bg-amber-500 hover:bg-amber-600 text-zinc-900"
            onClick={() => setPickerOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Assign Contact
          </Button>
        </div>

        <div className="p-4">
          {assignedLoading ? (
            <div className="flex items-center justify-center py-10">
              <Spinner />
            </div>
          ) : (assigned ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ContactRound className="h-10 w-10 mb-3 text-zinc-300" />
              <p className="text-sm text-zinc-700 font-medium">No contacts assigned to this building yet.</p>
              <p className="text-xs text-zinc-400 mt-1">Click <span className="font-medium">Assign Contact</span> to add one.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {(assigned ?? []).map((bc) => (
                <ContactRow
                  key={bc.id}
                  contactType={bc.contactType}
                  companyName={bc.companyName}
                  contactName={bc.contactName}
                  email={bc.email}
                  phone={bc.phone}
                  trailingActions={
                    <>
                      <div className="flex items-center gap-2 mr-2">
                        <Switch
                          checked={bc.receivesNotifications}
                          onCheckedChange={(checked) => handleToggle(bc, checked)}
                          aria-label="Receives notifications"
                        />
                        <span className="text-xs text-zinc-500 hidden sm:inline">Notifications</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setUnassignTarget(bc)}
                        title="Unassign"
                      >
                        <X className="h-3.5 w-3.5 text-zinc-500" />
                      </Button>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AssignContactPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        customerId={building.customerId}
        customerName={building.customerName ?? "this customer"}
        alreadyAssignedContactIds={assignedIds}
        onSelect={(contactId, source) => assignExisting(contactId, source)}
        onAddNew={() => {
          setPickerOpen(false);
          setFormDialogOpen(true);
        }}
      />

      <CreateContactDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        onSuccess={handleNewContactCreated}
      />

      <AlertDialog open={unassignTarget !== null} onOpenChange={(open) => { if (!open) setUnassignTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {unassignTarget ? contactDisplayName({
                companyName: unassignTarget.companyName,
                contactName: unassignTarget.contactName,
                email: unassignTarget.email,
              }) : "contact"} from this building's notifications?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The contact will remain in your master Contacts list — only this building assignment is removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnassign}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
