import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  const { data: customers } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: customersFetch,
  });

  const { data: summary,   isLoading: l1 } = useQuery({
    queryKey: ["/api/dashboard/summary", selectedCustomerId],
    queryFn:  () => dashboardFetch("summary", selectedCustomerId),
  });
  const { data: attention, isLoading: l2 } = useQuery({
    queryKey: ["/api/dashboard/attention", selectedCustomerId],
    queryFn:  () => dashboardFetch("attention", selectedCustomerId),
  });
  const { data: breakdown, isLoading: l3 } = useQuery({
    queryKey: ["/api/dashboard/status-breakdown", selectedCustomerId],
    queryFn:  () => dashboardFetch("status-breakdown", selectedCustomerId),
  });
  const { data: forecast,  isLoading: l4 } = useQuery({
    queryKey: ["monthly-forecast", selectedCustomerId],
    queryFn:  () => dashboardFetch("monthly-forecast", selectedCustomerId),
  });
  const { data: aging, isLoading: l5 } = useQuery({
    queryKey: ["/api/dashboard/aging", selectedCustomerId],
    queryFn:  () => dashboardFetch("aging", selectedCustomerId),
  });

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
    name:  b.status.replace(/_/g, " "),
    value: b.count,
    color: getStatusColor(b.status),
  }));

  const currentYear = dayjs().year();
  const customerList: any[] = customers ?? [];

  return (
    <div className="flex flex-col min-h-full -m-6 lg:-m-8 bg-zinc-50 text-zinc-900 font-sans">
      <div className="flex-1 p-6 md:p-8 space-y-6">

        {/* ── Header row: year badge + customer selector ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
            {currentYear} Inspection Activity
          </span>
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

          {/* Inspection Aging — vertical bar */}
          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
            <SectionHeader title="Open Inspection Aging" />
            <div className="p-6 h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={aging ?? []}
                  margin={{ top: 16, right: 16, left: -20, bottom: 8 }}
                  barCategoryGap="28%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#3f3f46", fontSize: 12, fontWeight: 600 }}
                    axisLine={{ stroke: "#e4e4e7" }}
                    tickLine={false}
                    height={32}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "#3f3f46", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#f4f4f5" }}
                    contentStyle={{ backgroundColor: "#fff", borderColor: "#e4e4e7", borderRadius: "6px", boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)", fontSize: "13px" }}
                    formatter={(value: any, _: any, props: any) => [value, props.payload.bucket === "Current" ? "Not yet overdue" : "Days overdue"]}
                    labelFormatter={(label: string) => label}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={36}>
                    {(aging ?? []).map((entry: any) => {
                      const colors: Record<string, string> = {
                        "Current": "#22c55e",
                        "1–30":    "#f59e0b",
                        "31–60":   "#f97316",
                        "61–90":   "#ef4444",
                        "91+":     "#991b1b",
                      };
                      return <Cell key={entry.bucket} fill={colors[entry.bucket] ?? "#d4d4d8"} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Distribution — horizontal bar */}
          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
            <SectionHeader title={`${currentYear} Status Distribution`} />
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

          {/* 12-Month Forecast — fits container, no scroll */}
          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
            <SectionHeader title={`Monthly Compliance Forecast — ${currentYear}`} />
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
                    tick={{ fill: "#3f3f46", fontSize: 12 }}
                    axisLine={{ stroke: "#e4e4e7" }}
                    tickLine={false}
                    height={28}
                  />
                  <YAxis
                    tick={{ fill: "#3f3f46", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#f4f4f5" }}
                    contentStyle={{ backgroundColor: "#fff", borderColor: "#e4e4e7", borderRadius: "6px", boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)", fontSize: "13px" }}
                  />
                  <Legend
                    iconType="circle"
                    verticalAlign="top"
                    align="center"
                    wrapperStyle={{ fontSize: "12px", color: "#3f3f46", paddingBottom: "8px" }}
                  />
                  <Bar dataKey="notStarted" name="Not Started" stackId="stack" fill="#d4d4d8" radius={[0, 0, 0, 0]} />
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
            <SectionHeader title="Overdue Inspections" />
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow className="hover:bg-transparent border-b border-zinc-100">
                    <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9 pl-4">Unit / Building</TableHead>
                    <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9">Type</TableHead>
                    <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9 text-right pr-4">Was Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-zinc-400 py-8 text-sm">
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
                        <TableCell className="text-right py-3 pr-4">
                          <div className="text-sm font-semibold text-red-600 leading-snug">
                            {insp.nextDueDate ? dayjs(insp.nextDueDate).format("MMM D, YYYY") : "N/A"}
                          </div>
                          {daysOver !== null && (
                            <div className="text-xs text-red-400 mt-0.5">{daysOver} day{daysOver !== 1 ? "s" : ""} overdue</div>
                          )}
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
            <SectionHeader title="Upcoming — Next 14 Days" />
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow className="hover:bg-transparent border-b border-zinc-100">
                    <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9 pl-4">Unit / Building</TableHead>
                    <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9">Type</TableHead>
                    <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9 text-right pr-4">Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcoming.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-zinc-400 py-8 text-sm">
                        No inspections due in the next 14 days.
                      </TableCell>
                    </TableRow>
                  ) : upcoming.map((insp: any) => {
                    const daysUntil = insp.nextDueDate ? dayjs(insp.nextDueDate).diff(dayjs(), "day") : null;
                    const isUrgent = daysUntil !== null && daysUntil <= 3;
                    return (
                      <TableRow key={insp.id} className="hover:bg-zinc-50/80 border-b border-zinc-100">
                        <TableCell className="py-3 pl-4">
                          <div className="font-semibold text-sm text-zinc-900 leading-snug">{insp.elevatorName}</div>
                          <div className="text-xs text-zinc-500 mt-0.5">{insp.buildingName}</div>
                        </TableCell>
                        <TableCell className="py-3">
                          <InspectionTypeBadge type={insp.inspectionType} />
                        </TableCell>
                        <TableCell className="text-right py-3 pr-4">
                          <div className={`text-sm font-semibold leading-snug ${isUrgent ? "text-amber-600" : "text-zinc-700"}`}>
                            {insp.nextDueDate ? dayjs(insp.nextDueDate).format("MMM D, YYYY") : "N/A"}
                          </div>
                          {daysUntil !== null && (
                            <div className={`text-xs mt-0.5 ${isUrgent ? "text-amber-500" : "text-zinc-400"}`}>
                              {daysUntil === 0 ? "due today" : `in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`}
                            </div>
                          )}
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
