import React from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

const kpiData = {
  totalElevators: 420,
  dueThisMonth: 24,
  overdue: 3,
  scheduled: 18,
  totalBuildings: 45,
  totalCustomers: 12,
};

const attentionData = [
  { id: 1, elevator: "ELEV-01 (Freight)", building: "Apex Tower", dueDate: "2023-10-15", status: "OVERDUE" },
  { id: 2, elevator: "ELEV-04 (Passenger)", building: "Nexus Hub", dueDate: "2023-10-20", status: "OVERDUE" },
  { id: 3, elevator: "ELEV-02 (Passenger)", building: "Apex Tower", dueDate: "2023-10-22", status: "OVERDUE" },
];

const riskData = [
  { id: 1, building: "Apex Tower", customer: "Apex Corp", overdue: 2 },
  { id: 2, building: "Nexus Hub", customer: "Nexus Logistics", overdue: 1 },
];

const upcomingData = [
  { id: 1, elevator: "ELEV-12", building: "Lumina Point", type: "CAT1", dueDate: "2023-11-05", status: "SCHEDULED" },
  { id: 2, elevator: "ELEV-14", building: "Lumina Point", type: "CAT5", dueDate: "2023-11-08", status: "NOT_STARTED" },
  { id: 3, elevator: "ELEV-05", building: "Horizon Center", type: "CAT1", dueDate: "2023-11-12", status: "IN_PROGRESS" },
  { id: 4, elevator: "ELEV-08", building: "Zenith Complex", type: "CAT1", dueDate: "2023-11-15", status: "SCHEDULED" },
];

const statusChartData = [
  { name: "Not Started", value: 15, color: "#52525b" }, // zinc-600
  { name: "Scheduled", value: 18, color: "#3b82f6" },   // blue-500
  { name: "In Progress", value: 8, color: "#f59e0b" },  // amber-500
  { name: "Completed", value: 376, color: "#22c55e" }, // green-500
  { name: "Overdue", value: 3, color: "#ef4444" },      // red-500
];

