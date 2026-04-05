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

/* ─── helpers ─── */
function toLabel(s: string) {
  if (s === "NOT_STARTED" || s === "NOT STARTED") return "Not Scheduled";
  return s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "COMPLETED":   return "#16a34a";
    case "OVERDUE":     return "#dc2626";
    case "IN_PROGRESS": return "#d97706";
    case "SCHEDULED":   return "#2563eb";
    default:            return "#a1a1aa";
  }
};

/* ─── Overdue aging badge — large + prominent ─── */
function OverdueBadge({ days }: { days: number }) {
  let label: string;
  let cls: string;
  if (days >= 365 * 9) {
    label = "9+ years overdue"; cls = "bg-red-950 text-white";
  } else if (days >= 730) {
    const yrs = Math.floor(days / 365);
    label = `${yrs}+ years overdue`; cls = "bg-red-900 text-white";
  } else if (days >= 365) {
    label = "1+ year overdue"; cls = "bg-red-800 text-white";
  } else if (days > 120) {
    label = `${days} days overdue`; cls = "bg-red-700 text-white";
  } else if (days > 60) {
    label = `${days} days overdue`; cls = "bg-red-500 text-white";
  } else if (days > 30) {
    label = `${days} days overdue`; cls = "bg-orange-500 text-white";
  } else {
    label = `${days} days overdue`; cls = "bg-amber-500 text-white";
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-bold whitespace-nowrap ${cls}`}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
        <path fillRule="evenodd" d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.3-2.25l5.197-9ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 1 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
      </svg>
      {label}
    </span>
  );
}

/* ─── Upcoming aging badge ─── */
function UpcomingBadge({ days }: { days: number }) {
  let cls = "bg-emerald-100 text-emerald-800";
  let label = days === 0 ? "Today" : `${days}d away`;
  if (days === 0)     cls = "bg-red-100 text-red-700 font-bold";
  else if (days <= 3) cls = "bg-amber-100 text-amber-800 font-bold";
  else if (days <= 7) cls = "bg-yellow-100 text-yellow-800";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

/* ─── Status badge ─── */
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    OVERDUE:     "bg-red-100 text-red-700 border-red-300",
    SCHEDULED:   "bg-blue-100 text-blue-700 border-blue-300",
    NOT_STARTED: "bg-zinc-100 text-zinc-600 border-zinc-300",
    IN_PROGRESS: "bg-amber-100 text-amber-700 border-amber-300",
    COMPLETED:   "bg-green-100 text-green-700 border-green-300",
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
    <p className="text-xs font-black text-zinc-600 uppercase tracking-[0.14em] mb-3 pl-0.5">
      {children}
    </p>
  );
}

/* ─── Count badge ─── */
function CountBadge({ n, variant = "neutral" }: { n: number; variant?: "neutral" | "danger" }) {
  const cls = variant === "danger"
    ? "bg-red-600 text-white"
    : "bg-zinc-200 text-zinc-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-black tabular-nums ${cls}`}>
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
      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded border border-zinc-300 bg-white text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:border-zinc-400 shadow-sm transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
        <path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z" />
        <path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z" />
      </svg>
      Export
    </button>
  );
}

/* ─── Custom bar label renderer ─── */
function BarValueLabel(props: any) {
  const { x, y, width, height, value } = props;
  if (!value || value === 0) return null;
  return (
    <text
      x={Number(x) + Number(width) / 2}
      y={Number(y) + Number(height) / 2 + 5}
      fill="#fff"
      fontSize={12}
      fontWeight={700}
      textAnchor="middle"
    >
      {value}
    </text>
  );
}

/* ─── Total label at right of stacked bar ─── */
function StackedTotalLabel(data: any[]) {
  return function StackedTotalLabelInner(props: any) {
    const { x, y, width, height, index } = props;
    const d = data[index];
    if (!d || d._total === 0) return null;
    return (
      <text x={Number(x) + Number(width) + 8} y={Number(y) + Number(height) / 2 + 5} fill="#27272a" fontSize={12} fontWeight={700} textAnchor="start">
        {d._total}
      </text>
    );
  };
}

