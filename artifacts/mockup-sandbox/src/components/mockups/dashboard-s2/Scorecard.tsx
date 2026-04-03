import React from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const KPIs = {
  notStarted: 12,
  scheduled: 5,
  inProgress: 2,
  completed: 18,
  avgDaysToSchedule: 3.2,
  avgDaysToComplete: 7.5,
  overdue: 3,
};

const statusColors = {
  COMPLETED: "#22c55e",
  OVERDUE: "#ef4444",
  IN_PROGRESS: "#f59e0b",
  SCHEDULED: "#3b82f6",
  NOT_STARTED: "#d4d4d8",
};

const statusChartData = [
  { name: "COMPLETED", count: 18, color: statusColors.COMPLETED },
  { name: "SCHEDULED", count: 5, color: statusColors.SCHEDULED },
  { name: "IN_PROGRESS", count: 2, color: statusColors.IN_PROGRESS },
  { name: "NOT_STARTED", count: 12, color: statusColors.NOT_STARTED },
  { name: "OVERDUE", count: 3, color: statusColors.OVERDUE },
];

const monthlyData = [
  { month: "Jan", completed: 12, scheduled: 4, inProgress: 1, notStarted: 5 },
  { month: "Feb", completed: 15, scheduled: 5, inProgress: 2, notStarted: 6 },
  { month: "Mar", completed: 18, scheduled: 3, inProgress: 4, notStarted: 4 },
  { month: "Apr", completed: 22, scheduled: 8, inProgress: 3, notStarted: 8 },
  { month: "May", completed: 25, scheduled: 12, inProgress: 5, notStarted: 10 },
  { month: "Jun", completed: 20, scheduled: 15, inProgress: 6, notStarted: 15 },
  { month: "Jul", completed: 18, scheduled: 18, inProgress: 7, notStarted: 12 },
  { month: "Aug", completed: 15, scheduled: 20, inProgress: 8, notStarted: 8 },
  { month: "Sep", completed: 25, scheduled: 15, inProgress: 4, notStarted: 5 },
  { month: "Oct", completed: 28, scheduled: 10, inProgress: 3, notStarted: 4 },
  { month: "Nov", completed: 30, scheduled: 8, inProgress: 2, notStarted: 3 },
  { month: "Dec", completed: 32, scheduled: 5, inProgress: 1, notStarted: 2 },
];

const overdueRows = [
  {
    elevator: "Elevator 3A",
    building: "Crane Tower",
    due: "Feb 15, 2025",
    daysOverdue: 47,
    rawStatus: "NOT_STARTED",
  },
  {
    elevator: "Unit 7",
    building: "Midtown Suites",
    due: "Mar 2, 2025",
    daysOverdue: 32,
    rawStatus: "SCHEDULED",
  },
  {
    elevator: "Cab B",
    building: "Harbor Point",
    due: "Jan 28, 2025",
    daysOverdue: 65,
    rawStatus: "IN_PROGRESS",
  },
];

const upcomingRows = [
  {
    elevator: "Unit 12",
    building: "Skyline Plaza",
    type: "CAT1",
    due: "Apr 8, 2025",
    status: "SCHEDULED",
  },
  {
    elevator: "Elevator 2",
    building: "Crane Tower",
    type: "CAT5",
    due: "Apr 12, 2025",
    status: "NOT_STARTED",
  },
  {
    elevator: "Main Lift",
    building: "Harbor Point",
    type: "CAT1",
    due: "Apr 15, 2025",
    status: "SCHEDULED",
  },
];

function getStatusBadge(status: string) {
  const mapping: Record<string, { label: string; colorClass: string }> = {
    NOT_STARTED: {
      label: "Not Started",
      colorClass: "bg-zinc-200 text-zinc-700 hover:bg-zinc-200",
    },
    SCHEDULED: {
      label: "Scheduled",
      colorClass: "bg-blue-100 text-blue-700 hover:bg-blue-100",
    },
    IN_PROGRESS: {
      label: "In Progress",
      colorClass: "bg-amber-100 text-amber-700 hover:bg-amber-100",
    },
    COMPLETED: {
      label: "Completed",
      colorClass: "bg-green-100 text-green-700 hover:bg-green-100",
    },
  };

  const config = mapping[status] || mapping.NOT_STARTED;
  return (
    <Badge variant="secondary" className={`font-medium ${config.colorClass}`}>
      {config.label}
    </Badge>
  );
}

