import { useQuery } from "@tanstack/react-query";
import { InspectionTypeBadge } from "@/components/inspection-type-badge";
import { Spinner } from "@/components/ui/spinner";
import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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

/* ─── dashboard API fetchers ─── */
type MonthBucket = { key: string; label: string; due: number; scheduled: number; completed: number };

function dashboardFetch(path: string, month?: number | null, year?: number | null) {
  const token = localStorage.getItem("token");
  const params = new URLSearchParams();
  if (month && year) { params.set("month", String(month)); params.set("year", String(year)); }
  const qs = params.toString();
  return fetch(`/api/dashboard/${path}${qs ? `?${qs}` : ""}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => { if (!r.ok) throw new Error(`Failed: ${path}`); return r.json(); });
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

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

const currentYear = dayjs().year();
const YEARS = Array.from({ length: 8 }, (_, i) => currentYear - 2 + i);

export default function Dashboard() {
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [filterYear,  setFilterYear]  = useState<number | null>(null);
  const hasFilter = filterMonth !== null && filterYear !== null;

  const { data: summary,   isLoading: l1 } = useQuery({
    queryKey: ["/api/dashboard/summary",          filterMonth, filterYear],
    queryFn:  () => dashboardFetch("summary",          filterMonth, filterYear),
  });
  const { data: attention, isLoading: l2 } = useQuery({
    queryKey: ["/api/dashboard/attention",         filterMonth, filterYear],
    queryFn:  () => dashboardFetch("attention",        filterMonth, filterYear),
  });
  const { data: breakdown, isLoading: l3 } = useQuery({
    queryKey: ["/api/dashboard/status-breakdown",  filterMonth, filterYear],
    queryFn:  () => dashboardFetch("status-breakdown", filterMonth, filterYear),
  });
  const { data: forecast,  isLoading: l4 } = useQuery({
    queryKey: ["monthly-forecast"],
    queryFn:  () => dashboardFetch("monthly-forecast"),
  });

  if (l1 || l2 || l3 || l4) {
    return (
      <div className="flex h-[50vh] items-center justify-center bg-zinc-50">
        <Spinner size="lg" />
      </div>
    );
  }

  const overdueCount = summary?.overdueCount ?? 0;
  const overdueItems = (attention ?? []).filter((i: any) => i.status === "OVERDUE");

  const todayStr = dayjs().format("YYYY-MM-DD");
  const in14Str  = dayjs().add(14, "day").format("YYYY-MM-DD");
  const upcoming = hasFilter
    ? (attention ?? []).filter((i: any) => i.status !== "OVERDUE")
    : (attention ?? []).filter((i: any) => i.status !== "OVERDUE" && i.nextDueDate && i.nextDueDate >= todayStr && i.nextDueDate <= in14Str);

  const statusChartData = (breakdown ?? []).map((b) => ({
    name:  b.status.replace(/_/g, " "),
    value: b.count,
    color: getStatusColor(b.status),
  }));

  return (
    <div className="flex flex-col min-h-full -m-6 lg:-m-8 bg-zinc-50 text-zinc-900 font-sans">
      <div className="flex-1 p-6 md:p-8 space-y-6">

        {/* ── Filter Bar ── */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Filter by period</span>
          <Select
            value={filterMonth !== null ? String(filterMonth) : ""}
            onValueChange={(v) => setFilterMonth(v ? Number(v) : null)}
          >
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((name, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filterYear !== null ? String(filterYear) : ""}
            onValueChange={(v) => setFilterYear(v ? Number(v) : null)}
          >
            <SelectTrigger className="w-24 h-8 text-sm">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((yr) => (
                <SelectItem key={yr} value={String(yr)}>{yr}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-zinc-500 hover:text-zinc-900"
              onClick={() => { setFilterMonth(null); setFilterYear(null); }}
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Clear
            </Button>
          )}
          {hasFilter && (
            <span className="text-xs text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded-full">
              Showing: {MONTHS[filterMonth! - 1]} {filterYear} — completed filtered by completion date
            </span>
          )}
        </div>

        {/* ── KPI Strip ── */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 bg-white border border-zinc-200 rounded-sm shadow-sm overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-zinc-200">
          {/* NOT STARTED */}
          <div className="p-6 flex flex-col items-center justify-center text-center">
            <div className="text-zinc-400 text-sm uppercase tracking-widest font-semibold mb-2">NOT STARTED</div>
            <div className="text-5xl font-black text-zinc-900">{summary?.notStartedCount ?? 0}</div>
          </div>
          {/* SCHEDULED */}
          <div className="p-6 flex flex-col items-center justify-center text-center">
            <div className="text-zinc-400 text-sm uppercase tracking-widest font-semibold mb-2">SCHEDULED</div>
            <div className="text-5xl font-black text-blue-600">{summary?.scheduledCount ?? 0}</div>
          </div>
          {/* COMPLETED */}
          <div className="p-6 flex flex-col items-center justify-center text-center">
            <div className="text-zinc-400 text-sm uppercase tracking-widest font-semibold mb-2">COMPLETED</div>
            <div className="text-5xl font-black text-green-600">{summary?.completedCount ?? 0}</div>
          </div>
          {/* OVERDUE */}
          <div className="p-6 flex flex-col items-center justify-center text-center">
            <div className="text-zinc-400 text-sm uppercase tracking-widest font-semibold mb-2">OVERDUE</div>
            <div className="text-5xl font-black text-red-600">{summary?.overdueCount ?? 0}</div>
          </div>
          {/* AVG DAYS TO SCHEDULE */}
          {(() => {
            const val = summary?.avgDaysToSchedule ?? null;
            const isGood = val !== null && val <= 0;
            const isBad  = val !== null && val > 0;
            return (
              <div className={`p-6 flex flex-col items-center justify-center text-center ${isBad ? "bg-red-50" : ""}`}>
                <div className="text-zinc-400 text-sm uppercase tracking-widest font-semibold mb-2">AVG DAYS TO SCHEDULE</div>
                <div className={`text-5xl font-black ${isBad ? "text-red-600" : isGood ? "text-green-600" : "text-zinc-400"}`}>
                  {val === null ? "—" : val}
                </div>
                {val !== null && <div className="text-xs text-zinc-400 mt-1">Days</div>}
              </div>
            );
          })()}
          {/* AVG DAYS TO COMPLETE */}
          {(() => {
            const val = summary?.avgDaysToComplete ?? null;
            return (
              <div className="p-6 flex flex-col items-center justify-center text-center">
                <div className="text-zinc-400 text-sm uppercase tracking-widest font-semibold mb-2">AVG DAYS TO COMPLETE</div>
                <div className="text-5xl font-black text-zinc-900">
                  {val === null ? "—" : val}
                </div>
                {val !== null && <div className="text-xs text-zinc-400 mt-1">Days</div>}
              </div>
            );
          })()}
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
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
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
                    width={160}
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
                      height={75}
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

        {/* ── Tables Grid — 2 columns ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Overdue Inspections */}
          <div className="bg-white border border-zinc-200 border-t-4 border-t-red-500 rounded-lg shadow-sm overflow-hidden flex flex-col">
            <SectionHeader
              title="Overdue Inspections"
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
                        No overdue inspections.
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

          {/* Upcoming */}
          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
            <SectionHeader title={hasFilter ? `Due in ${MONTHS[filterMonth! - 1]} ${filterYear}` : "Upcoming — Next 2 Weeks"} />
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
                        No upcoming inspections in 2 weeks.
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