const LIVE_OPTS = { staleTime: 0, refetchInterval: 2 * 60 * 1000, refetchOnWindowFocus: true } as const;
const DASHBOARD_KEYS = ["/api/customers", "/api/dashboard/summary", "/api/dashboard/attention", "/api/dashboard/status-breakdown", "monthly-forecast", "/api/dashboard/aging/v2"];

function dashboardFetch(path: string, customerId?: number | null) {
  const token = localStorage.getItem("token");
  const qs = customerId ? `?customerId=${customerId}` : "";
  return fetch(`/api/dashboard/${path}${qs}`, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => { if (!r.ok) throw new Error(`Failed: ${path}`); return r.json(); });
}
function customersFetch() {
  const token = localStorage.getItem("token");
  return fetch("/api/customers", { headers: { Authorization: `Bearer ${token}` } })
    .then(r => { if (!r.ok) throw new Error("Failed: customers"); return r.json(); });
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000)), 10_000);
    return () => clearInterval(iv);
  }, [lastUpdated]);

  function refreshAll() {
    DASHBOARD_KEYS.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
    setLastUpdated(new Date()); setSecondsAgo(0);
  }

  async function downloadXlsx(endpoint: "overdue" | "upcoming", filename: string) {
    const params = new URLSearchParams();
    if (selectedCustomerId) params.append("customerId", String(selectedCustomerId));
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/export/${endpoint}?${params.toString()}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  const { data: customers }                               = useQuery({ queryKey: ["/api/customers"],                        queryFn: customersFetch,                                              ...LIVE_OPTS });
  const { data: summary,   isLoading: l1, dataUpdatedAt: t1 } = useQuery({ queryKey: ["/api/dashboard/summary",          selectedCustomerId], queryFn: () => dashboardFetch("summary",         selectedCustomerId), ...LIVE_OPTS });
  const { data: attention, isLoading: l2 }                    = useQuery({ queryKey: ["/api/dashboard/attention",         selectedCustomerId], queryFn: () => dashboardFetch("attention",        selectedCustomerId), ...LIVE_OPTS });
  const { data: breakdown, isLoading: l3 }                    = useQuery({ queryKey: ["/api/dashboard/status-breakdown",  selectedCustomerId], queryFn: () => dashboardFetch("status-breakdown", selectedCustomerId), ...LIVE_OPTS });
  const { data: forecast,  isLoading: l4 }                    = useQuery({ queryKey: ["monthly-forecast",                 selectedCustomerId], queryFn: () => dashboardFetch("monthly-forecast", selectedCustomerId), ...LIVE_OPTS });
  const { data: aging,     isLoading: l5 }                    = useQuery({ queryKey: ["/api/dashboard/aging/v2",          selectedCustomerId], queryFn: () => dashboardFetch("aging",            selectedCustomerId), ...LIVE_OPTS });

  useEffect(() => { if (t1) { setLastUpdated(new Date(t1)); setSecondsAgo(0); } }, [t1]);

  if (l1 || l2 || l3 || l4 || l5) {
    return <div className="flex h-[50vh] items-center justify-center bg-zinc-50"><Spinner className="h-8 w-8" /></div>;
  }

  const todayStr  = dayjs().format("YYYY-MM-DD");
  const in14Days  = dayjs().add(14, "day").format("YYYY-MM-DD");
  const in3Days   = dayjs().add(3,  "day").format("YYYY-MM-DD");

  const overdueItems = (attention ?? [])
    .filter((i: any) => i.status === "OVERDUE")
    .sort((a: any, b: any) => (a.nextDueDate ?? "").localeCompare(b.nextDueDate ?? ""));

  const upcoming = (attention ?? []).filter(
    (i: any) => i.status !== "OVERDUE" && i.nextDueDate && i.nextDueDate >= todayStr && i.nextDueDate <= in14Days
  ).sort((a: any, b: any) => a.nextDueDate.localeCompare(b.nextDueDate));

  const statusChartData = (breakdown ?? []).map((b: any) => ({
    name: toLabel(b.status), value: b.count, color: getStatusColor(b.status),
  }));

  const agingData = (aging ?? []).map((b: any) => ({
    ...b, _total: (b.notStarted ?? 0) + (b.scheduled ?? 0) + (b.inProgress ?? 0),
  }));

  const currentYear  = dayjs().year();
  const customerList: any[] = customers ?? [];

  /* ─── summary alert copy ─── */
  const overdueCount  = overdueItems.length;
  const upcomingCount = upcoming.length;
  const alertMsg = overdueCount > 0
    ? `${overdueCount} overdue inspection${overdueCount > 1 ? "s require" : " requires"} immediate attention`
    : upcomingCount > 0
      ? `${upcomingCount} inspection${upcomingCount > 1 ? "s are" : " is"} due within the next 14 days`
      : "All inspections are on track";
  const alertStyle = overdueCount > 0
    ? "bg-red-600 text-white border-red-700"
    : upcomingCount > 0
      ? "bg-amber-500 text-white border-amber-600"
      : "bg-green-600 text-white border-green-700";

  return (
    <div className="flex flex-col min-h-full -m-6 lg:-m-8 bg-zinc-100 text-zinc-900 font-sans">
      <div className="flex-1 p-6 md:p-8 space-y-8">

        {/* ══ Header ══ */}
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2">
            <button onClick={refreshAll} title="Refresh dashboard" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-zinc-300 bg-white text-xs text-zinc-600 hover:text-zinc-900 hover:border-zinc-400 shadow-sm transition-colors font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08 1.01.75.75 0 1 1-1.3-.75 6 6 0 0 1 9.44-1.345l.842.841V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.345l-.842-.841v1.273a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.84.841a4.5 4.5 0 0 0 7.08-1.01.75.75 0 0 1 1.025-.295Z" clipRule="evenodd" />
              </svg>
              Refresh
            </button>
            <span className="text-xs text-zinc-500 font-medium">
              {secondsAgo < 60 ? "Just updated" : `Updated ${Math.floor(secondsAgo / 60)}m ago`}
            </span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">{currentYear} Inspection Activity</h1>
          <div className="flex-1 flex justify-end">
            <select value={selectedCustomerId ?? ""} onChange={e => setSelectedCustomerId(e.target.value ? parseInt(e.target.value) : null)}
              className="h-9 rounded-md border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-800 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 min-w-[200px]">
              <option value="">All Customers</option>
              {customerList.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {/* ══ #1 PRIORITY: Action alert banner ══ */}
        <div className={`flex items-center gap-3 px-5 py-3.5 rounded-lg border font-bold text-sm shadow-md ${alertStyle}`}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <span className="flex-1">{alertMsg}</span>
        </div>

        {/* ══ #2 PRIORITY: Action & Awareness ══ */}
        <section>
          <SectionLabel>⚠ Action Required</SectionLabel>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Overdue — dominant red alert card */}
            <div className="bg-white border-l-4 border-l-red-600 border border-red-200 rounded-lg shadow-lg overflow-hidden flex flex-col">
              <div className="px-5 py-4 bg-red-600 flex items-center gap-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-100 shrink-0">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
                <h3 className="text-base font-black text-white flex-1">Overdue Inspections Requiring Action</h3>
                <CountBadge n={overdueItems.length} variant="danger" />
                <ExportBtn onClick={() => downloadXlsx("overdue", `overdue_inspections_${new Date().toISOString().slice(0, 10)}.xlsx`)} />
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-red-50">
                    <TableRow className="hover:bg-transparent border-b border-red-200">
                      <TableHead className="text-red-800 text-xs uppercase tracking-wider font-bold h-9 pl-4">Unit / Building</TableHead>
                      <TableHead className="text-red-800 text-xs uppercase tracking-wider font-bold h-9 text-center">Type</TableHead>
                      <TableHead className="text-red-800 text-xs uppercase tracking-wider font-bold h-9 text-center">Status</TableHead>
                      <TableHead className="text-red-800 text-xs uppercase tracking-wider font-bold h-9 text-center">Was Due</TableHead>
                      <TableHead className="text-red-800 text-xs uppercase tracking-wider font-bold h-9 text-center pr-4">Aging</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdueItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-zinc-500 py-10 text-sm font-medium">
                          <div className="flex flex-col items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-green-500">
                              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                            </svg>
                            No overdue inspections — great work!
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : overdueItems.map((insp: any) => {
                      const daysOver = insp.nextDueDate ? dayjs().diff(dayjs(insp.nextDueDate), "day") : null;
                      return (
                        <TableRow key={insp.id} className="hover:bg-red-50/70 border-b border-red-100 transition-colors">
                          <TableCell className="py-3.5 pl-4">
                            <div className="font-bold text-sm text-zinc-900 leading-snug">{insp.elevatorName}</div>
                            <div className="text-xs text-zinc-500 mt-0.5">{insp.buildingName}</div>
                          </TableCell>
                          <TableCell className="py-3.5 text-center"><InspectionTypeBadge type={insp.inspectionType} /></TableCell>
                          <TableCell className="py-3.5 text-center"><StatusBadge status={insp.rawStatus} /></TableCell>
                          <TableCell className="text-center py-3.5">
                            <span className="text-sm font-semibold text-zinc-800">{insp.nextDueDate ? dayjs(insp.nextDueDate).format("MMM D, YYYY") : "N/A"}</span>
                          </TableCell>
                          <TableCell className="text-center py-3.5 pr-4">
                            {daysOver !== null && <OverdueBadge days={daysOver} />}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Upcoming */}
            <div className="bg-white border border-zinc-200 rounded-lg shadow-md overflow-hidden flex flex-col">
              <div className="px-5 py-4 bg-zinc-800 flex items-center gap-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4.5 h-4.5 text-zinc-300 shrink-0">
                  <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
                </svg>
                <h3 className="text-base font-black text-white flex-1">Upcoming — Next 14 Days</h3>
                <CountBadge n={upcoming.length} />
                <ExportBtn onClick={() => downloadXlsx("upcoming", `upcoming_inspections_${new Date().toISOString().slice(0, 10)}.xlsx`)} />
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-50">
                    <TableRow className="hover:bg-transparent border-b border-zinc-200">
                      <TableHead className="text-zinc-700 text-xs uppercase tracking-wider font-bold h-9 pl-4">Unit / Building</TableHead>
                      <TableHead className="text-zinc-700 text-xs uppercase tracking-wider font-bold h-9 text-center">Type</TableHead>
                      <TableHead className="text-zinc-700 text-xs uppercase tracking-wider font-bold h-9 text-center">Status</TableHead>
                      <TableHead className="text-zinc-700 text-xs uppercase tracking-wider font-bold h-9 text-center">Due</TableHead>
                      <TableHead className="text-zinc-700 text-xs uppercase tracking-wider font-bold h-9 text-center pr-4">Timing</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcoming.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-zinc-500 py-10 text-sm font-medium">No inspections due in the next 14 days.</TableCell>
                      </TableRow>
                    ) : upcoming.map((insp: any) => {
                      const daysUntil = insp.nextDueDate ? dayjs(insp.nextDueDate).diff(dayjs(), "day") : null;
                      const isToday   = insp.nextDueDate === todayStr;
                      const isUrgent  = !isToday && insp.nextDueDate <= in3Days;
                      const rowBg = isToday  ? "bg-red-50/70 hover:bg-red-100/50"
                                  : isUrgent ? "bg-amber-50/60 hover:bg-amber-100/40"
                                  :            "hover:bg-zinc-50";
                      return (
                        <TableRow key={insp.id} className={`border-b border-zinc-100 transition-colors ${rowBg}`}>
                          <TableCell className="py-3.5 pl-4">
                            <div className={`font-bold text-sm leading-snug ${isToday ? "text-red-800" : "text-zinc-900"}`}>{insp.elevatorName}</div>
                            <div className="text-xs text-zinc-500 mt-0.5">{insp.buildingName}</div>
                          </TableCell>
                          <TableCell className="py-3.5 text-center"><InspectionTypeBadge type={insp.inspectionType} /></TableCell>
                          <TableCell className="py-3.5 text-center"><StatusBadge status={insp.status} /></TableCell>
                          <TableCell className="text-center py-3.5">
                            <span className={`text-sm font-semibold ${isToday ? "text-red-700" : isUrgent ? "text-amber-700" : "text-zinc-800"}`}>
                              {insp.nextDueDate ? dayjs(insp.nextDueDate).format("MMM D, YYYY") : "N/A"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center py-3.5 pr-4">
                            {daysUntil !== null && <UpcomingBadge days={daysUntil} />}
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

        {/* ══ #3: KPI Strips ══ */}
        <section className="space-y-5">

          <div>
            <SectionLabel>Volume</SectionLabel>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Not Scheduled", value: summary?.notStartedCount ?? 0, color: "text-zinc-800",  accent: "border-t-zinc-400" },
                { label: "Scheduled",     value: summary?.scheduledCount   ?? 0, color: "text-blue-700",  accent: "border-t-blue-500" },
                { label: "In Progress",   value: summary?.inProgressCount  ?? 0, color: "text-amber-600", accent: "border-t-amber-500" },
                { label: "Completed",     value: summary?.completedCount   ?? 0, color: "text-green-700", accent: "border-t-green-500" },
              ].map(({ label, value, color, accent }) => (
                <div key={label} className={`bg-white border border-zinc-200 border-t-4 ${accent} rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 flex flex-col items-center justify-center text-center`}>
                  <div className="text-xs font-bold text-zinc-500 uppercase tracking-[0.12em] mb-3">{label}</div>
                  <div className={`text-[3.75rem] leading-none font-black tabular-nums ${color}`}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionLabel>Performance Metrics</SectionLabel>
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  label:   "Avg Days to Schedule",
                  sub:     "Average time from due date to scheduling",
                  val:     summary?.avgDaysToSchedule ?? null,
                  tip:     "Average number of days between an inspection's due date and when it was scheduled. Positive = scheduled after due date.",
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-zinc-400">
                      <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
                    </svg>
                  ),
                },
                {
                  label:   "Avg Days to Complete",
                  sub:     "Average time from due date to completion",
                  val:     summary?.avgDaysToComplete ?? null,
                  tip:     "Average number of days between an inspection's due date and when it was marked completed. Positive = completed after due date.",
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-zinc-400">
                      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
                    </svg>
                  ),
                },
              ].map(({ label, sub, val, tip, icon }) => (
                <div key={label} className="bg-white border border-zinc-200 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-xs font-bold text-zinc-500 uppercase tracking-[0.12em]">{label}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">{sub}</div>
                    </div>
                    {icon}
                  </div>
                  <div className="text-[3.75rem] leading-none font-black tabular-nums text-zinc-900 cursor-help" title={tip}>
                    {val === null ? "—" : val.toFixed(1)}
                  </div>
                  {val !== null && <div className="text-xs text-zinc-400 mt-2 font-medium">days · from due date</div>}
                </div>
              ))}
            </div>
          </div>

        </section>

        {/* ══ #4: Charts ══ */}
        <section>
          <SectionLabel>Analytics</SectionLabel>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Aging chart */}
            <div className="bg-white border border-zinc-200 rounded-lg shadow-md overflow-hidden flex flex-col">
              <div className="px-5 py-3.5 border-b border-zinc-200 bg-zinc-50">
                <h3 className="text-sm font-bold text-zinc-800">Open Inspections by Aging and Status</h3>
              </div>
              <div className="p-4 h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agingData} layout="vertical" margin={{ top: 4, right: 56, left: 10, bottom: 4 }} barCategoryGap="30%">
                    <XAxis type="number" allowDecimals={false} tickCount={5} tick={{ fill: "#52525b", fontSize: 12, fontWeight: 500 }} axisLine={{ stroke: "#d4d4d8" }} tickLine={false} />
                    <YAxis dataKey="label" type="category" tick={{ fill: "#27272a", fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} width={200} />
                    <Tooltip
                      cursor={{ fill: "#f4f4f5" }}
                      contentStyle={{ backgroundColor: "#fff", borderColor: "#d4d4d8", borderRadius: "8px", boxShadow: "0 4px 16px 0 rgb(0 0 0 / 0.14)", fontSize: "13px", padding: "10px 16px" }}
                      itemStyle={{ fontSize: "13px", fontWeight: 600 }}
                      labelStyle={{ fontSize: "13px", fontWeight: 800, color: "#18181b", marginBottom: "4px" }}
                    />
                    <Bar dataKey="notStarted" name="Not Scheduled" stackId="s" fill="#a1a1aa" barSize={40}>
                      <LabelList content={BarValueLabel} />
                    </Bar>
                    <Bar dataKey="scheduled" name="Scheduled" stackId="s" fill="#2563eb" barSize={40}>
                      <LabelList content={BarValueLabel} />
                    </Bar>
                    <Bar dataKey="inProgress" name="In Progress" stackId="s" fill="#d97706" radius={[0, 4, 4, 0]} barSize={40}>
                      <LabelList content={(props: any) => { const { x, y, width, height, index } = props; const d = agingData[index]; if (!d || d._total === 0) return null; return <text x={Number(x)+Number(width)+8} y={Number(y)+Number(height)/2+5} fill="#27272a" fontSize={12} fontWeight={800} textAnchor="start">{d._total}</text>; }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status distribution */}
            <div className="bg-white border border-zinc-200 rounded-lg shadow-md overflow-hidden flex flex-col">
              <div className="px-5 py-3.5 border-b border-zinc-200 bg-zinc-50">
                <h3 className="text-sm font-bold text-zinc-800">{currentYear} Inspections by Status</h3>
              </div>
              <div className="p-4 h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusChartData} layout="vertical" margin={{ top: 5, right: 50, left: 10, bottom: 5 }} barCategoryGap="30%">
                    <XAxis type="number" allowDecimals={false} tickCount={5} tick={{ fill: "#52525b", fontSize: 12, fontWeight: 500 }} axisLine={{ stroke: "#d4d4d8" }} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fill: "#27272a", fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} width={160} />
                    <Tooltip
                      cursor={{ fill: "#f4f4f5" }}
                      contentStyle={{ backgroundColor: "#fff", borderColor: "#d4d4d8", borderRadius: "8px", boxShadow: "0 4px 16px 0 rgb(0 0 0 / 0.14)", fontSize: "13px", padding: "10px 16px" }}
                      itemStyle={{ color: "#18181b", fontSize: "13px", fontWeight: 600 }}
                      labelStyle={{ color: "#18181b", fontSize: "13px", fontWeight: 800, marginBottom: "4px" }}
                    />
                    <Bar dataKey="value" barSize={36} radius={[0, 4, 4, 0]}>
                      {statusChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      <LabelList
                        content={(props: any) => {
                          const { x, y, width, height, value } = props;
                          if (!value) return null;
                          return <text x={Number(x)+Number(width)+8} y={Number(y)+Number(height)/2+5} fill="#27272a" fontSize={12} fontWeight={800} textAnchor="start">{value}</text>;
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly forecast */}
            <div className="bg-white border border-zinc-200 rounded-lg shadow-md overflow-hidden flex flex-col">
              <div className="px-5 py-3.5 border-b border-zinc-200 bg-zinc-50">
                <h3 className="text-sm font-bold text-zinc-800">{currentYear} Monthly Inspection Activity</h3>
              </div>
              <div className="p-4" style={{ height: 340 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={forecast} margin={{ top: 5, right: 8, left: -24, bottom: 0 }} barCategoryGap="20%">
                    <XAxis dataKey="label" tick={{ fill: "#52525b", fontSize: 12, fontWeight: 500 }} axisLine={{ stroke: "#d4d4d8" }} tickLine={false} height={28} />
                    <YAxis tick={{ fill: "#52525b", fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: "#f4f4f5" }}
                      contentStyle={{ backgroundColor: "#fff", borderColor: "#d4d4d8", borderRadius: "8px", boxShadow: "0 4px 16px 0 rgb(0 0 0 / 0.14)", fontSize: "13px", padding: "10px 16px" }}
                      itemStyle={{ fontSize: "13px", fontWeight: 600 }}
                      labelStyle={{ fontSize: "13px", fontWeight: 800, color: "#18181b", marginBottom: "4px" }}
                    />
                    <Bar dataKey="notStarted" name="Not Scheduled" stackId="s" fill="#a1a1aa" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="scheduled"  name="Scheduled"     stackId="s" fill="#2563eb" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="inProgress" name="In Progress"   stackId="s" fill="#d97706" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="completed"  name="Completed"     stackId="s" fill="#16a34a" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}
