import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Calendar, Clock, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

const kpis = [
  { label: "Not Started",       value: 12,     color: "#71717a", bg: "#f4f4f5", icon: MoreHorizontal },
  { label: "Scheduled",         value: 5,      color: "#3b82f6", bg: "#eff6ff", icon: Calendar },
  { label: "In Progress",       value: 2,      color: "#f59e0b", bg: "#fffbeb", icon: Clock },
  { label: "Completed",         value: 18,     color: "#22c55e", bg: "#f0fdf4", icon: CheckCircle2 },
  { label: "Avg → Sched",       value: "3.2d", color: "#6366f1", bg: "#eef2ff", icon: ArrowRight },
  { label: "Avg → Done",        value: "7.5d", color: "#8b5cf6", bg: "#f5f3ff", icon: ArrowRight },
];

const overdueInspections = [
  { elevator: "Elevator 3A", building: "Crane Tower",    customer: "Acme Corp",     due: "Feb 15, 2025", type: "CAT1", rawStatus: "NOT_STARTED", daysOverdue: 47 },
  { elevator: "Unit 7",      building: "Midtown Suites", customer: "Crane Co",      due: "Mar 2, 2025",  type: "CAT5", rawStatus: "SCHEDULED",   daysOverdue: 32 },
  { elevator: "Cab B",       building: "Harbor Point",   customer: "Metro Prop",    due: "Jan 28, 2025", type: "CAT1", rawStatus: "IN_PROGRESS", daysOverdue: 65 },
  { elevator: "Lift 4",      building: "Metro Center",   customer: "Metro Prop",    due: "Mar 10, 2025", type: "CAT5", rawStatus: "NOT_STARTED", daysOverdue: 24 },
  { elevator: "Unit 9",      building: "Parkview Apts",  customer: "Parkview LLC",  due: "Mar 18, 2025", type: "CAT1", rawStatus: "SCHEDULED",   daysOverdue: 16 },
  { elevator: "Cab A",       building: "Westside Hub",   customer: "Westside Mgt",  due: "Feb 22, 2025", type: "CAT5", rawStatus: "SCHEDULED",   daysOverdue: 41 },
  { elevator: "East Lift",   building: "Riverside Pk",   customer: "Riverside LLC", due: "Mar 5, 2025",  type: "CAT1", rawStatus: "NOT_STARTED", daysOverdue: 29 },
];

const upcomingInspections = [
  { elevator: "Unit 12",    building: "Skyline Plaza", type: "CAT1", due: "Apr 8, 2025",  status: "SCHEDULED" },
  { elevator: "Elevator 2", building: "Crane Tower",   type: "CAT5", due: "Apr 12, 2025", status: "NOT_STARTED" },
  { elevator: "Main Lift",  building: "Harbor Point",  type: "CAT1", due: "Apr 15, 2025", status: "SCHEDULED" },
  { elevator: "West Cab",   building: "Metro Center",  type: "CAT1", due: "Apr 20, 2025", status: "NOT_STARTED" },
  { elevator: "Unit 5",     building: "Parkview Apts", type: "CAT5", due: "Apr 25, 2025", status: "SCHEDULED" },
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
  NOT_STARTED: "#71717a",
};

