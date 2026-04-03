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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { InspectionTypeBadge } from "@/components/inspection-type-badge";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileText,
  AlertOctagon,
  CalendarClock,
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

/* ─── colour helpers ─── */
const getStatusColor = (status: string) => {
  switch (status) {
    case "COMPLETED":   return "#22c55e";
    case "OVERDUE":     return "#ef4444";
    case "IN_PROGRESS": return "#f59e0b";
    case "SCHEDULED":   return "#3b82f6";
    default:            return "#94a3b8";
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

/* ─── Section card wrapper ─── */
function Section({ title, icon: Icon, badge, children }: {
  title: string;
  icon?: React.ElementType;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-3">
        {Icon && <Icon className="h-4 w-4 text-zinc-400 shrink-0" />}
        <h2 className="text-sm font-bold text-zinc-900 tracking-tight uppercase">{title}</h2>
        {badge}
      </div>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data: summary,  isLoading: l1 } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: attention, isLoading: l2 } = useGetAttentionInspections({ query: { queryKey: getGetAttentionInspectionsQueryKey() } });
  const { data: breakdown, isLoading: l3 } = useGetStatusBreakdown({ query: { queryKey: getGetStatusBreakdownQueryKey() } });
  const { data: overdueBuildings, isLoading: l4 } = useGetOverdueByBuilding({ query: { queryKey: getGetOverdueByBuildingQueryKey() } });
  const { data: forecast,  isLoading: l5 } = useQuery({ queryKey: ["monthly-forecast"], queryFn: fetchMonthlyForecast });

  if (l1 || l2 || l3 || l4 || l5) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const overdueCount  = summary?.overdueCount ?? 0;
  const isAllClear    = overdueCount === 0;
  const overdueItems  = attention?.filter((i) => i.status === "OVERDUE") ?? [];

  /* upcoming = next 30 days, not overdue */
  const todayStr = dayjs().format("YYYY-MM-DD");
  const upcoming = attention?.filter(
    (i) => i.status !== "OVERDUE" && i.nextDueDate && i.nextDueDate >= todayStr
  ) ?? [];

  return (
    <div className="flex flex-col min-h-full -m-6 lg:-m-8">

      {/* ── Hero Alert Banner ── */}
      <div className={`w-full py-6 px-8 flex items-center shadow-md ${isAllClear ? "bg-green-600" : "bg-red-600"}`}>
        <div className="flex items-start gap-4 flex-1">
          {isAllClear ? (
            <CheckCircle2 className="h-12 w-12 text-green-200 shrink-0" />
          ) : (
            <AlertTriangle className="h-12 w-12 text-red-200 shrink-0" />
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

      {/* ── Stats Strip ── */}
      <div className="bg-white border-b border-zinc-200 px-8 py-5 flex items-center shadow-sm flex-wrap gap-6">
        {[
          { label: "Total Elevators",  value: summary?.totalElevators ?? 0,  color: "text-zinc-900" },
          { label: "Due This Month",   value: summary?.duethisMonth ?? 0,    color: "text-zinc-900" },
          { label: "Overdue",          value: overdueCount,                   color: "text-red-600"  },
          { label: "Scheduled",        value: summary?.scheduledCount ?? 0,  color: "text-zinc-900" },
          { label: "Total Buildings",  value: summary?.totalBuildings ?? 0,  color: "text-zinc-900" },
          { label: "Total Customers",  value: summary?.totalCustomers ?? 0,  color: "text-zinc-900" },
        ].map((stat, i, arr) => (
          <div key={stat.label} className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 font-bold mb-1">{stat.label}</span>
              <span className={`text-3xl font-black leading-none ${stat.color}`}>{stat.value}</span>
            </div>
            {i < arr.length - 1 && <div className="w-px h-10 bg-zinc-200" />}
          </div>
        ))}
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 p-8 bg-zinc-50 space-y-6">

        {/* Row 1: Attention table + Status chart */}
        <div className="grid grid-cols-7 gap-6">
          <div className="col-span-4">
            <Section
              title="Inspections Requiring Attention"
              icon={AlertTriangle}
              badge={
                overdueItems.length > 0 ? (
                  <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700">
                    {overdueItems.length} OVERDUE
                  </span>
                ) : undefined
              }
            >
              <div className="overflow-auto">
                <Table>
                  <TableHeader className="bg-zinc-50/80">
                    <TableRow className="hover:bg-transparent border-b-zinc-200">
                      {["Elevator", "Building", "Due Date", "Status"].map((h) => (
                        <TableHead key={h} className="font-semibold text-zinc-500 h-10 text-xs uppercase tracking-wider">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!attention || attention.length === 0) ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-zinc-400 py-8 text-sm">No inspections requiring immediate attention.</TableCell>
                      </TableRow>
                    ) : attention.map((insp) => (
                      <TableRow key={insp.id} className="border-b-zinc-100 hover:bg-zinc-50/50">
                        <TableCell className="font-bold text-zinc-900">{insp.elevatorName}</TableCell>
                        <TableCell className="text-zinc-600 font-medium">{insp.buildingName}</TableCell>
                        <TableCell>
                          <span className={dayjs(insp.nextDueDate).isBefore(dayjs()) ? "text-red-600 font-bold" : "text-zinc-600 font-medium"}>
                            {insp.nextDueDate ? dayjs(insp.nextDueDate).format("MMM D, YYYY") : "N/A"}
                          </span>
                        </TableCell>
                        <TableCell><StatusBadge status={insp.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Section>
          </div>

          <div className="col-span-3">
            <Section title="Inspections by Status" icon={FileText}>
              <div className="p-4 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={breakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis
                      dataKey="status"
                      tick={{ fontSize: 10, fill: "#71717a", fontWeight: 600 }}
                      tickFormatter={(v) => v.replace("_", " ")}
                      axisLine={false} tickLine={false} dy={8}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} dx={-6} />
                    <Tooltip
                      cursor={{ fill: "#f4f4f5" }}
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e4e4e7", fontSize: 13, fontWeight: 500 }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                      {breakdown?.map((entry, i) => (
                        <Cell key={i} fill={getStatusColor(entry.status)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>
          </div>
        </div>

        {/* Row 2: Overdue Buildings + Upcoming 30 days */}
        <div className="grid grid-cols-2 gap-6">
          <Section title="Highest Risk Buildings (Overdue)" icon={AlertOctagon}>
            <div className="overflow-auto">
              <Table>
                <TableHeader className="bg-zinc-50/80">
                  <TableRow className="hover:bg-transparent border-b-zinc-200">
                    <TableHead className="font-semibold text-zinc-500 h-10 text-xs uppercase tracking-wider">Building</TableHead>
                    <TableHead className="font-semibold text-zinc-500 h-10 text-xs uppercase tracking-wider">Customer</TableHead>
                    <TableHead className="font-semibold text-zinc-500 h-10 text-xs uppercase tracking-wider text-right">Overdue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueBuildings?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-zinc-400 text-sm">No overdue inspections!</TableCell>
                    </TableRow>
                  ) : overdueBuildings?.map((item) => (
                    <TableRow key={item.buildingId} className="border-b-zinc-100 hover:bg-zinc-50/50">
                      <TableCell className="font-bold text-zinc-900">{item.buildingName}</TableCell>
                      <TableCell className="text-zinc-600">{item.customerName}</TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-700 font-black text-sm">
                          {item.overdueCount}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Section>

          <Section title="Upcoming Inspections — Next 30 Days" icon={CalendarClock}>
            <div className="overflow-auto max-h-[320px]">
              <Table>
                <TableHeader className="bg-zinc-50/80 sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent border-b-zinc-200">
                    {["Elevator", "Building", "Type", "Due Date", "Status"].map((h) => (
                      <TableHead key={h} className="font-semibold text-zinc-500 h-10 text-xs uppercase tracking-wider">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcoming.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-zinc-400 text-sm">No upcoming inspections in the next 30 days.</TableCell>
                    </TableRow>
                  ) : upcoming.map((insp) => (
                    <TableRow key={insp.id} className="border-b-zinc-100 hover:bg-zinc-50/50">
                      <TableCell className="font-bold text-zinc-900">{insp.elevatorName}</TableCell>
                      <TableCell className="text-zinc-600">{insp.buildingName}</TableCell>
                      <TableCell><InspectionTypeBadge type={insp.inspectionType} /></TableCell>
                      <TableCell className="text-zinc-700 font-medium">
                        {insp.nextDueDate ? dayjs(insp.nextDueDate).format("MMM D, YYYY") : "N/A"}
                      </TableCell>
                      <TableCell><StatusBadge status={insp.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Section>
        </div>

        {/* Row 3: Monthly Forecast — scrollable */}
        <Section title="Monthly Inspection Forecast" icon={CalendarClock}>
          <div className="px-6 pt-2 pb-1 flex items-center gap-6 text-xs font-semibold text-zinc-500 border-b border-zinc-100">
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-zinc-800" />Due</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-blue-500" />Scheduled</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-green-500" />Completed</span>
            <span className="ml-auto text-zinc-400 italic">Scroll to see all months →</span>
          </div>
          <div className="overflow-x-auto">
            <div style={{ width: Math.max(900, (forecast?.length ?? 13) * 90) }} className="h-[300px] px-4 py-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={forecast}
                  margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
                  barCategoryGap="25%"
                  barGap={3}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#71717a", fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    dy={8}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#71717a" }}
                    axisLine={false}
                    tickLine={false}
                    dx={-6}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#f4f4f5" }}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e4e4e7",
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  />
                  <Bar dataKey="due"       name="Due"       fill="#18181b" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="scheduled" name="Scheduled" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Section>

      </div>
    </div>
  );
}
