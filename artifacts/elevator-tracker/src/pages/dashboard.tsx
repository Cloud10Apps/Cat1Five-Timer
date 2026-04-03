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
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
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
import { useLocation } from "wouter";
import logoSrc from "@/assets/logo.svg";

/* ─── colour helpers ─── */
const getStatusColor = (status: string) => {
  switch (status) {
    case "COMPLETED":   return "#22c55e";
    case "OVERDUE":     return "#ef4444";
    case "IN_PROGRESS": return "#f59e0b";
    case "SCHEDULED":   return "#3b82f6";
    default:            return "#71717a";
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

/* ─── Dark-themed status badge ─── */
function DarkStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    OVERDUE:     "bg-red-500/10 text-red-400 border-red-500/20",
    SCHEDULED:   "bg-blue-500/10 text-blue-400 border-blue-500/20",
    NOT_STARTED: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    IN_PROGRESS: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    COMPLETED:   "bg-green-500/10 text-green-400 border-green-500/20",
  };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-sm border whitespace-nowrap ${styles[status] ?? styles.NOT_STARTED}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data: summary,         isLoading: l1 } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: attention,       isLoading: l2 } = useGetAttentionInspections({ query: { queryKey: getGetAttentionInspectionsQueryKey() } });
  const { data: breakdown,       isLoading: l3 } = useGetStatusBreakdown({ query: { queryKey: getGetStatusBreakdownQueryKey() } });
  const { data: overdueBuildings,isLoading: l4 } = useGetOverdueByBuilding({ query: { queryKey: getGetOverdueByBuildingQueryKey() } });
  const { data: forecast,        isLoading: l5 } = useQuery({ queryKey: ["monthly-forecast"], queryFn: fetchMonthlyForecast });

  if (l1 || l2 || l3 || l4 || l5) {
    return (
      <div className="flex h-[50vh] items-center justify-center bg-zinc-950">
        <Spinner size="lg" />
      </div>
    );
  }

  const overdueCount = summary?.overdueCount ?? 0;
  const isAllClear   = overdueCount === 0;
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
    <div className="flex flex-col min-h-full -m-6 lg:-m-8 bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-500/30">

      {/* ── Top status line ── */}
      <div className={`h-1.5 w-full shrink-0 ${isAllClear ? "bg-green-500" : "bg-red-500"}`} />

      <div className="flex-1 p-6 md:p-8 space-y-8">

        {/* ── Header ── */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <img src={logoSrc} alt="Cat1Five Timer" className="h-14 rounded-sm" />

          <div className="flex items-center gap-3">
            {!isAllClear && (
              <button
                onClick={() => setLocation("/inspections")}
                className="text-xs font-medium px-3 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors flex items-center gap-1"
              >
                View All <ChevronRight className="h-3 w-3" />
              </button>
            )}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm border ${
              isAllClear
                ? "bg-green-500/10 border-green-500/20 text-green-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}>
              {isAllClear ? (
                <><CheckCircle2 className="w-4 h-4" /><span>All Systems Go</span></>
              ) : (
                <><ShieldAlert className="w-4 h-4" /><span>{overdueCount} Inspection{overdueCount !== 1 ? "s" : ""} Overdue</span></>
              )}
            </div>
          </div>
        </header>

        {/* ── KPI Strip ── */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-zinc-800 border border-zinc-800 rounded-lg bg-zinc-900/50 overflow-hidden">
          {[
            { label: "TOTAL ELEVATORS", value: summary?.totalElevators ?? 0 },
            { label: "DUE THIS MONTH",  value: summary?.duethisMonth ?? 0 },
            { label: "OVERDUE",         value: overdueCount, isAlert: true },
            { label: "SCHEDULED",       value: summary?.scheduledCount ?? 0 },
            { label: "TOTAL BUILDINGS", value: summary?.totalBuildings ?? 0 },
            { label: "TOTAL CUSTOMERS", value: summary?.totalCustomers ?? 0 },
          ].map((kpi, i) => (
            <div key={i} className="p-6 flex flex-col justify-between hover:bg-zinc-800/50 transition-colors">
              <span className="text-zinc-500 text-xs font-semibold tracking-wider mb-2">{kpi.label}</span>
              <span className={`text-4xl font-light tracking-tight ${kpi.isAlert && overdueCount > 0 ? "text-red-500" : "text-white"}`}>
                {kpi.value}
              </span>
            </div>
          ))}
        </section>

        {/* ── Charts Row ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Status Distribution — horizontal bar */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 flex flex-col h-[380px]">
            <h2 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
              Current Status Distribution
            </h2>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statusChartData}
                  layout="vertical"
                  margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#27272a" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#a1a1aa", fontSize: 12 }}
                    width={90}
                  />
                  <Tooltip
                    cursor={{ fill: "#27272a", opacity: 0.4 }}
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46", color: "#f4f4f5", borderRadius: "6px" }}
                    itemStyle={{ color: "#f4f4f5" }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 13-Month Forecast */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 flex flex-col h-[380px]">
            <h2 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
              13-Month Compliance Forecast
            </h2>
            <div className="flex-1 overflow-x-auto">
              <div style={{ width: Math.max(560, (forecast?.length ?? 13) * 72), height: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={forecast}
                    margin={{ top: 10, right: 4, left: -20, bottom: 0 }}
                    barCategoryGap="25%"
                    barGap={2}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#a1a1aa", fontSize: 11 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#a1a1aa", fontSize: 11 }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: "#27272a", opacity: 0.4 }}
                      contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46", color: "#f4f4f5", borderRadius: "6px" }}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: "12px", paddingTop: "10px", color: "#a1a1aa" }}
                    />
                    <Bar dataKey="due"       name="Total Due"  fill="#3f3f46" radius={[2, 2, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="scheduled" name="Scheduled"  fill="#3b82f6" radius={[2, 2, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="completed" name="Completed"  fill="#22c55e" radius={[2, 2, 0, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* ── Tables Grid — 3 columns ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Requiring Attention */}
          <div className="bg-zinc-900 border border-red-900/40 rounded-lg overflow-hidden shadow-[0_0_20px_rgba(239,68,68,0.04)]">
            <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <h3 className="text-sm font-semibold text-zinc-200">Requiring Attention</h3>
              {overdueItems.length > 0 && (
                <span className="ml-auto text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-sm">
                  {overdueItems.length} OVERDUE
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-xs text-zinc-500 uppercase">
                    <th className="px-4 py-3 font-medium">Unit</th>
                    <th className="px-4 py-3 font-medium">Building</th>
                    <th className="px-4 py-3 font-medium">Due</th>
                    <th className="px-4 py-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {(!attention || attention.length === 0) ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-zinc-500 text-xs">
                        No inspections requiring attention.
                      </td>
                    </tr>
                  ) : attention.map((insp) => (
                    <tr key={insp.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-zinc-300 text-xs">{insp.elevatorName}</td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">{insp.buildingName}</td>
                      <td className={`px-4 py-3 font-medium text-xs ${dayjs(insp.nextDueDate).isBefore(dayjs()) ? "text-red-400" : "text-zinc-400"}`}>
                        {insp.nextDueDate ? dayjs(insp.nextDueDate).format("MMM D, YYYY") : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DarkStatusBadge status={insp.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Highest Risk Buildings */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-200">Highest Risk Buildings</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-xs text-zinc-500 uppercase">
                    <th className="px-4 py-3 font-medium">Building</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium text-right">Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {(!overdueBuildings || overdueBuildings.length === 0) ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-zinc-500 text-xs">
                        No overdue inspections!
                      </td>
                    </tr>
                  ) : overdueBuildings.map((item) => (
                    <tr key={item.buildingId} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-zinc-300 text-xs">{item.buildingName}</td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">{item.customerName}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20">
                          {item.overdueCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upcoming — 30 days */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-200">Upcoming — Next 30 Days</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-xs text-zinc-500 uppercase">
                    <th className="px-4 py-3 font-medium">Unit</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Due</th>
                    <th className="px-4 py-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {upcoming.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-zinc-500 text-xs">
                        No upcoming inspections in 30 days.
                      </td>
                    </tr>
                  ) : upcoming.map((insp) => (
                    <tr key={insp.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-300 text-xs">{insp.elevatorName}</div>
                        <div className="text-[11px] text-zinc-500">{insp.buildingName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <InspectionTypeBadge type={insp.inspectionType} />
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        {insp.nextDueDate ? dayjs(insp.nextDueDate).format("MMM D, YYYY") : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DarkStatusBadge status={insp.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </section>
      </div>
    </div>
  );
}
