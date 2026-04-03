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

// --- STUB DATA ---

const kpiData = [
  { label: "TOTAL ELEVATORS", value: "42" },
  { label: "DUE THIS MONTH", value: "8" },
  { label: "OVERDUE", value: "3", isWarning: true },
  { label: "SCHEDULED", value: "14" },
  { label: "TOTAL BUILDINGS", value: "11" },
  { label: "TOTAL CUSTOMERS", value: "6" },
];

const statusChartData = [
  { name: "NOT STARTED", value: 15, color: "#57534e" },
  { name: "SCHEDULED", value: 14, color: "#60a5fa" },
  { name: "IN PROGRESS", value: 6, color: "#f59e0b" },
  { name: "COMPLETED", value: 376, color: "#4ade80" },
  { name: "OVERDUE", value: 3, color: "#ef4444" },
];

const forecastData = Array.from({ length: 13 }).map((_, i) => {
  const date = new Date();
  date.setMonth(date.getMonth() + i);
  const month = date.toLocaleString("default", { month: "short" });
  return {
    month,
    due: Math.floor(Math.random() * 10) + 5,
    scheduled: Math.floor(Math.random() * 8) + 2,
    completed: i === 0 ? Math.floor(Math.random() * 5) : 0,
  };
});

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

// --- COMPONENTS ---

const StatusBadge = ({ status }: { status: string }) => {
  let bg = "bg-stone-800";
  let text = "text-stone-300";

  switch (status) {
    case "OVERDUE":
      bg = "bg-red-500/10";
      text = "text-red-400";
      break;
    case "SCHEDULED":
      bg = "bg-blue-500/10";
      text = "text-blue-400";
      break;
    case "IN_PROGRESS":
      bg = "bg-amber-500/10";
      text = "text-amber-400";
      break;
    case "NOT_STARTED":
      bg = "bg-stone-500/10";
      text = "text-stone-400";
      break;
  }

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium tracking-wide uppercase ${bg} ${text}`}>
      {status.replace("_", " ")}
    </span>
  );
};

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-medium text-xs text-stone-400 uppercase tracking-widest border-l-2 border-amber-500/50 pl-2 mb-4">
    {children}
  </h2>
);

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-stone-900 border border-stone-700/40 rounded-xl p-5 ${className}`}>
    {children}
  </div>
);

// --- MAIN EXPORT ---

export function Dusk() {
  return (
    <div className="min-h-screen bg-stone-950 p-6 md:p-8 space-y-8 font-sans text-stone-100 selection:bg-amber-500/30">
      
      {/* 1. KPI STRIP */}
      <div className="bg-stone-900/60 border-t-2 border-amber-500/20 border-x border-b border-stone-700/40 rounded-xl overflow-hidden shadow-lg">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-y lg:divide-y-0 lg:divide-x divide-stone-700/60">
          {kpiData.map((kpi, idx) => (
            <div key={idx} className="p-6 flex flex-col justify-center items-center text-center group">
              <span className="text-stone-500 text-[10px] tracking-[0.15em] uppercase font-medium mb-3 group-hover:text-stone-400 transition-colors">
                {kpi.label}
              </span>
              <span 
                className={`text-5xl font-light tracking-tight ${
                  kpi.isWarning ? "text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]" : "text-amber-400"
                }`}
              >
                {kpi.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <SectionHeading>Current Status Distribution</SectionHeading>
          <div className="h-[320px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData} layout="vertical" margin={{ top: 0, right: 20, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#292524" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#a8a29e", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: "#a8a29e", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#292524', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #44403c', borderRadius: '8px', color: '#f5f5f4' }}
                  itemStyle={{ fontSize: '12px' }}
                  labelStyle={{ fontSize: '11px', color: '#a8a29e', marginBottom: '4px' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 13-Month Compliance Forecast */}
        <Card>
          <SectionHeading>13-Month Compliance Forecast</SectionHeading>
          <div className="h-[320px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecastData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#a8a29e", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#a8a29e", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#292524', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #44403c', borderRadius: '8px', color: '#f5f5f4' }}
                  itemStyle={{ fontSize: '12px' }}
                  labelStyle={{ fontSize: '11px', color: '#a8a29e', marginBottom: '4px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#a8a29e', paddingTop: '10px' }} />
                <Bar dataKey="due" name="Due" stackId="a" fill="#44403c" radius={[0, 0, 4, 4]} barSize={16} />
                <Bar dataKey="scheduled" name="Scheduled" stackId="a" fill="#60a5fa" />
                <Bar dataKey="completed" name="Completed" stackId="a" fill="#4ade80" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* 3. TABLES GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Requiring Attention */}
        <Card className="border-red-900/40 shadow-[0_0_20px_rgba(239,68,68,0.05)]">
          <SectionHeading>Requiring Attention</SectionHeading>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-stone-500 text-[10px] tracking-widest uppercase border-b border-stone-800">
                  <th className="pb-3 font-medium">Unit</th>
                  <th className="pb-3 font-medium">Building</th>
                  <th className="pb-3 font-medium">Due</th>
                  <th className="pb-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/50">
                {attentionData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-stone-800/50 transition-colors group">
                    <td className="py-3 font-medium text-stone-200">{row.unit}</td>
                    <td className="py-3 text-stone-400">{row.building}</td>
                    <td className="py-3 text-red-400 font-medium">{row.due}</td>
                    <td className="py-3 text-right">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Highest Risk Buildings */}
        <Card>
          <SectionHeading>Highest Risk Buildings</SectionHeading>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-stone-500 text-[10px] tracking-widest uppercase border-b border-stone-800">
                  <th className="pb-3 font-medium">Building</th>
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium text-right">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/50">
                {riskData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-stone-800/50 transition-colors">
                    <td className="py-3 font-medium text-stone-200">{row.building}</td>
                    <td className="py-3 text-stone-400">{row.customer}</td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-medium">
                        {row.overdueCount} overdue
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Upcoming */}
        <Card>
          <SectionHeading>Upcoming — Next 30 Days</SectionHeading>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-stone-500 text-[10px] tracking-widest uppercase border-b border-stone-800">
                  <th className="pb-3 font-medium">Unit / Building</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Due</th>
                  <th className="pb-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/50">
                {upcomingData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-stone-800/50 transition-colors">
                    <td className="py-3">
                      <div className="font-medium text-stone-200">{row.unit}</div>
                      <div className="text-xs text-stone-500 mt-0.5">{row.building}</div>
                    </td>
                    <td className="py-3 text-stone-400 text-xs">{row.type}</td>
                    <td className="py-3 text-stone-300">{row.due}</td>
                    <td className="py-3 text-right">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </div>
  );
}
