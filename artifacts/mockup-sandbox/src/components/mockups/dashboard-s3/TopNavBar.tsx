import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Calendar, Clock, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

const kpis = [
  { label: "Not Started",  value: 12, color: "#d4d4d8", bg: "#f4f4f5", icon: MoreHorizontal },
  { label: "Scheduled",    value: 5,  color: "#3b82f6", bg: "#eff6ff", icon: Calendar },
  { label: "In Progress",  value: 2,  color: "#f59e0b", bg: "#fffbeb", icon: Clock },
  { label: "Completed",    value: 18, color: "#22c55e", bg: "#f0fdf4", icon: CheckCircle2 },
  { label: "Overdue",      value: 7,  color: "#ef4444", bg: "#fef2f2", icon: AlertTriangle },
  { label: "Avg → Sched",  value: "3.2d", color: "#6366f1", bg: "#eef2ff", icon: ArrowRight },
  { label: "Avg → Done",   value: "7.5d", color: "#8b5cf6", bg: "#f5f3ff", icon: ArrowRight },
];

const overdueInspections = [
  { elevator: "Elevator 3A", building: "Crane Tower",    due: "Feb 15, 2025", rawStatus: "NOT_STARTED" },
  { elevator: "Unit 7",      building: "Midtown Suites", due: "Mar 2, 2025",  rawStatus: "SCHEDULED" },
  { elevator: "Cab B",       building: "Harbor Point",   due: "Jan 28, 2025", rawStatus: "IN_PROGRESS" },
  { elevator: "Lift 4",      building: "Metro Center",   due: "Mar 10, 2025", rawStatus: "NOT_STARTED" },
  { elevator: "Unit 9",      building: "Parkview Apts",  due: "Mar 18, 2025", rawStatus: "NOT_STARTED" },
  { elevator: "Cab A",       building: "Westside Hub",   due: "Feb 22, 2025", rawStatus: "SCHEDULED" },
];

const upcomingInspections = [
  { elevator: "Unit 12",    building: "Skyline Plaza",  type: "CAT1", due: "Apr 8, 2025",  status: "SCHEDULED" },
  { elevator: "Elevator 2", building: "Crane Tower",    type: "CAT5", due: "Apr 12, 2025", status: "NOT_STARTED" },
  { elevator: "Main Lift",  building: "Harbor Point",   type: "CAT1", due: "Apr 15, 2025", status: "SCHEDULED" },
  { elevator: "West Cab",   building: "Metro Center",   type: "CAT1", due: "Apr 20, 2025", status: "NOT_STARTED" },
  { elevator: "Unit 5",     building: "Parkview Apts",  type: "CAT5", due: "Apr 25, 2025", status: "SCHEDULED" },
];

const forecast = [
  { label: "Jan", notStarted: 3, scheduled: 2, inProgress: 0, completed: 5 },
  { label: "Feb", notStarted: 2, scheduled: 1, inProgress: 1, completed: 4 },
  { label: "Mar", notStarted: 4, scheduled: 3, inProgress: 0, completed: 3 },
  { label: "Apr", notStarted: 2, scheduled: 4, inProgress: 2, completed: 0 },
  { label: "May", notStarted: 5, scheduled: 2, inProgress: 0, completed: 0 },
  { label: "Jun", notStarted: 3, scheduled: 1, inProgress: 0, completed: 0 },
  { label: "Jul", notStarted: 2, scheduled: 3, inProgress: 0, completed: 0 },
  { label: "Aug", notStarted: 4, scheduled: 2, inProgress: 0, completed: 0 },
  { label: "Sep", notStarted: 3, scheduled: 1, inProgress: 0, completed: 0 },
  { label: "Oct", notStarted: 2, scheduled: 2, inProgress: 0, completed: 0 },
  { label: "Nov", notStarted: 3, scheduled: 1, inProgress: 0, completed: 0 },
  { label: "Dec", notStarted: 1, scheduled: 2, inProgress: 0, completed: 0 },
];

const statusDist = [
  { name: "Completed",   value: 18, color: "#22c55e" },
  { name: "Scheduled",   value: 5,  color: "#3b82f6" },
  { name: "In Progress", value: 2,  color: "#f59e0b" },
  { name: "Not Started", value: 12, color: "#d4d4d8" },
  { name: "Overdue",     value: 7,  color: "#ef4444" },
];

const statusColors: Record<string, string> = {
  COMPLETED: "#22c55e",
  SCHEDULED: "#3b82f6",
  IN_PROGRESS: "#f59e0b",
  NOT_STARTED: "#d4d4d8",
};

