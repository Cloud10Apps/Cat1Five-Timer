import React from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  CartesianGrid, 
  Legend 
} from "recharts";
import { AlertCircle, Calendar, Clock, CheckCircle2, TrendingUp, TrendingDown, ArrowRight, Info } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Badge } from "../../ui/badge";

// Sample Data
const kpis = { 
  notStarted: 12, 
  scheduled: 5, 
  inProgress: 2, 
  completed: 18, 
  avgDaysToSchedule: 3.2, 
  avgDaysToComplete: 7.5 
};

const overdueInspections = [
  { elevator: "Elevator 3A", building: "Crane Tower", due: "Feb 15, 2025", status: "NOT_STARTED" },
  { elevator: "Unit 7", building: "Midtown Suites", due: "Mar 2, 2025", status: "SCHEDULED" },
  { elevator: "Cab B", building: "Harbor Point", due: "Jan 28, 2025", status: "IN_PROGRESS" }
];

const upcomingInspections = [
  { elevator: "Unit 12", building: "Skyline Plaza", type: "CAT1", due: "Apr 8, 2025", status: "SCHEDULED" },
  { elevator: "Elevator 2", building: "Crane Tower", type: "CAT5", due: "Apr 12, 2025", status: "NOT_STARTED" },
  { elevator: "Main Lift", building: "Harbor Point", type: "CAT1", due: "Apr 15, 2025", status: "SCHEDULED" }
];

const statusChartData = [
  { name: "COMPLETED", count: 18, color: "#22c55e" },
  { name: "SCHEDULED", count: 5, color: "#3b82f6" },
  { name: "IN PROGRESS", count: 2, color: "#f59e0b" },
  { name: "NOT STARTED", count: 12, color: "#d4d4d8" },
  { name: "OVERDUE", count: 3, color: "#ef4444" }
];

const monthlyData = [
  { name: 'Jan', 'Not Started': 4, 'Scheduled': 2, 'In Progress': 1, 'Completed': 10 },
  { name: 'Feb', 'Not Started': 3, 'Scheduled': 4, 'In Progress': 2, 'Completed': 12 },
  { name: 'Mar', 'Not Started': 6, 'Scheduled': 3, 'In Progress': 3, 'Completed': 15 },
  { name: 'Apr', 'Not Started': 12, 'Scheduled': 5, 'In Progress': 2, 'Completed': 18 },
  { name: 'May', 'Not Started': 15, 'Scheduled': 8, 'In Progress': 4, 'Completed': 8 },
  { name: 'Jun', 'Not Started': 8, 'Scheduled': 12, 'In Progress': 6, 'Completed': 14 },
  { name: 'Jul', 'Not Started': 5, 'Scheduled': 15, 'In Progress': 8, 'Completed': 20 },
  { name: 'Aug', 'Not Started': 4, 'Scheduled': 10, 'In Progress': 5, 'Completed': 25 },
  { name: 'Sep', 'Not Started': 10, 'Scheduled': 6, 'In Progress': 4, 'Completed': 18 },
  { name: 'Oct', 'Not Started': 18, 'Scheduled': 4, 'In Progress': 2, 'Completed': 12 },
  { name: 'Nov', 'Not Started': 14, 'Scheduled': 3, 'In Progress': 1, 'Completed': 10 },
  { name: 'Dec', 'Not Started': 8, 'Scheduled': 2, 'In Progress': 1, 'Completed': 15 },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "COMPLETED": return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>;
    case "OVERDUE": return <Badge variant="destructive">Overdue</Badge>;
    case "IN_PROGRESS": return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">In Progress</Badge>;
    case "SCHEDULED": return <Badge className="bg-blue-500 hover:bg-blue-600">Scheduled</Badge>;
    case "NOT_STARTED": return <Badge variant="outline" className="text-zinc-500 border-zinc-300">Not Started</Badge>;
    default: return <Badge variant="secondary">{status}</Badge>;
  }
};

