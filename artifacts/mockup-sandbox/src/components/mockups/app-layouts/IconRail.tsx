import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  ArrowUpDown, 
  ClipboardCheck, 
  Users, 
  Building2, 
  Settings,
  Clock,
  LogOut,
  Bell,
  Search,
  MoreVertical,
  AlertTriangle,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

// Data
const chartData = [
  { name: 'Jan', completions: 8 },
  { name: 'Feb', completions: 11 },
  { name: 'Mar', completions: 6 },
  { name: 'Apr', completions: 14 },
  { name: 'May', completions: 9 },
  { name: 'Jun', completions: 16 },
];

const upcomingInspections = [
  { id: 'INS-082', elevator: 'Elevator A - Main Lobby', building: 'Nexus Tower', due: '2023-11-15', type: 'CAT 1', status: 'Scheduled' },
  { id: 'INS-083', elevator: 'Freight 1', building: 'Industrial Park West', due: '2023-11-18', type: 'CAT 5', status: 'Pending' },
  { id: 'INS-084', elevator: 'Elevator B - Guest', building: 'Grand Hotel', due: '2023-11-20', type: 'CAT 1', status: 'Overdue' },
  { id: 'INS-085', elevator: 'Service Car 2', building: 'City Hospital', due: '2023-11-25', type: 'CAT 1', status: 'Scheduled' },
];

export function IconRail() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'elevators', icon: ArrowUpDown, label: 'Elevators' },
    { id: 'inspections', icon: ClipboardCheck, label: 'Inspections' },
    { id: 'customers', icon: Users, label: 'Customers' },
    { id: 'buildings', icon: Building2, label: 'Buildings' },
  ];

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Icon Rail Sidebar */}
      <aside className="w-16 h-full bg-slate-950 flex flex-col items-center py-4 border-r border-slate-800 z-10 shrink-0">
        {/* Logo Monogram */}
        <div className="w-10 h-10 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xl mb-8 shadow-sm">
          C5
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 flex flex-col gap-3 w-full items-center">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <div key={item.id} className="relative group w-full flex justify-center">
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`relative p-3 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-slate-800 text-amber-500 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                  aria-label={item.label}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  
                  {/* Active Indicator Bar */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-500 rounded-r-full" />
                  )}
                </button>

                {/* Simulated Tooltip */}
                <div className="absolute left-14 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-slate-800 text-slate-200 text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md border border-slate-700 z-50">
                  {item.label}
                  {/* Tooltip arrow */}
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-[5px] border-transparent border-r-slate-800" />
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="flex flex-col gap-3 w-full items-center mt-auto">
          <div className="relative group w-full flex justify-center">
            <button className="p-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all duration-200">
              <Settings size={20} />
            </button>
            <div className="absolute left-14 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-slate-800 text-slate-200 text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md border border-slate-700 z-50">
              Settings
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 overflow-hidden mt-2 flex items-center justify-center cursor-pointer hover:border-slate-500 transition-colors">
            <span className="text-xs font-medium text-slate-300">JD</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div>
            <h1 className="text-xl font-semibold text-slate-800 tracking-tight">Dashboard</h1>
            <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Cat 1 & Cat 5 · Always on time</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search elevators, buildings..." 
                className="pl-9 pr-4 py-2 bg-slate-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all w-64 outline-none"
              />
            </div>
            <button className="relative p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1 */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-amber-200 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <ArrowUpDown size={20} />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">Total</span>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-1">142</h3>
                  <p className="text-sm text-slate-500 font-medium">Managed Elevators</p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-amber-200 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Calendar size={20} />
                  </div>
                  <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded-md">This Month</span>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-1">18</h3>
                  <p className="text-sm text-slate-500 font-medium">CAT1 Due</p>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-red-200 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                    <AlertTriangle size={20} />
                  </div>
                  <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-1 rounded-md">Critical</span>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-1">7</h3>
                  <p className="text-sm text-slate-500 font-medium">Overdue Inspections</p>
                </div>
              </div>

              {/* Card 4 */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-emerald-200 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 size={20} />
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md">YTD</span>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-1">94</h3>
                  <p className="text-sm text-slate-500 font-medium">Completed This Year</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Chart Section */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Completion Trends</h2>
                    <p className="text-sm text-slate-500">Monthly inspection completions (Jan - Jun)</p>
                  </div>
                  <button className="text-slate-400 hover:bg-slate-100 p-2 rounded-lg transition-colors">
                    <MoreVertical size={18} />
                  </button>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                        cursor={{ fill: '#f1f5f9' }}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar 
                        dataKey="completions" 
                        fill="#f59e0b" 
                        radius={[4, 4, 0, 0]} 
                        barSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Mini Table Section */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Upcoming</h2>
                    <p className="text-sm text-slate-500">Next 7 days</p>
                  </div>
                  <button className="text-sm font-medium text-amber-600 hover:text-amber-700">View All</button>
                </div>
                
                <div className="flex-1 flex flex-col gap-4">
                  {upcomingInspections.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                      <div className={`p-2 rounded-md shrink-0 mt-0.5 ${
                        item.status === 'Overdue' ? 'bg-red-50 text-red-600' : 
                        item.status === 'Scheduled' ? 'bg-blue-50 text-blue-600' : 
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {item.status === 'Overdue' ? <AlertTriangle size={16} /> : <Clock size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h4 className="text-sm font-semibold text-slate-900 truncate pr-2">{item.elevator}</h4>
                          <span className="text-xs font-medium text-slate-500 shrink-0">{item.due}</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{item.building}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {item.type}
                          </span>
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                            item.status === 'Overdue' ? 'bg-red-50 text-red-600' :
                            item.status === 'Scheduled' ? 'bg-blue-50 text-blue-600' :
                            'bg-amber-50 text-amber-600'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Quick Stats Footer */}
            <div className="flex items-center justify-between text-sm text-slate-500 pt-4 border-t border-slate-200">
              <div className="flex gap-6">
                <span className="flex items-center gap-2"><Users size={14} className="text-slate-400" /> 12 Active Customers</span>
                <span className="flex items-center gap-2"><Building2 size={14} className="text-slate-400" /> 34 Buildings</span>
              </div>
              <span>Data last updated: Just now</span>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
