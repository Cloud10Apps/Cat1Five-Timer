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
import { AlertTriangle } from "lucide-react";

// --- Hardcoded Data ---

const kpis = [
  { label: "Total Elevators", value: "42", isDanger: false },
  { label: "Due This Month", value: "8", isDanger: false },
  { label: "Overdue", value: "3", isDanger: true },
  { label: "Scheduled", value: "14", isDanger: false },
  { label: "Buildings", value: "11", isDanger: false },
  { label: "Customers", value: "6", isDanger: false },
];

const statusData = [
  { name: "NOT STARTED", value: 15, color: "#71717a" },
  { name: "SCHEDULED", value: 14, color: "#3b82f6" },
  { name: "IN PROGRESS", value: 6, color: "#f59e0b" },
  { name: "COMPLETED", value: 376, color: "#22c55e" },
  { name: "OVERDUE", value: 3, color: "#ef4444" },
];

const forecastData = [
  { label: "Feb '25", due: 28, scheduled: 28, completed: 28 },
  { label: "Mar '25", due: 30, scheduled: 29, completed: 27 },
  { label: "Apr '26", due: 42, scheduled: 14, completed: 9 }, // current month
  { label: "May '26", due: 38, scheduled: 6, completed: 0 },
  { label: "Jun '26", due: 45, scheduled: 0, completed: 0 },
  { label: "Jul '26", due: 32, scheduled: 0, completed: 0 },
  { label: "Aug '26", due: 50, scheduled: 0, completed: 0 },
  { label: "Sep '26", due: 28, scheduled: 0, completed: 0 },
  { label: "Oct '26", due: 35, scheduled: 0, completed: 0 },
  { label: "Nov '26", due: 40, scheduled: 0, completed: 0 },
  { label: "Dec '26", due: 22, scheduled: 0, completed: 0 },
  { label: "Jan '27", due: 48, scheduled: 0, completed: 0 },
  { label: "Feb '27", due: 33, scheduled: 0, completed: 0 },
];

const attentionRows = [
  { id: "ELEV-01", type: "Freight", building: "Apex Tower", date: "Oct 15, 2025", status: "OVERDUE" },
  { id: "ELEV-04", type: "Passenger", building: "Nexus Hub", date: "Oct 20, 2025", status: "OVERDUE" },
  { id: "ELEV-02", type: "Passenger", building: "Meridian Plaza", date: "Oct 22, 2025", status: "OVERDUE" },
];

const riskBuildings = [
  { name: "Apex Tower", customer: "Apex Corp", overdueCount: 2 },
  { name: "Nexus Hub", customer: "Nexus Logistics", overdueCount: 1 },
];

const upcomingRows = [
  { id: "ELEV-12", building: "Lumina Point", cat: "CAT1", date: "Nov 5, 2025", status: "SCHEDULED" },
  { id: "ELEV-14", building: "Lumina Point", cat: "CAT5", date: "Nov 8, 2025", status: "NOT_STARTED" },
  { id: "ELEV-05", building: "Horizon Center", cat: "CAT1", date: "Nov 12, 2025", status: "IN_PROGRESS" },
];

// --- Components ---

function DarkStatusBadge({ status }: { status: string }) {
  let colorClass = "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
  if (status === "OVERDUE") colorClass = "bg-red-500/10 text-red-400 border-red-500/20";
  if (status === "SCHEDULED") colorClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
  if (status === "IN_PROGRESS") colorClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
  if (status === "COMPLETED") colorClass = "bg-green-500/10 text-green-400 border-green-500/20";
  if (status === "NOT_STARTED") colorClass = "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wider ${colorClass}`}>
      {status.replace("_", " ")}
    </span>
  );
}

const CardHeader = ({ title, icon }: { title: string; icon?: React.ReactNode }) => (
  <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
    {icon}
    <h2 className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] font-semibold">
      {title}
    </h2>
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#18181b] border border-[#3f3f46] p-3 rounded-lg shadow-xl">
        <p className="text-[#f4f4f5] font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-zinc-400">{entry.name}:</span>
            <span className="text-zinc-100 font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// --- Main Layout ---

