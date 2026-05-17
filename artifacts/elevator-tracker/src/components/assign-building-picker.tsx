import { useEffect, useMemo, useState } from "react";
import {
  useListBuildings,
  getListBuildingsQueryKey,
  useAssignBuildingContact,
  getGetContactQueryKey,
  getListContactsQueryKey,
  Building,
  Contact,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { Search, ChevronDown, ChevronRight, Info, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AssignBuildingPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
}

interface CustomerGroup {
  customerId: number;
  customerName: string;
  buildings: Building[];
}

function buildAddress(b: Building): string | null {
  const parts: string[] = [];
  if (b.address) parts.push(b.address);
  const cityState = [b.city, b.state].filter(Boolean).join(", ");
  if (cityState) parts.push(cityState);
  if (b.zip) parts.push(b.zip);
  return parts.length > 0 ? parts.join(", ") : null;
}

function matchesSearch(b: Building, term: string): boolean {
  if (!term) return true;
  const hay = [
    b.name,
    b.address,
    b.city,
    b.state,
    b.zip,
  ].filter(Boolean).join(" ").toLowerCase();
  return hay.includes(term);
}

export function AssignBuildingPicker({ open, onOpenChange, contact }: AssignBuildingPickerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const { data: allBuildings, isLoading } = useListBuildings(
    {},
    { query: { queryKey: getListBuildingsQueryKey({}), enabled: open } },
  );

  const assignMutation = useAssignBuildingContact();

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setSearch("");
      setCollapsed(new Set());
    }
  }, [open]);

  const linkedCustomerIds = useMemo(
    () => new Set((contact.customers ?? []).map((c) => c.id)),
    [contact.customers],
  );

  const alreadyAssignedBuildingIds = useMemo(
    () => new Set((contact.buildings ?? []).map((b) => b.id)),
    [contact.buildings],
  );

  const { current, other } = useMemo(() => {
    const term = search.trim().toLowerCase();
    const byCustomer = new Map<number, CustomerGroup>();
    for (const b of allBuildings ?? []) {
      if (b.customerId == null) continue;
      if (!matchesSearch(b, term)) continue;
      const g = byCustomer.get(b.customerId);
      if (g) {
        g.buildings.push(b);
      } else {
        byCustomer.set(b.customerId, {
          customerId: b.customerId,
          customerName: b.customerName ?? "Unknown Customer",
          buildings: [b],
        });
      }
    }
    const currentList: CustomerGroup[] = [];
    const otherList: CustomerGroup[] = [];
    for (const g of byCustomer.values()) {
      g.buildings.sort((a, b) => a.name.localeCompare(b.name));
      if (linkedCustomerIds.has(g.customerId)) currentList.push(g);
      else otherList.push(g);
    }
    currentList.sort((a, b) => a.customerName.localeCompare(b.customerName));
    otherList.sort((a, b) => a.customerName.localeCompare(b.customerName));
    return { current: currentList, other: otherList };
  }, [allBuildings, linkedCustomerIds, search]);

  const isAssignable = (b: Building) => !alreadyAssignedBuildingIds.has(b.id);

  const toggleBuilding = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const groupState = (group: CustomerGroup): "empty" | "indeterminate" | "checked" => {
    const assignable = group.buildings.filter(isAssignable);
    if (assignable.length === 0) return "empty";
    const sel = assignable.filter((b) => selected.has(b.id)).length;
    if (sel === 0) return "empty";
    if (sel === assignable.length) return "checked";
    return "indeterminate";
  };

  const toggleGroup = (group: CustomerGroup) => {
    const state = groupState(group);
    const assignableIds = group.buildings.filter(isAssignable).map((b) => b.id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (state === "checked") {
        for (const id of assignableIds) next.delete(id);
      } else {
        for (const id of assignableIds) next.add(id);
      }
      return next;
    });
  };

  const isCollapsed = (customerId: number) => collapsed.has(customerId);
  const toggleCollapse = (customerId: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) next.delete(customerId);
      else next.add(customerId);
      return next;
    });
  };

  const onAssign = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    const results = await Promise.allSettled(
      ids.map((bid) =>
        assignMutation.mutateAsync({
          buildingId: bid,
          data: { contactId: contact.id, receivesNotifications: true },
        }),
      ),
    );
    const okCount = results.filter((r) => r.status === "fulfilled").length;
    const failCount = results.length - okCount;

    queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetContactQueryKey(contact.id) });

    if (failCount === 0) {
      toast({
        title: `Assigned ${okCount} building${okCount === 1 ? "" : "s"}`,
      });
    } else if (okCount === 0) {
      toast({
        title: "Failed to assign buildings",
        variant: "destructive",
      });
    } else {
      toast({
        title: `${okCount} of ${results.length} buildings assigned. ${failCount} failed.`,
        variant: "destructive",
      });
    }
    onOpenChange(false);
  };

  const renderGroup = (group: CustomerGroup, opts: { showAddress: boolean; allowAlreadyAssigned: boolean }) => {
    const state = groupState(group);
    const open = !isCollapsed(group.customerId);
    return (
      <div key={group.customerId} className="space-y-1">
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={state === "checked" ? true : state === "indeterminate" ? "indeterminate" : false}
            disabled={state === "empty"}
            onCheckedChange={() => toggleGroup(group)}
            aria-label={`Toggle all in ${group.customerName}`}
          />
          <button
            type="button"
            onClick={() => toggleCollapse(group.customerId)}
            className="flex items-center gap-1 text-[12px] font-medium text-zinc-700 hover:text-zinc-900"
          >
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <span>{group.customerName}</span>
          </button>
        </div>
        {open && (
          <div className="pl-7 space-y-1">
            {group.buildings.map((b) => {
              const assigned = alreadyAssignedBuildingIds.has(b.id);
              const checked = assigned || selected.has(b.id);
              const disabled = assigned;
              const address = buildAddress(b);
              return (
                <label
                  key={b.id}
                  className={cn(
                    "flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors",
                    !disabled && "hover:bg-zinc-50 cursor-pointer",
                    disabled && "opacity-55 cursor-not-allowed",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={() => { if (!disabled) toggleBuilding(b.id); }}
                  />
                  <span className="text-[14px] text-zinc-900 truncate flex-1">{b.name}</span>
                  {disabled && opts.allowAlreadyAssigned ? (
                    <span className="text-[11px] italic text-zinc-400 shrink-0">already assigned</span>
                  ) : (
                    address && opts.showAddress && (
                      <span className="text-[11px] text-zinc-400 truncate max-w-[14rem] text-right shrink-0">{address}</span>
                    )
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const selectedCount = selected.size;
  const isAssigning = assignMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] p-0 gap-0">
        <DialogHeader className="px-[22px] pt-5 pb-4 border-b space-y-3">
          <div>
            <DialogTitle className="text-[18px] font-medium">Assign buildings</DialogTitle>
            <p className="text-[13px] text-zinc-500 mt-0.5">
              Pick the buildings that should receive {contact.companyName?.trim() || contact.contactName?.trim() || contact.email}'s notifications.
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search buildings or addresses"
              className="pl-8 h-9 text-[14px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </DialogHeader>

        <div className="max-h-[380px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <>
              {current.length > 0 && (
                <div className="px-[22px] pt-4 pb-2 space-y-3">
                  <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
                    From current customers
                  </div>
                  {current.map((g) => renderGroup(g, { showAddress: true, allowAlreadyAssigned: true }))}
                </div>
              )}

              {other.length > 0 && (
                <div className="bg-zinc-50/60 border-t px-[22px] pt-3 pb-4 space-y-3">
                  <div className="space-y-1">
                    <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
                      Other buildings in your organization
                    </div>
                    <div className="flex items-start gap-1.5 text-[11px] text-zinc-500">
                      <Info className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>Picking from here will associate the contact with the building's customer automatically.</span>
                    </div>
                  </div>
                  {other.map((g) => renderGroup(g, { showAddress: true, allowAlreadyAssigned: false }))}
                </div>
              )}

              {current.length === 0 && other.length === 0 && (
                <div className="py-12 text-center text-[14px] text-zinc-500 flex flex-col items-center gap-3">
                  <Building2 className="h-8 w-8 text-zinc-300" />
                  {search
                    ? "No buildings match your search."
                    : "No buildings in your organization yet."}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-[22px] py-[14px] border-t">
          <span className="text-[13px] text-zinc-500">
            {selectedCount} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAssigning}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onAssign}
              disabled={selectedCount === 0 || isAssigning}
              className="bg-amber-500 hover:bg-amber-600 text-zinc-900 font-medium"
            >
              {isAssigning
                ? "Assigning..."
                : `Assign ${selectedCount} building${selectedCount === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
