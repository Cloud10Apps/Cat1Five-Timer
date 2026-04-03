import {
  useGetDashboardSummary,
  useGetAttentionInspections,
  useGetStatusBreakdown,
  useGetOverdueByBuilding,
  getGetDashboardSummaryQueryKey,
  getGetAttentionInspectionsQueryKey,
  getGetStatusBreakdownQueryKey,
  getGetOverdueByBuildingQueryKey,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { InspectionTypeBadge } from "@/components/inspection-type-badge";
import { Spinner } from "@/components/ui/spinner";
import { AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  Legend,
} from "recharts";
import dayjs from "dayjs";

/* ─── colour helpers ─── */
const getStatusColor = (status: string) => {
  switch (status) {
    case "COMPLETED":   return "#22c55e";
    case "OVERDUE":     return "#ef4444";
    case "IN_PROGRESS": return "#f59e0b";
    case "SCHEDULED":   return "#3b82f6";
    default:            return "#d4d4d8";
  }
};

/* ─── monthly-forecast fetcher (not in generated client) ─── */
type MonthBucket = { key: string; label: string; due: number; scheduled: number; completed: number };

async function fetchMonthlyForecast(): Promise<MonthBucket[]> {
  const token = localStorage.getItem("token");
  const res = await fetch("/api/dashboard/monthly-forecast", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch monthly forecast");
  return res.json();
}

/* ─── Light-themed status badge ─── */
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    OVERDUE:     "bg-red-100 text-red-700 border-red-200",
    SCHEDULED:   "bg-blue-100 text-blue-700 border-blue-200",
    NOT_STARTED: "bg-zinc-100 text-zinc-600 border-zinc-200",
    IN_PROGRESS: "bg-amber-100 text-amber-700 border-amber-200",
    COMPLETED:   "bg-green-100 text-green-700 border-green-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${styles[status] ?? styles.NOT_STARTED}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

/* ─── Section card header ─── */
function SectionHeader({ title, badge }: { title: string; badge?: React.ReactNode }) {
  return (
    <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-2">
      <h3 className="text-sm font-semibold text-zinc-700">{title}</h3>
      {badge}
    </div>
  );
}

export default function Dashboard() {
  const { data: summary,          isLoading: l1 } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: attention,        isLoading: l2 } = useGetAttentionInspections({ query: { queryKey: getGetAttentionInspectionsQueryKey() } });
  const { data: breakdown,        isLoading: l3 } = useGetStatusBreakdown({ query: { queryKey: getGetStatusBreakdownQueryKey() } });
  const { data: overdueBuildings, isLoading: l4 } = useGetOverdueByBuilding({ query: { queryKey: getGetOverdueByBuildingQueryKey() } });
  const { data: forecast,         isLoading: l5 } = useQuery({ queryKey: ["monthly-forecast"], queryFn: fetchMonthlyForecast });

  if (l1 || l2 || l3 || l4 || l5) {
    return (
      <div className="flex h-[50vh] items-center justify-center bg-zinc-50">
        <Spinner size="lg" />
      </div>
    );
  }

  const overdueCount = summary?.overdueCount ?? 0;
  const overdueItems = attention?.filter((i) => i.status === "OVERDUE") ?? [];

  const todayStr = dayjs().format("YYYY-MM-DD");
  const in30Str  = dayjs().add(30, "day").format("YYYY-MM-DD");
  const upcoming = attention?.filter(
    (i) => i.status !== "OVERDUE" && i.nextDueDate && i.nextDueDate >= todayStr && i.nextDueDate <= in30Str
  ) ?? [];

  const statusChartData = (breakdown ?? []).map((b) => ({
    name:  b.status.replace(/_/g, " "),
    value: b.count,
    color: getStatusColor(b.status),
  }));

  return (
    <div className="flex flex-col min-h-full -m-6 lg:-m-8 bg-zinc-50 text-zinc-900 font-sans">
      <div className="flex-1 p-6 md:p-8 space-y-6">

        {/* ── KPI Strip ── */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 bg-white border border-zinc-200 rounded-sm shadow-sm overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-zinc-200">
          {[
            { label: "TOTAL ELEVATORS", value: summary?.totalElevators ?? 0 },
            { label: "DUE THIS MONTH",  value: summary?.duethisMonth ?? 0 },
            { label: "OVERDUE",         value: overdueCount, isAlert: true },
            { label: "SCHEDULED",       value: summary?.scheduledCount ?? 0 },
            { label: "TOTAL BUILDINGS", value: summary?.totalBuildings ?? 0 },
            { label: "TOTAL CUSTOMERS", value: summary?.totalCustomers ?? 0 },
          ].map((kpi, i) => (
            <div key={i} className={`p-6 flex flex-col justify-center ${kpi.isAlert ? "bg-red-50" : ""}`}>
              <div className="text-zinc-400 text-sm uppercase tracking-widest font-semibold mb-2">
                {kpi.label}
              </div>
              <div className={`text-5xl font-black ${kpi.isAlert ? "text-red-600" : "text-zinc-900"}`}>
                {kpi.value}
              </div>
            </div>
          ))}
        </section>

        {/* ── Charts Row ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Status Distribution — horizontal bar */}
          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
            <SectionHeader title="Current Status Distribution" />
            <div className="p-6 h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statusChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "#3f3f46", fontSize: 16 }}
                    axisLine={{ stroke: "#e4e4e7" }}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fill: "#3f3f46", fontSize: 16, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    width={120}
                  />
                  <Tooltip
                    cursor={{ fill: "#f4f4f5" }}
                    contentStyle={{ backgroundColor: "#fff", borderColor: "#e4e4e7", borderRadius: "6px", boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)", fontSize: "16px" }}
                    itemStyle={{ color: "#18181b", fontSize: "16px", fontWeight: 600 }}
                    labelStyle={{ color: "#3f3f46", fontSize: "14px" }}
                  />
                  <Bar dataKey="value" barSize={24} radius={[0, 4, 4, 0]}>
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 13-Month Forecast */}
          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
            <SectionHeader title="13-Month Compliance Forecast" />
            <div className="flex-1 overflow-x-auto">
              <div style={{ width: Math.max(560, (forecast?.length ?? 13) * 72), height: 360 }} className="px-4 py-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={forecast}
                    margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                    barCategoryGap="25%"
                    barGap={2}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#3f3f46", fontSize: 15 }}
                      axisLine={{ stroke: "#e4e4e7" }}
                      tickLine={false}
                      angle={-45}
                      textAnchor="end"
                      dy={5}
                      height={60}
                    />
                    <YAxis
                      tick={{ fill: "#3f3f46", fontSize: 15 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: "#f4f4f5" }}
                      contentStyle={{ backgroundColor: "#fff", borderColor: "#e4e4e7", borderRadius: "6px", boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)", fontSize: "16px" }}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: "15px", color: "#3f3f46", paddingTop: "16px" }}
                    />
                    <Bar dataKey="due"       name="Due"       fill="#d4d4d8" radius={[2, 2, 0, 0]} maxBarSize={14} />
                    <Bar dataKey="scheduled" name="Scheduled" fill="#3b82f6" radius={[2, 2, 0, 0]} maxBarSize={14} />
                    <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[2, 2, 0, 0]} maxBarSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* ── Tables Grid — 3 columns ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Requiring Attention */}
          <div className="bg-white border border-zinc-200 border-t-4 border-t-red-500 rounded-lg shadow-sm overflow-hidden flex flex-col">
            <SectionHeader
              title="Requiring Attention"
              badge={
                overdueItems.length > 0 ? (
                  <span className="ml-auto flex items-center gap-1 text-[11px] font-bold text-red-600">
                    <AlertTriangle className="w-3 h-3" />
                    {overdueItems.length} OVERDUE
                  </span>
                ) : undefined
              }
            />
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow className="hover:bg-transparent border-b border-zinc-100">
                    <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9">Unit</TableHead>
                    <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9">Building</TableHead>
                    <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9">Due</TableHead>
                    <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!attention || attention.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-zinc-400 py-8 text-sm">
                        No inspections requiring attention.
                      </TableCell>
                    </TableRow>
                  ) : attention.map((insp) => (
                    <TableRow key={insp.id} className="hover:bg-zinc-50/80 border-b border-zinc-100">
                      <TableCell className="font-medium text-sm py-3">{insp.elevatorName}</TableCell>
                      <TableCell className="text-zinc-500 text-sm py-3">{insp.buildingName}</TableCell>
                      <TableCell className={`text-sm py-3 font-medium ${dayjs(insp.nextDueDate).isBefore(dayjs()) ? "text-red-600" : "text-zinc-500"}`}>
                        {insp.nextDueDate ? dayjs(insp.nextDueDate).format("MMM D, YYYY") : "N/A"}
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <StatusBadge status={insp.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Highest Risk Buildings */}
          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
            <SectionHeader title="Highest Risk Buildings" />
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow className="hover:bg-transparent border-b border-zinc-100">
                    <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9">Building</TableHead>
                    <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9">Customer</TableHead>
                    <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9 text-right">Overdue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!overdueBuildings || overdueBuildings.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-zinc-400 py-8 text-sm">
                        No overdue inspections!
                      </TableCell>
                    </TableRow>
                  ) : overdueBuildings.map((item) => (
                    <TableRow key={item.buildingId} className="hover:bg-zinc-50/80 border-b border-zinc-100">
                      <TableCell className="font-medium text-sm py-3">{item.buildingName}</TableCell>
                      <TableCell className="text-zinc-500 text-sm py-3">{item.customerName}</TableCell>
                      <TableCell className="text-right py-3">
                        <span className="inline-flex items-center justify-center bg-red-100 text-red-700 rounded-full font-bold h-6 w-6 text-xs">
                          {item.overdueCount}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Upcoming — 30 days */}
          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
            <SectionHeader title="Upcoming — Next 30 Days" />
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow className="hover:bg-transparent border-b border-zinc-100">
                    <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9">Unit / Building</TableHead>
                    <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9">Type</TableHead>
                    <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9">Due</TableHead>
                    <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcoming.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-zinc-400 py-8 text-sm">
                        No upcoming inspections in 30 days.
                      </TableCell>
                    </TableRow>
                  ) : upcoming.map((insp) => (
                    <TableRow key={insp.id} className="hover:bg-zinc-50/80 border-b border-zinc-100">
                      <TableCell className="py-3">
                        <div className="font-medium text-sm">{insp.elevatorName}</div>
                        <div className="text-xs text-zinc-500">{insp.buildingName}</div>
                      </TableCell>
                      <TableCell className="py-3">
                        <InspectionTypeBadge type={insp.inspectionType} />
                      </TableCell>
                      <TableCell className="text-zinc-500 text-sm py-3">
                        {insp.nextDueDate ? dayjs(insp.nextDueDate).format("MMM D, YYYY") : "N/A"}
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <StatusBadge status={insp.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

        </section>
      </div>
    </div>
  );
}
