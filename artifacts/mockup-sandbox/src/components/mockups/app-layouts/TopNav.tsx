import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Bell, Search, Settings, Building2, Users, AlertTriangle, CheckCircle2, Clock, Menu } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const data = [
  { name: "Jan", completions: 8 },
  { name: "Feb", completions: 11 },
  { name: "Mar", completions: 6 },
  { name: "Apr", completions: 14 },
  { name: "May", completions: 9 },
  { name: "Jun", completions: 16 },
];

export function TopNav() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 h-14 flex items-center px-4 md:px-6 sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-2 mr-8">
          <div className="w-8 h-8 rounded-md bg-amber-500 flex items-center justify-center text-white shadow-sm">
            <Clock className="w-5 h-5" />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="font-bold text-slate-900 leading-none text-sm tracking-tight">Cat1Five Timer</span>
            <span className="text-[10px] text-slate-500 font-medium tracking-wider uppercase mt-0.5">Always on time</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-2 h-full">
          {[
            { name: "Dashboard", active: true },
            { name: "Elevators", active: false },
            { name: "Inspections", active: false },
            { name: "Customers", active: false },
            { name: "Buildings", active: false },
          ].map((item) => (
            <a
              key={item.name}
              href="#"
              className={`h-full flex items-center px-3 text-sm font-medium transition-colors border-b-2 ${
                item.active 
                  ? "border-blue-600 text-blue-600" 
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {item.name}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="relative hidden lg:flex items-center">
            <Search className="w-4 h-4 absolute left-2.5 text-slate-400" />
            <Input 
              type="search" 
              placeholder="Search..." 
              className="w-48 xl:w-64 h-9 pl-9 bg-slate-50 border-slate-200 focus-visible:ring-blue-500 rounded-full" 
            />
          </div>
          
          <Button variant="ghost" size="icon" className="text-slate-500 h-9 w-9 rounded-full">
            <Bell className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-slate-500 md:hidden h-9 w-9">
            <Menu className="w-4 h-4" />
          </Button>
          
          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>
          
          <Avatar className="w-8 h-8 border border-slate-200 cursor-pointer shadow-sm">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">Overview of compliance and upcoming inspections.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" className="bg-white shadow-sm h-9">Export</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-9">New Inspection</Button>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-600">Total Elevators</CardTitle>
              <Building2 className="w-4 h-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">142</div>
              <p className="text-xs text-slate-500 mt-1">Across 34 buildings</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-600">CAT1 Due This Month</CardTitle>
              <Clock className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">18</div>
              <p className="text-xs text-amber-600 mt-1 font-medium flex items-center gap-1">
                Upcoming deadlines
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-600">Overdue</CardTitle>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">7</div>
              <p className="text-xs text-red-600/80 mt-1 font-medium">Action required immediately</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-600">Completed This Year</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">94</div>
              <p className="text-xs text-emerald-600 mt-1 font-medium flex items-center gap-1">
                On track for compliance
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts & Secondary Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="shadow-sm border-slate-200 lg:col-span-2 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-900">Monthly Completions</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="completions" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">System Overview</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Active Customers
                  </span>
                  <span className="font-medium text-slate-900">12</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[60%] rounded-full"></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Managed Buildings
                  </span>
                  <span className="font-medium text-slate-900">34</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 w-[80%] rounded-full"></div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <h4 className="text-sm font-medium text-slate-900 mb-4">Recent Activity</h4>
                <div className="space-y-4">
                  {[
                    { id: 1, text: "Inspection completed at Empire State Bldg", time: "2 hours ago" },
                    { id: 2, text: "New elevator added to Grand Central", time: "5 hours ago" },
                    { id: 3, text: "CAT1 certificate generated for 1WTC", time: "Yesterday" },
                  ].map((activity) => (
                    <div key={activity.id} className="flex gap-3 items-start">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                      <div>
                        <p className="text-sm text-slate-700 leading-tight">{activity.text}</p>
                        <span className="text-xs text-slate-400 block mt-1">{activity.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
