import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InspectionTypeBadge } from "@/components/inspection-type-badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { RefreshCw, AlertTriangle, Clock, CheckCircle2, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import dayjs from "dayjs";

/* ─── label helper ─── */
function toLabel(s: string) {
  if (s === "NOT_STARTED" || s === "NOT STARTED") return "Not Scheduled";
  return s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

/* ─── Overdue aging badge ─── */
function OverdueBadge({ days }: { days: number }) {
  let label: string; let bg: string;
  if (days >= 365 * 9) { label = "9+ years overdue"; bg = "bg-red-950"; }
  else if (days >= 730) { const y = Math.floor(days / 365); label = `${y}+ years overdue`; bg = "bg-red-900"; }
  else if (days >= 365) { label = "1+ year overdue"; bg = "bg-red-800"; }
  else if (days > 120)  { label = `${days} days overdue`; bg = "bg-red-700"; }
  else if (days > 60)   { label = `${days} days overdue`; bg = "bg-red-500"; }
  else if (days > 30)   { label = `${days} days overdue`; bg = "bg-red-500"; }
  else                  { label = `${days} days overdue`; bg = "bg-red-500"; }
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-bold whitespace-nowrap text-white ${bg}`}>
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
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

/* ─── Table skeleton ─── */
function TableSkeleton() {
  return (
    <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden animate-pulse">
      <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50">
        <div className="h-4 bg-zinc-200 rounded w-1/4" />
      </div>
      {[1,2,3].map(i => (
        <div key={i} className="flex gap-4 px-4 py-3 border-b border-zinc-100">
          <div className="flex-1 h-4 bg-zinc-100 rounded" />
          <div className="w-16 h-4 bg-zinc-100 rounded" />
          <div className="w-24 h-4 bg-zinc-100 rounded" />
        </div>
      ))}
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

const LIVE_OPTS = { staleTime: 0, refetchInterval: 2*60*1000, refetchOnWindowFocus: true } as const;
const DASH_KEYS = ["/api/customers","/api/dashboard/summary","/api/dashboard/attention","/api/inspections/upcoming-90"];

function apiFetch(path: string, cid?: number | null) {
  const token = localStorage.getItem("token");
  return fetch(`/api/dashboard/${path}${cid ? `?customerId=${cid}` : ""}`, { headers: { Authorization:`Bearer ${token}` } })
    .then(r => { if (!r.ok) throw new Error(path); return r.json(); });
}
function customersFetch() {
  const token = localStorage.getItem("token");
  return fetch("/api/customers", { headers: { Authorization:`Bearer ${token}` } }).then(r => r.json());
}
function upcomingFetch(cid: number | null, from: string, to: string) {
  const token = localStorage.getItem("token");
  const params = new URLSearchParams({ nextDueDateFrom: from, nextDueDateTo: to });
  if (cid) params.set("customerId", String(cid));
  return fetch(`/api/inspections?${params}`, { headers: { Authorization:`Bearer ${token}` } }).then(r => r.json());
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

  const todayStr = dayjs().format("YYYY-MM-DD");
  const in90Days = dayjs().add(90, "day").format("YYYY-MM-DD");
  const in3Days  = dayjs().add(3,  "day").format("YYYY-MM-DD");

  const { data: customers }                                  = useQuery({ queryKey:["/api/customers"],                      queryFn: customersFetch,                        ...LIVE_OPTS });
  const { data: summary,  isLoading:l1, dataUpdatedAt:t1 }  = useQuery({ queryKey:["/api/dashboard/summary",  cid], queryFn:()=>apiFetch("summary",  cid), ...LIVE_OPTS });
  const { data: attention, isLoading:l2 }                    = useQuery({ queryKey:["/api/dashboard/attention", cid], queryFn:()=>apiFetch("attention", cid), ...LIVE_OPTS });
  const { data: upcomingRaw, isLoading: l3 }                 = useQuery({ queryKey:["/api/inspections/upcoming-90", cid, todayStr, in90Days], queryFn:()=>upcomingFetch(cid, todayStr, in90Days), ...LIVE_OPTS });

  useEffect(() => { if (t1) { setLastUpdated(new Date(t1)); setSecsAgo(0); } }, [t1]);

  const overdueItems = ((attention??[]) as any[])
    .filter(i => i.status==="OVERDUE")
    .sort((a,b)=>(a.nextDueDate??"").localeCompare(b.nextDueDate??""));

  // All non-completed upcoming items within 90 days — used for compliance score
  const upcomingSoon = ((upcomingRaw ?? []) as any[])
    .filter((i: any) => !i.completionDate && i.nextDueDate && i.nextDueDate >= todayStr && i.nextDueDate <= in90Days);

  // "Coming Up" table: full 90-day window, matching compliance score
  const upcoming = upcomingSoon
    .filter((i: any) => i.nextDueDate <= in90Days)
    .sort((a: any, b: any) => a.nextDueDate.localeCompare(b.nextDueDate));

  const customerList = (customers ?? []) as any[];

  return (
    <div className="flex flex-col min-h-full -m-4 bg-zinc-100 text-zinc-900 font-sans">
      <div className="flex-1 p-6 md:p-8 space-y-9">

        {/* ── Header ── */}
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2">
            <button onClick={refreshAll} title="Refresh"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-zinc-300 bg-white text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 hover:border-zinc-400 shadow-sm transition-all font-medium">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
            <span className="text-xs text-zinc-400 font-medium">
              {secsAgo<60?"Just updated":`Updated ${Math.floor(secsAgo/60)}m ago`}
            </span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Portfolio Compliance Overview</h1>
          <div className="flex-1 flex justify-end">
            <select value={cid??""} onChange={e=>setCid(e.target.value?parseInt(e.target.value):null)}
              className="h-9 rounded-md border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-800 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 min-w-[200px]">
              <option value="">All Customers</option>
              {customerList.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {/* ══ THREE SCORE CARDS ══ */}
        {!l1 && (() => {
          const totalUnits        = summary?.totalUnits        ?? 0;
          const compliantUnits    = summary?.compliantUnits    ?? 0;
          const relevantTotal     = summary?.relevantTotal     ?? 0;
          const relevantCompleted = summary?.relevantCompleted ?? 0;
          const annualTotal       = summary?.annualTotal       ?? 0;
          const annualCompleted   = summary?.annualCompleted   ?? 0;
          const year              = dayjs().year();

          const unitScore   = totalUnits     > 0 ? Math.round((compliantUnits    / totalUnits)     * 100) : 100;
          const comp90Score = relevantTotal  > 0 ? Math.round((relevantCompleted / relevantTotal)  * 100) : 100;
          const annualScore = annualTotal    > 0 ? Math.round((annualCompleted   / annualTotal)    * 100) : 100;

          function scoreColor(s: number)   { return s >= 80 ? "text-green-700"      : s >= 50 ? "text-amber-600"      : "text-red-700"; }
          function barColor(s: number)     { return s >= 80 ? "#16a34a"             : s >= 50 ? "#d97706"             : "#dc2626"; }
          function accentBorder(s: number) { return s >= 80 ? "border-l-green-500"  : s >= 50 ? "border-l-amber-500"  : "border-l-red-500"; }
          function statusMsg(s: number)    {
            return s === 100 ? "Fully compliant — great work!"
              : s >= 80 ? "In good shape"
              : s >= 50 ? "Some attention needed"
              : "Action required";
          }

          type CardProps = {
            title: string; subtitle: string; score: number;
            statLine: string; tooltipText: string; pills: React.ReactNode;
            statusMsgFn?: (s: number) => string;
          };
          function ScoreCard({ title, subtitle, score, statLine, tooltipText, pills, statusMsgFn }: CardProps) {
            const msgFn = statusMsgFn ?? statusMsg;
            return (
              <div className={`bg-white rounded-xl border border-zinc-200 border-l-4 ${accentBorder(score)} shadow-sm p-6 flex flex-col gap-3`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">{title}</p>
                    <p className="text-xs text-zinc-400 font-normal italic mt-0.5">{subtitle}</p>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3.5 w-3.5 text-zinc-300 hover:text-zinc-500 cursor-help shrink-0 mt-0.5" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[220px] text-xs text-center leading-relaxed">
                        {tooltipText}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className={`text-5xl font-black tabular-nums leading-none ${scoreColor(score)}`}>
                  {score}%
                </div>
                <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: barColor(score) }} />
                </div>
                <p className={`text-sm font-medium ${scoreColor(score)}`}>{msgFn(score)}</p>
                <p className="text-xs text-zinc-500">{statLine}</p>
                <div className="flex flex-wrap gap-2 mt-auto pt-1">{pills}</div>
              </div>
            );
          }

          if (!(totalUnits > 0 || relevantTotal > 0 || annualTotal > 0 || overdueItems.length > 0)) return null;

          return (
            <section>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ScoreCard
                  title="Unit Compliance"
                  subtitle="Are my elevators legally compliant right now?"
                  score={unitScore}
                  statLine={`${compliantUnits} of ${totalUnits} elevator units have no overdue inspections`}
                  tooltipText="Percentage of elevator units with no overdue inspections. A unit is compliant when all its CAT1 and CAT5 inspections are either completed or not yet due. This score only changes when an inspection becomes overdue or is completed — it does not fluctuate daily."
                  pills={<>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                      ✅ {compliantUnits} Compliant Units
                    </span>
                    {(totalUnits - compliantUnits) > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                        ⚠️ {totalUnits - compliantUnits} Need Attention
                      </span>
                    )}
                  </>}
                />
                <ScoreCard
                  title="Inspection Completion (90 Days)"
                  subtitle="How prepared am I for what's coming next?"
                  score={comp90Score}
                  statLine={`${relevantCompleted} of ${relevantTotal} upcoming inspections due in the next 90 days are complete`}
                  tooltipText="Percentage of inspections due in the next 90 days that are already completed. This measures how prepared you are for upcoming inspections. Overdue inspections are excluded — those are tracked separately in Unit Compliance."
                  pills={<>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                      ✅ {relevantCompleted} Complete
                    </span>
                    {(relevantTotal - relevantCompleted) > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        📅 {relevantTotal - relevantCompleted} Not Yet Complete
                      </span>
                    )}
                  </>}
                />
                <ScoreCard
                  title={`Year-to-Date Completion (${year})`}
                  subtitle="How have I kept up with inspections due so far this year?"
                  score={annualScore}
                  statLine={`${annualCompleted} of ${annualTotal} inspections due so far in ${year} are complete`}
                  tooltipText="Percentage of inspections that were due on or before today this calendar year that have been completed. Future inspections due later this year are not counted until they come due. This score increases throughout the year as inspections are completed on time. Resets on January 1st each year."
                  statusMsgFn={(s) =>
                    s === 100 ? "Fully caught up — great work!"
                    : s >= 80 ? "On track for the year"
                    : s >= 50 ? "Some inspections past due this year"
                    : "Significantly behind — action required"
                  }
                  pills={<>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                      ✅ {annualCompleted} Completed
                    </span>
                    {(annualTotal - annualCompleted) > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                        ⚠️ {annualTotal - annualCompleted} Past Due This Year
                      </span>
                    )}
                  </>}
                />
              </div>
            </section>
          );
        })()}

        {/* ══ ACTION TABLES ══ */}
        <section>
          <div className="flex flex-col gap-5">

            {/* Onboarding banner — only shown when portfolio is completely empty */}
            {!l1 && !l2 && !l3 && summary?.completedCount === 0 && overdueItems.length === 0 && upcoming.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xl">👋</span>
                </div>
                <div>
                  <p className="font-bold text-zinc-900 text-base">Welcome to Cat1Five Timer!</p>
                  <p className="text-sm text-zinc-600 mt-1 mb-3">
                    Get started in 3 easy steps to track your elevator compliance:
                  </p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold shrink-0">1</span>
                      <span className="text-sm text-zinc-700">
                        <Link href="/buildings" className="font-semibold text-amber-600 hover:underline">Add your building</Link>
                        {" "}— enter your building name and address
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold shrink-0">2</span>
                      <span className="text-sm text-zinc-700">
                        <Link href="/units" className="font-semibold text-amber-600 hover:underline">Add your elevators</Link>
                        {" "}— enter each elevator unit with its details
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold shrink-0">3</span>
                      <span className="text-sm text-zinc-700">
                        <Link href="/elevators" className="font-semibold text-amber-600 hover:underline">Add your inspection dates</Link>
                        {" "}— enter your last CAT1 and CAT5 inspection dates
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 mt-3">
                    Your compliance score will appear automatically once you add your first inspection.
                  </p>
                </div>
              </div>
            )}

            {/* Tables — hidden when portfolio is empty */}
            {(summary?.totalUnits ?? 0) > 0 || overdueItems.length > 0 || upcoming.length > 0 ? <>

            {/* Overdue Inspections */}
            {l2 ? <TableSkeleton /> : <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-3.5 border-b border-red-200 bg-red-50 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <h3 className="text-xs font-black text-red-700 uppercase tracking-[0.09em] flex-1">Overdue Inspections</h3>
                <CountBadge n={overdueItems.length} variant="danger" />
                <ExportBtn onClick={()=>dlXlsx("overdue",`overdue_${new Date().toISOString().slice(0,10)}.xlsx`)} />
              </div>
              <div className="overflow-x-auto flex-1">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-zinc-100">
                      <TableHead className="text-zinc-500 text-xs font-semibold h-9 pl-6">Unit / Building</TableHead>
                      <TableHead className="text-zinc-500 text-xs font-semibold h-9 text-center">Type</TableHead>
                      <TableHead className="text-zinc-500 text-xs font-semibold h-9 text-center">Status</TableHead>
                      <TableHead className="text-zinc-500 text-xs font-semibold h-9 text-center">Was Due</TableHead>
                      <TableHead className="text-zinc-500 text-xs font-semibold h-9 pr-6">How Long Overdue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdueItems.length===0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            </div>
                            <span className="font-semibold text-zinc-700">No overdue inspections</span>
                            <span className="text-xs text-zinc-400">Great work — you're all caught up!</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : overdueItems.slice(0, 10).map((insp:any) => (
                      <TableRow key={insp.id} className="border-l-4 border-l-red-400 hover:bg-red-50/40 border-b border-red-100/60 transition-colors">
                        <TableCell className="py-4 pl-6">
                          <div className="font-bold text-[15px] text-zinc-900 leading-snug">{insp.elevatorName}</div>
                          <div className="text-[13px] text-zinc-500 mt-0.5">{insp.buildingName}</div>
                        </TableCell>
                        <TableCell className="py-4 text-center"><InspectionTypeBadge type={insp.inspectionType} /></TableCell>
                        <TableCell className="py-4 text-center"><StatusBadge status={insp.rawStatus} /></TableCell>
                        <TableCell className="py-4 text-center">
                          <span className="text-[14px] font-semibold text-red-700">
                            {insp.nextDueDate?dayjs(insp.nextDueDate).format("MMM D, YYYY"):"N/A"}
                          </span>
                        </TableCell>
                        <TableCell className="py-4 pr-6">
                          {insp.nextDueDate && <OverdueBadge days={dayjs(todayStr).diff(dayjs(insp.nextDueDate), "day")} />}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {overdueItems.length > 0 && (
                <div className="px-6 py-3 border-t border-zinc-100 flex justify-end">
                  <Link href="/elevators" className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline">
                    View all in Active Inspections →
                  </Link>
                </div>
              )}
            </div>}

            {/* Coming Up — Next 30 Days */}
            {l3 ? <TableSkeleton /> : <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-3.5 border-b border-indigo-200 bg-indigo-50 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                <h3 className="text-xs font-black text-indigo-700 uppercase tracking-[0.09em] flex-1">Coming Up — Next 90 Days</h3>
                <CountBadge n={upcoming.length} />
                <ExportBtn onClick={()=>dlXlsx("upcoming",`upcoming_${new Date().toISOString().slice(0,10)}.xlsx`)} />
              </div>
              <div className="overflow-x-auto flex-1">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-zinc-100">
                      <TableHead className="text-zinc-500 text-xs font-semibold h-9 pl-6">Unit / Building</TableHead>
                      <TableHead className="text-zinc-500 text-xs font-semibold h-9 text-center">Type</TableHead>
                      <TableHead className="text-zinc-500 text-xs font-semibold h-9 text-center">Status</TableHead>
                      <TableHead className="text-zinc-500 text-xs font-semibold h-9 text-center">Due Date</TableHead>
                      <TableHead className="text-zinc-500 text-xs font-semibold h-9 text-center pr-6">Timeline</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcoming.length===0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
                              <Clock className="w-5 h-5 text-zinc-400" />
                            </div>
                            <span className="font-semibold text-zinc-500 text-sm">No inspections due in 90 days</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : upcoming.map((insp:any) => {
                      const daysUntil = insp.nextDueDate ? dayjs(insp.nextDueDate).diff(dayjs(),"day") : null;
                      const isToday   = insp.nextDueDate===todayStr;
                      const isUrgent  = !isToday && insp.nextDueDate<=in3Days;
                      const borderCls = isToday  ? "border-l-4 border-l-red-400"
                                      : isUrgent ? "border-l-4 border-l-amber-400"
                                      :            "border-l-4 border-l-blue-300";
                      return (
                        <TableRow key={insp.id} className={`${borderCls} hover:bg-zinc-50 border-b border-zinc-100 transition-colors`}>
                          <TableCell className="py-4 pl-6">
                            <div className={`font-bold text-[15px] leading-snug ${isToday?"text-red-800":"text-zinc-900"}`}>{insp.elevatorName}</div>
                            <div className="text-[13px] text-zinc-500 mt-0.5">{insp.buildingName}</div>
                          </TableCell>
                          <TableCell className="py-4 text-center"><InspectionTypeBadge type={insp.inspectionType} /></TableCell>
                          <TableCell className="py-4 text-center"><StatusBadge status={insp.status} /></TableCell>
                          <TableCell className="py-4 text-center">
                            <span className={`text-[14px] font-semibold ${isToday?"text-red-700":isUrgent?"text-amber-700":"text-zinc-800"}`}>
                              {insp.nextDueDate?dayjs(insp.nextDueDate).format("MMM D, YYYY"):"N/A"}
                            </span>
                          </TableCell>
                          <TableCell className="py-4 text-center pr-6">
                            {daysUntil!==null&&<UpcomingBadge days={daysUntil} />}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {upcoming.length > 0 && (
                <div className="px-6 py-3 border-t border-zinc-100 flex justify-end">
                  <Link href="/elevators" className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline">
                    View all in Active Inspections →
                  </Link>
                </div>
              )}
            </div>}

            </> : null}

          </div>
        </section>

      </div>
    </div>
  );
}
