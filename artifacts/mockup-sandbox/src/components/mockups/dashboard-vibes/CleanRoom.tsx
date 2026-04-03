import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
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

// --- Stub Data ---
const kpiData = [
  { label: "TOTAL ELEVATORS", value: "42" },
  { label: "DUE THIS MONTH", value: "8" },
  { label: "OVERDUE", value: "3", isWarning: true },
  { label: "SCHEDULED", value: "14" },
  { label: "TOTAL BUILDINGS", value: "11" },
  { label: "TOTAL CUSTOMERS", value: "6" },
];

const statusChartData = [
  { name: "NOT STARTED", value: 15, color: "#d4d4d8" },
  { name: "SCHEDULED", value: 14, color: "#3b82f6" },
  { name: "IN PROGRESS", value: 6, color: "#f59e0b" },
  { name: "COMPLETED", value: 376, color: "#22c55e" },
  { name: "OVERDUE", value: 3, color: "#ef4444" },
];

const forecastData = [
  { month: "Oct", due: 12, scheduled: 10, completed: 2 },
  { month: "Nov", due: 15, scheduled: 5, completed: 0 },
  { month: "Dec", due: 8, scheduled: 0, completed: 0 },
  { month: "Jan", due: 22, scheduled: 0, completed: 0 },
  { month: "Feb", due: 14, scheduled: 0, completed: 0 },
  { month: "Mar", due: 18, scheduled: 0, completed: 0 },
  { month: "Apr", due: 30, scheduled: 0, completed: 0 },
  { month: "May", due: 25, scheduled: 0, completed: 0 },
  { month: "Jun", due: 19, scheduled: 0, completed: 0 },
  { month: "Jul", due: 11, scheduled: 0, completed: 0 },
  { month: "Aug", due: 15, scheduled: 0, completed: 0 },
  { month: "Sep", due: 20, scheduled: 0, completed: 0 },
  { month: "Oct", due: 12, scheduled: 0, completed: 0 },
];

const attentionData = [
  { unit: "ELEV-01", building: "Apex Tower", due: "Oct 15", status: "OVERDUE" },
  { unit: "ELEV-04", building: "Nexus Hub", due: "Oct 20", status: "OVERDUE" },
  { unit: "ELEV-02", building: "Meridian Plaza", due: "Oct 22", status: "OVERDUE" },
];

const riskData = [
  { building: "Apex Tower", customer: "Apex Corp", overdueCount: 2 },
  { building: "Nexus Hub", customer: "Nexus Logistics", overdueCount: 1 },
];

const upcomingData = [
  { unit: "ELEV-12", building: "Lumina Point", type: "CAT1", due: "Nov 5", status: "SCHEDULED" },
  { unit: "ELEV-14", building: "Lumina Point", type: "CAT5", due: "Nov 8", status: "NOT_STARTED" },
  { unit: "ELEV-05", building: "Horizon Center", type: "CAT1", due: "Nov 12", status: "IN_PROGRESS" },
];

// --- Components ---

