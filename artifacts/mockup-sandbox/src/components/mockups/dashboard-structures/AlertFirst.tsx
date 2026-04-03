import React from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Legend } from "recharts"
import { AlertCircle, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, CircleDashed, CalendarClock, Activity } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

const STATUS_COLORS = {
  COMPLETED: "#22c55e",
  OVERDUE: "#ef4444",
  IN_PROGRESS: "#f59e0b",
  SCHEDULED: "#3b82f6",
  NOT_STARTED: "#d4d4d8"
}

const OVERDUE_DATA = [
  { elevator: "Elevator 3A", building: "Crane Tower", due: "Feb 15, 2025", status: "NOT_STARTED" },
  { elevator: "Unit 7", building: "Midtown Suites", due: "Mar 2, 2025", status: "SCHEDULED" },
  { elevator: "Cab B", building: "Harbor Point", due: "Jan 28, 2025", status: "IN_PROGRESS" }
]

const UPCOMING_DATA = [
  { elevator: "Unit 12", building: "Skyline Plaza", type: "CAT1", due: "Apr 8, 2025", status: "SCHEDULED" },
  { elevator: "Elevator 2", building: "Crane Tower", type: "CAT5", due: "Apr 12, 2025", status: "NOT_STARTED" },
  { elevator: "Main Lift", building: "Harbor Point", type: "CAT1", due: "Apr 15, 2025", status: "SCHEDULED" }
]

const STATUS_CHART_DATA = [
  { name: "COMPLETED", count: 18, fill: STATUS_COLORS.COMPLETED },
  { name: "SCHEDULED", count: 5, fill: STATUS_COLORS.SCHEDULED },
  { name: "IN_PROGRESS", count: 2, fill: STATUS_COLORS.IN_PROGRESS },
  { name: "NOT_STARTED", count: 12, fill: STATUS_COLORS.NOT_STARTED },
  { name: "OVERDUE", count: 3, fill: STATUS_COLORS.OVERDUE }
]

const MONTHLY_DATA = [
  { month: "Jan", "Not Started": 2, "Scheduled": 5, "In Progress": 1, "Completed": 10 },
  { month: "Feb", "Not Started": 3, "Scheduled": 4, "In Progress": 2, "Completed": 12 },
  { month: "Mar", "Not Started": 1, "Scheduled": 6, "In Progress": 3, "Completed": 15 },
  { month: "Apr", "Not Started": 4, "Scheduled": 8, "In Progress": 2, "Completed": 9 },
  { month: "May", "Not Started": 5, "Scheduled": 10, "In Progress": 4, "Completed": 8 },
  { month: "Jun", "Not Started": 2, "Scheduled": 5, "In Progress": 1, "Completed": 18 },
  { month: "Jul", "Not Started": 1, "Scheduled": 3, "In Progress": 1, "Completed": 20 },
  { month: "Aug", "Not Started": 3, "Scheduled": 5, "In Progress": 2, "Completed": 15 },
  { month: "Sep", "Not Started": 6, "Scheduled": 12, "In Progress": 5, "Completed": 10 },
  { month: "Oct", "Not Started": 8, "Scheduled": 15, "In Progress": 4, "Completed": 8 },
  { month: "Nov", "Not Started": 4, "Scheduled": 8, "In Progress": 2, "Completed": 14 },
  { month: "Dec", "Not Started": 2, "Scheduled": 4, "In Progress": 1, "Completed": 18 },
]