export default function TopNavBar() {
  return (
    <div className="h-screen bg-zinc-50 flex flex-col font-sans overflow-hidden">

      {/* TOP — App name */}
      <header className="bg-zinc-950 px-6 py-2.5 flex items-center gap-3 shrink-0">
        <span className="text-white font-bold tracking-tight text-sm">Cat1Five Timer</span>
        <span className="text-zinc-500 text-xs">2025 Compliance Dashboard</span>
      </header>

      {/* STATS BAND — Full-width KPI bar */}
      <div className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center gap-3 shrink-0">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div
              key={k.label}
              className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1"
              style={{ backgroundColor: k.bg }}
            >
              <Icon size={14} style={{ color: k.color }} className="shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-zinc-500 leading-none truncate">{k.label}</div>
                <div className="text-lg font-bold leading-tight" style={{ color: k.color }}>{k.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MAIN — 3-column content area */}
      <div className="flex flex-1 gap-4 p-4 overflow-hidden">

        {/* Column 1 — Overdue */}
        <div className="flex flex-col flex-1 bg-white rounded-lg border border-zinc-200 overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-zinc-100 flex items-center justify-between shrink-0">
            <h2 className="text-sm font-semibold text-zinc-900">Overdue Inspections</h2>
            <Badge className="bg-red-50 text-red-600 border-0 text-xs">{overdueInspections.length}</Badge>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {overdueInspections.map((item, i) => (
              <div key={i} className="border border-red-100 bg-red-50/40 rounded-md px-3 py-2.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold text-zinc-800">{item.elevator}</span>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: (statusColors[item.rawStatus] || "#d4d4d8") + "33",
                      color: statusColors[item.rawStatus] || "#71717a",
                    }}
                  >
                    {item.rawStatus.replace("_", " ")}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-500">{item.building}</div>
                <div className="text-[10px] text-red-500 font-medium mt-0.5">Due {item.due}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2 — Forecast chart */}
        <div className="flex flex-col flex-[1.6] bg-white rounded-lg border border-zinc-200 overflow-hidden">
          <div className="px-4 pt-4 pb-2 border-b border-zinc-100 shrink-0">
            <h2 className="text-sm font-semibold text-zinc-900">Monthly Compliance Forecast</h2>
          </div>
          <div className="flex-1 px-3 py-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecast} margin={{ top: 4, right: 8, left: -18, bottom: 0 }} barCategoryGap="18%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={{ stroke: "#e4e4e7" }} tickLine={false} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "#f4f4f5" }}
                  contentStyle={{ backgroundColor: "#fff", borderColor: "#e4e4e7", borderRadius: "6px", fontSize: "12px" }}
                />
                <Bar dataKey="notStarted" name="Not Started" stackId="s" fill="#d4d4d8" maxBarSize={44} />
                <Bar dataKey="scheduled"  name="Scheduled"   stackId="s" fill="#3b82f6" maxBarSize={44} />
                <Bar dataKey="inProgress" name="In Progress" stackId="s" fill="#f59e0b" maxBarSize={44} />
                <Bar dataKey="completed"  name="Completed"   stackId="s" fill="#22c55e" radius={[3,3,0,0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Column 3 — Upcoming + Status Distribution */}
        <div className="flex flex-col flex-1 gap-3 overflow-hidden">

          {/* Upcoming */}
          <div className="flex flex-col bg-white rounded-lg border border-zinc-200 overflow-hidden flex-1">
            <div className="px-4 pt-4 pb-3 border-b border-zinc-100 flex items-center justify-between shrink-0">
              <h2 className="text-sm font-semibold text-zinc-900">Upcoming</h2>
              <Badge className="bg-blue-50 text-blue-600 border-0 text-xs">{upcomingInspections.length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {upcomingInspections.map((item, i) => (
                <div key={i} className="border border-zinc-100 rounded-md px-3 py-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold text-zinc-800">{item.elevator}</span>
                    <span className="text-[9px] font-bold bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded">{item.type}</span>
                  </div>
                  <div className="text-[10px] text-zinc-500">{item.building} · {item.due}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Status Distribution — compact horizontal bars */}
          <div className="bg-white rounded-lg border border-zinc-200 p-3 shrink-0">
            <h2 className="text-xs font-semibold text-zinc-700 mb-2">2025 Status Distribution</h2>
            <div className="flex flex-col gap-1.5">
              {statusDist.map(item => {
                const total = statusDist.reduce((s, i) => s + i.value, 0);
                const pct = Math.round((item.value / total) * 100);
                return (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 w-20 shrink-0 truncate">{item.name}</span>
                    <div className="flex-1 h-3 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                    </div>
                    <span className="text-[10px] font-bold w-4 text-right" style={{ color: item.color }}>{item.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
