import React from "react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Legend 
} from "recharts";
import { 
  AlertCircle, CheckCircle2, Clock, Calendar, AlertTriangle, ArrowUpRight, ArrowDownRight, MoreHorizontal
} from "lucide-react";

const overdueData = [
  { elevator: "Elevator 3A", building: "Crane Tower", due: "Feb 15, 2025", status: "NOT_STARTED" },
  { elevator: "Unit 7", building: "Midtown Suites", due: "Mar 2, 2025", status: "SCHEDULED" },
  { elevator: "Cab B", building: "Harbor Point", due: "Jan 28, 2025", status: "IN_PROGRESS" }
];

const upcomingData = [
  { elevator: "Unit 12", building: "Skyline Plaza", type: "CAT1", due: "Apr 8, 2025", status: "SCHEDULED" },
  { elevator: "Elevator 2", building: "Crane Tower", type: "CAT5", due: "Apr 12, 2025", status: "NOT_STARTED" },
  { elevator: "Main Lift", building: "Harbor Point", type: "CAT1", due: "Apr 15, 2025", status: "SCHEDULED" }
];

const statusDistribution = [
  { name: "COMPLETED", count: 18, color: "#22c55e" },
  { name: "SCHEDULED", count: 5, color: "#3b82f6" },
  { name: "IN PROGRESS", count: 2, color: "#f59e0b" },
  { name: "NOT STARTED", count: 12, color: "#d4d4d8" },
  { name: "OVERDUE", count: 3, color: "#ef4444" }
];

const monthlyData = [
  { month: "Jan", "Not Started": 2, "Scheduled": 4, "In Progress": 1, "Completed": 12 },
  { month: "Feb", "Not Started": 3, "Scheduled": 5, "In Progress": 2, "Completed": 15 },
  { month: "Mar", "Not Started": 1, "Scheduled": 8, "In Progress": 3, "Completed": 10 },
  { month: "Apr", "Not Started": 5, "Scheduled": 12, "In Progress": 4, "Completed": 8 },
  { month: "May", "Not Started": 4, "Scheduled": 6, "In Progress": 2, "Completed": 14 },
  { month: "Jun", "Not Started": 2, "Scheduled": 3, "In Progress": 1, "Completed": 18 },
  { month: "Jul", "Not Started": 1, "Scheduled": 2, "In Progress": 0, "Completed": 22 },
  { month: "Aug", "Not Started": 3, "Scheduled": 5, "In Progress": 2, "Completed": 16 },
  { month: "Sep", "Not Started": 6, "Scheduled": 10, "In Progress": 4, "Completed": 9 },
  { month: "Oct", "Not Started": 8, "Scheduled": 15, "In Progress": 5, "Completed": 6 },
  { month: "Nov", "Not Started": 4, "Scheduled": 7, "In Progress": 2, "Completed": 11 },
  { month: "Dec", "Not Started": 2, "Scheduled": 4, "In Progress": 1, "Completed": 14 },
];

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'COMPLETED': return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Completed</span>;
    case 'OVERDUE': return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Overdue</span>;
    case 'IN_PROGRESS': return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">In Progress</span>;
    case 'SCHEDULED': return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Scheduled</span>;
    case 'NOT_STARTED': return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700">Not Started</span>;
    default: return null;
  }
};

