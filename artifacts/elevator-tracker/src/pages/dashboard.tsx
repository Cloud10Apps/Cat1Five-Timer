import {
  useGetDashboardSummary,
  useGetAttentionInspections,
  useGetStatusBreakdown,
  getGetDashboardSummaryQueryKey,
  getGetAttentionInspectionsQueryKey,
  getGetStatusBreakdownQueryKey,
} from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { Spinner } from "@/components/ui/spinner";
import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import dayjs from "dayjs";
import { useLocation } from "wouter";

const getStatusColor = (status: string) => {
  switch (status) {
    case "COMPLETED":   return "#22c55e";
    case "OVERDUE":     return "#ef4444";
    case "IN_PROGRESS": return "#f59e0b";
    case "SCHEDULED":   return "#18181b";
    default:            return "#a1a1aa";
  }
};

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });
  const { data: attention, isLoading: loadingAttention } = useGetAttentionInspections({
    query: { queryKey: getGetAttentionInspectionsQueryKey() },
  });
  const { data: breakdown, isLoading: loadingBreakdown } = useGetStatusBreakdown({
    query: { queryKey: getGetStatusBreakdownQueryKey() },
  });

  if (loadingSummary || loadingAttention || loadingBreakdown) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const overdueCount = summary?.overdueCount ?? 0;
  const isAllClear = overdueCount === 0;
  const overdueItems = attention?.filter((i) => i.status === "OVERDUE") ?? [];

  return (
    <div className="flex flex-col min-h-full -m-6 lg:-m-8">

      {/* Hero Alert Banner */}
      <div className={`w-full py-6 px-8 flex items-center shadow-md ${isAllClear ? "bg-green-600" : "bg-red-600"}`}>
        <div className="flex items-start gap-4 flex-1">
          {isAllClear ? (
            <CheckCircle2 className="h-12 w-12 text-green-200 mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle className="h-12 w-12 text-red-200 mt-0.5 shrink-0" />
          )}
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              {isAllClear ? "All Systems Go" : `${overdueCount} Overdue Inspection${overdueCount !== 1 ? "s" : ""}`}
            </h1>
            <p className={`text-sm mt-1 font-medium ${isAllClear ? "text-green-100" : "text-red-100"}`}>
              {isAllClear
                ? "All elevators are fully compliant and up to date."
                : "Immediate attention required. These elevators are past their compliance deadline."}
            </p>
          </div>
        </div>
        {!isAllClear && (
          <div className="ml-auto pl-4">
            <button
              onClick={() => setLocation("/inspections")}
              className="bg-white text-red-700 font-bold text-sm px-5 py-2.5 rounded-lg shadow-sm hover:bg-red-50 transition-all flex items-center gap-1.5"
            >
              View All Overdue <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Stats Strip */}
      <div className="bg-white border-b border-zinc-200 px-8 py-5 flex items-center shadow-sm">
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 font-bold mb-1">Total Elevators</span>
          <span className="text-3xl font-black text-zinc-900 leading-none">{summary?.totalElevators ?? 0}</span>
        </div>
        <div className="w-px h-10 bg-zinc-200 mx-8" />
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 font-bold mb-1">Due This Month</span>
          <span className="text-3xl font-black text-zinc-900 leading-none">{summary?.duethisMonth ?? 0}</span>
        </div>
        <div className="w-px h-10 bg-zinc-200 mx-8" />
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 font-bold mb-1">Overdue</span>
          <span className="text-3xl font-black text-red-600 leading-none">{overdueCount}</span>
        </div>
        <div className="w-px h-10 bg-zinc-200 mx-8" />
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 font-bold mb-1">Scheduled</span>
          <span className="text-3xl font-black text-zinc-900 leading-none">{summary?.scheduledCount ?? 0}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 bg-zinc-50">
        <div className="grid grid-cols-7 gap-6">

          {/* Attention Table */}
          <div className="col-span-4 bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-100 flex items-center gap-3">
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">Inspections Requiring Attention</h2>
              {overdueItems.length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700 tracking-wide">
                  {overdueItems.length} OVERDUE
                </span>
              )}
            </div>
            <div className="overflow-auto flex-1">
              <Table>
                <TableHeader className="bg-zinc-50/80">
                  <TableRow className="hover:bg-transparent border-b-zinc-200">
                    <TableHead className="font-semibold text-zinc-500 h-11 text-xs uppercase tracking-wider">Elevator</TableHead>
                    <TableHead className="font-semibold text-zinc-500 h-11 text-xs uppercase tracking-wider">Building</TableHead>
                    <TableHead className="font-semibold text-zinc-500 h-11 text-xs uppercase tracking-wider">Due Date</TableHead>
                    <TableHead className="font-semibold text-zinc-500 h-11 text-xs uppercase tracking-wider">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!attention || attention.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-zinc-400 py-8 text-sm">
                        No inspections requiring immediate attention.
                      </TableCell>
                    </TableRow>
                  )}
                  {attention?.map((inspection) => (
                    <TableRow key={inspection.id} className="border-b-zinc-100 hover:bg-zinc-50/50 transition-colors">
                      <TableCell className="font-bold text-zinc-900">{inspection.elevatorName}</TableCell>
                      <TableCell className="text-zinc-600 font-medium">{inspection.buildingName}</TableCell>
                      <TableCell>
                        <span className={dayjs(inspection.nextDueDate).isBefore(dayjs()) ? "text-red-600 font-bold" : "text-zinc-600 font-medium"}>
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
            </div>
          </div>

          {/* Status Breakdown Chart */}
          <div className="col-span-3 bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-100">
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">Status Breakdown</h2>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-center">
              <div className="w-full h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={breakdown} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <XAxis
                      dataKey="status"
                      tick={{ fontSize: 11, fill: "#71717a", fontWeight: 600 }}
                      tickFormatter={(val) => val.replace("_", " ")}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#71717a", fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      dx={-10}
                    />
                    <Tooltip
                      cursor={{ fill: "#f4f4f5" }}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e4e4e7",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        fontWeight: 500,
                        fontSize: "13px",
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={50}>
                      {breakdown?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