const forecastData = [
  { month: "Sep", due: 30, scheduled: 30, completed: 30 },
  { month: "Oct", due: 28, scheduled: 28, completed: 25 }, // 3 overdue
  { month: "Nov", due: 45, scheduled: 18, completed: 0 },
  { month: "Dec", due: 32, scheduled: 5, completed: 0 },
  { month: "Jan", due: 40, scheduled: 0, completed: 0 },
  { month: "Feb", due: 35, scheduled: 0, completed: 0 },
  { month: "Mar", due: 50, scheduled: 0, completed: 0 },
  { month: "Apr", due: 20, scheduled: 0, completed: 0 },
  { month: "May", due: 25, scheduled: 0, completed: 0 },
  { month: "Jun", due: 30, scheduled: 0, completed: 0 },
  { month: "Jul", due: 42, scheduled: 0, completed: 0 },
  { month: "Aug", due: 38, scheduled: 0, completed: 0 },
  { month: "Sep", due: 45, scheduled: 0, completed: 0 },
];

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    OVERDUE: "bg-red-500/10 text-red-500 border-red-500/20",
    SCHEDULED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    NOT_STARTED: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    IN_PROGRESS: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    COMPLETED: "bg-green-500/10 text-green-500 border-green-500/20",
  };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-sm border ${styles[status]}`}>
      {status.replace("_", " ")}
    </span>
  );
};

export function CommandCenter() {
  const isOverdue = kpiData.overdue > 0;
  
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-500/30">
      {/* Top Status Bar */}
      <div className={`h-1.5 w-full ${isOverdue ? "bg-red-500" : "bg-green-500"}`} />
      
      <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <img src="/__mockup/images/logo.svg" alt="Cat1Five Timer" className="h-14 rounded-sm" />
          </div>
          
          <div className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm border ${
            isOverdue 
              ? "bg-red-500/10 border-red-500/20 text-red-400" 
              : "bg-green-500/10 border-green-500/20 text-green-400"
          }`}>
            {isOverdue ? (
              <>
                <ShieldAlert className="w-4 h-4" />
                <span>{kpiData.overdue} SYSTEM{kpiData.overdue > 1 ? 'S' : ''} OVERDUE</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>ALL SYSTEMS GO</span>
              </>
            )}
          </div>
        </header>

        {/* KPIs Strip */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-zinc-800 border border-zinc-800 rounded-lg bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
          {[
            { label: "TOTAL ELEVATORS", value: kpiData.totalElevators },
            { label: "DUE THIS MONTH", value: kpiData.dueThisMonth },
            { label: "OVERDUE", value: kpiData.overdue, isAlert: true },
            { label: "SCHEDULED", value: kpiData.scheduled },
            { label: "TOTAL BUILDINGS", value: kpiData.totalBuildings },
            { label: "TOTAL CUSTOMERS", value: kpiData.totalCustomers },
          ].map((kpi, i) => (
            <div key={i} className="p-6 flex flex-col justify-between hover:bg-zinc-800/50 transition-colors">
              <span className="text-zinc-500 text-xs font-semibold tracking-wider mb-2">{kpi.label}</span>
              <span className={`text-4xl font-light tracking-tight ${kpi.isAlert ? "text-red-500" : "text-white"}`}>
                {kpi.value}
              </span>
            </div>
          ))}
        </section>

        {/* Charts Row */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Chart */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 flex flex-col h-[400px]">
            <h2 className="text-sm font-semibold tracking-wider text-zinc-400 uppercase mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
              Current Status Distribution
            </h2>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#27272a" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#a1a1aa', fontSize: 12 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#27272a', opacity: 0.4 }}
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#f4f4f5' }}
                    itemStyle={{ color: '#f4f4f5' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Forecast Chart */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 flex flex-col h-[400px]">
            <h2 className="text-sm font-semibold tracking-wider text-zinc-400 uppercase mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
              13-Month Compliance Forecast
            </h2>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecastData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#a1a1aa', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#a1a1aa', fontSize: 12 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#27272a', opacity: 0.4 }}
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#f4f4f5' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="due" name="Total Due" fill="#3f3f46" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="scheduled" name="Scheduled" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Tables Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Attention Table */}
          <div className="bg-zinc-900 border border-red-900/50 rounded-lg p-0 flex flex-col overflow-hidden shadow-[0_0_15px_rgba(239,68,68,0.05)]">
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/80 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-semibold text-zinc-200">Requiring Attention</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-zinc-500 uppercase bg-zinc-900/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">Unit</th>
                    <th className="px-4 py-3 font-medium">Building</th>
                    <th className="px-4 py-3 font-medium">Due</th>
                    <th className="px-4 py-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {attentionData.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-800/30 transition-colors group">
                      <td className="px-4 py-3 font-medium text-zinc-300">{row.elevator}</td>
                      <td className="px-4 py-3 text-zinc-400">{row.building}</td>
                      <td className="px-4 py-3 text-red-400 font-medium">{row.dueDate}</td>
                      <td className="px-4 py-3 text-right">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Risk Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-0 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/80">
              <h3 className="text-sm font-semibold text-zinc-200">Highest Risk Buildings</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-zinc-500 uppercase bg-zinc-900/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">Building</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium text-right">Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {riskData.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-zinc-300">{row.building}</td>
                      <td className="px-4 py-3 text-zinc-400">{row.customer}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500/10 text-red-500 text-xs font-bold">
                          {row.overdue}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upcoming Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-0 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/80">
              <h3 className="text-sm font-semibold text-zinc-200">Upcoming (30 Days)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-zinc-500 uppercase bg-zinc-900/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">Unit</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Due</th>
                    <th className="px-4 py-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {upcomingData.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-300">{row.elevator}</div>
                        <div className="text-xs text-zinc-500">{row.building}</div>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs font-medium">{row.type}</td>
                      <td className="px-4 py-3 text-zinc-400">{row.dueDate}</td>
                      <td className="px-4 py-3 text-right">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </section>
      </div>
    </div>
  );
}
