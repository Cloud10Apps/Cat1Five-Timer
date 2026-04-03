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
  Legend,
} from "recharts";
import { AlertTriangle, RotateCw, Calendar, CheckCircle, Circle, Clock } from "lucide-react";

const overdueData = [
  { elevator: "Elevator 3A", building: "Crane Tower", due: "Feb 15, 2025", rawStatus: "NOT_STARTED" },
  { elevator: "Unit 7", building: "Midtown Suites", due: "Mar 2, 2025", rawStatus: "SCHEDULED" },
  { elevator: "Cab B", building: "Harbor Point", due: "Jan 28, 2025", rawStatus: "IN_PROGRESS" },
];

const inProgressData = [
  { elevator: "Service Lift", building: "Oceanview Tech", due: "Apr 2, 2025", rawStatus: "IN_PROGRESS" },
  { elevator: "Unit 4", building: "Skyline Plaza", due: "Apr 5, 2025", rawStatus: "IN_PROGRESS" },
];

const scheduledData = [
  { elevator: "Unit 12", building: "Skyline Plaza", type: "CAT1", due: "Apr 8, 2025", status: "SCHEDULED" },
  { elevator: "Elevator 2", building: "Crane Tower", type: "CAT5", due: "Apr 12, 2025", status: "SCHEDULED" },
  { elevator: "Main Lift", building: "Harbor Point", type: "CAT1", due: "Apr 15, 2025", status: "SCHEDULED" },
  { elevator: "East Wing A", building: "State Capitol", type: "CAT1", due: "Apr 18, 2025", status: "SCHEDULED" },
  { elevator: "Freight 1", building: "Industrial Park", type: "CAT1", due: "Apr 20, 2025", status: "SCHEDULED" },
];

const statusChartData = [
  { name: "COMPLETED", count: 18, color: "#22c55e" },
  { name: "NOT STARTED", count: 12, color: "#a1a1aa" },
  { name: "SCHEDULED", count: 5, color: "#3b82f6" },
  { name: "OVERDUE", count: 3, color: "#ef4444" },
  { name: "IN PROGRESS", count: 2, color: "#f59e0b" },
];

const monthlyData = [
  { name: "Jan", cat1: 4, cat5: 1, overdue: 1, completed: 3 },
  { name: "Feb", cat1: 3, cat5: 0, overdue: 2, completed: 4 },
  { name: "Mar", cat1: 5, cat5: 2, overdue: 0, completed: 5 },
  { name: "Apr", cat1: 8, cat5: 1, overdue: 1, completed: 2 },
  { name: "May", cat1: 6, cat5: 0, overdue: 0, completed: 6 },
  { name: "Jun", cat1: 4, cat5: 3, overdue: 0, completed: 7 },
  { name: "Jul", cat1: 2, cat5: 1, overdue: 0, completed: 4 },
  { name: "Aug", cat1: 3, cat5: 0, overdue: 1, completed: 3 },
  { name: "Sep", cat1: 7, cat5: 2, overdue: 0, completed: 8 },
  { name: "Oct", cat1: 9, cat5: 1, overdue: 2, completed: 5 },
  { name: "Nov", cat1: 4, cat5: 0, overdue: 0, completed: 6 },
  { name: "Dec", cat1: 2, cat5: 1, overdue: 0, completed: 4 },
];

