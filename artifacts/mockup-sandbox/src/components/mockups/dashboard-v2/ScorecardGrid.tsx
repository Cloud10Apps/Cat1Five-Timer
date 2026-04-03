import React from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// --- STUB DATA ---

const KPIs = [
  { name: "Total Elevators", value: "142", color: "border-zinc-950" },
  { name: "Due This Month", value: "18", color: "border-zinc-950" },
  { name: "Overdue", value: "3", color: "border-red-500", textClass: "text-red-500" },
  { name: "Scheduled", value: "24", color: "border-zinc-950" },
  { name: "Total Buildings", value: "45", color: "border-zinc-950" },
  { name: "Total Customers", value: "12", color: "border-zinc-950" },
];

const REQUIRING_ATTENTION = [
  { id: 1, elevator: "EL-104", building: "Empire State", due: "2023-10-15", status: "OVERDUE" },
  { id: 2, elevator: "EL-201", building: "Chrysler Bldg", due: "2023-10-20", status: "OVERDUE" },
  { id: 3, elevator: "EL-405", building: "One World Trade", due: "2023-10-25", status: "OVERDUE" },
  { id: 4, elevator: "EL-112", building: "Empire State", due: "2023-11-01", status: "IN_PROGRESS" },
  { id: 5, elevator: "EL-304", building: "Flatiron Bldg", due: "2023-11-05", status: "IN_PROGRESS" },
];

const STATUS_DATA = [
  { name: "Not Started", value: 45, color: "#a1a1aa" }, // zinc-400
  { name: "Scheduled", value: 24, color: "#3b82f6" }, // blue-500
  { name: "In Progress", value: 12, color: "#f59e0b" }, // amber-500
  { name: "Completed", value: 58, color: "#22c55e" }, // green-500
  { name: "Overdue", value: 3, color: "#ef4444" }, // red-500
];

const RISK_BUILDINGS = [
  { id: 1, name: "Empire State", customer: "Vornado", overdue: 2 },
  { id: 2, name: "Chrysler Bldg", customer: "Tishman", overdue: 1 },
  { id: 3, name: "One World Trade", customer: "Durst", overdue: 0 },
];

const UPCOMING = [
  { id: 1, elevator: "EL-501", building: "MetLife", type: "CAT1", due: "2023-11-10", status: "SCHEDULED" },
  { id: 2, elevator: "EL-502", building: "MetLife", type: "CAT1", due: "2023-11-10", status: "SCHEDULED" },
  { id: 3, elevator: "EL-601", building: "Woolworth", type: "CAT5", due: "2023-11-15", status: "NOT_STARTED" },
  { id: 4, elevator: "EL-602", building: "Woolworth", type: "CAT5", due: "2023-11-15", status: "NOT_STARTED" },
  { id: 5, elevator: "EL-701", building: "Seagram", type: "CAT1", due: "2023-11-20", status: "SCHEDULED" },
];

const FORECAST_DATA = [
  { month: "Sep", due: 10, scheduled: 10, completed: 10 },
  { month: "Oct", due: 15, scheduled: 12, completed: 12 },
  { month: "Nov", due: 20, scheduled: 15, completed: 5 },
  { month: "Dec", due: 25, scheduled: 10, completed: 0 },
  { month: "Jan", due: 18, scheduled: 5, completed: 0 },
  { month: "Feb", due: 22, scheduled: 0, completed: 0 },
  { month: "Mar", due: 15, scheduled: 0, completed: 0 },
  { month: "Apr", due: 30, scheduled: 0, completed: 0 },
  { month: "May", due: 28, scheduled: 0, completed: 0 },
  { month: "Jun", due: 20, scheduled: 0, completed: 0 },
  { month: "Jul", due: 15, scheduled: 0, completed: 0 },
  { month: "Aug", due: 12, scheduled: 0, completed: 0 },
  { month: "Sep", due: 10, scheduled: 0, completed: 0 },
];

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    NOT_STARTED: "bg-zinc-100 text-zinc-600 border-zinc-200",
    SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200",
    IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
    COMPLETED: "bg-green-50 text-green-700 border-green-200",
    OVERDUE: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <Badge variant="outline" className={`${styles[status]} font-medium text-[10px] tracking-wider uppercase`}>
      {status.replace("_", " ")}
    </Badge>
  );
};

