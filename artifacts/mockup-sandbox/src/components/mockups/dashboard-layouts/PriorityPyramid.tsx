import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { AlertTriangle, AlertCircle, Calendar, ArrowRight, Activity, Building, Users } from 'lucide-react';

const statusData = [
  { name: "NOT STARTED", value: 15, color: "#71717a" },
  { name: "SCHEDULED",   value: 14, color: "#3b82f6" },
  { name: "IN PROGRESS", value: 6,  color: "#f59e0b" },
  { name: "COMPLETED",   value: 376, color: "#22c55e" },
  { name: "OVERDUE",     value: 3,  color: "#ef4444" }
];

const forecastData = [
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

const attentionRows = [
  { id: 'ELEV-01', type: 'Freight', building: 'Apex Tower', date: 'Oct 15, 2025', status: 'OVERDUE' },
  { id: 'ELEV-04', type: 'Passenger', building: 'Nexus Hub', date: 'Oct 20, 2025', status: 'OVERDUE' },
  { id: 'ELEV-02', type: 'Passenger', building: 'Meridian Plaza', date: 'Oct 22, 2025', status: 'OVERDUE' }
];

const riskBuildings = [
  { name: 'Apex Tower', customer: 'Apex Corp', count: 2 },
  { name: 'Nexus Hub', customer: 'Nexus Logistics', count: 1 }
];

const upcomingRows = [
  { id: 'ELEV-12', building: 'Lumina Point', cat: 'CAT1', date: 'Nov 5, 2025', status: 'SCHEDULED' },
  { id: 'ELEV-14', building: 'Lumina Point', cat: 'CAT5', date: 'Nov 8, 2025', status: 'NOT_STARTED' },
  { id: 'ELEV-05', building: 'Horizon Center', cat: 'CAT1', date: 'Nov 12, 2025', status: 'IN_PROGRESS' }
];

function DarkStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'OVERDUE': 'bg-red-500/10 text-red-400 border border-red-500/20',
    'SCHEDULED': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    'NOT_STARTED': 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
    'IN_PROGRESS': 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    'COMPLETED': 'bg-green-500/10 text-green-400 border border-green-500/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${styles[status] || styles['NOT_STARTED']}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2 mb-4">
    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
    <h2 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">{children}</h2>
  </div>
);

export function PriorityPyramid() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 space-y-5 font-sans">
      
      {/* Top Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Requiring Attention (2/3) */}
        <div className="lg:col-span-2 bg-zinc-900 border border-red-900/40 rounded-xl p-5 shadow-sm flex flex-col">
          <SectionHeading>Requiring Attention</SectionHeading>
          <div className="flex-1 border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950/50">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-900/80 text-zinc-400 text-xs uppercase tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Elevator</th>
                  <th className="px-4 py-3 font-medium">Building</th>
                  <th className="px-4 py-3 font-medium">Due Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {attentionRows.map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="font-medium text-zinc-200">{row.id}</span>
                        <span className="text-zinc-500 text-xs">({row.type})</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{row.building}</td>
                    <td className="px-4 py-3 text-zinc-300">{row.date}</td>
                    <td className="px-4 py-3"><DarkStatusBadge status={row.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-zinc-400 hover:text-white transition-colors">
                        <ArrowRight className="w-4 h-4 ml-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right side (1/3) */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Risk Buildings */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm h-[200px] flex flex-col">
            <SectionHeading>Risk Buildings</SectionHeading>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {riskBuildings.map((bldg, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-zinc-800/50 bg-zinc-950/30">
                  <div>
                    <div className="font-medium text-zinc-200 text-sm">{bldg.name}</div>
                    <div className="text-xs text-zinc-500">{bldg.customer}</div>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-red-500/10 border border-red-500/20 text-red-400 rounded-md w-8 h-8">
                    <span className="font-bold text-sm">{bldg.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm h-[200px] flex flex-col">
            <SectionHeading>Upcoming</SectionHeading>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {upcomingRows.map((row, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-zinc-800/50 bg-zinc-950/30">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-200 text-sm">{row.id}</span>
                      <span className="text-[10px] text-zinc-500 px-1.5 py-0.5 border border-zinc-800 rounded bg-zinc-900">{row.cat}</span>
                    </div>
                    <div className="text-xs text-zinc-400 mt-1">{row.building} • {row.date}</div>
                  </div>
                  <DarkStatusBadge status={row.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="-mx-6 border-y border-zinc-800 bg-zinc-900/80">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800">
          
          <div className="py-5 px-6 flex flex-col gap-1">
            <div className="text-zinc-500 text-xs font-medium flex items-center gap-2">
              <Activity className="w-4 h-4" /> Total Elevators
            </div>
            <div className="text-3xl font-light text-zinc-100">42</div>
          </div>
          
          <div className="py-5 px-6 flex flex-col gap-1">
            <div className="text-zinc-500 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-zinc-400" /> Due This Month
            </div>
            <div className="text-3xl font-light text-zinc-100">8</div>
          </div>

          <div className="py-5 px-6 flex flex-col gap-1">
            <div className="text-zinc-500 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" /> Overdue
            </div>
            <div className="text-3xl font-light text-red-400">3</div>
          </div>

          <div className="py-5 px-6 flex flex-col gap-1">
            <div className="text-zinc-500 text-xs font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" /> Scheduled
            </div>
            <div className="text-3xl font-light text-zinc-100">14</div>
          </div>

          <div className="py-5 px-6 flex flex-col gap-1">
            <div className="text-zinc-500 text-xs font-medium flex items-center gap-2">
              <Building className="w-4 h-4" /> Buildings
            </div>
            <div className="text-3xl font-light text-zinc-100">11</div>
          </div>

          <div className="py-5 px-6 flex flex-col gap-1">
            <div className="text-zinc-500 text-xs font-medium flex items-center gap-2">
              <Users className="w-4 h-4" /> Customers
            </div>
            <div className="text-3xl font-light text-zinc-100">6</div>
          </div>

        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm h-[320px] flex flex-col">
          <SectionHeading>Status Distribution</SectionHeading>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={statusData} margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#27272a" />
                <XAxis type="number" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} width={80} />
                <Tooltip 
                  cursor={{ fill: '#27272a', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#f4f4f5', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm h-[320px] flex flex-col">
          <SectionHeading>13-Month Forecast</SectionHeading>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecastData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis dataKey="label" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#27272a', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#f4f4f5', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#a1a1aa', paddingTop: '10px' }} />
                <Bar dataKey="due" name="Due" fill="#71717a" radius={[2, 2, 0, 0]} stackId="a" />
                <Bar dataKey="scheduled" name="Scheduled" fill="#3b82f6" radius={[2, 2, 0, 0]} stackId="b" />
                <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[2, 2, 0, 0]} stackId="c" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
