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
  LabelList,
} from "recharts";
import dayjs from "dayjs";

/* ─── label helpers ─── */
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
    let label: string;
    if (days >= 365 * 9) label = "9+ yrs overdue";
    else if (days >= 365) { const yrs = Math.floor(days / 365); label = `${yrs} yr${yrs > 1 ? "s" : ""} overdue`; }
    else label = `${days}d overdue`;
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${cls}`}>
        {label}
      </span>
    );
  }
  let cls = "bg-green-100 text-green-800";
  let label = days === 0 ? "Today" : `${days}d away`;
  if (days === 0)     cls = "bg-red-100 text-red-700";
  else if (days <= 3) cls = "bg-amber-100 text-amber-800";
  else if (days <= 7) cls = "bg-yellow-100 text-yellow-800";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${cls}`}>
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

/* ─── Status badge — slightly larger for premium feel ─── */
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    OVERDUE:     "bg-red-100 text-red-700 border-red-200",
    SCHEDULED:   "bg-blue-100 text-blue-700 border-blue-200",
    NOT_STARTED: "bg-zinc-100 text-zinc-600 border-zinc-200",
    IN_PROGRESS: "bg-amber-100 text-amber-700 border-amber-200",
    COMPLETED:   "bg-green-100 text-green-700 border-green-200",
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide border whitespace-nowrap ${styles[status] ?? styles.NOT_STARTED}`}>
      {toLabel(status)}
    </span>
  );
}

/* ─── Section label ─── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-zinc-500 uppercase tracking-[0.12em] mb-2.5 pl-0.5">
      {children}
    </p>
  );
}

/* ─── Card header (centered title) ─── */
function CardHeader({
  title, badge, action, variant = "default",
}: {
  title: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "default" | "danger";
}) {
  if (variant === "danger") {
    return (
      <div className="px-5 py-3.5 border-b border-red-200 bg-red-50 flex items-center gap-2">
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500 shrink-0">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <h3 className="text-sm font-bold text-red-700 text-center">{title}</h3>
          {badge}
        </div>
        <div className="flex-1 flex justify-end">{action}</div>
      </div>
    );
  }
  return (
    <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50/60 flex items-center gap-2">
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-zinc-700 text-center">{title}</h3>
        {badge}
      </div>
      <div className="flex-1 flex justify-end">{action}</div>
    </div>
  );
}

/* ─── Count badge ─── */
function CountBadge({ n, variant = "neutral" }: { n: number; variant?: "neutral" | "danger" }) {
  const cls = variant === "danger"
    ? "bg-red-100 text-red-700 ring-1 ring-red-200"
    : "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${cls}`}>
      {n}
    </span>
  );
}

/* ─── Export button ─── */
function ExportBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Download as Excel"
      className="inline-flex items-center gap-1 h-6 px-2 rounded border border-zinc-200 bg-white text-xs text-zinc-500 hover:text-zinc-800 hover:border-zinc-300 shadow-sm transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
        <path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z" />
        <path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z" />
      </svg>
      Export
    </button>
  );
}

