import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InspectionTypeBadge } from "@/components/inspection-type-badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from "recharts";
import dayjs from "dayjs";

/* ─── label helper ─── */
function toLabel(s: string) {
  if (s === "NOT_STARTED" || s === "NOT STARTED") return "Not scheduled";
  return s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

/* ─── Status colours — single source of truth ─── */
const STATUS_COLORS: Record<string, string> = {
  COMPLETED:   "#16a34a",
  OVERDUE:     "#dc2626",
  IN_PROGRESS: "#d97706",
  SCHEDULED:   "#2563eb",
  NOT_STARTED: "#a1a1aa",
};
const getStatusColor = (s: string) => STATUS_COLORS[s] ?? "#a1a1aa";

/* ─── Overdue aging badge ─── */
function OverdueBadge({ days }: { days: number }) {
  let label: string; let bg: string;
  if (days >= 365 * 9) { label = "9+ years overdue"; bg = "bg-red-950"; }
  else if (days >= 730) { const y = Math.floor(days / 365); label = `${y}+ years overdue`; bg = "bg-red-900"; }
  else if (days >= 365) { label = "1+ year overdue"; bg = "bg-red-800"; }
  else if (days > 120)  { label = `${days} days overdue`; bg = "bg-red-700"; }
  else if (days > 60)   { label = `${days} days overdue`; bg = "bg-red-500"; }
  else if (days > 30)   { label = `${days} days overdue`; bg = "bg-orange-500"; }
  else                  { label = `${days} days overdue`; bg = "bg-amber-500"; }
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-bold whitespace-nowrap text-white ${bg}`}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
        <path fillRule="evenodd" d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.3-2.25l5.197-9ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 1 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
      </svg>
      {label}
    </span>
  );
}

/* ─── Upcoming timing badge ─── */
function UpcomingBadge({ days }: { days: number }) {
  let cls = "bg-emerald-100 text-emerald-800";
  let label = `${days}d away`;
  if (days === 0)     { label = "Today";        cls = "bg-red-100 text-red-700 font-bold"; }
  else if (days <= 3) { label = `${days}d away`; cls = "bg-amber-100 text-amber-800 font-bold"; }
  else if (days <= 7) { cls = "bg-yellow-100 text-yellow-800"; }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

/* ─── Status badge ─── */
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    OVERDUE:     "bg-red-50   text-red-700   border-red-200",
    SCHEDULED:   "bg-blue-50  text-blue-700  border-blue-200",
    NOT_STARTED: "bg-zinc-50  text-zinc-600  border-zinc-200",
    IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
    COMPLETED:   "bg-green-50 text-green-700 border-green-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${styles[status] ?? styles.NOT_STARTED}`}>
      {toLabel(status)}
    </span>
  );
}

/* ─── Section label with divider line ─── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="text-xs font-black text-zinc-500 uppercase tracking-[0.14em] whitespace-nowrap">{children}</p>
      <div className="flex-1 h-px bg-zinc-200" />
    </div>
  );
}

/* ─── Uniform card header — same font size, UPPERCASE title ─── */
function CardHeader({ title, badge, action }: { title: string; badge?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50/60 flex items-center gap-2">
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-black text-zinc-700 uppercase tracking-[0.09em] text-center">{title}</h3>
        {badge}
      </div>
      <div className="flex-1 flex justify-end">{action}</div>
    </div>
  );
}

/* ─── Overdue card header — same size, red tint ─── */
function OverdueCardHeader({ title, badge, action }: { title: string; badge?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="px-5 py-3 border-b border-red-200 bg-red-50 flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-red-500 shrink-0">
        <path fillRule="evenodd" d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.3-2.25l5.197-9ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 1 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
      </svg>
      <h3 className="text-xs font-black text-red-700 uppercase tracking-[0.09em] flex-1 text-center">{title}</h3>
      {badge}
      <div className="flex justify-end">{action}</div>
    </div>
  );
}

/* ─── Upcoming card header ─── */
function UpcomingCardHeader({ title, badge, action }: { title: string; badge?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="px-5 py-3 border-b border-indigo-200 bg-indigo-50 flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-indigo-500 shrink-0">
        <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5V3.75Z" clipRule="evenodd" />
      </svg>
      <h3 className="text-xs font-black text-indigo-700 uppercase tracking-[0.09em] flex-1 text-center">{title}</h3>
      {badge}
      <div className="flex justify-end">{action}</div>
    </div>
  );
}

