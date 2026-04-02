import React from "react";
import { 
  ArrowUpSquare, 
  LayoutDashboard, 
  Users, 
  Building2, 
  ClipboardCheck,
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from "recharts";

const SUMMARY = { totalElevators: 7, dueThisMonth: 2, overdueCount: 3, scheduledCount: 4 };

const ATTENTION = [
  { id: 1, elevatorName: "Main Lobby", buildingName: "City Tower", nextDueDate: "2026-03-15", status: "OVERDUE", type: "Annual" },
  { id: 2, elevatorName: "Service Lift A", buildingName: "Harbor View", nextDueDate: "2026-03-28", status: "OVERDUE", type: "5-Year" },
  { id: 3, elevatorName: "Freight Elevator", buildingName: "Metro Plaza", nextDueDate: "2026-04-01", status: "OVERDUE", type: "Annual" },
  { id: 4, elevatorName: "Passenger B", buildingName: "City Tower", nextDueDate: "2026-04-10", status: "IN_PROGRESS", type: "Initial" },
  { id: 5, elevatorName: "Executive Lift", buildingName: "Riverside Complex", nextDueDate: "2026-04-22", status: "SCHEDULED", type: "Annual" },
];

const BREAKDOWN = [
  { status: "COMPLETED", count: 3 },
  { status: "OVERDUE", count: 3 },
  { status: "IN_PROGRESS", count: 2 },
  { status: "SCHEDULED", count: 4 },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    COMPLETED: { label: "Completed", className: "bg-green-100 text-green-700" },
    OVERDUE: { label: "Overdue", className: "bg-red-100 text-red-700" },
    IN_PROGRESS: { label: "In Progress", className: "bg-yellow-100 text-yellow-700" },
    SCHEDULED: { label: "Scheduled", className: "bg-blue-100 text-blue-700" },
  };
  const { label, className } = map[status] || { label: status, className: "bg-gray-100 text-gray-700" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${className}`}>{label}</span>;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "COMPLETED": return "#22c55e";
    case "OVERDUE": return "#ef4444";
    case "IN_PROGRESS": return "#eab308";
    case "SCHEDULED": return "#3b82f6";
    default: return "#94a3b8";
  }
};

export default function DashA() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50 font-sans">
      {/* COLUMN 1: Nav Sidebar */}
      <div className="flex w-56 flex-col bg-zinc-950 h-full shrink-0">
        <div className="flex h-16 items-center gap-3 px-6 pt-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500 text-zinc-950">
            <ArrowUpSquare size={18} strokeWidth={2.5} />
          </div>
          <span className="text-sm font-bold text-zinc-50 tracking-tight">InspectIQ Tracker</span>
        </div>
        
        <nav className="flex-1 space-y-1 px-3 py-6">
          <a href="#" className="flex items-center gap-3 rounded-md bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-50">
            <LayoutDashboard size={18} className="text-amber-500" />
            Dashboard
          </a>
          <a href="#" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50">
            <Users size={18} />
            Customers
          </a>
          <a href="#" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50">
            <Building2 size={18} />
            Buildings
          </a>
          <a href="#" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50">
            <ArrowUpSquare size={18} />
            Elevators
          </a>
          <a href="#" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50">
            <ClipboardCheck size={18} />
            Inspections
          </a>
        </nav>

        <div className="border-t border-zinc-800 p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-zinc-800" />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-zinc-300">Admin User</span>
            </div>
          </div>
        </div>
      </div>

      {/* COLUMN 2: Stats Sidebar */}
      <div className="flex w-52 flex-col bg-white border-r border-gray-200 h-full shrink-0">
        <div className="py-6 px-5 border-b border-gray-100 flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold">Total Elevators</span>
          <span className="text-3xl font-black text-gray-900">{SUMMARY.totalElevators}</span>
          <span className="text-xs text-gray-400">in portfolio</span>
        </div>
        <div className="py-6 px-5 border-b border-gray-100 flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold">Due This Month</span>
          <span className="text-3xl font-black text-gray-900">{SUMMARY.dueThisMonth}</span>
          <span className="text-xs text-gray-400">upcoming</span>
        </div>
        <div className="py-6 px-5 border-b border-gray-100 flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold">Overdue</span>
          <span className="text-3xl font-black text-red-600">{SUMMARY.overdueCount}</span>
          <span className="text-xs text-gray-400">need attention</span>
        </div>
        <div className="py-6 px-5 border-b border-gray-100 flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold">Scheduled</span>
          <span className="text-3xl font-black text-gray-900">{SUMMARY.scheduledCount}</span>
          <span className="text-xs text-gray-400">coming up</span>
        </div>
      </div>

      {/* RIGHT SIDE: Main Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <span className="text-sm text-gray-400">Today: Apr 2, 2026</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
            <h2 className="font-semibold text-gray-900">Inspections Requiring Attention</h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              5 items
            </span>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 font-medium">Elevator</th>
                  <th className="px-6 py-3 font-medium">Building</th>
                  <th className="px-6 py-3 font-medium">Due Date</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                </tr>
              </thead>
              <tbody>
                {ATTENTION.map((item, i) => {
                  const isPastDue = new Date(item.nextDueDate) < new Date("2026-04-02");
                  return (
                    <tr key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-6 py-4 font-medium text-gray-900">{item.elevatorName}</td>
                      <td className="px-6 py-4 text-gray-600">{item.buildingName}</td>
                      <td className={`px-6 py-4 ${isPastDue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                        {item.nextDueDate}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-6 py-4 text-gray-600">{item.type}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-6">Status Breakdown</h2>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={BREAKDOWN} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="status" 
                  tick={{ fontSize: 12, fill: '#6b7280' }} 
                  tickFormatter={(val) => val.replace('_', ' ')} 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6b7280' }} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  {BREAKDOWN.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}