/** Shared live-data options */
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
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  const { data: customers } = useQuery({ queryKey: ["/api/customers"], queryFn: customersFetch, ...LIVE_OPTS });
  const { data: summary,   isLoading: l1, dataUpdatedAt: t1 } = useQuery({ queryKey: ["/api/dashboard/summary",          selectedCustomerId], queryFn: () => dashboardFetch("summary",          selectedCustomerId), ...LIVE_OPTS });
  const { data: attention, isLoading: l2 }                    = useQuery({ queryKey: ["/api/dashboard/attention",         selectedCustomerId], queryFn: () => dashboardFetch("attention",         selectedCustomerId), ...LIVE_OPTS });
  const { data: breakdown, isLoading: l3 }                    = useQuery({ queryKey: ["/api/dashboard/status-breakdown",  selectedCustomerId], queryFn: () => dashboardFetch("status-breakdown",  selectedCustomerId), ...LIVE_OPTS });
  const { data: forecast,  isLoading: l4 }                    = useQuery({ queryKey: ["monthly-forecast",                 selectedCustomerId], queryFn: () => dashboardFetch("monthly-forecast",  selectedCustomerId), ...LIVE_OPTS });
  const { data: aging,     isLoading: l5 }                    = useQuery({ queryKey: ["/api/dashboard/aging/v2",          selectedCustomerId], queryFn: () => dashboardFetch("aging",             selectedCustomerId), ...LIVE_OPTS });

  useEffect(() => { if (t1) { setLastUpdated(new Date(t1)); setSecondsAgo(0); } }, [t1]);

  if (l1 || l2 || l3 || l4 || l5) {
    return <div className="flex h-[50vh] items-center justify-center bg-zinc-50"><Spinner className="h-8 w-8" /></div>;
  }

  const todayStr   = dayjs().format("YYYY-MM-DD");
  const in14Days   = dayjs().add(14, "day").format("YYYY-MM-DD");
  const in3Days    = dayjs().add(3,  "day").format("YYYY-MM-DD");

  const overdueItems = (attention ?? [])
    .filter((i: any) => i.status === "OVERDUE")
    .sort((a: any, b: any) => (a.nextDueDate ?? "").localeCompare(b.nextDueDate ?? ""));

  const upcoming = (attention ?? []).filter(
    (i: any) => i.status !== "OVERDUE" && i.nextDueDate && i.nextDueDate >= todayStr && i.nextDueDate <= in14Days
  ).sort((a: any, b: any) => a.nextDueDate.localeCompare(b.nextDueDate));

  const statusChartData = (breakdown ?? []).map((b: any) => ({
    name:  toLabel(b.status),
    value: b.count,
    color: getStatusColor(b.status),
  }));

  const agingData = (aging ?? []).map((b: any) => ({
    ...b,
    _total: (b.notStarted ?? 0) + (b.scheduled ?? 0) + (b.inProgress ?? 0),
  }));

  const currentYear  = dayjs().year();
  const customerList: any[] = customers ?? [];

  return (
    <div className="flex flex-col min-h-full -m-6 lg:-m-8 bg-zinc-50 text-zinc-900 font-sans">
      <div className="flex-1 p-6 md:p-8 space-y-8">

        {/* ── Header ── */}
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
              {secondsAgo < 60 ? "Just updated" : `Updated ${Math.floor(secondsAgo / 60)}m ago`}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">{currentYear} Inspection Activity</h1>
          <div className="flex-1 flex justify-end">
            <select
              value={selectedCustomerId ?? ""}
              onChange={e => setSelectedCustomerId(e.target.value ? parseInt(e.target.value) : null)}
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 min-w-[200px]"
            >
              <option value="">All Customers</option>
              {customerList.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {/* ── KPI Strips ── */}
        <section className="space-y-5">

          {/* Volume */}
          <div>
            <SectionLabel>Volume</SectionLabel>
            <div className="grid grid-cols-2 md:grid-cols-4 bg-white border border-zinc-200/80 rounded-lg shadow-sm overflow-hidden divide-y md:divide-y-0 md:divide-x divide-zinc-200/80">
              {[
                { label: "NOT SCHEDULED", value: summary?.notStartedCount ?? 0, color: "text-zinc-800" },
                { label: "SCHEDULED",     value: summary?.scheduledCount   ?? 0, color: "text-blue-600" },
                { label: "IN PROGRESS",   value: summary?.inProgressCount  ?? 0, color: "text-amber-500" },
                { label: "COMPLETED",     value: summary?.completedCount   ?? 0, color: "text-green-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="py-7 px-6 flex flex-col items-center justify-center text-center">
                  <div className="text-[11px] font-semibold text-zinc-400/90 uppercase tracking-[0.14em] mb-3">{label}</div>
                  <div className={`text-[3.5rem] leading-none font-black tabular-nums ${color}`}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Metrics */}
          <div>
            <SectionLabel>Performance Metrics</SectionLabel>
            <div className="grid grid-cols-2 bg-white border border-zinc-200/80 rounded-lg shadow-sm overflow-hidden divide-x divide-zinc-200/80">
              {[
                {
                  label: "AVG DAYS TO SCHEDULE",
                  val:   summary?.avgDaysToSchedule ?? null,
                  tip:   "Average number of days between an inspection's due date and when it was scheduled. Positive = scheduled after due date.",
                },
                {
                  label: "AVG DAYS TO COMPLETE",
                  val:   summary?.avgDaysToComplete ?? null,
                  tip:   "Average number of days between an inspection's due date and when it was marked completed. Positive = completed after due date.",
                },
              ].map(({ label, val, tip }) => (
                <div key={label} className="py-7 px-6 flex flex-col items-center justify-center text-center">
                  <div className="text-[11px] font-semibold text-zinc-400/90 uppercase tracking-[0.14em] mb-3">{label}</div>
                  <div
                    className="text-[3.5rem] leading-none font-black tabular-nums text-zinc-900 cursor-help"
                    title={tip}
                  >
                    {val === null ? "—" : val.toFixed(1)}
                  </div>
                  <div className="text-xs text-zinc-400 mt-2">
                    {val !== null ? "Days" : ""}
                    {val !== null && <span className="text-zinc-300 ml-1">· from Due Date</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </section>

        {/* ── Charts Row ── */}
        <section>
          <SectionLabel>Analytics</SectionLabel>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Inspection Aging */}
            <div className="bg-white border border-zinc-200/80 rounded-lg shadow-sm overflow-hidden flex flex-col">
              <CardHeader title="Open Inspections by Aging and Status" />
              <div className="p-4 h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agingData} layout="vertical" margin={{ top: 4, right: 52, left: 10, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tickCount={6} tick={{ fill: "#71717a", fontSize: 13 }} axisLine={{ stroke: "#e4e4e7" }} tickLine={false} />
                    <YAxis dataKey="label" type="category" tick={{ fill: "#3f3f46", fontSize: 13, fontWeight: 600 }} axisLine={false} tickLine={false} width={200} />
                    <Tooltip
                      cursor={{ fill: "#f4f4f5" }}
                      contentStyle={{ backgroundColor: "#fff", borderColor: "#e4e4e7", borderRadius: "8px", boxShadow: "0 4px 12px 0 rgb(0 0 0 / 0.12)", fontSize: "14px", padding: "10px 16px", minWidth: "180px" }}
                      itemStyle={{ fontSize: "14px", fontWeight: 600, paddingTop: "3px", paddingBottom: "3px" }}
                      labelStyle={{ fontSize: "14px", fontWeight: 700, color: "#18181b", marginBottom: "6px" }}
                    />
                    <Bar dataKey="notStarted" name="Not Scheduled" stackId="s" fill="#a1a1aa" radius={[0, 0, 0, 0]} barSize={36} />
                    <Bar dataKey="scheduled"  name="Scheduled"     stackId="s" fill="#2563eb" radius={[0, 0, 0, 0]} barSize={36} />
                    <Bar dataKey="inProgress" name="In Progress"   stackId="s" fill="#d97706" radius={[0, 4, 4, 0]} barSize={36}>
                      <LabelList
                        content={(props: any) => {
                          const { x, y, width, height, index } = props;
                          const d = agingData[index];
                          if (!d || d._total === 0) return null;
                          return (
                            <text x={Number(x) + Number(width) + 7} y={Number(y) + Number(height) / 2 + 5} fill="#3f3f46" fontSize={13} fontWeight={700} textAnchor="start">
                              {d._total}
                            </text>
                          );
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status Distribution */}
            <div className="bg-white border border-zinc-200/80 rounded-lg shadow-sm overflow-hidden flex flex-col">
              <CardHeader title={`${currentYear} Inspections by Status`} />
              <div className="p-6 h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusChartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tickCount={6} tick={{ fill: "#71717a", fontSize: 13 }} axisLine={{ stroke: "#e4e4e7" }} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fill: "#3f3f46", fontSize: 13, fontWeight: 600 }} axisLine={false} tickLine={false} width={160} />
                    <Tooltip
                      cursor={{ fill: "#f4f4f5" }}
                      contentStyle={{ backgroundColor: "#fff", borderColor: "#e4e4e7", borderRadius: "8px", boxShadow: "0 4px 12px 0 rgb(0 0 0 / 0.12)", fontSize: "14px", padding: "10px 16px", minWidth: "180px" }}
                      itemStyle={{ color: "#18181b", fontSize: "14px", fontWeight: 600, paddingTop: "3px", paddingBottom: "3px" }}
                      labelStyle={{ color: "#18181b", fontSize: "14px", fontWeight: 700, marginBottom: "6px" }}
                    />
                    <Bar dataKey="value" barSize={28} radius={[0, 4, 4, 0]}>
                      {statusChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Forecast */}
            <div className="bg-white border border-zinc-200/80 rounded-lg shadow-sm overflow-hidden flex flex-col">
              <CardHeader title={`${currentYear} Monthly Inspection Activity`} />
              <div className="p-4" style={{ height: 360 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={forecast} margin={{ top: 5, right: 8, left: -24, bottom: 0 }} barCategoryGap="18%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 13 }} axisLine={{ stroke: "#e4e4e7" }} tickLine={false} height={28} />
                    <YAxis tick={{ fill: "#71717a", fontSize: 13 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: "#f4f4f5" }}
                      contentStyle={{ backgroundColor: "#fff", borderColor: "#e4e4e7", borderRadius: "8px", boxShadow: "0 4px 12px 0 rgb(0 0 0 / 0.12)", fontSize: "14px", padding: "10px 16px", minWidth: "180px" }}
                      itemStyle={{ fontSize: "14px", fontWeight: 600, paddingTop: "3px", paddingBottom: "3px" }}
                      labelStyle={{ fontSize: "14px", fontWeight: 700, color: "#18181b", marginBottom: "6px" }}
                    />
                    <Bar dataKey="notStarted" name="Not Scheduled" stackId="stack" fill="#d4d4d8" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="scheduled"  name="Scheduled"     stackId="stack" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="inProgress" name="In Progress"   stackId="stack" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="completed"  name="Completed"     stackId="stack" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </section>

        {/* ── Tables ── */}
        <section>
          <SectionLabel>Action &amp; Awareness</SectionLabel>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Overdue — alert styling ── */}
            <div className="bg-red-50/60 border border-red-200 rounded-lg shadow-sm overflow-hidden flex flex-col ring-1 ring-red-100">
              <CardHeader
                variant="danger"
                title="Overdue Inspections Requiring Action"
                badge={<CountBadge n={overdueItems.length} variant="danger" />}
                action={<ExportBtn onClick={() => downloadXlsx("overdue", `overdue_inspections_${new Date().toISOString().slice(0, 10)}.xlsx`)} />}
              />
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-red-50/80">
                    <TableRow className="hover:bg-transparent border-b border-red-200/60">
                      <TableHead className="text-red-700/70 text-xs uppercase tracking-wider font-semibold h-9 pl-4">Unit / Building</TableHead>
                      <TableHead className="text-red-700/70 text-xs uppercase tracking-wider font-semibold h-9 text-center">Type</TableHead>
                      <TableHead className="text-red-700/70 text-xs uppercase tracking-wider font-semibold h-9 text-center">Status</TableHead>
                      <TableHead className="text-red-700/70 text-xs uppercase tracking-wider font-semibold h-9 text-center pr-4">Was Due</TableHead>
                      <TableHead className="text-red-700/70 text-xs uppercase tracking-wider font-semibold h-9 text-center pr-4">Aging</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdueItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-zinc-400 py-8 text-sm">No overdue inspections.</TableCell>
                      </TableRow>
                    ) : overdueItems.map((insp: any) => {
                      const daysOver = insp.nextDueDate ? dayjs().diff(dayjs(insp.nextDueDate), "day") : null;
                      return (
                        <TableRow key={insp.id} className="hover:bg-red-100/40 border-b border-red-100/60 transition-colors">
                          <TableCell className="py-3 pl-4">
                            <div className="font-semibold text-sm text-zinc-900 leading-snug">{insp.elevatorName}</div>
                            <div className="text-xs text-zinc-500 mt-0.5">{insp.buildingName}</div>
                          </TableCell>
                          <TableCell className="py-3 text-center"><InspectionTypeBadge type={insp.inspectionType} /></TableCell>
                          <TableCell className="py-3 text-center"><StatusBadge status={insp.rawStatus} /></TableCell>
                          <TableCell className="text-center py-3 pr-4">
                            <div className="text-sm font-semibold text-zinc-900">{insp.nextDueDate ? dayjs(insp.nextDueDate).format("MMM D, YYYY") : "N/A"}</div>
                          </TableCell>
                          <TableCell className="text-center py-3 pr-4">
                            {daysOver !== null && <AgingBadge days={daysOver} mode="overdue" />}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* ── Upcoming ── */}
            <div className="bg-white border border-zinc-200/80 rounded-lg shadow-sm overflow-hidden flex flex-col">
              <CardHeader
                title={`Upcoming — Next 14 Days`}
                badge={<CountBadge n={upcoming.length} />}
                action={<ExportBtn onClick={() => downloadXlsx("upcoming", `upcoming_inspections_${new Date().toISOString().slice(0, 10)}.xlsx`)} />}
              />
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-50">
                    <TableRow className="hover:bg-transparent border-b border-zinc-200">
                      <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9 pl-4">Unit / Building</TableHead>
                      <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9 text-center">Type</TableHead>
                      <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9 text-center">Status</TableHead>
                      <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9 text-center pr-4">Due</TableHead>
                      <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9 text-center pr-4">Aging</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcoming.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-zinc-400 py-8 text-sm">No inspections due in the next 14 days.</TableCell>
                      </TableRow>
                    ) : upcoming.map((insp: any) => {
                      const daysUntil = insp.nextDueDate ? dayjs(insp.nextDueDate).diff(dayjs(), "day") : null;
                      const isToday   = insp.nextDueDate === todayStr;
                      const isUrgent  = !isToday && insp.nextDueDate <= in3Days;
                      const rowBg = isToday  ? "bg-red-50/60 hover:bg-red-100/40"
                                  : isUrgent ? "bg-amber-50/50 hover:bg-amber-100/40"
                                  :            "hover:bg-zinc-50/80";
                      return (
                        <TableRow key={insp.id} className={`border-b border-zinc-100 transition-colors ${rowBg}`}>
                          <TableCell className="py-3 pl-4">
                            <div className={`font-semibold text-sm leading-snug ${isToday ? "text-red-800" : "text-zinc-900"}`}>{insp.elevatorName}</div>
                            <div className="text-xs text-zinc-500 mt-0.5">{insp.buildingName}</div>
                          </TableCell>
                          <TableCell className="py-3 text-center"><InspectionTypeBadge type={insp.inspectionType} /></TableCell>
                          <TableCell className="py-3 text-center"><StatusBadge status={insp.status} /></TableCell>
                          <TableCell className="text-center py-3 pr-4">
                            <div className={`text-sm font-semibold leading-snug ${isToday ? "text-red-700" : isUrgent ? "text-amber-700" : "text-zinc-900"}`}>
                              {insp.nextDueDate ? dayjs(insp.nextDueDate).format("MMM D, YYYY") : "N/A"}
                            </div>
                          </TableCell>
                          <TableCell className="text-center py-3 pr-4">
                            {daysUntil !== null && <AgingBadge days={daysUntil} mode="upcoming" />}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}
