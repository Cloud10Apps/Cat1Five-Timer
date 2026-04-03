import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

const STATUS_DATA = [
  { name: "NOT STARTED", value: 15, color: "#71717a" },
  { name: "SCHEDULED",   value: 14, color: "#3b82f6" },
  { name: "IN PROGRESS", value: 6,  color: "#f59e0b" },
  { name: "COMPLETED",   value: 376, color: "#22c55e" },
  { name: "OVERDUE",     value: 3,  color: "#ef4444" }
];

const FORECAST_DATA = [
  { label: "Feb '25", due: 28, scheduled: 28, completed: 28 },
  { label: "Mar '25", due: 30, scheduled: 29, completed: 27 },
  { label: "Apr '26", due: 42, scheduled: 14, completed: 9 },
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

const ATTENTION_DATA = [
  { id: "ELEV-01", type: "Freight", building: "Apex Tower", date: "Oct 15, 2025", status: "OVERDUE" },
  { id: "ELEV-04", type: "Passenger", building: "Nexus Hub", date: "Oct 20, 2025", status: "OVERDUE" },
  { id: "ELEV-02", type: "Passenger", building: "Meridian Plaza", date: "Oct 22, 2025", status: "OVERDUE" },
];

const RISK_DATA = [
  { building: "Apex Tower", customer: "Apex Corp", overdueCount: 2 },
  { building: "Nexus Hub", customer: "Nexus Logistics", overdueCount: 1 },
];

const UPCOMING_DATA = [
  { id: "ELEV-12", building: "Lumina Point", cat: "CAT1", date: "Nov 5, 2025", status: "SCHEDULED" },
  { id: "ELEV-14", building: "Lumina Point", cat: "CAT5", date: "Nov 8, 2025", status: "NOT_STARTED" },
  { id: "ELEV-05", building: "Horizon Center", cat: "CAT1", date: "Nov 12, 2025", status: "IN_PROGRESS" },
];

function DarkStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    "OVERDUE": "bg-red-500/10 text-red-500 border-red-500/20",
    "SCHEDULED": "bg-blue-500/10 text-blue-500 border-blue-500/20",
    "NOT_STARTED": "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    "IN_PROGRESS": "bg-amber-500/10 text-amber-500 border-amber-500/20",
    "COMPLETED": "bg-green-500/10 text-green-500 border-green-500/20",
  };
  
  const formatted = status.replace("_", " ");
  
  return (
    <span className={`px-2 py-0.5 text-[10px] uppercase font-medium tracking-wider border rounded-sm ${styles[status] || styles["NOT_STARTED"]}`}>
      {formatted}
    </span>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-4 flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
      {children}
    </h2>
  );
}

const KPITile = ({ label, value, valueColor = "text-white" }: { label: string, value: string | number, valueColor?: string }) => (
  <div className="px-5 py-6 flex flex-col justify-center">
    <span className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-medium">{label}</span>
    <span className={`text-4xl font-light ${valueColor}`}>{value}</span>
  </div>
);

export function LeftRail() {
  return (
    <div className="flex flex-row min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* KPI Rail */}
      <aside className="w-[220px] shrink-0 bg-zinc-900 border-r border-zinc-800 h-screen sticky top-0 flex flex-col divide-y divide-zinc-800">
        <KPITile label="Total Elevators" value={42} />
        <KPITile label="Due This Month" value={8} />
        <KPITile label="Overdue" value={3} valueColor="text-red-500" />
        <KPITile label="Scheduled" value={14} />
        <KPITile label="Buildings" value={11} />
        <KPITile label="Customers" value={6} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 space-y-6">
        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-lg">
            <SectionHeading>Status Distribution</SectionHeading>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={STATUS_DATA} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#27272a" />
                  <XAxis type="number" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: '#27272a' }}
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#f4f4f5', borderRadius: '6px', fontSize: '12px' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {STATUS_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-lg">
            <SectionHeading>13-Month Forecast</SectionHeading>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={FORECAST_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis dataKey="label" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: '#27272a' }}
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#f4f4f5', borderRadius: '6px', fontSize: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="due" name="Due" fill="#71717a" radius={[2, 2, 0, 0]} stackId="a" />
                  <Bar dataKey="scheduled" name="Scheduled" fill="#3b82f6" radius={[2, 2, 0, 0]} stackId="a" />
                  <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[2, 2, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Tables Row */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden flex flex-col">
            <div className="p-5 border-b border-zinc-800 pb-4">
              <SectionHeading>Needs Attention</SectionHeading>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="text-[10px] uppercase text-zinc-500 bg-zinc-950/50">
                  <tr>
                    <th className="px-5 py-3 font-medium">Elevator</th>
                    <th className="px-5 py-3 font-medium">Building</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {ATTENTION_DATA.map((item, i) => (
                    <tr key={i} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium text-zinc-200">{item.id}</div>
                        <div className="text-xs text-zinc-500">{item.type}</div>
                      </td>
                      <td className="px-5 py-3 text-zinc-400">{item.building}</td>
                      <td className="px-5 py-3 text-zinc-400">{item.date}</td>
                      <td className="px-5 py-3 text-right">
                        <DarkStatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden flex flex-col">
            <div className="p-5 border-b border-zinc-800 pb-4">
              <SectionHeading>At Risk Buildings</SectionHeading>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="text-[10px] uppercase text-zinc-500 bg-zinc-950/50">
                  <tr>
                    <th className="px-5 py-3 font-medium">Building</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium text-right">Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {RISK_DATA.map((item, i) => (
                    <tr key={i} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-5 py-3 font-medium text-zinc-200">{item.building}</td>
                      <td className="px-5 py-3 text-zinc-400">{item.customer}</td>
                      <td className="px-5 py-3 text-right">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/20">
                          {item.overdueCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden flex flex-col">
            <div className="p-5 border-b border-zinc-800 pb-4">
              <SectionHeading>Upcoming Inspections</SectionHeading>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="text-[10px] uppercase text-zinc-500 bg-zinc-950/50">
                  <tr>
                    <th className="px-5 py-3 font-medium">Elevator</th>
                    <th className="px-5 py-3 font-medium">Details</th>
                    <th className="px-5 py-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {UPCOMING_DATA.map((item, i) => (
                    <tr key={i} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium text-zinc-200">{item.id}</div>
                        <div className="text-xs text-zinc-500">{item.cat}</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-zinc-300">{item.building}</div>
                        <div className="text-xs text-zinc-500">{item.date}</div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <DarkStatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