const Badge = ({ children, colorClass }: { children: React.ReactNode; colorClass: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
    {children}
  </span>
);

const Card = ({ title, subtitle, meta, badgeClass, badgeText }: any) => (
  <div className="flex-shrink-0 w-64 bg-white border border-gray-200 rounded-md p-3 shadow-sm flex flex-col justify-between">
    <div>
      <div className="flex justify-between items-start mb-1">
        <h4 className="font-semibold text-gray-900 text-sm truncate pr-2">{title}</h4>
        <Badge colorClass={badgeClass}>{badgeText}</Badge>
      </div>
      <p className="text-xs text-gray-500 truncate">{subtitle}</p>
    </div>
    <div className="mt-3 flex items-center text-xs text-gray-500">
      <Clock className="w-3 h-3 mr-1" />
      Due: {meta}
    </div>
  </div>
);

export function SwimLanes() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Compliance Operations</h1>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
              <span className="font-medium text-gray-700">37 total inspections</span>
              <span>&middot;</span>
              <span className="font-medium text-red-600">3 overdue</span>
              <span>&middot;</span>
              <span>Avg 3.2d to schedule</span>
            </p>
          </div>
          <div className="flex gap-2 text-sm">
            <div className="bg-gray-100 px-3 py-1.5 rounded-md flex flex-col">
              <span className="text-gray-500 text-xs uppercase tracking-wider">Avg to Complete</span>
              <span className="font-semibold">7.5 days</span>
            </div>
            <div className="bg-gray-100 px-3 py-1.5 rounded-md flex flex-col">
              <span className="text-gray-500 text-xs uppercase tracking-wider">Avg to Schedule</span>
              <span className="font-semibold">3.2 days</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-6 px-6 space-y-6">
        
        {/* OVERDUE LANE */}
        <section className="bg-red-50/50 border border-red-200 rounded-lg overflow-hidden flex flex-col shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 bg-red-100/50 border-l-8 border-red-500">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="font-bold text-red-700 text-sm tracking-wide">OVERDUE <span className="opacity-75 font-medium ml-1">(3 units)</span></h2>
          </div>
          <div className="p-4 flex overflow-x-auto gap-4 pb-5">
            {overdueData.map((item, i) => (
              <Card 
                key={i} 
                title={item.elevator} 
                subtitle={item.building} 
                meta={item.due} 
                badgeClass="bg-gray-100 text-gray-600 border border-gray-200"
                badgeText={item.rawStatus.replace('_', ' ')}
              />
            ))}
          </div>
        </section>

        {/* IN PROGRESS LANE */}
        <section className="bg-amber-50/30 border border-amber-200 rounded-lg overflow-hidden flex flex-col shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 bg-amber-100/30 border-l-8 border-amber-500">
            <RotateCw className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-amber-700 text-sm tracking-wide">IN PROGRESS <span className="opacity-75 font-medium ml-1">(2 units)</span></h2>
          </div>
          <div className="p-4 flex overflow-x-auto gap-4 pb-5">
            {inProgressData.map((item, i) => (
              <Card 
                key={i} 
                title={item.elevator} 
                subtitle={item.building} 
                meta={item.due} 
                badgeClass="bg-amber-100 text-amber-700 border border-amber-200"
                badgeText="IN PROGRESS"
              />
            ))}
          </div>
        </section>

        {/* SCHEDULED LANE */}
        <section className="bg-blue-50/30 border border-blue-200 rounded-lg overflow-hidden flex flex-col shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 bg-blue-100/30 border-l-8 border-blue-500">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-blue-700 text-sm tracking-wide">SCHEDULED <span className="opacity-75 font-medium ml-1">(5 units)</span></h2>
          </div>
          <div className="p-4 flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex overflow-x-auto gap-4 pb-2 w-full lg:w-1/2">
              {scheduledData.map((item, i) => (
                <Card 
                  key={i} 
                  title={item.elevator} 
                  subtitle={`${item.building} · ${item.type}`} 
                  meta={item.due} 
                  badgeClass="bg-blue-100 text-blue-700 border border-blue-200"
                  badgeText="SCHEDULED"
                />
              ))}
            </div>
            <div className="w-full lg:w-1/2 bg-white rounded border border-gray-200 p-3 h-[220px]">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Monthly Compliance Forecast</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="completed" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="cat1" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="cat5" stackId="a" fill="#8b5cf6" />
                  <Bar dataKey="overdue" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* COMPLETED LANE */}
        <section className="bg-green-50/30 border border-green-200 rounded-lg overflow-hidden flex flex-col shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 bg-green-100/30 border-l-8 border-green-500">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h2 className="font-bold text-green-700 text-sm tracking-wide">COMPLETED <span className="opacity-75 font-medium ml-1">(18 units)</span></h2>
          </div>
          <div className="p-4 flex flex-col md:flex-row gap-6 items-center">
            <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm flex gap-8 items-center flex-1 w-full">
              <div>
                <p className="text-3xl font-bold text-green-600">18</p>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Completed this year</p>
              </div>
              <div className="w-px h-12 bg-gray-200"></div>
              <div>
                <p className="text-3xl font-bold text-gray-700">7.5<span className="text-lg text-gray-400 font-normal">d</span></p>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Avg days to complete</p>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm flex-1 w-full flex flex-col justify-center h-[90px]">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-gray-700">Overall Completion Rate</span>
                <span className="font-bold text-green-600">48%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200">
                <div className="bg-green-500 h-3 rounded-full" style={{ width: '48%' }}></div>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-right">18 of 37 total units</p>
            </div>
          </div>
        </section>

        {/* NOT STARTED LANE */}
        <section className="bg-zinc-50 border border-zinc-200 rounded-lg overflow-hidden flex flex-col shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 bg-zinc-100/80 border-l-8 border-zinc-400">
            <Circle className="w-5 h-5 text-zinc-600" />
            <h2 className="font-bold text-zinc-700 text-sm tracking-wide">NOT STARTED <span className="opacity-75 font-medium ml-1">(12 units)</span></h2>
          </div>
          <div className="p-4 flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-1/2 bg-white rounded border border-gray-200 p-4">
               <h4 className="text-sm font-semibold text-gray-700 mb-1">Awaiting Action</h4>
               <p className="text-xs text-gray-500 mb-4">These units require scheduling or immediate attention to begin the compliance process.</p>
               <div className="grid grid-cols-2 gap-3">
                 <div className="bg-zinc-50 rounded p-3 border border-zinc-100">
                   <p className="text-2xl font-bold text-zinc-700">12</p>
                   <p className="text-xs text-zinc-500">Total Unscheduled</p>
                 </div>
                 <div className="bg-red-50 rounded p-3 border border-red-100">
                   <p className="text-2xl font-bold text-red-600">3</p>
                   <p className="text-xs text-red-500">Past Due Action</p>
                 </div>
               </div>
            </div>
            
            <div className="w-full lg:w-1/2 bg-white rounded border border-gray-200 p-3 h-[200px]">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Portfolio Status Distribution</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#4b5563', fontWeight: 500 }} width={80} />
                  <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