/* ─── Count badge ─── */
function CountBadge({ n, variant = "neutral" }: { n: number; variant?: "neutral" | "danger" }) {
  const cls = variant === "danger" ? "bg-red-600 text-white" : "bg-zinc-200 text-zinc-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-black tabular-nums ${cls}`}>{n}</span>
  );
}

/* ─── Export button ─── */
function ExportBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} title="Download as Excel"
      className="inline-flex items-center gap-1.5 h-6 px-2 rounded border border-zinc-200 bg-white text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 shadow-sm transition-all">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
        <path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z" />
        <path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z" />
      </svg>
      Export
    </button>
  );
}

/* ─── In-bar value label (white) ─── */
function BarValueLabel(props: any) {
  const { x, y, width, height, value } = props;
  if (!value || Number(value) === 0 || Number(width) < 22) return null;
  return (
    <text x={Number(x)+Number(width)/2} y={Number(y)+Number(height)/2+5}
      fill="#fff" fontSize={12} fontWeight={700} textAnchor="middle">{value}</text>
  );
}

/* ─── External total label at right of stacked bar ─── */
function TotalLabel(data: any[]) {
  return function Inner(props: any) {
    const { x, y, width, height, index } = props;
    const d = data[index];
    if (!d || d._total === 0) return null;
    return <text x={Number(x)+Number(width)+10} y={Number(y)+Number(height)/2+5} fill="#18181b" fontSize={14} fontWeight={900} textAnchor="start">{d._total}</text>;
  };
}

/* ─── Shared tooltip style ─── */
const TT = {
  contentStyle: { backgroundColor:"#fff", borderColor:"#e4e4e7", borderRadius:"8px", boxShadow:"0 4px 20px rgb(0 0 0/0.12)", fontSize:"13px", padding:"10px 16px" },
  itemStyle:    { fontSize:"13px", fontWeight:600 },
  labelStyle:   { fontSize:"13px", fontWeight:800, color:"#18181b", marginBottom:"4px" },
  cursor:       { fill:"#f4f4f5" },
};
const tickStyle = { fill:"#52525b", fontSize:12, fontWeight:500 as const };

const LIVE_OPTS = { staleTime: 0, refetchInterval: 2*60*1000, refetchOnWindowFocus: true } as const;
const DASH_KEYS = ["/api/customers","/api/dashboard/summary","/api/dashboard/attention","/api/dashboard/status-breakdown","monthly-forecast","/api/dashboard/aging/v2"];

function apiFetch(path: string, cid?: number | null) {
  const token = localStorage.getItem("token");
  return fetch(`/api/dashboard/${path}${cid ? `?customerId=${cid}` : ""}`, { headers: { Authorization:`Bearer ${token}` } })
    .then(r => { if (!r.ok) throw new Error(path); return r.json(); });
}
function customersFetch() {
  const token = localStorage.getItem("token");
  return fetch("/api/customers", { headers: { Authorization:`Bearer ${token}` } }).then(r => r.json());
}

