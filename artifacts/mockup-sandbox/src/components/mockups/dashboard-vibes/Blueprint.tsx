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

const statusData = [
  { name: "NOT STARTED", value: 15, color: "#475569" },
  { name: "SCHEDULED", value: 14, color: "#38bdf8" },
  { name: "IN PROGRESS", value: 6, color: "#fb923c" },
  { name: "COMPLETED", value: 376, color: "#34d399" },
  { name: "OVERDUE", value: 3, color: "#f43f5e" },
];

const forecastData = [
  { month: "Oct", due: 12, scheduled: 8, completed: 4 },
  { month: "Nov", due: 15, scheduled: 10, completed: 0 },
  { month: "Dec", due: 8, scheduled: 5, completed: 0 },
  { month: "Jan", due: 20, scheduled: 2, completed: 0 },
  { month: "Feb", due: 14, scheduled: 0, completed: 0 },
  { month: "Mar", due: 18, scheduled: 0, completed: 0 },
  { month: "Apr", due: 22, scheduled: 0, completed: 0 },
  { month: "May", due: 10, scheduled: 0, completed: 0 },
  { month: "Jun", due: 11, scheduled: 0, completed: 0 },
  { month: "Jul", due: 9, scheduled: 0, completed: 0 },
  { month: "Aug", due: 15, scheduled: 0, completed: 0 },
  { month: "Sep", due: 13, scheduled: 0, completed: 0 },
  { month: "Oct", due: 12, scheduled: 0, completed: 0 },
];

const attentionData = [
  { unit: "ELEV-01", building: "Apex Tower", due: "Oct 15", status: "OVERDUE" },
  { unit: "ELEV-04", building: "Nexus Hub", due: "Oct 20", status: "OVERDUE" },
  { unit: "ELEV-02", building: "Meridian Plaza", due: "Oct 22", status: "OVERDUE" },
];

const riskData = [
  { building: "Apex Tower", customer: "Apex Corp", overdue: 2 },
  { building: "Nexus Hub", customer: "Nexus Logistics", overdue: 1 },
];

const upcomingData = [
  { unit: "ELEV-12", building: "Lumina Point", type: "CAT1", due: "Nov 5", status: "SCHEDULED" },
  { unit: "ELEV-14", building: "Lumina Point", type: "CAT5", due: "Nov 8", status: "NOT_STARTED" },
  { unit: "ELEV-05", building: "Horizon Center", type: "CAT1", due: "Nov 12", status: "IN_PROGRESS" },
];