export default function FocusCard() {
  return (
    <div className="h-screen bg-zinc-100 flex flex-col font-sans overflow-hidden">

      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-5 py-2.5 flex items-center justify-between shrink-0">
        <span className="font-bold text-zinc-900 text-sm tracking-tight">Cat1Five Timer</span>
        <span className="text-xs text-zinc-400">2025 Compliance Dashboard</span>
      </header>

      {/* KPI strip */}
      <div className="bg-white border-b border-zinc-200 px-5 py-2 flex items-center gap-2 shrink-0">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md flex-1" style={{ backgroundColor: k.bg }}>
              <Icon size={12} style={{ color: k.color }} className="shrink-0" />
              <div>
                <div className="text-[9px] text-zinc-400 leading-none">{k.label}</div>
                <div className="text-sm font-bold leading-tight" style={{ color: k.color }}>{k.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main body */}
      <div className="flex flex-1 gap-3 p-3 overflow-hidden">

        {/* FOCAL CARD — Overdue, large and bold */}
        <div className="flex flex-col w-[58%] bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden shrink-0">
          {/* Card header */}
          <div className="bg-red-600 px-5 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-200" />
              <h2 className="text-sm font-bold text-white">Overdue Inspections</h2>
            </div>
            <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {overdueInspections.length} items
            </span>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-red-50 border-b border-red-100">
                  <th className="text-left px-4 py-2.5 text-red-700 font-semibold">Elevator</th>
                  <th className="text-left px-3 py-2.5 text-red-700 font-semibold">Building</th>
                  <th className="text-left px-3 py-2.5 text-red-700 font-semibold">Type</th>
                  <th className="text-left px-3 py-2.5 text-red-700 font-semibold">Due Date</th>
                  <th className="text-right px-4 py-2.5 text-red-700 font-semibold">Days Over</th>
                  <th className="text-left px-3 py-2.5 text-red-700 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {overdueInspections
                  .sort((a, b) => b.daysOverdue - a.daysOverdue)
                  .map((item, i) => (
                    <tr key={i} className={`border-b border-zinc-100 ${i % 2 === 0 ? "bg-white" : "bg-zinc-50/50"}`}>
                      <td className="px-4 py-2.5 font-semibold text-zinc-800">{item.elevator}</td>
                      <td className="px-3 py-2.5 text-zinc-600">{item.building}</td>
                      <td className="px-3 py-2.5">
                        <span className="bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded text-[10px] font-bold">{item.type}</span>
                      </td>
                      <td className="px-3 py-2.5 text-zinc-500">{item.due}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-bold text-red-600">{item.daysOverdue}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: (statusColors[item.rawStatus] || "#d4d4d8") + "22",
                            color: statusColors[item.rawStatus] || "#71717a",
                          }}
                        >
                          {item.rawStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT PANEL — Upcoming */}
        <div className="flex flex-col flex-1 bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-zinc-100 flex items-center justify-between shrink-0">
            <h2 className="text-sm font-semibold text-zinc-900">Upcoming Inspections</h2>
            <Badge className="bg-blue-50 text-blue-600 border-0 text-xs">{upcomingInspections.length}</Badge>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {upcomingInspections.map((item, i) => (
              <div key={i} className="border border-zinc-100 rounded-lg px-3 py-2.5 bg-zinc-50/50">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold text-zinc-800">{item.elevator}</span>
                  <span className="text-[10px] font-bold bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded">{item.type}</span>
                </div>
                <div className="text-[11px] text-zinc-500">{item.building}</div>
                <div className="text-[11px] text-blue-500 font-medium mt-0.5">{item.due}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM — Forecast sparkline strip, full width */}
      <div className="bg-white border-t border-zinc-200 mx-3 mb-3 rounded-xl overflow-hidden shrink-0" style={{ height: 160 }}>
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <h2 className="text-xs font-semibold text-zinc-700">Monthly Compliance Forecast — 2025</h2>
          <div className="flex items-center gap-3">
            {[
              { label: "Not Started", color: "#d4d4d8" },
              { label: "Scheduled",   color: "#3b82f6" },
              { label: "In Progress", color: "#f59e0b" },
              { label: "Completed",   color: "#22c55e" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                <span className="text-[10px] text-zinc-400">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ height: 110 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={forecast} margin={{ top: 2, right: 16, left: -20, bottom: 0 }} barCategoryGap="10%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#a1a1aa", fontSize: 10 }} axisLine={{ stroke: "#e4e4e7" }} tickLine={false} />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
              <Tooltip
                cursor={{ fill: "#f4f4f5" }}
                contentStyle={{ backgroundColor: "#fff", borderColor: "#e4e4e7", borderRadius: "6px", fontSize: "11px" }}
              />
              <Bar dataKey="notStarted" name="Not Started" stackId="s" fill="#d4d4d8" maxBarSize={36} />
              <Bar dataKey="scheduled"  name="Scheduled"   stackId="s" fill="#3b82f6" maxBarSize={36} />
              <Bar dataKey="inProgress" name="In Progress" stackId="s" fill="#f59e0b" maxBarSize={36} />
              <Bar dataKey="completed"  name="Completed"   stackId="s" fill="#22c55e" radius={[2,2,0,0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
