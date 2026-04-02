import React from "react";
import { 
  AlertTriangle, 
  ArrowUpSquare, 
  LayoutDashboard, 
  Building2, 
  Users, 
  ClipboardCheck, 
  Calendar, 
  ChevronRight 
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const SUMMARY = { totalElevators: 7, dueThisMonth: 2, overdueCount: 3, scheduledCount: 4 };
const ATTENTION = [
  { id: 1, elevatorName: "Main Lobby", buildingName: "City Tower", nextDueDate: "2026-03-15", status: "OVERDUE" },
  { id: 2, elevatorName: "Service Lift A", buildingName: "Harbor View", nextDueDate: "2026-03-28", status: "OVERDUE" },
  { id: 3, elevatorName: "Freight Elevator", buildingName: "Metro Plaza", nextDueDate: "2026-04-01", status: "OVERDUE" },
  { id: 4, elevatorName: "Passenger B", buildingName: "City Tower", nextDueDate: "2026-04-10", status: "IN_PROGRESS" },
  { id: 5, elevatorName: "Executive Lift", buildingName: "Riverside Complex", nextDueDate: "2026-04-22", status: "SCHEDULED" },
];
const BREAKDOWN = [
  { status: "COMPLETED", count: 3 },
  { status: "OVERDUE", count: 3 },
  { status: "IN_PROGRESS", count: 2 },
  { status: "SCHEDULED", count: 4 },
];

const COMPLETED_FAKE_ITEMS = [
  { id: 6, elevatorName: "Lobby A", buildingName: "Riverside Complex", nextDueDate: "2026-03-01", status: "COMPLETED" },
  { id: 7, elevatorName: "Freight B", buildingName: "Metro Plaza", nextDueDate: "2026-02-15", status: "COMPLETED" },
];

const ALL_INSPECTIONS = [...ATTENTION, ...COMPLETED_FAKE_ITEMS];

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

export default function DashC() {
  const totalInspections = BREAKDOWN.reduce((acc, cur) => acc + cur.count, 0);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white text-gray-900 font-sans">
      {/* LEFT: Nav sidebar */}
      <div className="w-56 bg-zinc-950 flex flex-col h-full shrink-0">
        <div className="p-4 flex items-center gap-3">
          <div className="bg-amber-500 p-1.5 rounded-md">
            <ArrowUpSquare className="w-5 h-5 text-zinc-950" />
          </div>
          <span className="text-zinc-50 font-bold tracking-tight">InspectIQ Tracker</span>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <a href="#" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-zinc-50 bg-zinc-800">
            <LayoutDashboard className="w-4 h-4 text-amber-500" />
            Dashboard
          </a>
          <a href="#" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50 transition-colors">
            <Users className="w-4 h-4" />
            Customers
          </a>
          <a href="#" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50 transition-colors">
            <Building2 className="w-4 h-4" />
            Buildings
          </a>
          <a href="#" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50 transition-colors">
            <ArrowUpSquare className="w-4 h-4" />
            Elevators
          </a>
          <a href="#" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50 transition-colors">
            <ClipboardCheck className="w-4 h-4" />
            Inspections
          </a>
        </nav>

        <div className="p-4 border-t border-zinc-900">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-400">
              AU
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-300 truncate">Admin User</p>
              <p className="text-xs text-zinc-500 truncate">admin@elevatortracker.com</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50">
        
        {/* TOP BAR */}
        <div className="bg-white border-b border-gray-100 px-8 py-5 flex items-center justify-between shrink-0">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-700" />
              <span className="font-bold text-sm text-red-700">{SUMMARY.overdueCount}</span>
              <span className="text-xs text-red-700">Overdue</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100">
              <ArrowUpSquare className="h-4 w-4 text-gray-700" />
              <span className="font-bold text-sm text-gray-700">{SUMMARY.totalElevators}</span>
              <span className="text-xs text-gray-500">Elevators</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50">
              <Calendar className="h-4 w-4 text-amber-700" />
              <span className="font-bold text-sm text-amber-700">{SUMMARY.dueThisMonth}</span>
              <span className="text-xs text-amber-700">Due This Month</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50">
              <Calendar className="h-4 w-4 text-blue-700" />
              <span className="font-bold text-sm text-blue-700">{SUMMARY.scheduledCount}</span>
              <span className="text-xs text-blue-700">Scheduled</span>
            </div>
          </div>
        </div>

        {/* THREE-COLUMN MOSAIC */}
        <div className="flex-1 overflow-hidden flex flex-row gap-0">
          
          {/* COLUMN A — Alert Feed */}
          <div className="w-72 bg-white border-r border-gray-200 flex flex-col shrink-0">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h2 className="font-semibold text-sm text-gray-900">Needs Attention</h2>
              <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">
                {SUMMARY.overdueCount}
              </span>
            </div>
            <div className="overflow-y-auto flex-1">
              {ATTENTION.map((item) => (
                <div key={item.id} className="px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-sm text-gray-900 group-hover:text-amber-600 transition-colors">{item.elevatorName}</h3>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                    <Building2 className="w-3.5 h-3.5" />
                    <span className="truncate">{item.buildingName}</span>
                  </div>
                  <div className={`text-xs ${item.status === 'OVERDUE' ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                    Due {new Date(item.nextDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COLUMN B — Chart */}
          <div className="flex-1 bg-gray-50 p-6 overflow-y-auto min-w-0 flex flex-col gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Status Breakdown</h2>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={BREAKDOWN} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
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

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3">
              <div className="text-sm font-medium text-gray-900">
                <span className="font-bold">{totalInspections}</span> total inspections this cycle
              </div>
              <div className="h-3 w-full bg-gray-100 rounded-full flex overflow-hidden">
                {BREAKDOWN.map(item => {
                  const percentage = (item.count / totalInspections) * 100;
                  return (
                    <div 
                      key={item.status} 
                      style={{ 
                        width: `${percentage}%`, 
                        backgroundColor: getStatusColor(item.status) 
                      }} 
                      className="h-full first:rounded-l-full last:rounded-r-full border-r border-white/20 last:border-0"
                      title={`${item.status.replace('_', ' ')}: ${item.count}`}
                    />
                  );
                })}
              </div>
              <div className="flex items-center gap-4 text-xs mt-1 text-gray-500">
                 {BREAKDOWN.map(item => (
                   <div key={item.status} className="flex items-center gap-1.5">
                     <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(item.status) }} />
                     <span>{item.status.replace('_', ' ')} ({item.count})</span>
                   </div>
                 ))}
              </div>
            </div>
          </div>

          {/* COLUMN C — Upcoming */}
          <div className="w-64 bg-white border-l border-gray-200 flex flex-col shrink-0">
            <div className="px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 className="font-semibold text-sm text-gray-900">All Inspections</h2>
            </div>
            <div className="overflow-y-auto flex-1">
              {ALL_INSPECTIONS.map((item) => (
                <div key={item.id} className="px-5 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getStatusColor(item.status) }} />
                    <span className="font-medium text-sm text-gray-800 truncate">{item.elevatorName}</span>
                  </div>
                  <div className="text-xs text-gray-400 pl-4 truncate">
                    {item.buildingName} • {new Date(item.nextDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