export function GridCards() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-6 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-light tracking-tight text-white mb-1">Grid Overview</h1>
          <p className="text-sm text-zinc-500">Flat equal-weight masonry grid layout.</p>
        </div>

        {/* 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min">
          
          {/* KPI Tiles (6) */}
          {kpis.map((kpi, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 flex flex-col items-center justify-center text-center h-[120px]">
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">
                {kpi.label}
              </div>
              <div className={`text-5xl font-light ${kpi.isDanger ? 'text-red-500' : 'text-white'}`}>
                {kpi.value}
              </div>
            </div>
          ))}

          {/* Status Distribution */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg col-span-1 lg:col-span-2 flex flex-col h-[280px]">
            <CardHeader title="Status Distribution" />
            <div className="flex-1 p-5 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#27272a', opacity: 0.4 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Requiring Attention */}
          <div className="bg-zinc-900 border border-red-900/40 rounded-lg col-span-1 flex flex-col h-[280px] overflow-hidden">
            <CardHeader 
              title="Requiring Attention" 
              icon={<AlertTriangle className="w-3.5 h-3.5 text-red-500" />} 
            />
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <tbody>
                  {attentionRows.map((row, i) => (
                    <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                      <td className="py-3 px-4 text-xs">
                        <div className="font-medium text-zinc-200">{row.id}</div>
                        <div className="text-zinc-500 mt-0.5">{row.type}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-zinc-400">
                        {row.building}
                        <div className="text-zinc-500 mt-0.5">{row.date}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DarkStatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Risk Buildings */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg col-span-1 flex flex-col h-[280px] overflow-hidden">
            <CardHeader title="Risk Buildings" />
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-900/50 sticky top-0">
                  <tr>
                    <th className="py-2 px-4 text-[10px] font-medium text-zinc-500 uppercase">Building</th>
                    <th className="py-2 px-4 text-[10px] font-medium text-zinc-500 uppercase text-right">Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {riskBuildings.map((bldg, i) => (
                    <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                      <td className="py-3 px-4 text-xs">
                        <div className="font-medium text-zinc-200">{bldg.name}</div>
                        <div className="text-zinc-500 mt-0.5">{bldg.customer}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500/10 text-red-400 font-medium text-xs border border-red-500/20">
                          {bldg.overdueCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 13-Month Forecast */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg col-span-1 lg:col-span-2 flex flex-col h-[280px]">
            <CardHeader title="13-Month Forecast" />
            <div className="flex-1 p-5 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="label" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#27272a', opacity: 0.4 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
                  <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[2, 2, 0, 0]} stackId="a" />
                  <Bar dataKey="scheduled" name="Scheduled" fill="#3b82f6" radius={[2, 2, 0, 0]} stackId="a" />
                  <Bar dataKey="due" name="Due" fill="#71717a" radius={[2, 2, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Upcoming */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg col-span-1 lg:col-span-3 flex flex-col">
            <CardHeader title="Upcoming — Next 30 Days" />
            <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-900/50 sticky top-0 border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">ID</th>
                    <th className="py-3 px-4 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Building</th>
                    <th className="py-3 px-4 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Category</th>
                    <th className="py-3 px-4 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Date</th>
                    <th className="py-3 px-4 text-[10px] font-medium text-zinc-500 uppercase tracking-wider text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingRows.map((row, i) => (
                    <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                      <td className="py-3 px-4 text-xs font-medium text-zinc-300">{row.id}</td>
                      <td className="py-3 px-4 text-xs text-zinc-400">{row.building}</td>
                      <td className="py-3 px-4 text-xs text-zinc-400">{row.cat}</td>
                      <td className="py-3 px-4 text-xs text-zinc-400">{row.date}</td>
                      <td className="py-3 px-4 text-right">
                        <DarkStatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
