import React, { useState } from "react";
import { 
  Building2, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpRight,
  ArrowRight,
  Search,
  Plus,
  Bell,
  Settings,
  MoreVertical,
  Activity
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const chartData = [
  { name: "Jan", completions: 8 },
  { name: "Feb", completions: 11 },
  { name: "Mar", completions: 6 },
  { name: "Apr", completions: 14 },
  { name: "May", completions: 9 },
  { name: "Jun", completions: 16 },
];

const recentInspections = [
  { id: "INS-2024-089", elevator: "EL-402 (Passenger)", building: "Apex Tower", type: "CAT 1", status: "Completed", date: "Today, 09:30 AM" },
  { id: "INS-2024-088", elevator: "EL-115 (Freight)", building: "Nexus Logistics", type: "CAT 5", status: "In Progress", date: "Today, 08:00 AM" },
  { id: "INS-2024-087", elevator: "EL-201 (Passenger)", building: "Oasis Heights", type: "CAT 1", status: "Overdue", date: "Yesterday" },
  { id: "INS-2024-086", elevator: "EL-202 (Passenger)", building: "Oasis Heights", type: "CAT 1", status: "Completed", date: "Oct 12, 2024" },
  { id: "INS-2024-085", elevator: "EL-305 (Service)", building: "Grand Hotel", type: "CAT 5", status: "Scheduled", date: "Tomorrow" },
];

export function KpiStrip() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const tabs = ["Dashboard", "Elevators", "Inspections", "Customers", "Buildings"];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-zinc-50 font-sans">
      {/* Zone 1: Persistent KPI Strip */}
      <header className="bg-zinc-950 text-white flex-shrink-0 relative z-20 shadow-md">
        <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3 mb-4 md:mb-0 mr-8">
            <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <Clock className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight leading-tight">Cat1Five</h1>
              <p className="text-[10px] font-medium text-amber-500/80 uppercase tracking-widest whitespace-nowrap">CAT 1 & CAT 5 · ALWAYS ON TIME</p>
            </div>
          </div>

          <div className="flex-1 flex flex-wrap items-center justify-end gap-x-8 gap-y-4">
            <div className="flex items-center gap-3 px-4 border-l border-zinc-800/50">
              <div className="p-2 rounded-md bg-zinc-900 text-zinc-400">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Total Elevators</p>
                <p className="text-2xl font-semibold text-white leading-none mt-1">142</p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 border-l border-zinc-800/50">
              <div className="p-2 rounded-md bg-red-950/50 text-red-500">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-red-400 font-medium uppercase tracking-wider">Overdue</p>
                <p className="text-2xl font-semibold text-white leading-none mt-1">7</p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 border-l border-zinc-800/50">
              <div className="p-2 rounded-md bg-amber-950/50 text-amber-500">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-amber-400 font-medium uppercase tracking-wider">Due This Month</p>
                <p className="text-2xl font-semibold text-white leading-none mt-1">18</p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 border-l border-zinc-800/50">
              <div className="p-2 rounded-md bg-emerald-950/50 text-emerald-500">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-emerald-400 font-medium uppercase tracking-wider">Completed YTD</p>
                <p className="text-2xl font-semibold text-white leading-none mt-1">94</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 px-4 border-l border-zinc-800/50">
              <div className="p-2 rounded-md bg-blue-950/50 text-blue-500">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-blue-400 font-medium uppercase tracking-wider">Active Customers</p>
                <p className="text-2xl font-semibold text-white leading-none mt-1">12</p>
              </div>
            </div>

            <div className="flex items-center gap-3 ml-4 pl-6 border-l border-zinc-800/80">
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full h-9 w-9">
                <Bell className="w-4 h-4" />
              </Button>
              <Avatar className="h-9 w-9 border border-zinc-800">
                <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026024d" />
                <AvatarFallback className="bg-zinc-800 text-xs">AD</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      {/* Zone 2: Compact Tab Bar */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-10 shadow-sm flex-shrink-0">
        <div className="px-6 flex items-center justify-between">
          <nav className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium transition-all relative outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500 ${
                  activeTab === tab 
                    ? "text-amber-600 bg-amber-50/50" 
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-t-full" />
                )}
              </button>
            ))}
          </nav>
          
          <div className="flex items-center gap-3 py-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input 
                placeholder="Search elevators, buildings..." 
                className="h-8 pl-9 w-64 bg-zinc-50 border-zinc-200 focus-visible:ring-amber-500 text-xs"
              />
            </div>
            <Button size="sm" className="h-8 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-medium">
              <Plus className="w-4 h-4 mr-1" />
              New Inspection
            </Button>
          </div>
        </div>
      </div>

      {/* Zone 3: Content */}
      <main className="flex-1 overflow-auto p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Dashboard Overview</h2>
              <p className="text-zinc-500 mt-1">Welcome back. Here's what's happening across your 34 managed buildings.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-9">
                <Settings className="w-4 h-4 mr-2" />
                Configure Views
              </Button>
            </div>
          </div>

          {/* 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Chart (Spans 2 cols) */}
            <Card className="lg:col-span-2 shadow-sm border-zinc-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-zinc-100">
                <div>
                  <CardTitle className="text-base font-semibold text-zinc-900">Inspection Completions</CardTitle>
                  <CardDescription>Monthly completed CAT1 and CAT5 inspections</CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#71717a' }} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#71717a' }} 
                      />
                      <RechartsTooltip 
                        cursor={{ fill: '#f4f4f5' }}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar 
                        dataKey="completions" 
                        radius={[4, 4, 0, 0]} 
                        barSize={40}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#f59e0b' : '#3f3f46'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Right: Quick Action Cards */}
            <div className="space-y-4 flex flex-col">
              <Card className="shadow-sm border-zinc-200 bg-gradient-to-br from-amber-500 to-amber-600 text-white border-none flex-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Action Required
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold mb-2">7</div>
                  <p className="text-amber-100 font-medium mb-6">Elevators are currently overdue for inspection.</p>
                  <Button className="w-full bg-white text-amber-600 hover:bg-amber-50 shadow-sm border-0 font-semibold">
                    View Overdue List
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-zinc-200 flex-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-zinc-900">Quick Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-between h-auto py-3 text-left font-normal border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900">
                    <span className="flex flex-col items-start gap-1">
                      <span className="font-medium">Schedule Inspections</span>
                      <span className="text-xs text-zinc-500">Assign technicians to upcoming</span>
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-zinc-400" />
                  </Button>
                  <Button variant="outline" className="w-full justify-between h-auto py-3 text-left font-normal border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900">
                    <span className="flex flex-col items-start gap-1">
                      <span className="font-medium">Generate Compliance Report</span>
                      <span className="text-xs text-zinc-500">Export PDF for building owners</span>
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-zinc-400" />
                  </Button>
                </CardContent>
              </Card>
            </div>
            
          </div>

          {/* Recent Inspections Table */}
          <Card className="shadow-sm border-zinc-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-zinc-100">
              <div>
                <CardTitle className="text-base font-semibold text-zinc-900">Recent Inspections</CardTitle>
                <CardDescription>Latest activity across all buildings</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="text-xs">
                View All
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead className="font-semibold text-zinc-900">ID</TableHead>
                    <TableHead className="font-semibold text-zinc-900">Elevator</TableHead>
                    <TableHead className="font-semibold text-zinc-900">Building</TableHead>
                    <TableHead className="font-semibold text-zinc-900">Type</TableHead>
                    <TableHead className="font-semibold text-zinc-900">Status</TableHead>
                    <TableHead className="text-right font-semibold text-zinc-900">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInspections.map((item) => (
                    <TableRow key={item.id} className="hover:bg-zinc-50/50 cursor-pointer transition-colors">
                      <TableCell className="font-medium text-zinc-900">{item.id}</TableCell>
                      <TableCell>{item.elevator}</TableCell>
                      <TableCell className="text-zinc-500">{item.building}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-zinc-100 border-zinc-200 text-zinc-800 font-medium">
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={
                            item.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-transparent' : 
                            item.status === 'Overdue' ? 'bg-red-100 text-red-700 hover:bg-red-100 border-transparent' :
                            item.status === 'In Progress' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-transparent' :
                            'bg-zinc-100 text-zinc-700 hover:bg-zinc-100 border-transparent'
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-zinc-500 whitespace-nowrap">{item.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}

export default KpiStrip;