export function CommandColumn() {
  return (
    <div className="flex flex-row min-h-screen bg-zinc-50 font-sans text-zinc-900">
      {/* Left Sidebar - KPIs */}
      <div className="w-[220px] bg-zinc-900 text-zinc-100 flex-shrink-0 sticky top-0 h-screen overflow-y-auto flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-zinc-400" />
            Cat1Five
          </h1>
          <p className="text-xs text-zinc-400 mt-1 uppercase tracking-wider font-semibold">Command Center</p>
        </div>
        
        <div className="flex-1 flex flex-col">
          <div className="p-6 border-b border-zinc-800/50 flex-1 flex flex-col justify-center">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">Not Started</h3>
            <div className="text-4xl font-light text-zinc-300">{kpis.notStarted}</div>
          </div>
          <div className="p-6 border-b border-zinc-800/50 flex-1 flex flex-col justify-center">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">Scheduled</h3>
            <div className="text-4xl font-light text-blue-400">{kpis.scheduled}</div>
          </div>
          <div className="p-6 border-b border-zinc-800/50 flex-1 flex flex-col justify-center">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">In Progress</h3>
            <div className="text-4xl font-light text-amber-400">{kpis.inProgress}</div>
          </div>
          <div className="p-6 border-b border-zinc-800/50 flex-1 flex flex-col justify-center">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">Completed</h3>
            <div className="text-4xl font-light text-green-400">{kpis.completed}</div>
          </div>
          <div className="p-6 border-b border-zinc-800/50 flex-1 flex flex-col justify-center">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">Avg Days to Schedule</h3>
            <div className="text-4xl font-light text-red-400 flex items-center gap-2">
              {kpis.avgDaysToSchedule}
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">Avg Days to Complete</h3>
            <div className="text-4xl font-light text-red-400 flex items-center gap-2">
              {kpis.avgDaysToComplete}
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Portfolio Overview</h2>
              <p className="text-zinc-500 mt-1">Real-time compliance status and forecast across all properties.</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-white text-zinc-600 font-medium py-1.5 px-3 border-zinc-200">
                <Calendar className="w-4 h-4 mr-2" />
                2025 Cycle
              </Badge>
            </div>
          </div>

          {/* Top Row: Charts (45% / 55%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Status Distribution Chart (Left, ~45%) */}
            <Card className="lg:col-span-5 shadow-sm border-zinc-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-zinc-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-zinc-400" />
                  Current Status Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={statusChartData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#3f3f46', fontSize: 11, fontWeight: 500}} width={90} />
                      <Tooltip 
                        cursor={{fill: '#f4f4f5'}}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Forecast (Right, ~55%) */}
            <Card className="lg:col-span-7 shadow-sm border-zinc-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-zinc-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-zinc-400" />
                  Monthly Compliance Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyData}
                      margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="Not Started" stackId="a" fill="#d4d4d8" radius={[0, 0, 4, 4]} />
                      <Bar dataKey="Scheduled" stackId="a" fill="#3b82f6" />
                      <Bar dataKey="In Progress" stackId="a" fill="#f59e0b" />
                      <Bar dataKey="Completed" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row: Tables (45% / 55%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Overdue Table (Left, ~45%) */}
            <Card className="lg:col-span-5 shadow-sm border-red-200 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
              <CardHeader className="pb-3 border-b border-red-100 bg-red-50/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium text-red-900 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    Critical Overdue
                  </CardTitle>
                  <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 border-none">Action Required</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-red-50/30">
                    <TableRow className="border-red-100 hover:bg-transparent">
                      <TableHead className="text-red-900/70 font-medium h-10 text-xs">Unit</TableHead>
                      <TableHead className="text-red-900/70 font-medium h-10 text-xs">Building</TableHead>
                      <TableHead className="text-red-900/70 font-medium h-10 text-xs">Due Date</TableHead>
                      <TableHead className="text-red-900/70 font-medium h-10 text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdueInspections.map((row, i) => (
                      <TableRow key={i} className="border-red-100/50 hover:bg-red-50/30 transition-colors">
                        <TableCell className="font-medium text-zinc-900 py-3">{row.elevator}</TableCell>
                        <TableCell className="text-zinc-600 py-3">{row.building}</TableCell>
                        <TableCell className="text-red-600 font-medium py-3">{row.due}</TableCell>
                        <TableCell className="py-3">{getStatusBadge(row.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Upcoming Table (Right, ~55%) */}
            <Card className="lg:col-span-7 shadow-sm border-zinc-200">
              <CardHeader className="pb-3 border-b border-zinc-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium text-zinc-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-zinc-400" />
                    Upcoming (Next 14 Days)
                  </CardTitle>
                  <button className="text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1">
                    View all <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-zinc-50/50">
                    <TableRow className="border-zinc-100 hover:bg-transparent">
                      <TableHead className="text-zinc-500 font-medium h-10 text-xs">Unit & Building</TableHead>
                      <TableHead className="text-zinc-500 font-medium h-10 text-xs">Type</TableHead>
                      <TableHead className="text-zinc-500 font-medium h-10 text-xs">Due Date</TableHead>
                      <TableHead className="text-zinc-500 font-medium h-10 text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingInspections.map((row, i) => (
                      <TableRow key={i} className="border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                        <TableCell className="py-3">
                          <div className="font-medium text-zinc-900">{row.elevator}</div>
                          <div className="text-xs text-zinc-500">{row.building}</div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className="text-zinc-600 font-medium bg-zinc-50 border-zinc-200">{row.type}</Badge>
                        </TableCell>
                        <TableCell className="text-zinc-700 py-3">{row.due}</TableCell>
                        <TableCell className="py-3">{getStatusBadge(row.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
