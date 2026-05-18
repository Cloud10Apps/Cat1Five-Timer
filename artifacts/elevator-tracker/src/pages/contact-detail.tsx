import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import {
  useGetContact,
  getGetContactQueryKey,
  useUpdateBuildingContact,
  useUnassignBuildingContact,
  getListContactsQueryKey,
  Contact,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
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
  ChevronDown,
  Pencil,
  Plus,
  Mail,
  Phone,
  Building2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPhone } from "@/lib/format-phone";
import { useToast } from "@/hooks/use-toast";
import {
  CONTACT_TYPE_META,
  contactDisplayName,
  type ContactType,
} from "@/components/contact-row";
import { EditContactDialog } from "@/components/contact-form-dialog";
import { AssignBuildingPicker } from "@/components/assign-building-picker";

type BuildingAssignment = NonNullable<Contact["buildings"]>[number];

export default function ContactDetail() {
  const params = useParams<{ id: string }>();
  const contactId = Number(params.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: contact, isLoading, isError } = useGetContact(contactId, {
    query: {
      queryKey: getGetContactQueryKey(contactId),
      enabled: Number.isInteger(contactId) && contactId > 0,
    },
  });

  const updateMutation = useUpdateBuildingContact();
  const unassignMutation = useUnassignBuildingContact();

  const [editOpen, setEditOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [unassignTarget, setUnassignTarget] = useState<BuildingAssignment | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetContactQueryKey(contactId) });
    queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() });
  };

  const toggleNotifications = (b: BuildingAssignment, next: boolean) => {
    updateMutation.mutate(
      { buildingId: b.id, contactId, data: { receivesNotifications: next } },
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
      { buildingId: target.id, contactId },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Building unassigned" });
          setUnassignTarget(null);
        },
        onError: () => {
          toast({ title: "Failed to unassign building", variant: "destructive" });
          setUnassignTarget(null);
        },
      },
    );
  };

  const groupedBuildings = useMemo(() => {
    const buildings = (contact?.buildings ?? []) as BuildingAssignment[];
    const groups = new Map<number, { customerId: number; customerName: string; buildings: BuildingAssignment[] }>();
    for (const b of buildings) {
      const g = groups.get(b.customerId);
      if (g) g.buildings.push(b);
      else groups.set(b.customerId, { customerId: b.customerId, customerName: b.customerName, buildings: [b] });
    }
    return Array.from(groups.values());
  }, [contact?.buildings]);

  if (!Number.isInteger(contactId) || contactId <= 0) {
    return <div className="p-10 text-center text-zinc-500">Invalid contact id.</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (isError || !contact) {
    return (
      <div className="space-y-4 animate-in fade-in duration-500">
        <div className="text-sm text-zinc-500">
          <Link href="/contacts" className="hover:text-zinc-900">Contacts</Link>
          <ChevronRight className="inline h-3.5 w-3.5 mx-1 text-zinc-400" />
          <span>Not found</span>
        </div>
        <div className="rounded-xl border bg-white p-10 text-center">
          <p className="text-base font-semibold text-zinc-800">Contact not found</p>
          <p className="text-sm text-zinc-500 mt-1">It may have been deleted, or you don't have access.</p>
        </div>
      </div>
    );
  }

  const meta = CONTACT_TYPE_META[contact.contactType as ContactType] ?? CONTACT_TYPE_META.other;
  const HeaderIcon = meta.icon;
  const displayName = contactDisplayName({
    companyName: contact.companyName,
    contactName: contact.contactName,
    email: contact.email,
  });
  const hasContactName = contact.companyName && contact.contactName;
  const customerCount = contact.customers?.length ?? 0;
  const buildingCount = contact.buildings?.length ?? 0;
  const buildings = (contact.buildings ?? []) as BuildingAssignment[];
  const receivingCount = buildings.filter((b) => b.receivesNotifications).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-zinc-500">
        <Link href="/contacts" className="hover:text-zinc-900 transition-colors">Contacts</Link>
        <ChevronRight className="h-3.5 w-3.5 mx-1 text-zinc-400" />
        <span className="text-zinc-900 font-medium truncate">{displayName}</span>
      </div>

      {/* Header card */}
      <div className="rounded-xl border bg-white p-6">
        <div className="flex items-start gap-4">
          <div className={cn(
            "flex items-center justify-center w-14 h-14 rounded-xl shrink-0",
            meta.iconBgClass,
            meta.iconColorClass,
          )}>
            <HeaderIcon className="h-7 w-7" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 leading-tight">{displayName}</h1>
              <span className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide",
                meta.badgeBgClass,
                meta.badgeTextClass,
              )}>
                {meta.singular}
              </span>
            </div>
            {hasContactName && (
              <div className="text-sm text-zinc-500 mt-1">{contact.contactName}</div>
            )}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3">
              <a
                href={`mailto:${contact.email}`}
                className="inline-flex items-center gap-1.5 text-sm text-blue-700 hover:underline"
              >
                <Mail className="h-3.5 w-3.5" />
                {contact.email}
              </a>
              {contact.phone && (
                <a
                  href={`tel:${contact.phone.replace(/\D/g, "")}`}
                  className="inline-flex items-center gap-1.5 text-sm text-blue-700 hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {formatPhone(contact.phone)}
                </a>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setEditOpen(true)}
            className="h-9 w-9 shrink-0"
            title="Edit contact"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="rounded-lg bg-zinc-50 px-4 py-3">
            <div className="text-xs text-zinc-500">Customers served</div>
            <div className="text-2xl font-bold text-zinc-900 mt-0.5">{customerCount}</div>
          </div>
          <div className="rounded-lg bg-zinc-50 px-4 py-3">
            <div className="text-xs text-zinc-500">Building assignments</div>
            <div className="text-2xl font-bold text-zinc-900 mt-0.5">{buildingCount}</div>
          </div>
          <div className="rounded-lg bg-zinc-50 px-4 py-3">
            <div className="text-xs text-zinc-500">Receiving notifications</div>
            <div className="mt-0.5">
              <span className="text-2xl font-bold text-zinc-900">{receivingCount}</span>
              <span className="text-sm text-zinc-400 font-normal"> / {buildingCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Building Assignments section */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b">
          <div className="min-w-0">
            <div className="text-base font-semibold text-zinc-900">Building assignments</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              Each toggle controls whether this contact receives inspection notifications for that building.
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setPickerOpen(true)}
            className="h-9 px-3 text-sm font-medium shrink-0"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Assign building
          </Button>
        </div>

        {groupedBuildings.length === 0 ? (
          <div className="py-12 text-center">
            <Building2 className="h-10 w-10 mx-auto mb-3 text-zinc-300" />
            <p className="text-sm text-zinc-700 font-medium">No building assignments yet.</p>
            <p className="text-xs text-zinc-400 mt-1">Click <span className="font-medium">Assign building</span> to add one.</p>
          </div>
        ) : (
          <div className="pb-2 divide-y divide-zinc-100">
            {groupedBuildings.map((group) => {
              const open = !collapsed.has(group.customerId);
              return (
                <div key={group.customerId}>
                  <button
                    type="button"
                    onClick={() => setCollapsed((prev) => {
                      const next = new Set(prev);
                      if (next.has(group.customerId)) next.delete(group.customerId);
                      else next.add(group.customerId);
                      return next;
                    })}
                    className="flex items-center gap-2 w-full text-left px-6 pt-4 pb-2 hover:bg-zinc-50 transition-colors"
                  >
                    {open
                      ? <ChevronDown className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                      : <ChevronRight className="h-3.5 w-3.5 text-zinc-500 shrink-0" />}
                    <span className="text-sm font-semibold text-zinc-900">{group.customerName}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
                      {group.buildings.length}
                    </span>
                  </button>
                  {open && (
                    <div className="px-6 pb-2">
                      {group.buildings.map((b, idx) => (
                        <div
                          key={b.id}
                          className={cn(
                            "flex items-center gap-3 py-2 pl-6",
                            idx > 0 && "border-t border-zinc-50",
                          )}
                        >
                          <Link
                            href={`/buildings/${b.id}`}
                            className="flex-1 text-sm text-zinc-900 hover:text-amber-700 hover:underline truncate"
                          >
                            {b.name}
                          </Link>
                          <Switch
                            checked={b.receivesNotifications}
                            onCheckedChange={(next) => toggleNotifications(b, next)}
                            aria-label={`Notifications ${b.receivesNotifications ? "on" : "off"} for ${b.name}`}
                            className="data-[state=checked]:bg-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => setUnassignTarget(b)}
                            className="p-1 text-zinc-400 hover:text-red-600 transition-colors"
                            title={`Unassign ${b.name}`}
                            aria-label={`Unassign ${b.name}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <EditContactDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        contact={contact}
      />

      <AssignBuildingPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        contact={contact}
      />

      <AlertDialog open={unassignTarget !== null} onOpenChange={(o) => { if (!o) setUnassignTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Unassign {unassignTarget?.name ?? "building"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {displayName} will stop receiving notifications for this building. The contact stays in your Contacts list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnassign}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Unassign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
