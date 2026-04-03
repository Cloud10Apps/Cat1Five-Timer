import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { Badge } from "../../ui/badge";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import { AlertCircle, CheckCircle2, Building2, Users, Calendar, AlertOctagon } from "lucide-react";

// Stub Data
const FORECAST_DATA = [
  { month: "Jan", due: 15, scheduled: 12, completed: 15 },
  { month: "Feb", due: 18, scheduled: 18, completed: 16 },
  { month: "Mar", due: 22, scheduled: 10, completed: 0 },
  { month: "Apr", due: 25, scheduled: 5, completed: 0 },
  { month: "May", due: 10, scheduled: 2, completed: 0 },
  { month: "Jun", due: 30, scheduled: 0, completed: 0 },
  { month: "Jul", due: 12, scheduled: 0, completed: 0 },
  { month: "Aug", due: 14, scheduled: 0, completed: 0 },
  { month: "Sep", due: 28, scheduled: 0, completed: 0 },
  { month: "Oct", due: 20, scheduled: 0, completed: 0 },
  { month: "Nov", due: 15, scheduled: 0, completed: 0 },
  { month: "Dec", due: 10, scheduled: 0, completed: 0 },
  { month: "Jan '25", due: 22, scheduled: 0, completed: 0 },
];

const KPI_STATS = {
  totalElevators: 142,
  dueThisMonth: 22,
  overdue: 3,
  scheduled: 10,
  totalBuildings: 45,
  totalCustomers: 18,
};

const ATTENTION_INSPECTIONS = [
  { id: 1, elevator: "EL-01", building: "Empire State", dueDate: "2023-11-15", status: "OVERDUE" },
  { id: 2, elevator: "EL-05", building: "Chrysler Bldg", dueDate: "2023-12-01", status: "OVERDUE" },
  { id: 3, elevator: "EL-12", building: "One World Trade", dueDate: "2024-01-10", status: "OVERDUE" },
  { id: 4, elevator: "EL-02", building: "Empire State", dueDate: "2024-02-15", status: "NOT_STARTED" },
];

const UPCOMING_INSPECTIONS = [
  { id: 101, elevator: "EL-20", building: "Willis Tower", type: "CAT1", dueDate: "2024-03-20", status: "SCHEDULED" },
  { id: 102, elevator: "EL-21", building: "Willis Tower", type: "CAT5", dueDate: "2024-03-22", status: "SCHEDULED" },
  { id: 103, elevator: "EL-08", building: "Tribune Tower", type: "CAT1", dueDate: "2024-03-25", status: "NOT_STARTED" },
  { id: 104, elevator: "EL-09", building: "Tribune Tower", type: "CAT1", dueDate: "2024-03-28", status: "NOT_STARTED" },
  { id: 105, elevator: "EL-15", building: "John Hancock", type: "CAT5", dueDate: "2024-04-02", status: "SCHEDULED" },
];

const STATUS_DATA = [
  { name: "NOT_STARTED", count: 45, color: "#9ca3af" }, // gray-400
  { name: "SCHEDULED", count: 28, color: "#3b82f6" },   // blue-500
  { name: "IN_PROGRESS", count: 12, color: "#f59e0b" },   // amber-500
  { name: "COMPLETED", count: 54, color: "#22c55e" },     // green-500
  { name: "OVERDUE", count: 3, color: "#ef4444" },        // red-500
];

const RISK_BUILDINGS = [
  { id: 1, building: "Empire State", customer: "ESRT", overdue: 2 },
  { id: 2, building: "Chrysler Bldg", customer: "Tishman", overdue: 1 },
  { id: 3, building: "One World Trade", customer: "Durst", overdue: 1 },
  { id: 4, building: "Woolworth", customer: "Witkoff", overdue: 0 },
];

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    OVERDUE: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    NOT_STARTED: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
    SCHEDULED: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    IN_PROGRESS: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    COMPLETED: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  };

  return (
    <Badge variant="outline" className={`font-medium ${styles[status]}`}>
      {status.replace("_", " ")}
    </Badge>
  );
};

