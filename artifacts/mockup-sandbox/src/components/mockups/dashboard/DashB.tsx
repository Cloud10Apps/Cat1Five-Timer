import React from "react";
import { 
  AlertTriangle, 
  ArrowUpSquare, 
  LayoutDashboard, 
  Building2, 
  Users, 
  ClipboardCheck, 
  ChevronRight,
  CheckCircle2
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

export default function DashB() {
  const isAllClear = SUMMARY.overdueCount === 0;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50 text-zinc-950 font-sans">
      {/* Sidebar */}
      <div className="w-56 flex-shrink-0 bg-zinc-950 h-full flex flex-col z-20 shadow-xl">
        <div className="p-4 flex items-center gap-2 mb-6 mt-2">
          <div className="bg-amber-500 rounded p-1">
            <ArrowUpSquare className="h-5 w-5 text-zinc-950" />
          </div>
          <span className="text-zinc-50 font-bold tracking-tight">InspectIQ Tracker</span>
        </div>
        
        <nav className="flex-1 px-3 space-y-1">
          <a href="#" className="flex items-center gap-2 px-3 py-2 rounded text-sm text-zinc-50 bg-zinc-800 font-medium">
            <LayoutDashboard className="h-4 w-4 text-amber-500" />
            <span>Dashboard</span>
          </a>
          <a href="#" className="flex items-center gap-2 px-3 py-2 rounded text-sm text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50 transition-colors font-medium">
            <Users className="h-4 w-4" />
            <span>Customers</span>
          </a>
          <a href="#" className="flex items-center gap-2 px-3 py-2 rounded text-sm text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50 transition-colors font-medium">
            <Building2 className="h-4 w-4" />
            <span>Buildings</span>
          </a>
          <a href="#" className="flex items-center gap-2 px-3 py-2 rounded text-sm text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50 transition-colors font-medium">
            <ArrowUpSquare className="h-4 w-4" />
            <span>Elevators</span>
          </a>
          <a href="#" className="flex items-center gap-2 px-3 py-2 rounded text-sm text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50 transition-colors font-medium">
            <ClipboardCheck className="h-4 w-4" />
            <span>Inspections</span>
          </a>
        </nav>
        
        <div className="p-4 mt-auto border-t border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-medium text-xs">
              AU
            </div>
            <span className="text-xs text-zinc-400 font-medium">Admin User</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto relative">
        
        {/* Hero Alert Banner */}
        <div className={`w-full py-6 px-8 flex items-center shadow-md relative z-10 ${isAllClear ? 'bg-green-600' : 'bg-red-600'}`}>
          <div className="flex items-start gap-4 flex-1">
            {isAllClear ? (
              <CheckCircle2 className="h-12 w-12 text-green-200 mt-0.5" />
            ) : (
              <AlertTriangle className="h-12 w-12 text-red-200 mt-0.5" />
            )}
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                {isAllClear ? "All Systems Go" : `${SUMMARY.overdueCount} Overdue Inspections`}
              </h1>
              <p className={`text-sm mt-1 font-medium ${isAllClear ? 'text-green-100' : 'text-red-100'}`}>
                {isAllClear 
                  ? "All elevators are fully compliant and up to date." 
                  : "Immediate attention required. These elevators are past their compliance deadline."}
              </p>
            </div>
          </div>
          {!isAllClear && (
            <div className="ml-auto pl-4">
              <button className="bg-white text-red-700 font-bold text-sm px-5 py-2.5 rounded-lg shadow-sm hover:bg-red-50 hover:shadow transition-all flex items-center gap-1.5 focus:ring-4 focus:ring-red-400 focus:outline-none">
                View All Overdue <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Stats Strip */}
        <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center shadow-sm z-0">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-[0.15em] text-gray-500 font-bold mb-1">Total Elevators</span>
            <span className="text-3xl font-black text-gray-900 leading-none">{SUMMARY.totalElevators}</span>
          </div>
          <div className="w-px h-10 bg-gray-200 mx-8" />
          
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-[0.15em] text-gray-500 font-bold mb-1">Due This Month</span>
            <span className="text-3xl font-black text-gray-900 leading-none">{SUMMARY.dueThisMonth}</span>
          </div>
          <div className="w-px h-10 bg-gray-200 mx-8" />
          
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-[0.15em] text-gray-500 font-bold mb-1">Overdue</span>
            <span className="text-3xl font-black text-red-600 leading-none">{SUMMARY.overdueCount}</span>
          </div>
          <div className="w-px h-10 bg-gray-200 mx-8" />
          
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-[0.15em] text-gray-500 font-bold mb-1">Scheduled</span>
            <span className="text-3xl font-black text-gray-900 leading-none">{SUMMARY.scheduledCount}</span>
          </div>
        </div>

        {/* Main Dashboard Content */}
        <div className="flex-1 p-8">
          <div className="grid grid-cols-7 gap-8">
            
            {/* Attention Table */}
            <div className="col-span-4 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3 bg-white">
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">Inspections Requiring Attention</h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700 tracking-wide">
                  3 OVERDUE
                </span>
              </div>
              <div className="p-0 overflow-auto flex-1">
                <Table>
                  <TableHeader className="bg-gray-50/80">
                    <TableRow className="hover:bg-transparent border-b-gray-200">
                      <TableHead className="font-semibold text-gray-600 h-11 text-xs uppercase tracking-wider">Elevator</TableHead>
                      <TableHead className="font-semibold text-gray-600 h-11 text-xs uppercase tracking-wider">Building</TableHead>
                      <TableHead className="font-semibold text-gray-600 h-11 text-xs uppercase tracking-wider">Due Date</TableHead>
                      <TableHead className="font-semibold text-gray-600 h-11 text-xs uppercase tracking-wider">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ATTENTION.map((inspection) => (
                      <TableRow key={inspection.id} className="border-b-gray-100 hover:bg-gray-50/50 transition-colors">
                        <TableCell className="font-bold text-gray-900">{inspection.elevatorName}</TableCell>
                        <TableCell className="text-gray-600 font-medium">{inspection.buildingName}</TableCell>
                        <TableCell>
                          <span className={inspection.status === 'OVERDUE' ? "text-red-600 font-bold" : "text-gray-600 font-medium"}>
                            {new Date(inspection.nextDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={inspection.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-white">
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">Status Breakdown</h2>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-center">
                <div className="w-full h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={BREAKDOWN} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis 
                        dataKey="status" 
                        tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }} 
                        tickFormatter={(val) => val.replace('_', ' ')}
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        dx={-10}
                      />
                      <Tooltip 
                        cursor={{ fill: '#f9fafb' }}
                        contentStyle={{ 
                          borderRadius: '8px', 
                          border: '1px solid #e5e7eb', 
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                          fontWeight: 500,
                          fontSize: '13px'
                        }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={50}>
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
        </div>

      </div>
    </div>
  );
}
