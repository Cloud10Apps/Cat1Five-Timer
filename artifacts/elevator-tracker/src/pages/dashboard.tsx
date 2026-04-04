import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InspectionTypeBadge } from "@/components/inspection-type-badge";
import { Spinner } from "@/components/ui/spinner";
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
} from "recharts";
import dayjs from "dayjs";

/* ─── label helpers ─── */
/** "NOT_STARTED" or "NOT STARTED" → "Not Scheduled" */
function toLabel(s: string) {
  if (s === "NOT_STARTED" || s === "NOT STARTED") return "Not Scheduled";
  return s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

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

/* ─── Aging badge ─── */
function AgingBadge({ days, mode }: { days: number; mode: "overdue" | "upcoming" }) {
  if (mode === "overdue") {
    let cls = "bg-amber-100 text-amber-800";
    if (days > 120) cls = "bg-red-900 text-white";
    else if (days > 90) cls = "bg-red-700 text-white";
    else if (days > 60) cls = "bg-red-500 text-white";
    else if (days > 30) cls = "bg-orange-500 text-white";
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${cls}`}>
        {days}d overdue
      </span>
    );
  }
  let cls = "bg-green-100 text-green-800";
  let label = days === 0 ? "Today" : `${days}d away`;
  if (days === 0)       cls = "bg-red-100 text-red-700";
  else if (days <= 3)   cls = "bg-amber-100 text-amber-800";
  else if (days <= 7)   cls = "bg-yellow-100 text-yellow-800";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

/* ─── dashboard API fetchers ─── */
type MonthBucket = { key: string; label: string; due: number; scheduled: number; completed: number };

function dashboardFetch(path: string, customerId?: number | null) {
  const token = localStorage.getItem("token");
  const qs = customerId ? `?customerId=${customerId}` : "";
  return fetch(`/api/dashboard/${path}${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => { if (!r.ok) throw new Error(`Failed: ${path}`); return r.json(); });
}

function customersFetch() {
  const token = localStorage.getItem("token");
  return fetch("/api/customers", { headers: { Authorization: `Bearer ${token}` } })
    .then(r => { if (!r.ok) throw new Error("Failed: customers"); return r.json(); });
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
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border whitespace-nowrap ${styles[status] ?? styles.NOT_STARTED}`}>
      {toLabel(status)}
    </span>
  );
}

/* ─── Section card header ─── */
function SectionHeader({ title, badge, action }: { title: string; badge?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-2">
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-zinc-700 text-center">{title}</h3>
        {badge}
      </div>
      <div className="flex-1 flex justify-end">{action}</div>
    </div>
  );
}

/** Shared live-data options: always consider data stale, poll every 2 min, refresh on tab focus */
const LIVE_OPTS = {
  staleTime: 0,
  refetchInterval: 2 * 60 * 1000,
  refetchOnWindowFocus: true,
} as const;

const DASHBOARD_KEYS = [
  "/api/customers",
  "/api/dashboard/summary",
  "/api/dashboard/attention",
  "/api/dashboard/status-breakdown",
  "monthly-forecast",
  "/api/dashboard/aging/v2",
];

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);

  /* tick the "last updated X seconds ago" counter */
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 10_000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  function refreshAll() {
    DASHBOARD_KEYS.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
    setLastUpdated(new Date());
    setSecondsAgo(0);
  }

  async function downloadXlsx(endpoint: "overdue" | "upcoming", filename: string) {
    const params = new URLSearchParams();
    if (selectedCustomerId) params.append("customerId", String(selectedCustomerId));
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/export/${endpoint}?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const { data: customers } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: customersFetch,
    ...LIVE_OPTS,
  });

  const { data: summary,   isLoading: l1, dataUpdatedAt: t1 } = useQuery({
    queryKey: ["/api/dashboard/summary", selectedCustomerId],
    queryFn:  () => dashboardFetch("summary", selectedCustomerId),
    ...LIVE_OPTS,
  });
  const { data: attention, isLoading: l2 } = useQuery({
    queryKey: ["/api/dashboard/attention", selectedCustomerId],
    queryFn:  () => dashboardFetch("attention", selectedCustomerId),
    ...LIVE_OPTS,
  });
  const { data: breakdown, isLoading: l3 } = useQuery({
    queryKey: ["/api/dashboard/status-breakdown", selectedCustomerId],
    queryFn:  () => dashboardFetch("status-breakdown", selectedCustomerId),
    ...LIVE_OPTS,
  });
  const { data: forecast,  isLoading: l4 } = useQuery({
    queryKey: ["monthly-forecast", selectedCustomerId],
    queryFn:  () => dashboardFetch("monthly-forecast", selectedCustomerId),
    ...LIVE_OPTS,
  });
  const { data: aging, isLoading: l5 } = useQuery({
    queryKey: ["/api/dashboard/aging/v2", selectedCustomerId],
    queryFn:  () => dashboardFetch("aging", selectedCustomerId),
    ...LIVE_OPTS,
  });

  /* Update lastUpdated whenever fresh data arrives */
  useEffect(() => {
    if (t1) { setLastUpdated(new Date(t1)); setSecondsAgo(0); }
  }, [t1]);

  if (l1 || l2 || l3 || l4 || l5) {
    return (
      <div className="flex h-[50vh] items-center justify-center bg-zinc-50">
        <Spinner size="lg" />
      </div>
    );
  }

  const overdueItems = (attention ?? [])
    .filter((i: any) => i.status === "OVERDUE")
    .sort((a: any, b: any) => (a.nextDueDate ?? "").localeCompare(b.nextDueDate ?? ""));

  const todayStr = dayjs().format("YYYY-MM-DD");
  const in14Days = dayjs().add(14, "day").format("YYYY-MM-DD");
  const upcoming = (attention ?? []).filter(
    (i: any) => i.status !== "OVERDUE" && i.nextDueDate && i.nextDueDate >= todayStr && i.nextDueDate <= in14Days
  ).sort((a: any, b: any) => a.nextDueDate.localeCompare(b.nextDueDate));

  const statusChartData = (breakdown ?? []).map((b) => ({
    name:  toLabel(b.status),
    value: b.count,
    color: getStatusColor(b.status),
  }));

  const currentYear = dayjs().year();
  const customerList: any[] = customers ?? [];

  return (
    <div className="flex flex-col min-h-full -m-6 lg:-m-8 bg-zinc-50 text-zinc-900 font-sans">
      <div className="flex-1 p-6 md:p-8 space-y-6">

        {/* ── Header row: centered title + controls ── */}
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2">
            <button
              onClick={refreshAll}
              title="Refresh dashboard"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-zinc-200 bg-white text-xs text-zinc-500 hover:text-zinc-800 hover:border-zinc-300 shadow-sm transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08 1.01.75.75 0 1 1-1.3-.75 6 6 0 0 1 9.44-1.345l.842.841V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.345l-.842-.841v1.273a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.84.841a4.5 4.5 0 0 0 7.08-1.01.75.75 0 0 1 1.025-.295Z" clipRule="evenodd" />
              </svg>
              Refresh
            </button>
            <span className="text-xs text-zinc-400">
              {secondsAgo < 60
                ? "Just updated"
                : `Updated ${Math.floor(secondsAgo / 60)}m ago`}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            {currentYear} Inspection Activity
          </h1>
          <div className="flex-1 flex justify-end">
            <select
              value={selectedCustomerId ?? ""}
              onChange={e => setSelectedCustomerId(e.target.value ? parseInt(e.target.value) : null)}
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 min-w-[200px]"
            >
              <option value="">All Customers</option>
              {customerList.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── KPI Strip ── */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 bg-white border border-zinc-200 rounded-sm shadow-sm overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-zinc-200">
          {/* NOT STARTED */}
          <div className="p-6 flex flex-col items-center justify-center text-center">
            <div className="text-zinc-400 text-sm uppercase tracking-widest font-semibold mb-2">NOT SCHEDULED</div>
            <div className="text-5xl font-black text-zinc-900">{summary?.notStartedCount ?? 0}</div>
          </div>
          {/* SCHEDULED */}
          <div className="p-6 flex flex-col items-center justify-center text-center">
            <div className="text-zinc-400 text-sm uppercase tracking-widest font-semibold mb-2">SCHEDULED</div>
            <div className="text-5xl font-black text-blue-600">{summary?.scheduledCount ?? 0}</div>
          </div>
          {/* IN PROGRESS */}
          <div className="p-6 flex flex-col items-center justify-center text-center">
            <div className="text-zinc-400 text-sm uppercase tracking-widest font-semibold mb-2">IN PROGRESS</div>
            <div className="text-5xl font-black text-amber-500">{summary?.inProgressCount ?? 0}</div>
          </div>
          {/* COMPLETED */}
          <div className="p-6 flex flex-col items-center justify-center text-center">
            <div className="text-zinc-400 text-sm uppercase tracking-widest font-semibold mb-2">COMPLETED</div>
            <div className="text-5xl font-black text-green-600">{summary?.completedCount ?? 0}</div>
          </div>
          {/* AVG DAYS TO SCHEDULE */}
          {(() => {
            const val = summary?.avgDaysToSchedule ?? null;
            return (
              <div className="p-6 flex flex-col items-center justify-center text-center">
                <div className="text-zinc-400 text-sm uppercase tracking-widest font-semibold mb-2">AVG DAYS TO SCHEDULE</div>
                <div className={`text-5xl font-black ${val === null ? "text-zinc-400" : val > 0 ? "text-red-600" : "text-green-600"}`}>
                  {val === null ? "—" : val.toFixed(1)}
                </div>
                {val !== null && <div className="text-xs text-zinc-400 mt-1">Days</div>}
              </div>
            );
          })()}
          {/* AVG DAYS TO COMPLETE */}
          {(() => {
            const val = summary?.avgDaysToComplete ?? null;
            const isGood = val !== null && val <= 0;
            const isBad  = val !== null && val > 0;
            return (
              <div className="p-6 flex flex-col items-center justify-center text-center">
                <div className="text-zinc-400 text-sm uppercase tracking-widest font-semibold mb-2">AVG DAYS TO COMPLETE</div>
                <div className={`text-5xl font-black ${isBad ? "text-red-600" : isGood ? "text-green-600" : "text-zinc-400"}`}>
                  {val === null ? "—" : val.toFixed(1)}
                </div>
                {val !== null && <div className="text-xs text-zinc-400 mt-1">Days</div>}
              </div>
            );
          })()}
        </section>

        {/* ── Charts Row ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Inspection Aging — horizontal stacked bar by status */}
          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
            <SectionHeader title="Open Inspections by Aging and Status" />
            <div className="p-4 h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={aging ?? []}
                  layout="vertical"
                  margin={{ top: 4, right: 24, left: 10, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tickCount={6}
                    tick={{ fill: "#3f3f46", fontSize: 13 }}
                    axisLine={{ stroke: "#e4e4e7" }}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="label"
                    type="category"
                    tick={{ fill: "#3f3f46", fontSize: 13, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    width={110}
                    tickFormatter={(v: string) => v.replace(/\b\w/g, c => c.toUpperCase())}
                  />
                  <Tooltip
                    cursor={{ fill: "#f4f4f5" }}
                    contentStyle={{ backgroundColor: "#fff", borderColor: "#e4e4e7", borderRadius: "8px", boxShadow: "0 4px 12px 0 rgb(0 0 0 / 0.12)", fontSize: "15px", padding: "10px 16px", minWidth: "180px" }}
                    itemStyle={{ fontSize: "15px", fontWeight: 600, paddingTop: "3px", paddingBottom: "3px" }}
                    labelStyle={{ fontSize: "15px", fontWeight: 700, color: "#18181b", marginBottom: "6px" }}
                  />
                  <Bar dataKey="notStarted" name="Not Scheduled" stackId="s" fill="#d4d4d8" radius={[0, 0, 0, 0]} barSize={20} />
                  <Bar dataKey="scheduled"  name="Scheduled"   stackId="s" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={20} />
                  <Bar dataKey="inProgress" name="In Progress" stackId="s" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Distribution — horizontal bar */}
          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
            <SectionHeader title={`${currentYear} Inspections by Status`} />
            <div className="p-6 h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statusChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tickCount={6}
                    tick={{ fill: "#3f3f46", fontSize: 13 }}
                    axisLine={{ stroke: "#e4e4e7" }}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fill: "#3f3f46", fontSize: 13, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    width={160}
                  />
                  <Tooltip
                    cursor={{ fill: "#f4f4f5" }}
                    contentStyle={{ backgroundColor: "#fff", borderColor: "#e4e4e7", borderRadius: "8px", boxShadow: "0 4px 12px 0 rgb(0 0 0 / 0.12)", fontSize: "15px", padding: "10px 16px", minWidth: "180px" }}
                    itemStyle={{ color: "#18181b", fontSize: "15px", fontWeight: 600, paddingTop: "3px", paddingBottom: "3px" }}
                    labelStyle={{ color: "#18181b", fontSize: "15px", fontWeight: 700, marginBottom: "6px" }}
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

          {/* 12-Month Forecast — fits container, no scroll */}
          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
            <SectionHeader title={`${currentYear} Inspections by Month`} />
            <div className="p-4" style={{ height: 360 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={forecast}
                  margin={{ top: 5, right: 8, left: -24, bottom: 0 }}
                  barCategoryGap="18%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#3f3f46", fontSize: 13 }}
                    axisLine={{ stroke: "#e4e4e7" }}
                    tickLine={false}
                    height={28}
                  />
                  <YAxis
                    tick={{ fill: "#3f3f46", fontSize: 13 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#f4f4f5" }}
                    contentStyle={{ backgroundColor: "#fff", borderColor: "#e4e4e7", borderRadius: "8px", boxShadow: "0 4px 12px 0 rgb(0 0 0 / 0.12)", fontSize: "15px", padding: "10px 16px", minWidth: "180px" }}
                    itemStyle={{ fontSize: "15px", fontWeight: 600, paddingTop: "3px", paddingBottom: "3px" }}
                    labelStyle={{ fontSize: "15px", fontWeight: 700, color: "#18181b", marginBottom: "6px" }}
                  />
                  <Bar dataKey="notStarted" name="Not Scheduled" stackId="stack" fill="#d4d4d8" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="scheduled"  name="Scheduled"  stackId="stack" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="inProgress" name="In Progress" stackId="stack" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="completed"  name="Completed"  stackId="stack" fill="#22c55e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* ── Tables Grid — 2 columns ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Overdue Inspections */}
          <div className="bg-white border border-zinc-200 border-t-4 border-t-red-500 rounded-lg shadow-sm overflow-hidden flex flex-col">
            <SectionHeader
              title="Overdue Inspections"
              action={
                <button
                  onClick={() => downloadXlsx("overdue", `overdue_inspections_${new Date().toISOString().slice(0, 10)}.xlsx`)}
                  title="Download as Excel"
                  className="inline-flex items-center gap-1 h-6 px-2 rounded border border-zinc-200 bg-white text-xs text-zinc-500 hover:text-zinc-800 hover:border-zinc-300 shadow-sm transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                    <path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z" />
                    <path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z" />
                  </svg>
                  Export
                </button>
              }
            />
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow className="hover:bg-transparent border-b border-zinc-100">
                    <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9 pl-4">Unit / Building</TableHead>
                    <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9">Type</TableHead>
                    <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9">Status</TableHead>
                    <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9 text-right pr-4">Was Due</TableHead>
                    <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9 text-right pr-4">Aging</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-zinc-400 py-8 text-sm">
                        No overdue inspections.
                      </TableCell>
                    </TableRow>
                  ) : overdueItems.map((insp: any) => {
                    const daysOver = insp.nextDueDate ? dayjs().diff(dayjs(insp.nextDueDate), "day") : null;
                    return (
                      <TableRow key={insp.id} className="hover:bg-red-50/40 border-b border-zinc-100 relative">
                        <TableCell className="py-3 pl-4">
                          <div className="font-semibold text-sm text-zinc-900 leading-snug">{insp.elevatorName}</div>
                          <div className="text-xs text-zinc-500 mt-0.5">{insp.buildingName}</div>
                        </TableCell>
                        <TableCell className="py-3">
                          <InspectionTypeBadge type={insp.inspectionType} />
                        </TableCell>
                        <TableCell className="py-3">
                          <StatusBadge status={insp.rawStatus} />
                        </TableCell>
                        <TableCell className="text-right py-3 pr-4">
                          <div className="text-sm font-semibold text-zinc-900 leading-snug">
                            {insp.nextDueDate ? dayjs(insp.nextDueDate).format("MMM D, YYYY") : "N/A"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-3 pr-4">
                          {daysOver !== null && <AgingBadge days={daysOver} mode="overdue" />}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Upcoming — Next 2 Weeks */}
          <div className="bg-white border border-zinc-200 border-t-4 border-t-zinc-700 rounded-lg shadow-sm overflow-hidden flex flex-col">
            <SectionHeader
              title="Upcoming — Next 14 Days"
              action={
                <button
                  onClick={() => downloadXlsx("upcoming", `upcoming_inspections_${new Date().toISOString().slice(0, 10)}.xlsx`)}
                  title="Download as Excel"
                  className="inline-flex items-center gap-1 h-6 px-2 rounded border border-zinc-200 bg-white text-xs text-zinc-500 hover:text-zinc-800 hover:border-zinc-300 shadow-sm transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                    <path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z" />
                    <path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z" />
                  </svg>
                  Export
                </button>
              }
            />
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow className="hover:bg-transparent border-b border-zinc-100">
                    <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9 pl-4">Unit / Building</TableHead>
                    <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9">Type</TableHead>
                    <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9">Status</TableHead>
                    <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9 text-right pr-4">Due</TableHead>
                    <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9 text-right pr-4">Aging</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcoming.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-zinc-400 py-8 text-sm">
                        No inspections due in the next 14 days.
                      </TableCell>
                    </TableRow>
                  ) : upcoming.map((insp: any) => {
                    const daysUntil = insp.nextDueDate ? dayjs(insp.nextDueDate).diff(dayjs(), "day") : null;
                    return (
                      <TableRow key={insp.id} className="hover:bg-zinc-50/80 border-b border-zinc-100">
                        <TableCell className="py-3 pl-4">
                          <div className="font-semibold text-sm text-zinc-900 leading-snug">{insp.elevatorName}</div>
                          <div className="text-xs text-zinc-500 mt-0.5">{insp.buildingName}</div>
                        </TableCell>
                        <TableCell className="py-3">
                          <InspectionTypeBadge type={insp.inspectionType} />
                        </TableCell>
                        <TableCell className="py-3">
                          <StatusBadge status={insp.status} />
                        </TableCell>
                        <TableCell className="text-right py-3 pr-4">
                          <div className="text-sm font-semibold text-zinc-900 leading-snug">
                            {insp.nextDueDate ? dayjs(insp.nextDueDate).format("MMM D, YYYY") : "N/A"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-3 pr-4">
                          {daysUntil !== null && <AgingBadge days={daysUntil} mode="upcoming" />}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

        </section>
      </div>
    </div>
  );
}