export function TimelineFirst() {
  const hasOverdue = KPI_STATS.overdue > 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 font-sans text-zinc-950 dark:text-zinc-50 space-y-8">
      {/* Header & Status Alert */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Timeline Overview</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Cat1/Cat5 Elevator Compliance</p>
        </div>
        
        {hasOverdue ? (
          <Alert variant="destructive" className="w-full md:w-auto bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="mb-0 font-bold">{KPI_STATS.overdue} Overdue</AlertTitle>
          </Alert>
        ) : (
          <Alert className="w-full md:w-auto bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900 text-green-800 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
            <AlertTitle className="mb-0 font-bold">All Systems Go</AlertTitle>
          </Alert>
        )}
      </div>

      {/* Hero: Monthly Forecast */}
      <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <CardHeader className="bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <CardTitle className="text-lg font-bold">Monthly Forecast (13 Months)</CardTitle>
          <CardDescription>Projected inspection workload and completion status</CardDescription>
        </CardHeader>
        <CardContent className="p-6 bg-white dark:bg-zinc-900">
          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={FORECAST_DATA} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f4f4f5' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="completed" name="Completed" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} />
                <Bar dataKey="scheduled" name="Scheduled" stackId="a" fill="#3b82f6" />
                <Bar dataKey="due" name="Due" stackId="a" fill="#09090b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>

        {/* Inline KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-y md:divide-y-0 divide-zinc-100 dark:divide-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 border-t border-zinc-200 dark:border-zinc-800">
          <div className="p-4 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <Building2 className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Total Elevators</span>
            </div>
            <span className="text-2xl font-bold">{KPI_STATS.totalElevators}</span>
          </div>
          <div className="p-4 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Due This Month</span>
            </div>
            <span className="text-2xl font-bold">{KPI_STATS.dueThisMonth}</span>
          </div>
          <div className="p-4 flex flex-col justify-center bg-red-50/30 dark:bg-red-950/10">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
              <AlertOctagon className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Overdue</span>
            </div>
            <span className="text-2xl font-bold text-red-600 dark:text-red-400">{KPI_STATS.overdue}</span>
          </div>
          <div className="p-4 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Scheduled</span>
            </div>
            <span className="text-2xl font-bold">{KPI_STATS.scheduled}</span>
          </div>
          <div className="p-4 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <Building2 className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Total Buildings</span>
            </div>
            <span className="text-2xl font-bold">{KPI_STATS.totalBuildings}</span>
          </div>
          <div className="p-4 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Customers</span>
            </div>
            <span className="text-2xl font-bold">{KPI_STATS.totalCustomers}</span>
          </div>
        </div>
      </Card>

      {/* 2-Column Section: Attention & Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col h-full">
          <CardHeader className="bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-amber-500" />
              Requiring Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 bg-white dark:bg-zinc-900">
            <Table>
              <TableHeader className="bg-zinc-50/50 dark:bg-zinc-950/50">
                <TableRow>
                  <TableHead className="font-semibold text-zinc-900 dark:text-zinc-100">Elevator</TableHead>
                  <TableHead className="font-semibold text-zinc-900 dark:text-zinc-100">Building</TableHead>
                  <TableHead className="font-semibold text-zinc-900 dark:text-zinc-100">Due Date</TableHead>
                  <TableHead className="font-semibold text-zinc-900 dark:text-zinc-100 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ATTENTION_INSPECTIONS.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.elevator}</TableCell>
                    <TableCell className="text-zinc-500">{row.building}</TableCell>
                    <TableCell>{row.dueDate}</TableCell>
                    <TableCell className="text-right">
                      <StatusBadge status={row.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col h-full">
          <CardHeader className="bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-zinc-400" />
              Upcoming (Next 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 bg-white dark:bg-zinc-900">
            <Table>
              <TableHeader className="bg-zinc-50/50 dark:bg-zinc-950/50">
                <TableRow>
                  <TableHead className="font-semibold text-zinc-900 dark:text-zinc-100">Elevator</TableHead>
                  <TableHead className="font-semibold text-zinc-900 dark:text-zinc-100">Type</TableHead>
                  <TableHead className="font-semibold text-zinc-900 dark:text-zinc-100">Due Date</TableHead>
                  <TableHead className="font-semibold text-zinc-900 dark:text-zinc-100 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {UPCOMING_INSPECTIONS.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.elevator}</div>
                      <div className="text-xs text-zinc-500">{row.building}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                        {row.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.dueDate}</TableCell>
                    <TableCell className="text-right">
                      <StatusBadge status={row.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Status Chart & Risk Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm lg:col-span-1 h-full">
          <CardHeader className="bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
            <CardTitle className="text-lg font-bold">Current Status</CardTitle>
          </CardHeader>
          <CardContent className="p-6 bg-white dark:bg-zinc-900 flex items-center justify-center">
            <div className="w-full h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={STATUS_DATA} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} width={90} 
                         tickFormatter={(val) => val.replace("_", " ")} />
                  <Tooltip 
                    cursor={{ fill: '#f4f4f5' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                    {STATUS_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm lg:col-span-2 h-full">
          <CardHeader className="bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-zinc-400" />
              Highest Risk Buildings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 bg-white dark:bg-zinc-900">
            <Table>
              <TableHeader className="bg-zinc-50/50 dark:bg-zinc-950/50">
                <TableRow>
                  <TableHead className="font-semibold text-zinc-900 dark:text-zinc-100">Building</TableHead>
                  <TableHead className="font-semibold text-zinc-900 dark:text-zinc-100">Customer</TableHead>
                  <TableHead className="font-semibold text-zinc-900 dark:text-zinc-100 text-right">Overdue Inspections</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RISK_BUILDINGS.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.building}</TableCell>
                    <TableCell className="text-zinc-500">{row.customer}</TableCell>
                    <TableCell className="text-right">
                      {row.overdue > 0 ? (
                        <Badge variant="destructive" className="bg-red-500 hover:bg-red-600">
                          {row.overdue} Overdue
                        </Badge>
                      ) : (
                        <span className="text-zinc-400 text-sm">Clear</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