const TypeBadge = ({ type }: { type: string }) => {
  return <span className="inline-flex items-center px-2 py-1 rounded border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600">{type}</span>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-zinc-200 shadow-lg rounded-lg p-3 text-sm">
        <p className="font-medium text-zinc-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-zinc-600">{entry.name}:</span>
            <span className="font-medium text-zinc-900">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function Bento() {
  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8 font-sans text-zinc-900">
      <div className="max-w-[1400px] mx-auto space-y-4">
        
        {/* Header (optional minimal header to set context) */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Portfolio Compliance</h1>
            <p className="text-sm text-zinc-500">Real-time overview of elevator inspections</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-white border border-zinc-200 text-zinc-700 text-sm font-medium rounded-lg hover:bg-zinc-50 transition-colors">
              Export Report
            </button>
            <button className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors shadow-sm">
              Schedule Inspection
            </button>
          </div>
        </div>

        {/* ROW 1: Hero KPIs & Status Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-auto md:h-[280px]">
          {/* Overdue Hero Card */}
          <div className="bg-red-50 rounded-xl border border-red-100 shadow-sm p-6 flex flex-col justify-between relative overflow-hidden group col-span-1">
            <div className="absolute -right-6 -top-6 text-red-100/50 group-hover:scale-110 transition-transform duration-500">
              <AlertCircle size={160} strokeWidth={1} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-red-600 font-semibold tracking-wide text-sm mb-2">
                <AlertCircle size={16} />
                <span>ACTION REQUIRED</span>
              </div>
              <h2 className="text-zinc-900 font-medium">Critical Overdue</h2>
              <p className="text-sm text-zinc-500 mt-1">Inspections past compliance date</p>
            </div>
            <div className="relative z-10 mt-8">
              <div className="text-7xl font-bold tracking-tighter text-red-600">3</div>
              <div className="text-sm font-medium text-red-700 mt-2 flex items-center gap-1">
                <ArrowUpRight size={14} /> +1 since last week
              </div>
            </div>
          </div>

          {/* Status Distribution */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 col-span-1 md:col-span-2 flex flex-col">
            <h3 className="text-base font-semibold text-zinc-900 mb-1">Current Status Pipeline</h3>
            <p className="text-sm text-zinc-500 mb-6">Distribution of all active elevators</p>
            <div className="flex-1 min-h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusDistribution} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f4f4f5" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 12, fontWeight: 500 }}
                  />
                  <Tooltip cursor={{ fill: '#f4f4f5' }} content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ROW 2: Compact Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 flex flex-col justify-center">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Clock size={12} /> Not Started</span>
            <span className="text-2xl font-bold text-zinc-700">12</span>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 flex flex-col justify-center">
            <span className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar size={12} /> Scheduled</span>
            <span className="text-2xl font-bold text-zinc-900">5</span>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 flex flex-col justify-center">
            <span className="text-xs font-medium text-amber-600 uppercase tracking-wider mb-1 flex items-center gap-1"><AlertTriangle size={12} /> In Progress</span>
            <span className="text-2xl font-bold text-zinc-900">2</span>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 flex flex-col justify-center">
            <span className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1 flex items-center gap-1"><CheckCircle2 size={12} /> Completed</span>
            <span className="text-2xl font-bold text-zinc-900">18</span>
          </div>
          
          {/* Average Days Pills */}
          <div className="col-span-2 grid grid-rows-2 gap-4">
            <div className="bg-red-50 rounded-xl border border-red-100 shadow-sm px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-red-900">Avg Days to Schedule</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-red-700">3.2</span>
                <span className="text-xs text-red-600 bg-red-100 px-1.5 py-0.5 rounded">Poor</span>
              </div>
            </div>
            <div className="bg-red-50 rounded-xl border border-red-100 shadow-sm px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-red-900">Avg Days to Complete</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-red-700">7.5</span>
                <span className="text-xs text-red-600 bg-red-100 px-1.5 py-0.5 rounded">Poor</span>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 3: Monthly Forecast & Upcoming */}
        <div className="grid grid-cols-1 lg:grid-cols-[65%_calc(35%-1rem)] gap-4 min-h-[400px]">
          {/* Monthly Forecast */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-semibold text-zinc-900">12-Month Compliance Forecast</h3>
                <p className="text-sm text-zinc-500">Predicted inspection volume by status</p>
              </div>
              <select className="text-sm border-zinc-200 rounded-md bg-zinc-50 text-zinc-700 px-3 py-1.5 border outline-none">
                <option>2025</option>
                <option>2024</option>
              </select>
            </div>
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 12 }} 
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f4f4f5' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Bar dataKey="Completed" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} barSize={32} />
                  <Bar dataKey="In Progress" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="Scheduled" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="Not Started" stackId="a" fill="#d4d4d8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Upcoming Table */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <h3 className="text-base font-semibold text-zinc-900">Upcoming (14 Days)</h3>
              <button className="text-sm text-blue-600 font-medium hover:text-blue-700">View All</button>
            </div>
            <div className="flex-1 overflow-auto p-0">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-zinc-500 uppercase bg-white sticky top-0 border-b border-zinc-100">
                  <tr>
                    <th className="px-5 py-3 font-medium">Unit / Building</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium text-right">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {upcomingData.map((row, i) => (
                    <tr key={i} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium text-zinc-900">{row.elevator}</div>
                        <div className="text-zinc-500 text-xs mt-0.5">{row.building}</div>
                      </td>
                      <td className="px-5 py-3">
                        <TypeBadge type={row.type} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="font-medium text-zinc-900">{row.due}</div>
                        <div className="mt-1 flex justify-end"><StatusBadge status={row.status} /></div>
                      </td>
                    </tr>
                  ))}
                  <tr className="hover:bg-zinc-50 transition-colors">
                     <td colSpan={3} className="px-5 py-4 text-center text-zinc-500 text-sm italic">
                        + 4 more scheduled this month
                     </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ROW 4: Overdue Table */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h3 className="text-base font-semibold text-zinc-900">Overdue Inspections Resolution</h3>
            </div>
            <button className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-md transition-colors">
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b border-zinc-100">
                <tr>
                  <th className="px-6 py-3 font-medium">Elevator Unit</th>
                  <th className="px-6 py-3 font-medium">Building Location</th>
                  <th className="px-6 py-3 font-medium">Original Due Date</th>
                  <th className="px-6 py-3 font-medium">Current Status</th>
                  <th className="px-6 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {overdueData.map((row, i) => (
                  <tr key={i} className="hover:bg-red-50/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-zinc-900">{row.elevator}</td>
                    <td className="px-6 py-4 text-zinc-600">{row.building}</td>
                    <td className="px-6 py-4 text-red-600 font-medium flex items-center gap-1.5">
                      <Clock size={14} /> {row.due}
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={row.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-sm font-medium text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity">
                        Resolve Now &rarr;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
