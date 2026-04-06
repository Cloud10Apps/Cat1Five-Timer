import { useGetStatusBreakdown, useGetOverdueByBuilding, useGetAttentionInspections, getGetStatusBreakdownQueryKey, getGetOverdueByBuildingQueryKey, getGetAttentionInspectionsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/status-badge";
import { InspectionTypeBadge } from "@/components/inspection-type-badge";
import dayjs from "dayjs";
import { FileText, AlertOctagon } from "lucide-react";

export default function Reports() {
  const { data: statusBreakdown, isLoading: loadingStatus } = useGetStatusBreakdown({ query: { queryKey: getGetStatusBreakdownQueryKey() } });
  const { data: overdueBuildings, isLoading: loadingOverdue } = useGetOverdueByBuilding({ query: { queryKey: getGetOverdueByBuildingQueryKey() } });
  const { data: upcoming, isLoading: loadingUpcoming } = useGetAttentionInspections({ query: { queryKey: getGetAttentionInspectionsQueryKey() } });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "#22c55e";
      case "OVERDUE": return "#ef4444";
      case "IN_PROGRESS": return "#eab308";
      case "SCHEDULED": return "#3b82f6";
      default: return "#94a3b8";
    }
  };

  const isLoading = loadingStatus || loadingOverdue || loadingUpcoming;

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Spinner className="h-8 w-8" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground">Portfolio compliance overview and metrics.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Inspections by Status
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusBreakdown} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="status" tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} tickFormatter={(val) => val.replace('_', ' ')} />
                  <YAxis tick={{ fill: "hsl(var(--foreground))" }} />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={60}>
                    {statusBreakdown?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertOctagon className="h-5 w-5" />
              Highest Risk Buildings (Overdue)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Building</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Overdue Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueBuildings?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No overdue inspections!
                    </TableCell>
                  </TableRow>
                ) : (
                  overdueBuildings?.slice(0, 6).map((item) => (
                    <TableRow key={item.buildingId}>
                      <TableCell className="font-medium">{item.buildingName}</TableCell>
                      <TableCell>{item.customerName}</TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10 text-destructive font-bold">
                          {item.overdueCount}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming & Attention Required</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Building</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Inspection Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcoming?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nothing requiring immediate attention.
                  </TableCell>
                </TableRow>
              ) : (
                upcoming?.map((insp) => (
                  <TableRow key={insp.id}>
                    <TableCell className="font-medium">{insp.elevatorName}</TableCell>
                    <TableCell>{insp.buildingName}</TableCell>
                    <TableCell><InspectionTypeBadge type={insp.inspectionType} /></TableCell>
                    <TableCell className={dayjs(insp.nextDueDate).isBefore(dayjs()) ? "text-destructive font-bold" : ""}>
                      {insp.nextDueDate ? dayjs(insp.nextDueDate).format("MMM D, YYYY") : "N/A"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={insp.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}