export function Scorecard() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans">
      {/* 1. Scoreboard header */}
      <div className="flex flex-row items-center gap-6 px-8 py-5 bg-zinc-900 text-white w-full overflow-x-auto shrink-0">
        <div className="flex items-center gap-8 grow">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-widest text-zinc-400">
              Not Started
            </span>
            <span className="text-2xl font-black">{KPIs.notStarted}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-widest text-zinc-400">
              Scheduled
            </span>
            <span className="text-2xl font-black text-blue-400">
              {KPIs.scheduled}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-widest text-zinc-400">
              In Progress
            </span>
            <span className="text-2xl font-black text-amber-400">
              {KPIs.inProgress}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-widest text-zinc-400">
              Completed
            </span>
            <span className="text-2xl font-black text-green-400">
              {KPIs.completed}
            </span>
          </div>
          <div className="w-px h-8 bg-zinc-800 mx-2" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-widest text-zinc-400">
              Avg to Schedule
            </span>
            <span className="text-2xl font-black">{KPIs.avgDaysToSchedule}d</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-widest text-zinc-400">
              Avg to Complete
            </span>
            <span className="text-2xl font-black">{KPIs.avgDaysToComplete}d</span>
          </div>
        </div>

        <div className="flex items-center pl-6 border-l border-zinc-800 shrink-0">
          <div className="flex flex-col items-end">
            <span className="text-red-400 text-3xl font-black flex items-center gap-2">
              {KPIs.overdue} <span className="text-lg">OVERDUE</span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 space-y-6 max-w-[1200px] w-full mx-auto">
        {/* 2. Risk Register */}
        <div className="rounded-lg border border-zinc-200 shadow-sm bg-white overflow-hidden border-l-4 border-l-red-500">
          <div className="px-6 py-3 border-b border-zinc-200 bg-zinc-50/50">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
              Risk Register — Overdue Inspections
            </h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-zinc-700">
                  Elevator
                </TableHead>
                <TableHead className="font-semibold text-zinc-700">
                  Building
                </TableHead>
                <TableHead className="font-semibold text-zinc-700 text-right">
                  Days Overdue
                </TableHead>
                <TableHead className="font-semibold text-zinc-700">
                  Current Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overdueRows.map((row, index) => (
                <TableRow
                  key={index}
                  className={`border-zinc-100 ${
                    index % 2 !== 0 ? "bg-zinc-50/30" : ""
                  }`}
                >
                  <TableCell className="font-medium">{row.elevator}</TableCell>
                  <TableCell className="text-zinc-600">
                    {row.building}
                  </TableCell>
                  <TableCell className="text-right font-medium text-red-600">
                    {row.daysOverdue} days
                  </TableCell>
                  <TableCell>{getStatusBadge(row.rawStatus)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* 3. Compliance Trend */}
        <div className="rounded-lg border border-zinc-200 shadow-sm bg-white overflow-hidden">
          <div className="px-6 py-3 border-b border-zinc-200 bg-zinc-50/50">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
              Compliance Trend — 12-Month Forecast
            </h2>
          </div>
          <div className="p-6 space-y-8">
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#71717a", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#71717a", fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: "#f4f4f5" }}
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px", fontSize: "12px" }} />
                  <Bar dataKey="completed" name="Completed" stackId="a" fill={statusColors.COMPLETED} radius={[0, 0, 4, 4]} />
                  <Bar dataKey="inProgress" name="In Progress" stackId="a" fill={statusColors.IN_PROGRESS} />
                  <Bar dataKey="scheduled" name="Scheduled" stackId="a" fill={statusColors.SCHEDULED} />
                  <Bar dataKey="notStarted" name="Not Started" stackId="a" fill={statusColors.NOT_STARTED} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="h-[280px] w-full pt-4 border-t border-zinc-100">
              <h3 className="text-sm font-medium text-zinc-600 mb-4">
                Current Status Distribution
              </h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statusChartData}
                  layout="vertical"
                  margin={{ top: 0, right: 30, left: 30, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#3f3f46", fontSize: 12, fontWeight: 500 }}
                  />
                  <Tooltip
                    cursor={{ fill: "#f4f4f5" }}
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 4. Upcoming Schedule */}
        <div className="rounded-lg border border-zinc-200 shadow-sm bg-white overflow-hidden">
          <div className="px-6 py-3 border-b border-zinc-200 bg-zinc-50/50">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
              Upcoming Inspections — Next 14 Days
            </h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-zinc-700">
                  Elevator & Building
                </TableHead>
                <TableHead className="font-semibold text-zinc-700">
                  Type
                </TableHead>
                <TableHead className="font-semibold text-zinc-700 text-right">
                  Due Date
                </TableHead>
                <TableHead className="font-semibold text-zinc-700">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingRows.map((row, index) => (
                <TableRow
                  key={index}
                  className={`border-zinc-100 ${
                    index % 2 !== 0 ? "bg-zinc-50/30" : ""
                  }`}
                >
                  <TableCell>
                    <div className="font-medium text-zinc-900">
                      {row.elevator}
                    </div>
                    <div className="text-sm text-zinc-500">{row.building}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {row.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-zinc-600">
                    {row.due}
                  </TableCell>
                  <TableCell>{getStatusBadge(row.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="px-6 py-4 bg-zinc-50/30 border-t border-zinc-200 text-xs text-zinc-400">
            Generated Apr 3, 2025
          </div>
        </div>
      </div>
    </div>
  );
}
