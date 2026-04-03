import React from "react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Legend 
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, Calendar, CheckCircle2, MoreHorizontal, ArrowRight, Building2, Layers } from "lucide-react";

// Mock Data
const kpis = [
  { label: "Not Started", value: 12, color: "text-zinc-500", icon: MoreHorizontal },
  { label: "Scheduled", value: 5, color: "text-blue-500", icon: Calendar },
  { label: "In Progress", value: 2, color: "text-amber-500", icon: Clock },
  { label: "Completed", value: 18, color: "text-green-500", icon: CheckCircle2 },
  { label: "Avg Days to Schedule", value: "3.2", color: "text-zinc-900", icon: ArrowRight },
  { label: "Avg Days to Complete", value: "7.5", color: "text-zinc-900", icon: ArrowRight },
];

const overdueInspections = [
  { elevator: "Elevator 3A", building: "Crane Tower", due: "Feb 15, 2025", rawStatus: "NOT_STARTED" },
  { elevator: "Unit 7", building: "Midtown Suites", due: "Mar 2, 2025", rawStatus: "SCHEDULED" },
  { elevator: "Cab B", building: "Harbor Point", due: "Jan 28, 2025", rawStatus: "IN_PROGRESS" }
];

const upcomingInspections = [
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

const monthlyForecast = [
  { month: "Jan", completed: 15, scheduled: 5, inProgress: 2, notStarted: 3 },
  { month: "Feb", completed: 12, scheduled: 8, inProgress: 4, notStarted: 5 },
  { month: "Mar", completed: 18, scheduled: 10, inProgress: 3, notStarted: 8 },
  { month: "Apr", completed: 22, scheduled: 15, inProgress: 6, notStarted: 12 },
  { month: "May", completed: 25, scheduled: 20, inProgress: 8, notStarted: 15 },
  { month: "Jun", completed: 30, scheduled: 25, inProgress: 10, notStarted: 18 },
  { month: "Jul", completed: 28, scheduled: 22, inProgress: 9, notStarted: 16 },
  { month: "Aug", completed: 35, scheduled: 28, inProgress: 12, notStarted: 20 },
  { month: "Sep", completed: 40, scheduled: 32, inProgress: 15, notStarted: 25 },
  { month: "Oct", completed: 38, scheduled: 30, inProgress: 14, notStarted: 22 },
  { month: "Nov", completed: 45, scheduled: 35, inProgress: 18, notStarted: 28 },
  { month: "Dec", completed: 50, scheduled: 40, inProgress: 20, notStarted: 30 },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "COMPLETED": return "bg-green-100 text-green-800 border-green-200";
    case "OVERDUE": return "bg-red-100 text-red-800 border-red-200";
    case "IN_PROGRESS": return "bg-amber-100 text-amber-800 border-amber-200";
    case "SCHEDULED": return "bg-blue-100 text-blue-800 border-blue-200";
    case "NOT_STARTED": return "bg-zinc-100 text-zinc-800 border-zinc-200";
    default: return "bg-zinc-100 text-zinc-800 border-zinc-200";
  }
};

const formatStatus = (status: string) => status.replace("_", " ");

export function TwoPanel() {
  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-zinc-50 font-sans text-zinc-900">
      
      {/* LEFT PANEL */}
      <div className="flex-1 flex flex-col overflow-y-auto border-r border-zinc-200 bg-zinc-50">
        <div className="p-6 pb-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
              <p className="text-sm text-zinc-500">Cat1Five Timer Operations</p>
            </div>
            <Badge variant="outline" className="bg-white">2025</Badge>
          </div>

          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">Key Metrics</h2>
        </div>

        {/* 6 KPI Metrics in 2x3 Grid */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-2 gap-4">
            {kpis.map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <Card key={i} className="bg-white border-zinc-200 shadow-sm rounded-xl overflow-hidden">
                  <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-zinc-500">{kpi.label}</span>
                      <Icon className={`w-4 h-4 ${kpi.color} opacity-75`} />
                    </div>
                    <div className="text-3xl font-semibold tracking-tight mt-1">{kpi.value}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Overdue Inspections */}
        <div className="px-6 pb-8 flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              Overdue Alerts
            </h2>
            <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-100 border-none">
              3 Requires Action
            </Badge>
          </div>

          <div className="space-y-3">
            {overdueInspections.map((item, i) => (
              <div 
                key={i} 
                className="bg-white rounded-lg p-4 shadow-sm border border-zinc-200 border-l-4 border-l-red-500 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-zinc-900">{item.elevator}</h3>
                    <p className="text-sm text-zinc-500 flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5" />
                      {item.building}
                    </p>
                  </div>
                  <Badge variant="outline" className={getStatusColor(item.rawStatus)}>
                    {formatStatus(item.rawStatus)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-100">
                  <Badge variant="destructive" className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-sm">
                    Due: {item.due}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-white">
        
        {/* Status Distribution Chart */}
        <div className="p-6 border-b border-zinc-100">
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-tight">Status Distribution</h2>
            <p className="text-sm text-zinc-500">Current state of all inspections</p>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={statusDistribution}
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f4f4f5" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} width={90} />
                <Tooltip 
                  cursor={{fill: '#f4f4f5'}}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Compliance Forecast */}
        <div className="p-6 border-b border-zinc-100">
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-tight">12-Month Forecast</h2>
            <p className="text-sm text-zinc-500">Projected volume by status</p>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyForecast}
                margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="completed" name="Completed" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} />
                <Bar dataKey="scheduled" name="Scheduled" stackId="a" fill="#3b82f6" />
                <Bar dataKey="inProgress" name="In Progress" stackId="a" fill="#f59e0b" />
                <Bar dataKey="notStarted" name="Not Started" stackId="a" fill="#d4d4d8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Inspections List */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Upcoming Inspections</h2>
              <p className="text-sm text-zinc-500">Next 14 days</p>
            </div>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-700">View All</button>
          </div>

          <div className="space-y-1 rounded-lg border border-zinc-200 bg-zinc-50/50 overflow-hidden">
            {upcomingInspections.map((item, i) => (
              <div 
                key={i} 
                className="flex items-center justify-between p-3.5 bg-white border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded bg-zinc-100 flex items-center justify-center flex-shrink-0 text-zinc-500">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 text-sm">{item.elevator}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{item.building}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-right">
                  <div className="hidden sm:block">
                    <Badge variant="outline" className="text-xs bg-zinc-50 text-zinc-600 border-zinc-200">
                      {item.type}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{item.due}</p>
                    <p className="text-xs mt-0.5">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusColor(item.status)}`}>
                        {formatStatus(item.status)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
