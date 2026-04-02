import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useListInspections,
  getListInspectionsQueryKey,
  useCreateInspection,
  useUpdateInspection,
  useDeleteInspection,
  useListElevators,
  getListElevatorsQueryKey,
  Inspection,
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
import { Plus, Search, Pencil, Trash2, ClipboardCheck, Download, Filter, X } from "lucide-react";
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
import { StatusBadge } from "@/components/status-badge";
import { InspectionTypeBadge } from "@/components/inspection-type-badge";
import dayjs from "dayjs";
import { useDebounce } from "@/hooks/use-debounce";

const inspectionSchema = z.object({
  elevatorId: z.coerce.number().min(1, "Elevator is required"),
  inspectionType: z.enum(["CAT1", "CAT5"] as const),
  recurrenceYears: z.coerce.number().min(1, "Recurrence is required"),
  lastInspectionDate: z.string().optional(),
  scheduledDate: z.string().optional(),
  completionDate: z.string().optional(),
  status: z.enum(["NOT_STARTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "OVERDUE"] as const).optional(),
  notes: z.string().optional(),
});

type InspectionFormValues = z.infer<typeof inspectionSchema>;

export default function Inspections() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null);
  const [showDateFilters, setShowDateFilters] = useState(false);

  const [lastInspFrom, setLastInspFrom] = useState("");
  const [lastInspTo, setLastInspTo] = useState("");
  const [nextDueFrom, setNextDueFrom] = useState("");
  const [nextDueTo, setNextDueTo] = useState("");
  const [scheduledFrom, setScheduledFrom] = useState("");
  const [scheduledTo, setScheduledTo] = useState("");
  const [completionFrom, setCompletionFrom] = useState("");
  const [completionTo, setCompletionTo] = useState("");

  const hasDateFilters = !!(lastInspFrom || lastInspTo || nextDueFrom || nextDueTo || scheduledFrom || scheduledTo || completionFrom || completionTo);

  const clearDateFilters = useCallback(() => {
    setLastInspFrom(""); setLastInspTo("");
    setNextDueFrom(""); setNextDueTo("");
    setScheduledFrom(""); setScheduledTo("");
    setCompletionFrom(""); setCompletionTo("");
  }, []);

  const statusFilter = selectedStatus !== "all" ? (selectedStatus as any) : undefined;
  const typeFilter = selectedType !== "all" ? (selectedType as "CAT1" | "CAT5") : undefined;

  const queryParams = {
    search: debouncedSearch || undefined,
    status: statusFilter,
    inspectionType: typeFilter,
    lastInspectionDateFrom: lastInspFrom || undefined,
    lastInspectionDateTo: lastInspTo || undefined,
    nextDueDateFrom: nextDueFrom || undefined,
    nextDueDateTo: nextDueTo || undefined,
    scheduledDateFrom: scheduledFrom || undefined,
    scheduledDateTo: scheduledTo || undefined,
    completionDateFrom: completionFrom || undefined,
    completionDateTo: completionTo || undefined,
  };

  const { data: inspections, isLoading } = useListInspections(
    queryParams,
    { query: { queryKey: getListInspectionsQueryKey(queryParams) } }
  );

  const { data: elevators } = useListElevators({}, { query: { queryKey: getListElevatorsQueryKey({}) } });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useCreateInspection();
  const updateMutation = useUpdateInspection();
  const deleteMutation = useDeleteInspection();

  const form = useForm<InspectionFormValues>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: { 
      elevatorId: 0, 
      inspectionType: "CAT1", 
      recurrenceYears: 1,
      status: "NOT_STARTED",
      notes: ""
    },
  });

  const onSubmit = (data: InspectionFormValues) => {
    if (editingInspection) {
      updateMutation.mutate(
        { id: editingInspection.id, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey() });
            setEditingInspection(null);
            setIsAddOpen(false);
            form.reset();
            toast({ title: "Inspection updated successfully" });
          },
          onError: () => {
            toast({ title: "Failed to update inspection", variant: "destructive" });
          },
        }
      );
    } else {
      createMutation.mutate(
        { data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey() });
            setIsAddOpen(false);
            form.reset();
            toast({ title: "Inspection added successfully" });
          },
          onError: () => {
            toast({ title: "Failed to add inspection", variant: "destructive" });
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
          queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey() });
          toast({ title: "Inspection deleted successfully" });
          setDeleteId(null);
        },
        onError: () => {
          toast({ title: "Failed to delete inspection", variant: "destructive" });
          setDeleteId(null);
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
  };

  const openEdit = (inspection: Inspection) => {
    setEditingInspection(inspection);
    form.reset({
      elevatorId: inspection.elevatorId,
      inspectionType: inspection.inspectionType,
      recurrenceYears: inspection.recurrenceYears,
      status: inspection.status,
      lastInspectionDate: inspection.lastInspectionDate ? dayjs(inspection.lastInspectionDate).format('YYYY-MM-DD') : "",
      scheduledDate: inspection.scheduledDate ? dayjs(inspection.scheduledDate).format('YYYY-MM-DD') : "",
      completionDate: inspection.completionDate ? dayjs(inspection.completionDate).format('YYYY-MM-DD') : "",
      notes: inspection.notes || "",
    });
  };

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.append("status", statusFilter);
    if (typeFilter) params.append("inspectionType", typeFilter);

    const token = localStorage.getItem("token");
    const res = await fetch(`/api/export/inspections?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      console.error("Export failed", res.status);
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `inspections_export_${date}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Auto calculate next due date in the form preview
  const watchLastDate = form.watch("lastInspectionDate");
  const watchRecurrence = form.watch("recurrenceYears");
  const nextDuePreview = watchLastDate && watchRecurrence 
    ? dayjs(watchLastDate).add(Number(watchRecurrence), 'year').format('YYYY-MM-DD')
    : "N/A";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inspections</h1>
          <p className="text-muted-foreground">Manage compliance cycles and schedules.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) {
              form.reset({ elevatorId: 0, inspectionType: "CAT1", recurrenceYears: 1, status: "NOT_STARTED", notes: "" });
              setEditingInspection(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingInspection(null);
                form.reset({ elevatorId: 0, inspectionType: "CAT1", recurrenceYears: 1, status: "NOT_STARTED", notes: "" });
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Inspection
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingInspection ? "Edit Inspection" : "Add New Inspection"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="elevatorId"
                      render={({ field }) => (
                        <FormItem className="col-span-2 md:col-span-1">
                          <FormLabel>Elevator</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value ? field.value.toString() : ""}
                            disabled={!!editingInspection} // Usually shouldn't change elevator for an inspection record
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an elevator" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {elevators?.map((elevator) => (
                                <SelectItem key={elevator.id} value={elevator.id.toString()}>
                                  {elevator.name} ({elevator.buildingName})
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
                      name="status"
                      render={({ field }) => (
                        <FormItem className="col-span-2 md:col-span-1">
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                              <SelectItem value="COMPLETED">Completed</SelectItem>
                              <SelectItem value="OVERDUE">Overdue</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="inspectionType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="CAT1">CAT1 (Annual)</SelectItem>
                              <SelectItem value="CAT5">CAT5 (5-Year)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="recurrenceYears"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recurrence (Years)</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastInspectionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Inspection Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex flex-col justify-center pt-8 text-sm text-muted-foreground">
                      Calculated Next Due: <strong>{nextDuePreview}</strong>
                    </div>
                    <FormField
                      control={form.control}
                      name="scheduledDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scheduled Date (Optional)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="completionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Completion Date (Optional)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Input placeholder="Inspector notes, compliance details..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save Inspection"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3">
          <div className="relative flex-1 w-full min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search inspections..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="NOT_STARTED">Not Started</SelectItem>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="OVERDUE">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="CAT1">CAT1</SelectItem>
              <SelectItem value="CAT5">CAT5</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={showDateFilters || hasDateFilters ? "default" : "outline"}
            size="sm"
            className="shrink-0"
            onClick={() => setShowDateFilters(v => !v)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Date Filters
            {hasDateFilters && (
              <span className="ml-1.5 rounded-full bg-white text-amber-700 text-[10px] font-bold px-1.5 py-0.5 leading-none">●</span>
            )}
          </Button>
          {hasDateFilters && (
            <Button variant="ghost" size="sm" onClick={clearDateFilters} className="text-muted-foreground">
              <X className="mr-1 h-3.5 w-3.5" />
              Clear dates
            </Button>
          )}
        </div>

        {showDateFilters && (
          <div className="rounded-lg border bg-muted/30 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Last Inspection</p>
              <div className="flex gap-1.5 items-center">
                <Input type="date" className="h-8 text-xs" value={lastInspFrom} onChange={e => setLastInspFrom(e.target.value)} placeholder="From" />
                <span className="text-muted-foreground text-xs">–</span>
                <Input type="date" className="h-8 text-xs" value={lastInspTo} onChange={e => setLastInspTo(e.target.value)} placeholder="To" />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Next Due</p>
              <div className="flex gap-1.5 items-center">
                <Input type="date" className="h-8 text-xs" value={nextDueFrom} onChange={e => setNextDueFrom(e.target.value)} placeholder="From" />
                <span className="text-muted-foreground text-xs">–</span>
                <Input type="date" className="h-8 text-xs" value={nextDueTo} onChange={e => setNextDueTo(e.target.value)} placeholder="To" />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Scheduled Date</p>
              <div className="flex gap-1.5 items-center">
                <Input type="date" className="h-8 text-xs" value={scheduledFrom} onChange={e => setScheduledFrom(e.target.value)} placeholder="From" />
                <span className="text-muted-foreground text-xs">–</span>
                <Input type="date" className="h-8 text-xs" value={scheduledTo} onChange={e => setScheduledTo(e.target.value)} placeholder="To" />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Completion Date</p>
              <div className="flex gap-1.5 items-center">
                <Input type="date" className="h-8 text-xs" value={completionFrom} onChange={e => setCompletionFrom(e.target.value)} placeholder="From" />
                <span className="text-muted-foreground text-xs">–</span>
                <Input type="date" className="h-8 text-xs" value={completionTo} onChange={e => setCompletionTo(e.target.value)} placeholder="To" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Elevator / Building</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Inspection</TableHead>
              <TableHead>Next Due</TableHead>
              <TableHead>Scheduled Date</TableHead>
              <TableHead>Completion Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Spinner />
                </TableCell>
              </TableRow>
            ) : inspections?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <ClipboardCheck className="h-10 w-10 mb-2 opacity-20" />
                    <p>No inspections found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              inspections?.map((inspection) => (
                <TableRow key={inspection.id}>
                  <TableCell>
                    <div className="font-medium">{inspection.elevatorName}</div>
                    <div className="text-xs text-muted-foreground">{inspection.buildingName}</div>
                  </TableCell>
                  <TableCell>
                    <InspectionTypeBadge type={inspection.inspectionType} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={inspection.status} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {inspection.lastInspectionDate ? dayjs(inspection.lastInspectionDate).format('MMM D, YYYY') : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className={`text-sm font-medium ${inspection.status !== "COMPLETED" && inspection.nextDueDate && dayjs(inspection.nextDueDate).isBefore(dayjs()) ? "text-destructive" : ""}`}>
                    {inspection.nextDueDate ? dayjs(inspection.nextDueDate).format('MMM D, YYYY') : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {inspection.scheduledDate ? dayjs(inspection.scheduledDate).format('MMM D, YYYY') : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {inspection.completionDate ? dayjs(inspection.completionDate).format('MMM D, YYYY') : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => {
                      openEdit(inspection);
                      setIsAddOpen(true);
                    }}>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(inspection.id)}
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
            <AlertDialogTitle>Delete Inspection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this inspection record? This action cannot be undone.
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