const StatusBadge = ({ status }: { status: string }) => {
  let bg = "bg-slate-800";
  let text = "text-slate-300";
  let border = "border-slate-600";

  if (status === "OVERDUE") {
    bg = "bg-rose-500/10";
    text = "text-rose-400";
    border = "border-rose-500/30";
  } else if (status === "SCHEDULED") {
    bg = "bg-sky-500/10";
    text = "text-sky-400";
    border = "border-sky-500/30";
  } else if (status === "IN_PROGRESS") {
    bg = "bg-orange-500/10";
    text = "text-orange-400";
    border = "border-orange-500/30";
  } else if (status === "NOT_STARTED") {
    bg = "bg-slate-700/30";
    text = "text-slate-400";
    border = "border-slate-600/50";
  }

  return (
    <span
      className={`px-2 py-1 text-[10px] font-mono tracking-wider uppercase border rounded-none ${bg} ${text} ${border}`}
    >
      {status.replace("_", " ")}
    </span>
  );
};

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-[10px] tracking-[0.25em] text-cyan-500/60 uppercase border-l-2 border-cyan-500/40 pl-3 mb-4 font-mono">
    {children}
  </h2>
);

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-slate-900 border border-slate-700/50 rounded-none ${className}`}>
    {children}
  </div>
);

export function Blueprint() {
  return (
    <div className="min-h-screen p-6 md:p-8 space-y-8 bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30">
      {/* KPI Strip */}
      <Card className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-700">
        {[
          { label: "TOTAL ELEVATORS", value: "42" },
          { label: "DUE THIS MONTH", value: "8" },
          { label: "OVERDUE", value: "3", isAlert: true },
          { label: "SCHEDULED", value: "14" },
          { label: "TOTAL BUILDINGS", value: "11" },
          { label: "TOTAL CUSTOMERS", value: "6" },
        ].map((kpi, i) => (
          <div key={i} className="flex-1 p-6 flex flex-col justify-center items-center text-center">
            <div className="font-mono text-[10px] tracking-[0.2em] text-slate-500 uppercase mb-2">
              {kpi.label}
            </div>
            <div
              className={`font-mono text-5xl ${
                kpi.isAlert ? "text-rose-500" : "text-cyan-400"
              }`}
            >
              {kpi.value}
            </div>
          </div>
        ))}
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 h-[420px] flex flex-col">
          <SectionHeading>CURRENT STATUS DISTRIBUTION</SectionHeading>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={statusData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={10} fontFamily="monospace" />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#94a3b8"
                  fontSize={10}
                  fontFamily="monospace"
                  width={100}
                />
                <Tooltip
                  cursor={{ fill: "#1e293b" }}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "0px",
                    fontFamily: "monospace",
                    fontSize: "12px",
                    color: "#f1f5f9",
                  }}
                  itemStyle={{ color: "#22d3ee" }}
                />
                <Bar dataKey="value" barSize={20}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 h-[420px] flex flex-col">
          <SectionHeading>13-MONTH COMPLIANCE FORECAST</SectionHeading>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#94a3b8"
                  fontSize={10}
                  fontFamily="monospace"
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis stroke="#94a3b8" fontSize={10} fontFamily="monospace" tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "#1e293b" }}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "0px",
                    fontFamily: "monospace",
                    fontSize: "12px",
                    color: "#f1f5f9",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "10px", fontFamily: "monospace", paddingTop: "10px" }}
                  iconType="square"
                />
                <Bar dataKey="due" name="DUE" fill="#334155" />
                <Bar dataKey="scheduled" name="SCHEDULED" fill="#38bdf8" />
                <Bar dataKey="completed" name="COMPLETED" fill="#34d399" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 border-rose-800/50 shadow-[0_0_20px_rgba(244,63,94,0.06)]">
          <SectionHeading>REQUIRING ATTENTION</SectionHeading>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 text-cyan-500/70 text-[10px] tracking-[0.2em] uppercase font-mono">
                  <th className="pb-3 font-normal">Unit</th>
                  <th className="pb-3 font-normal">Building</th>
                  <th className="pb-3 font-normal">Due</th>
                  <th className="pb-3 font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {attentionData.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-800/60 transition-colors group">
                    <td className="py-3 font-mono text-xs text-slate-300 group-hover:text-cyan-400 transition-colors">
                      {row.unit}
                    </td>
                    <td className="py-3 text-slate-400 text-xs">{row.building}</td>
                    <td className="py-3 font-mono text-xs text-slate-400">{row.due}</td>
                    <td className="py-3">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-6">
          <SectionHeading>HIGHEST RISK BUILDINGS</SectionHeading>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 text-cyan-500/70 text-[10px] tracking-[0.2em] uppercase font-mono">
                  <th className="pb-3 font-normal">Building</th>
                  <th className="pb-3 font-normal">Customer</th>
                  <th className="pb-3 font-normal text-right">Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {riskData.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-800/60 transition-colors">
                    <td className="py-3 text-slate-300 text-xs">{row.building}</td>
                    <td className="py-3 text-slate-400 text-xs">{row.customer}</td>
                    <td className="py-3 text-right">
                      <span className="inline-block px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono text-xs">
                        {row.overdue}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-6">
          <SectionHeading>UPCOMING — NEXT 30 DAYS</SectionHeading>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 text-cyan-500/70 text-[10px] tracking-[0.2em] uppercase font-mono">
                  <th className="pb-3 font-normal">Unit</th>
                  <th className="pb-3 font-normal">Type</th>
                  <th className="pb-3 font-normal">Due</th>
                  <th className="pb-3 font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {upcomingData.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-800/60 transition-colors group">
                    <td className="py-3">
                      <div className="font-mono text-xs text-slate-300 group-hover:text-cyan-400 transition-colors">
                        {row.unit}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{row.building}</div>
                    </td>
                    <td className="py-3 font-mono text-xs text-slate-400">{row.type}</td>
                    <td className="py-3 font-mono text-xs text-slate-400">{row.due}</td>
                    <td className="py-3">
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
