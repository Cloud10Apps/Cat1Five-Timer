import { useGetDashboardSummary, useGetAttentionInspections, useGetStatusBreakdown, getGetDashboardSummaryQueryKey, getGetAttentionInspectionsQueryKey, getGetStatusBreakdownQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { Spinner } from "@/components/ui/spinner";
import { ArrowUpSquare, AlertTriangle, Calendar as CalendarIcon, CheckCircle2, Info } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import dayjs from "dayjs";
import { STATUS_COLORS } from "@/components/status-badge";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: attention, isLoading: loadingAttention } = useGetAttentionInspections({ query: { queryKey: getGetAttentionInspectionsQueryKey() } });
  const { data: breakdown, isLoading: loadingBreakdown } = useGetStatusBreakdown({ query: { queryKey: getGetStatusBreakdownQueryKey() } });

  if (loadingSummary || loadingAttention || loadingBreakdown) {
    return <div className="flex h-[50vh] items-center justify-center"><Spinner size="lg" /></div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "#22c55e";
      case "OVERDUE": return "#ef4444";
      case "IN_PROGRESS": return "#eab308";
      case "SCHEDULED": return "#3b82f6";
      default: return "#94a3b8";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Elevators</CardTitle>
            <ArrowUpSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalElevators || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due This Month</CardTitle>
            <Info className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.duethisMonth || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{summary?.overdueCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.scheduledCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Inspections Requiring Attention</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Elevator</TableHead>
                  <TableHead>Building</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attention?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No inspections requiring immediate attention.
                    </TableCell>
                  </TableRow>
                )}
                {attention?.map((inspection) => (
                  <TableRow key={inspection.id}>
                    <TableCell className="font-medium">{inspection.elevatorName}</TableCell>
                    <TableCell>{inspection.buildingName}</TableCell>
                    <TableCell>
                      <span className={dayjs(inspection.nextDueDate).isBefore(dayjs()) ? "text-destructive font-semibold" : ""}>
                        {inspection.nextDueDate ? dayjs(inspection.nextDueDate).format("MMM D, YYYY") : "N/A"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={inspection.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakdown}>
                  <XAxis dataKey="status" tick={{ fontSize: 12 }} tickFormatter={(val) => val.replace('_', ' ')} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {breakdown?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}