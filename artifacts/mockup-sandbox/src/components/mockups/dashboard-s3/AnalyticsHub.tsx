import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Calendar, Clock, CheckCircle2, ArrowRight, AlertTriangle } from "lucide-react";

const kpis = [
  { label: "Not Started", value: 12, color: "#d4d4d8", icon: MoreHorizontal },
  { label: "Scheduled",   value: 5,  color: "#3b82f6", icon: Calendar },
  { label: "In Progress", value: 2,  color: "#f59e0b", icon: Clock },
  { label: "Completed",   value: 18, color: "#22c55e", icon: CheckCircle2 },
  { label: "Overdue",     value: 7,  color: "#ef4444", icon: AlertTriangle },
];

const overdueInspections = [
  { elevator: "Elevator 3A", building: "Crane Tower",    due: "Feb 15, 2025", rawStatus: "NOT_STARTED" },
  { elevator: "Unit 7",      building: "Midtown Suites", due: "Mar 2, 2025",  rawStatus: "SCHEDULED" },
  { elevator: "Cab B",       building: "Harbor Point",   due: "Jan 28, 2025", rawStatus: "IN_PROGRESS" },
  { elevator: "Lift 4",      building: "Metro Center",   due: "Mar 10, 2025", rawStatus: "NOT_STARTED" },
  { elevator: "Unit 9",      building: "Parkview Apts",  due: "Mar 18, 2025", rawStatus: "SCHEDULED" },
];

const upcomingInspections = [
  { elevator: "Unit 12",    building: "Skyline Plaza",  type: "CAT1", due: "Apr 8, 2025" },
  { elevator: "Elevator 2", building: "Crane Tower",    type: "CAT5", due: "Apr 12, 2025" },
  { elevator: "Main Lift",  building: "Harbor Point",   type: "CAT1", due: "Apr 15, 2025" },
  { elevator: "West Cab",   building: "Metro Center",   type: "CAT1", due: "Apr 20, 2025" },
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

const statusColors: Record<string, string> = {
  COMPLETED: "#22c55e",
  SCHEDULED: "#3b82f6",
  IN_PROGRESS: "#f59e0b",
  NOT_STARTED: "#d4d4d8",
};

export default function AnalyticsHub() {
  return (
    <div className="h-screen bg-zinc-50 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div>
          <span className="font-bold text-zinc-900 text-base tracking-tight">Cat1Five Timer</span>
          <span className="ml-3 text-sm text-zinc-400">2025 Compliance Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">Avg to Schedule</span>
          <span className="font-semibold text-sm text-zinc-700">3.2 days</span>
          <span className="mx-2 text-zinc-200">|</span>
          <span className="text-xs text-zinc-400">Avg to Complete</span>
          <span className="font-semibold text-sm text-zinc-700">7.5 days</span>
        </div>
      </header>

      {/* Main — two panes */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT — Hero forecast chart */}
        <div className="flex flex-col flex-1 bg-white border-r border-zinc-200 overflow-hidden">
          {/* Chart header with KPI chips */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
            <h2 className="text-base font-semibold text-zinc-900">Monthly Compliance Forecast — 2025</h2>
            <div className="flex gap-3">
              {kpis.map(k => (
                <div key={k.label} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: k.color }} />
                  <span className="text-xs text-zinc-500">{k.label}</span>
                  <span className="text-xs font-bold" style={{ color: k.color }}>{k.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* The big chart */}
          <div className="flex-1 px-4 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecast} margin={{ top: 4, right: 10, left: -10, bottom: 0 }} barCategoryGap="18%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#71717a", fontSize: 13 }}
                  axisLine={{ stroke: "#e4e4e7" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#71717a", fontSize: 13 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "#f4f4f5" }}
                  contentStyle={{ backgroundColor: "#fff", borderColor: "#e4e4e7", borderRadius: "6px", fontSize: "13px" }}
                />
                <Legend
                  iconType="circle"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ fontSize: "13px", color: "#52525b", paddingTop: "8px" }}
                />
                <Bar dataKey="notStarted" name="Not Started" stackId="s" fill="#d4d4d8" maxBarSize={56} />
                <Bar dataKey="scheduled"  name="Scheduled"   stackId="s" fill="#3b82f6" maxBarSize={56} />
                <Bar dataKey="inProgress" name="In Progress" stackId="s" fill="#f59e0b" maxBarSize={56} />
                <Bar dataKey="completed"  name="Completed"   stackId="s" fill="#22c55e" radius={[3,3,0,0]} maxBarSize={56} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RIGHT — Detail sidebar */}
        <div className="w-80 flex flex-col bg-zinc-50 overflow-y-auto shrink-0">

          {/* Overdue */}
          <div className="p-4 border-b border-zinc-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-900">Overdue</h3>
              <Badge className="bg-red-100 text-red-700 border-0 text-xs px-2 py-0.5">{overdueInspections.length}</Badge>
            </div>
            <div className="flex flex-col gap-2">
              {overdueInspections.map((item, i) => (
                <div key={i} className="bg-white rounded border border-zinc-200 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-800">{item.elevator}</span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: (statusColors[item.rawStatus] || "#d4d4d8") + "22", color: statusColors[item.rawStatus] || "#71717a" }}
                    >
                      {item.rawStatus.replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">{item.building} · Due {item.due}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-900">Upcoming</h3>
              <Badge className="bg-blue-50 text-blue-600 border-0 text-xs px-2 py-0.5">{upcomingInspections.length}</Badge>
            </div>
            <div className="flex flex-col gap-2">
              {upcomingInspections.map((item, i) => (
                <div key={i} className="bg-white rounded border border-zinc-200 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-800">{item.elevator}</span>
                    <span className="text-[10px] font-bold bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded">{item.type}</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">{item.building} · {item.due}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