export function ScorecardGrid() {
  const hasOverdue = KPIs.find((k) => k.name === "Overdue")?.value !== "0";

  return (
    <div className="min-h-screen bg-zinc-50 p-8 font-sans text-zinc-950 space-y-8">
      
      {/* HEADER BANNER */}
      <div className="flex items-stretch gap-0 shadow-sm rounded-sm overflow-hidden">
        <div className="bg-zinc-950 px-3 py-2 flex items-center">
          <img src="/__mockup/images/logo.svg" alt="Cat1Five Timer" className="h-12" />
        </div>
        <div className={`flex-1 border-l-8 p-6 flex items-center gap-4 ${hasOverdue ? "bg-red-50 border-red-500" : "bg-green-50 border-green-500"}`}>
          {hasOverdue ? <AlertCircle className="w-8 h-8 text-red-500" /> : <CheckCircle2 className="w-8 h-8 text-green-500" />}
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${hasOverdue ? "text-red-700" : "text-green-700"}`}>
              {hasOverdue ? "3 OVERDUE INSPECTIONS" : "ALL SYSTEMS GO"}
            </h1>
            <p className={hasOverdue ? "text-red-600/80 font-medium" : "text-green-600/80 font-medium"}>
              Immediate action required on critical elevators.
            </p>
          </div>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {KPIs.map((kpi, i) => (
          <Card key={i} className={`rounded-none border-t-0 border-l-0 border-r-0 border-b-4 shadow-sm bg-white ${kpi.color}`}>
            <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">{kpi.name}</p>
              <p className={`text-5xl font-black tracking-tighter ${kpi.textClass || "text-zinc-950"}`}>
                {kpi.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3 COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COL 1: ATTENTION */}
        <Card className="rounded-none shadow-sm border-zinc-200 bg-white col-span-1">
          <CardHeader className="border-b border-zinc-100 pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-zinc-950">
              Requiring Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 h-10">Elevator</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 h-10">Bldg</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 h-10">Due</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 h-10 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {REQUIRING_ATTENTION.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-semibold text-zinc-900">{row.elevator}</TableCell>
                    <TableCell className="text-zinc-600 truncate max-w-[100px]">{row.building}</TableCell>
                    <TableCell className="text-zinc-500 text-xs">{row.due}</TableCell>
                    <TableCell className="text-right"><StatusBadge status={row.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* COL 2: STATUS & RISK */}
        <div className="flex flex-col gap-8 col-span-1">
          <Card className="rounded-none shadow-sm border-zinc-200 bg-white">
            <CardHeader className="border-b border-zinc-100 pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-zinc-950">
                Inspections by Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-8 h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={STATUS_DATA} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                  <Tooltip 
                    cursor={{fill: '#f4f4f5'}}
                    contentStyle={{ borderRadius: '0px', border: '1px solid #e4e4e7', boxShadow: 'none', fontSize: '12px' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {STATUS_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-none shadow-sm border-zinc-200 bg-white flex-1">
            <CardHeader className="border-b border-zinc-100 pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-zinc-950">
                Highest Risk Buildings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 h-10">Building</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 h-10">Customer</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 h-10 text-right">Overdue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RISK_BUILDINGS.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-semibold text-zinc-900">{row.name}</TableCell>
                      <TableCell className="text-zinc-600 text-xs">{row.customer}</TableCell>
                      <TableCell className="text-right">
                        {row.overdue > 0 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                            {row.overdue}
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-xs">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* COL 3: UPCOMING */}
        <Card className="rounded-none shadow-sm border-zinc-200 bg-white col-span-1">
          <CardHeader className="border-b border-zinc-100 pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-zinc-950">
              Upcoming (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 h-10">Elevator</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 h-10">Type</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 h-10">Due</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 h-10 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {UPCOMING.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-semibold text-zinc-900">{row.elevator}</div>
                      <div className="text-xs text-zinc-500">{row.building}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] bg-zinc-100 border-zinc-200 text-zinc-600 rounded-none">
                        {row.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-500 text-xs">{row.due}</TableCell>
                    <TableCell className="text-right"><StatusBadge status={row.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>

      {/* FULL WIDTH BOTTOM: FORECAST */}
      <Card className="rounded-none shadow-sm border-zinc-200 bg-white">
        <CardHeader className="border-b border-zinc-100 pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-zinc-950">
            13-Month Forecast
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-8 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={FORECAST_DATA} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
              <Tooltip 
                cursor={{fill: '#f4f4f5'}}
                contentStyle={{ borderRadius: '0px', border: '1px solid #e4e4e7', boxShadow: 'none', fontSize: '12px' }}
              />
              <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[2, 2, 0, 0]} />
              <Bar dataKey="scheduled" name="Scheduled" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              <Bar dataKey="due" name="Due" fill="#18181b" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

    </div>
  );
}