function StatusBadge({ status }: { status: string }) {
  let colorClass = "";
  let label = status.replace("_", " ");

  switch (status) {
    case "OVERDUE":
      colorClass = "bg-red-100 text-red-700 border-red-200";
      break;
    case "COMPLETED":
      colorClass = "bg-green-100 text-green-700 border-green-200";
      break;
    case "IN_PROGRESS":
      colorClass = "bg-amber-100 text-amber-700 border-amber-200";
      break;
    case "SCHEDULED":
      colorClass = "bg-blue-100 text-blue-700 border-blue-200";
      break;
    case "NOT_STARTED":
    default:
      colorClass = "bg-zinc-100 text-zinc-700 border-zinc-200";
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colorClass}`}
    >
      {label}
    </span>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50/50">
      <h3 className="text-sm font-semibold text-zinc-700">{title}</h3>
    </div>
  );
}

export function CleanRoom() {
  return (
    <div className="min-h-screen p-6 md:p-8 space-y-8 bg-zinc-50 text-zinc-900 font-sans">
      
      {/* 1. KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 bg-white border border-zinc-200 rounded-sm shadow-sm overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-zinc-200">
        {kpiData.map((kpi, index) => (
          <div
            key={index}
            className={`p-6 flex flex-col justify-center ${
              kpi.isWarning ? "bg-red-50" : ""
            }`}
          >
            <div className="text-zinc-400 text-[10px] uppercase tracking-widest font-semibold mb-2">
              {kpi.label}
            </div>
            <div
              className={`text-5xl font-black ${
                kpi.isWarning ? "text-red-600" : "text-zinc-900"
              }`}
            >
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* 2. Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Chart */}
        <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
          <SectionHeader title="Current Status Distribution" />
          <div className="p-6 h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={statusChartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#71717a", fontSize: 12 }} axisLine={{ stroke: "#e4e4e7" }} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: "#71717a", fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "#f4f4f5" }}
                  contentStyle={{ backgroundColor: "#fff", borderColor: "#e4e4e7", borderRadius: "6px", boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)" }}
                  itemStyle={{ color: "#18181b", fontSize: "14px", fontWeight: 600 }}
                  labelStyle={{ color: "#71717a", fontSize: "12px", marginBottom: "4px" }}
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

        {/* Right Chart */}
        <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
          <SectionHeader title="13-Month Compliance Forecast" />
          <div className="p-6 h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={forecastData}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 12 }} axisLine={{ stroke: "#e4e4e7" }} tickLine={false} dy={10} />
                <YAxis tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "#f4f4f5" }}
                  contentStyle={{ backgroundColor: "#fff", borderColor: "#e4e4e7", borderRadius: "6px", boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)" }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", color: "#71717a", paddingTop: "20px" }} />
                <Bar dataKey="due" name="Due" fill="#d4d4d8" radius={[2, 2, 0, 0]} barSize={12} />
                <Bar dataKey="scheduled" name="Scheduled" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={12} />
                <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[2, 2, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Table 1: Requiring Attention */}
        <div className="bg-white border border-zinc-200 border-t-4 border-t-red-500 rounded-lg shadow-sm overflow-hidden flex flex-col">
          <SectionHeader title="Requiring Attention" />
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
                {attentionData.map((row, i) => (
                  <TableRow key={i} className="hover:bg-zinc-50/80 border-b border-zinc-100">
                    <TableCell className="font-medium text-sm py-3">{row.unit}</TableCell>
                    <TableCell className="text-zinc-500 text-sm py-3">{row.building}</TableCell>
                    <TableCell className="text-zinc-500 text-sm py-3">{row.due}</TableCell>
                    <TableCell className="text-right py-3"><StatusBadge status={row.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Table 2: Highest Risk Buildings */}
        <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
          <SectionHeader title="Highest Risk Buildings" />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-50">
                <TableRow className="hover:bg-transparent border-b border-zinc-100">
                  <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9">Building</TableHead>
                  <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9">Customer</TableHead>
                  <TableHead className="text-zinc-500 text-xs uppercase tracking-wider font-semibold h-9 text-right">Overdue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {riskData.map((row, i) => (
                  <TableRow key={i} className="hover:bg-zinc-50/80 border-b border-zinc-100">
                    <TableCell className="font-medium text-sm py-3">{row.building}</TableCell>
                    <TableCell className="text-zinc-500 text-sm py-3">{row.customer}</TableCell>
                    <TableCell className="text-right py-3">
                      <span className="inline-flex items-center justify-center bg-red-100 text-red-700 rounded-full font-bold h-6 w-6 text-xs">
                        {row.overdueCount}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Table 3: Upcoming — Next 30 Days */}
        <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
          <SectionHeader title="Upcoming — Next 30 Days" />
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
                {upcomingData.map((row, i) => (
                  <TableRow key={i} className="hover:bg-zinc-50/80 border-b border-zinc-100">
                    <TableCell className="py-3">
                      <div className="font-medium text-sm">{row.unit}</div>
                      <div className="text-xs text-zinc-500">{row.building}</div>
                    </TableCell>
                    <TableCell className="text-zinc-500 text-sm py-3">{row.type}</TableCell>
                    <TableCell className="text-zinc-500 text-sm py-3">{row.due}</TableCell>
                    <TableCell className="text-right py-3"><StatusBadge status={row.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

      </div>
    </div>
  );
}