export default function Dashboard() {
  const qc = useQueryClient();
  const [cid, setCid]               = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secsAgo,   setSecsAgo]       = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setSecsAgo(Math.floor((Date.now()-lastUpdated.getTime())/1000)), 10_000);
    return () => clearInterval(iv);
  }, [lastUpdated]);

  function refreshAll() {
    DASH_KEYS.forEach(k => qc.invalidateQueries({ queryKey:[k] }));
    setLastUpdated(new Date()); setSecsAgo(0);
  }

  async function dlXlsx(endpoint: "overdue"|"upcoming", filename: string) {
    const params = new URLSearchParams();
    if (cid) params.append("customerId", String(cid));
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/export/${endpoint}?${params}`, { headers: token ? { Authorization:`Bearer ${token}` } : {} });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=filename;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  const { data: customers }                             = useQuery({ queryKey:["/api/customers"],                      queryFn: customersFetch,                        ...LIVE_OPTS });
  const { data: summary,  isLoading:l1, dataUpdatedAt:t1 } = useQuery({ queryKey:["/api/dashboard/summary",         cid], queryFn:()=>apiFetch("summary",         cid), ...LIVE_OPTS });
  const { data: attention, isLoading:l2 }                  = useQuery({ queryKey:["/api/dashboard/attention",        cid], queryFn:()=>apiFetch("attention",        cid), ...LIVE_OPTS });
  const { data: breakdown, isLoading:l3 }                  = useQuery({ queryKey:["/api/dashboard/status-breakdown", cid], queryFn:()=>apiFetch("status-breakdown", cid), ...LIVE_OPTS });
  const { data: forecast,  isLoading:l4 }                  = useQuery({ queryKey:["monthly-forecast",                cid], queryFn:()=>apiFetch("monthly-forecast", cid), ...LIVE_OPTS });
  const { data: aging,     isLoading:l5 }                  = useQuery({ queryKey:["/api/dashboard/aging/v2",         cid], queryFn:()=>apiFetch("aging",            cid), ...LIVE_OPTS });

  useEffect(() => { if (t1) { setLastUpdated(new Date(t1)); setSecsAgo(0); } }, [t1]);

  if (l1||l2||l3||l4||l5) return (
    <div className="flex h-[50vh] items-center justify-center bg-zinc-50"><Spinner className="h-8 w-8" /></div>
  );

  const todayStr = dayjs().format("YYYY-MM-DD");
  const in14Days = dayjs().add(14,"day").format("YYYY-MM-DD");
  const in3Days  = dayjs().add(3, "day").format("YYYY-MM-DD");

  const overdueItems = ((attention??[]) as any[])
    .filter(i => i.status==="OVERDUE")
    .sort((a,b)=>(a.nextDueDate??"").localeCompare(b.nextDueDate??""));
  const upcoming = ((attention??[]) as any[]).filter(
    i=>i.status!=="OVERDUE"&&i.nextDueDate&&i.nextDueDate>=todayStr&&i.nextDueDate<=in14Days
  ).sort((a,b)=>a.nextDueDate.localeCompare(b.nextDueDate));

  const statusChartData = ((breakdown??[]) as any[]).map(b=>({ name:toLabel(b.status), value:b.count, color:getStatusColor(b.status) }));
  const agingData       = ((aging??[]) as any[]).map(b=>({ ...b, _total:(b.notStarted??0)+(b.scheduled??0)+(b.inProgress??0) }));
  const year            = dayjs().year();
  const customerList    = (customers??[]) as any[];

  return (
    <div className="flex flex-col min-h-full -m-6 lg:-m-8 bg-zinc-100 text-zinc-900 font-sans">
      <div className="flex-1 p-6 md:p-8 space-y-9">

        {/* ── Header ── */}
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2">
            <button onClick={refreshAll} title="Refresh"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-zinc-300 bg-white text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 hover:border-zinc-400 shadow-sm transition-all font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08 1.01.75.75 0 1 1-1.3-.75 6 6 0 0 1 9.44-1.345l.842.841V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.345l-.842-.841v1.273a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.84.841a4.5 4.5 0 0 0 7.08-1.01.75.75 0 0 1 1.025-.295Z" clipRule="evenodd" />
              </svg>
              Refresh
            </button>
            <span className="text-xs text-zinc-400 font-medium">
              {secsAgo<60?"Just updated":`Updated ${Math.floor(secsAgo/60)}m ago`}
            </span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">{year} Inspection Activity</h1>
          <div className="flex-1 flex justify-end">
            <select value={cid??""} onChange={e=>setCid(e.target.value?parseInt(e.target.value):null)}
              className="h-9 rounded-md border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-800 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 min-w-[200px]">
              <option value="">All Customers</option>
              {customerList.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {/* ══ SECTION 1 — VOLUME ══ */}
        <section>
          <SectionLabel>Volume</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {([
              { label:"Not Scheduled", value:summary?.notStartedCount??0, numCls:"text-zinc-800",  topCls:"border-t-zinc-400", iconCls:"text-zinc-400",
                icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5V3.75Z" clipRule="evenodd" /></svg> },
              { label:"Scheduled",     value:summary?.scheduledCount??0,  numCls:"text-blue-700",  topCls:"border-t-blue-500", iconCls:"text-blue-400",
                icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" /></svg> },
              { label:"In Progress",   value:summary?.inProgressCount??0, numCls:"text-amber-600", topCls:"border-t-amber-500", iconCls:"text-amber-400",
                icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08 1.01.75.75 0 1 1-1.3-.75 6 6 0 0 1 9.44-1.345l.842.841V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.345l-.842-.841v1.273a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.84.841a4.5 4.5 0 0 0 7.08-1.01.75.75 0 0 1 1.025-.295Z" clipRule="evenodd" /></svg> },
              { label:"Completed",     value:summary?.completedCount??0,  numCls:"text-green-700", topCls:"border-t-green-500", iconCls:"text-green-500",
                icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" /></svg> },
            ] as { label:string; value:number; numCls:string; topCls:string; iconCls:string; icon:React.ReactNode }[]).map(({ label, value, numCls, topCls, iconCls, icon }) => (
              <div key={label} className={`bg-white border border-t-4 border-zinc-200 ${topCls} rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col`}>
                <CardHeader title={label} />
                <div className="relative flex-1 flex items-center justify-center py-6 overflow-hidden">
                  <div className={`absolute -bottom-3 -right-3 w-28 h-28 opacity-[0.09] pointer-events-none select-none ${iconCls} [&>svg]:w-full [&>svg]:h-full`}>{icon}</div>
                  <div className={`relative text-[4.5rem] leading-none font-black tabular-nums tracking-tight ${numCls}`}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══ SECTION 2 — PERFORMANCE METRICS ══ */}
        <section>
          <SectionLabel>Performance Metrics</SectionLabel>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                label:"Avg Days To Schedule",
                sub:  "Average time from due date to scheduling",
                val:  summary?.avgDaysToSchedule??null,
                tip:  "Average days between an inspection's due date and when it was scheduled. Positive = scheduled after due date.",
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-zinc-400">
                    <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
                  </svg>
                ),
              },
              {
                label:"Avg Days To Complete",
                sub:  "Average time from due date to completion",
                val:  summary?.avgDaysToComplete??null,
                tip:  "Average days between an inspection's due date and when it was marked completed. Positive = completed after due date.",
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-zinc-400">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
                  </svg>
                ),
              },
            ].map(({ label, sub, val, tip, icon }) => (
              <div key={label} className="bg-white border border-zinc-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                <CardHeader title={label} />
                <div className="flex flex-col items-center justify-center py-5 text-center">
                  <div className="text-[4.5rem] leading-none font-black tabular-nums tracking-tight text-zinc-900 cursor-help" title={tip}>
                    {val===null?"—":val.toFixed(1)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2.5 text-zinc-400">
                    <span className="text-zinc-400">{icon}</span>
                    <span className="text-sm font-semibold">{sub}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══ SECTION 3 — ANALYTICS ══ */}
        <section>
          <SectionLabel>Analytics</SectionLabel>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Aging stacked bar */}
            <div className="bg-white border border-zinc-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
              <CardHeader title="Open Inspections — Aging by Status" />
              <div className="p-4 h-[330px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agingData} layout="vertical" margin={{ top:4, right:56, left:8, bottom:4 }} barCategoryGap="28%">
                    <XAxis type="number" allowDecimals={false} tick={false} axisLine={false} tickLine={false} />
                    <YAxis dataKey="label" type="category" tick={{ fill:"#18181b", fontSize:13, fontWeight:700 }} axisLine={false} tickLine={false} width={200} />
                    <Tooltip {...TT} />
                    <Bar dataKey="notStarted" name="Not Scheduled" stackId="s" fill={STATUS_COLORS.NOT_STARTED} barSize={46}>
                      <LabelList content={(p:any)=>{const{x,y,width,height,value}=p;if(!value||Number(value)===0||Number(width)<26)return null;return<text x={Number(x)+Number(width)/2} y={Number(y)+Number(height)/2+5} fill="#fff" fontSize={13} fontWeight={800} textAnchor="middle">{value}</text>;}} />
                    </Bar>
                    <Bar dataKey="scheduled" name="Scheduled" stackId="s" fill={STATUS_COLORS.SCHEDULED} barSize={46}>
                      <LabelList content={(p:any)=>{const{x,y,width,height,value}=p;if(!value||Number(value)===0||Number(width)<26)return null;return<text x={Number(x)+Number(width)/2} y={Number(y)+Number(height)/2+5} fill="#fff" fontSize={13} fontWeight={800} textAnchor="middle">{value}</text>;}} />
                    </Bar>
                    <Bar dataKey="inProgress" name="In Progress" stackId="s" fill={STATUS_COLORS.IN_PROGRESS} radius={[0,4,4,0]} barSize={46}>
                      <LabelList content={(p:any)=>{const{x,y,width,height,value}=p;if(!value||Number(value)===0||Number(width)<26)return null;return<text x={Number(x)+Number(width)/2} y={Number(y)+Number(height)/2+5} fill="#fff" fontSize={13} fontWeight={800} textAnchor="middle">{value}</text>;}} />
                      <LabelList content={TotalLabel(agingData)} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status distribution */}
            <div className="bg-white border border-zinc-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
              <CardHeader title={`${year} Inspections by Status`} />
              <div className="p-4 h-[330px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusChartData} layout="vertical" margin={{ top:5, right:54, left:8, bottom:5 }} barCategoryGap="28%">
                    <XAxis type="number" allowDecimals={false} tick={false} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fill:"#18181b", fontSize:13, fontWeight:700 }} axisLine={false} tickLine={false} width={155} />
                    <Tooltip {...TT} />
                    <Bar dataKey="value" barSize={46} radius={[0,5,5,0]}>
                      {statusChartData.map((e,i)=><Cell key={i} fill={e.color} />)}
                      <LabelList content={(props:any) => {
                        const { x,y,width,height,value } = props;
                        if (!value) return null;
                        return <text x={Number(x)+Number(width)+10} y={Number(y)+Number(height)/2+5} fill="#18181b" fontSize={14} fontWeight={900} textAnchor="start">{value}</text>;
                      }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly activity */}
            <div className="bg-white border border-zinc-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
              <CardHeader title={`${year} Monthly Inspection Activity`} />
              <div className="p-4" style={{ height:330 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={forecast} margin={{ top:5, right:8, left:-20, bottom:0 }} barCategoryGap="28%">
                    <XAxis dataKey="label" tick={{ fill:"#18181b", fontSize:13, fontWeight:700 }} axisLine={false} tickLine={false} height={28} />
                    <YAxis tick={{ fill:"#71717a", fontSize:12, fontWeight:500 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip {...TT} />
                    <Bar dataKey="notStarted" name="Not Scheduled" stackId="s" fill={STATUS_COLORS.NOT_STARTED} radius={[0,0,0,0]} />
                    <Bar dataKey="scheduled"  name="Scheduled"     stackId="s" fill={STATUS_COLORS.SCHEDULED}   radius={[0,0,0,0]} />
                    <Bar dataKey="inProgress" name="In Progress"   stackId="s" fill={STATUS_COLORS.IN_PROGRESS}  radius={[0,0,0,0]} />
                    <Bar dataKey="completed"  name="Completed"     stackId="s" fill={STATUS_COLORS.COMPLETED}    radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </section>

        {/* ══ SECTION 4 — ACTION LISTS ══ */}
        <section>
          <SectionLabel>Action Lists</SectionLabel>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Overdue — light red tint, red accents only */}
            <div className="bg-red-50/50 border border-red-200 border-l-4 border-l-red-600 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
              <OverdueCardHeader
                title="Overdue Inspections"
                badge={<CountBadge n={overdueItems.length} variant="danger" />}
                action={<ExportBtn onClick={()=>dlXlsx("overdue",`overdue_${new Date().toISOString().slice(0,10)}.xlsx`)} />}
              />
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-red-200 bg-red-50/70">
                      <TableHead className="text-red-700 text-xs font-bold uppercase tracking-wider h-8 pl-4">Unit / Building</TableHead>
                      <TableHead className="text-red-700 text-xs font-bold uppercase tracking-wider h-8 text-center">Type</TableHead>
                      <TableHead className="text-red-700 text-xs font-bold uppercase tracking-wider h-8 text-center">Status</TableHead>
                      <TableHead className="text-red-700 text-xs font-bold uppercase tracking-wider h-8 text-center">Was Due</TableHead>
                      <TableHead className="text-red-700 text-xs font-bold uppercase tracking-wider h-8 text-center pr-4">How Overdue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdueItems.length===0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-sm text-zinc-500 font-medium">
                          <div className="flex flex-col items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-green-500">
                              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                            </svg>
                            No overdue inspections — great work!
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : overdueItems.map((insp:any) => {
                      const daysOver = insp.nextDueDate ? dayjs().diff(dayjs(insp.nextDueDate),"day") : null;
                      return (
                        <TableRow key={insp.id} className="hover:bg-red-100/40 border-b border-red-100/60 transition-colors duration-150">
                          <TableCell className="py-3 pl-4">
                            <div className="font-bold text-sm text-zinc-900 leading-snug">{insp.elevatorName}</div>
                            <div className="text-xs text-zinc-500 mt-0.5">{insp.buildingName}</div>
                          </TableCell>
                          <TableCell className="py-3 text-center"><InspectionTypeBadge type={insp.inspectionType} /></TableCell>
                          <TableCell className="py-3 text-center"><StatusBadge status={insp.rawStatus} /></TableCell>
                          <TableCell className="py-3 text-center">
                            <span className="text-sm font-semibold text-zinc-800">
                              {insp.nextDueDate?dayjs(insp.nextDueDate).format("MMM D, YYYY"):"N/A"}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 text-center pr-4">
                            {daysOver!==null&&<OverdueBadge days={daysOver} />}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Upcoming — indigo presence */}
            <div className="bg-indigo-50/30 border border-indigo-200 border-l-4 border-l-indigo-500 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
              <UpcomingCardHeader
                title="Upcoming — Next 14 Days"
                badge={<CountBadge n={upcoming.length} />}
                action={<ExportBtn onClick={()=>dlXlsx("upcoming",`upcoming_${new Date().toISOString().slice(0,10)}.xlsx`)} />}
              />
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-zinc-200 bg-zinc-50">
                      <TableHead className="text-zinc-600 text-xs font-bold uppercase tracking-wider h-8 pl-4">Unit / Building</TableHead>
                      <TableHead className="text-zinc-600 text-xs font-bold uppercase tracking-wider h-8 text-center">Type</TableHead>
                      <TableHead className="text-zinc-600 text-xs font-bold uppercase tracking-wider h-8 text-center">Status</TableHead>
                      <TableHead className="text-zinc-600 text-xs font-bold uppercase tracking-wider h-8 text-center">Due Date</TableHead>
                      <TableHead className="text-zinc-600 text-xs font-bold uppercase tracking-wider h-8 text-center pr-4">Timing</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcoming.length===0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-sm text-zinc-500 font-medium">
                          No inspections due in the next 14 days.
                        </TableCell>
                      </TableRow>
                    ) : upcoming.map((insp:any) => {
                      const daysUntil = insp.nextDueDate ? dayjs(insp.nextDueDate).diff(dayjs(),"day") : null;
                      const isToday   = insp.nextDueDate===todayStr;
                      const isUrgent  = !isToday && insp.nextDueDate<=in3Days;
                      const rowBg     = isToday  ? "bg-red-50/60 hover:bg-red-100/40"
                                      : isUrgent ? "bg-amber-50/50 hover:bg-amber-100/30"
                                      :            "hover:bg-zinc-50/80";
                      return (
                        <TableRow key={insp.id} className={`border-b border-zinc-100 transition-colors duration-150 ${rowBg}`}>
                          <TableCell className="py-3 pl-4">
                            <div className={`font-bold text-sm leading-snug ${isToday?"text-red-800":"text-zinc-900"}`}>{insp.elevatorName}</div>
                            <div className="text-xs text-zinc-500 mt-0.5">{insp.buildingName}</div>
                          </TableCell>
                          <TableCell className="py-3 text-center"><InspectionTypeBadge type={insp.inspectionType} /></TableCell>
                          <TableCell className="py-3 text-center"><StatusBadge status={insp.status} /></TableCell>
                          <TableCell className="py-3 text-center">
                            <span className={`text-sm font-semibold ${isToday?"text-red-700":isUrgent?"text-amber-700":"text-zinc-800"}`}>
                              {insp.nextDueDate?dayjs(insp.nextDueDate).format("MMM D, YYYY"):"N/A"}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 text-center pr-4">
                            {daysUntil!==null&&<UpcomingBadge days={daysUntil} />}
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