export function AlertFirst() {
  return (
    <div className="min-h-screen bg-zinc-50 p-6 space-y-6 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Compliance Operations</h1>
            <p className="text-sm text-zinc-500">Real-time overview of your portfolio</p>
          </div>
        </div>

        {/* HERO: Overdue Inspections */}
        <Card className="border-l-8 border-l-red-500 border-red-100 shadow-sm overflow-hidden bg-white">
          <div className="bg-red-50/50 px-6 py-4 border-b border-red-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 text-red-600 rounded-md">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-red-900 tracking-tight">ACTION REQUIRED: OVERDUE INSPECTIONS</h2>
                <p className="text-sm text-red-700/80 font-medium">3 units have passed their compliance date and risk violation.</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-red-600 tracking-tighter">03</div>
              <div className="text-xs font-semibold text-red-700 uppercase tracking-wider">Total Overdue</div>
            </div>
          </div>
          <div className="p-0">
            <Table>
              <TableHeader className="bg-zinc-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-zinc-600 h-10 px-6">Unit</TableHead>
                  <TableHead className="font-semibold text-zinc-600 h-10">Building</TableHead>
                  <TableHead className="font-semibold text-zinc-600 h-10">Due Date</TableHead>
                  <TableHead className="font-semibold text-zinc-600 h-10 text-right pr-6">Current Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {OVERDUE_DATA.map((row, i) => (
                  <TableRow key={i} className="hover:bg-red-50/30 transition-colors">
                    <TableCell className="font-bold text-zinc-900 text-base py-4 px-6">{row.elevator}</TableCell>
                    <TableCell className="text-zinc-600 font-medium">{row.building}</TableCell>
                    <TableCell className="text-red-600 font-bold">{row.due}</TableCell>
                    <TableCell className="text-right pr-6">
                      <Badge variant="outline" className={`
                        font-bold uppercase tracking-wider text-xs px-2.5 py-1
                        ${row.status === 'NOT_STARTED' ? 'bg-zinc-100 text-zinc-700 border-zinc-200' : ''}
                        ${row.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                        ${row.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                      `}>
                        {row.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* COMPACT KPI BAR */}
        <div className="flex flex-col lg:flex-row items-center justify-between bg-white border border-zinc-200 rounded-xl shadow-sm p-2 gap-4">
          <div className="flex items-center divide-x divide-zinc-200 flex-1 w-full overflow-x-auto">
            <div className="px-6 py-2 flex items-center gap-4 flex-shrink-0">
              <CircleDashed className="w-8 h-8 text-zinc-300" />
              <div>
                <div className="text-2xl font-bold text-zinc-900 tracking-tight">12</div>
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Not Started</div>
              </div>
            </div>
            <div className="px-6 py-2 flex items-center gap-4 flex-shrink-0">
              <CalendarClock className="w-8 h-8 text-blue-400" />
              <div>
                <div className="text-2xl font-bold text-zinc-900 tracking-tight">5</div>
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Scheduled</div>
              </div>
            </div>
            <div className="px-6 py-2 flex items-center gap-4 flex-shrink-0">
              <Activity className="w-8 h-8 text-amber-400" />
              <div>
                <div className="text-2xl font-bold text-zinc-900 tracking-tight">2</div>
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">In Progress</div>
              </div>
            </div>
            <div className="px-6 py-2 flex items-center gap-4 flex-shrink-0">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-zinc-900 tracking-tight">18</div>
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Completed</div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 px-4 flex-shrink-0">
            <Badge variant="secondary" className="bg-red-50 text-red-700 hover:bg-red-50 py-1.5 px-3 border border-red-100 flex items-center gap-1.5 font-medium text-xs">
              <Clock className="w-3.5 h-3.5" />
              <span>Avg 3.2d to schedule</span>
              <ArrowUpRight className="w-3 h-3 text-red-500" />
            </Badge>
            <Badge variant="secondary" className="bg-red-50 text-red-700 hover:bg-red-50 py-1.5 px-3 border border-red-100 flex items-center gap-1.5 font-medium text-xs">
              <Clock className="w-3.5 h-3.5" />
              <span>Avg 7.5d to complete</span>
              <ArrowUpRight className="w-3 h-3 text-red-500" />
            </Badge>
          </div>
        </div>

        {/* MIDDLE ROW: 3 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Status Distribution (1/3) */}
          <Card className="col-span-1 shadow-sm border-zinc-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Status Distribution</CardTitle>
              <CardDescription>Current snapshot of all active units</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={STATUS_CHART_DATA} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e4e4e7" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#52525b', fontWeight: 600 }} width={80} />
                  <Tooltip 
                    cursor={{fill: '#f4f4f5'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                    {STATUS_CHART_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Upcoming Inspections (2/3) */}
          <Card className="col-span-1 lg:col-span-2 shadow-sm border-zinc-200 flex flex-col">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Upcoming & Scheduled</CardTitle>
                  <CardDescription>Next 14 days</CardDescription>
                </div>
                <div className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  12 total pending
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-4">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-zinc-100">
                    <TableHead className="font-semibold text-zinc-500 h-9">Unit / Building</TableHead>
                    <TableHead className="font-semibold text-zinc-500 h-9">Type</TableHead>
                    <TableHead className="font-semibold text-zinc-500 h-9">Due Date</TableHead>
                    <TableHead className="font-semibold text-zinc-500 h-9 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {UPCOMING_DATA.map((row, i) => (
                    <TableRow key={i} className="border-zinc-100">
                      <TableCell>
                        <div className="font-semibold text-zinc-900">{row.elevator}</div>
                        <div className="text-xs text-zinc-500">{row.building}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px] bg-zinc-50 text-zinc-600 border-zinc-200">
                          {row.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-zinc-700">{row.due}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={`
                          font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5
                          ${row.status === 'NOT_STARTED' ? 'bg-zinc-100 text-zinc-600 border-zinc-200' : ''}
                          ${row.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                        `}>
                          {row.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* BOTTOM: Monthly Forecast */}
        <Card className="shadow-sm border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold">12-Month Compliance Forecast</CardTitle>
            <CardDescription>Projected workload based on renewal dates</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                <Tooltip 
                  cursor={{fill: '#f4f4f5'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Bar dataKey="Completed" stackId="a" fill={STATUS_COLORS.COMPLETED} radius={[0, 0, 4, 4]} />
                <Bar dataKey="In Progress" stackId="a" fill={STATUS_COLORS.IN_PROGRESS} />
                <Bar dataKey="Scheduled" stackId="a" fill={STATUS_COLORS.SCHEDULED} />
                <Bar dataKey="Not Started" stackId="a" fill={STATUS_COLORS.NOT_STARTED} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
