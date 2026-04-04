import React from "react";
import { 
  RefreshCw, 
  ChevronDown, 
  Download, 
  Filter, 
  AlertTriangle,
  Clock,
  CheckCircle2,
  CalendarDays
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const kpiData = [
  { label: "Not Scheduled", value: "12", color: "border-zinc-500", textColor: "text-zinc-700" },
  { label: "Scheduled", value: "8", color: "border-blue-500", textColor: "text-blue-600" },
  { label: "In Progress", value: "3", color: "border-amber-500", textColor: "text-amber-600" },
  { label: "Completed", value: "47", color: "border-green-500", textColor: "text-green-600" },
  { label: "Avg Days to Schedule", value: "2.3", color: "border-zinc-300", textColor: "text-zinc-700" },
  { label: "Avg Days to Complete", value: "5.1", color: "border-zinc-300", textColor: "text-zinc-700" },
];

const overdueData = [
  { unit: "Unit 4A", building: "Harbor Plaza", type: "CAT1", status: "NOT_STARTED", date: "Mar 12 2025", days: "23d overdue" },
  { unit: "Freight 1", building: "Meridian Tower", type: "CAT5", status: "SCHEDULED", date: "Feb 28 2025", days: "35d overdue" },
  { unit: "Main Lobby", building: "Westgate Suites", type: "CAT1", status: "IN_PROGRESS", date: "Jan 15 2025", days: "79d overdue" },
  { unit: "Unit 2B", building: "Harbor Plaza", type: "CAT1", status: "NOT_STARTED", date: "Nov 30 2024", days: "125d overdue" },
];

const upcomingData = [
  { unit: "Unit 1A", building: "Meridian Tower", type: "CAT5", status: "SCHEDULED", date: "Apr 8 2025", days: "4d away" },
  { unit: "Elevator C", building: "Westgate Suites", type: "CAT1", status: "NOT_STARTED", date: "Apr 11 2025", days: "7d away" },
  { unit: "Service Lift", building: "Harbor Plaza", type: "CAT1", status: "SCHEDULED", date: "Apr 14 2025", days: "10d away" },
];

const agingChartData = [
  { label: "Current", value: 15, color: "bg-green-500" },
  { label: "Overdue 1–30 Days", value: 25, color: "bg-amber-500" },
  { label: "Overdue 31–60 Days", value: 40, color: "bg-red-400" },
  { label: "Overdue 61–90 Days", value: 10, color: "bg-red-500" },
  { label: "Overdue 91–120 Days", value: 6, color: "bg-red-600" },
  { label: "Overdue 121+ Days", value: 4, color: "bg-red-700" },
];

const statusChartData = [
  { label: "Completed", value: 47, color: "bg-green-500" },
  { label: "In Progress", value: 3, color: "bg-amber-500" },
  { label: "Scheduled", value: 8, color: "bg-blue-500" },
  { label: "Not Scheduled", value: 12, color: "bg-zinc-500" },
];

const monthChartData = [
  { label: "Jan", value: 12, color: "bg-zinc-400" },
  { label: "Feb", value: 15, color: "bg-zinc-400" },
  { label: "Mar", value: 8, color: "bg-zinc-400" },
  { label: "Apr", value: 22, color: "bg-blue-500" },
  { label: "May", value: 30, color: "bg-zinc-300" },
  { label: "Jun", value: 18, color: "bg-zinc-300" },
];

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    NOT_STARTED: "bg-zinc-100 text-zinc-700 border-zinc-200",
    SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200",
    IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
    COMPLETED: "bg-green-50 text-green-700 border-green-200",
  };
  return (
    <Badge variant="outline" className={`font-medium text-[10px] ${styles[status]}`}>
      {status.replace("_", " ")}
    </Badge>
  );
};

const SectionDivider = ({ title }: { title: string }) => (
  <div className="flex items-center gap-4 py-2 mt-4">
    <div className="h-px bg-zinc-200 w-8"></div>
    <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest whitespace-nowrap">
      {title}
    </h2>
    <div className="h-px bg-zinc-200 flex-1"></div>
  </div>
);

const PanelHeader = ({ title, actionIcon: ActionIcon, actionText }: any) => (
  <CardHeader className="bg-zinc-800 rounded-t-xl px-5 py-3 flex flex-row items-center justify-between border-b-0 space-y-0">
    <CardTitle className="text-sm font-semibold text-white tracking-wide">{title}</CardTitle>
    {ActionIcon && (
      <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent border-white/30 text-white hover:bg-white hover:text-zinc-900 transition-colors">
        <ActionIcon className="w-3.5 h-3.5 mr-1.5" />
        {actionText}
      </Button>
    )}
  </CardHeader>
);

const HorizontalBarChart = ({ data }: { data: any[] }) => {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div className="space-y-3 pt-2">
      {data.map((item, i) => (
        <div key={i} className="flex items-center text-sm">
          <div className="w-32 flex-shrink-0 text-zinc-600 truncate pr-4 text-xs font-medium">
            {item.label}
          </div>
          <div className="flex-1 flex items-center gap-3">
            <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${item.color}`} 
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
            <div className="w-8 text-right text-xs font-semibold text-zinc-700">
              {item.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export function PolishB() {
  return (
    <div className="min-h-screen bg-zinc-50 p-8 space-y-6 font-sans">
      
      {/* Header Row */}
      <div className="flex items-center justify-between mb-8">
        <Button variant="outline" size="sm" className="text-zinc-500 border-zinc-200 hover:bg-zinc-100">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Compliance Dashboard</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="border-zinc-200 bg-white font-medium">
              All Customers
              <ChevronDown className="w-4 h-4 ml-2 text-zinc-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>All Customers</DropdownMenuItem>
            <DropdownMenuItem>Acme Corp</DropdownMenuItem>
            <DropdownMenuItem>Global Industries</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* KPI Strip */}
      <Card className="bg-white border-zinc-200 shadow-sm overflow-hidden">
        <div className="flex flex-row divide-x divide-zinc-100">
          {kpiData.map((kpi, i) => (
            <div key={i} className="flex-1 p-5 relative group transition-colors hover:bg-zinc-50/50">
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${kpi.color}`}></div>
              <div className="pl-3 flex flex-col justify-center h-full">
                <div className="text-[11px] uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">
                  {kpi.label}
                </div>
                <div className={`text-3xl font-black tracking-tight ${kpi.textColor}`}>
                  {kpi.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <SectionDivider title="Analytics" />

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-zinc-200 shadow-sm rounded-xl overflow-hidden flex flex-col">
          <PanelHeader title="All Open Inspections by Aging and Status" actionIcon={Download} actionText="Export" />
          <CardContent className="p-5 flex-1 bg-white">
            <HorizontalBarChart data={agingChartData} />
          </CardContent>
        </Card>
        
        <Card className="border-zinc-200 shadow-sm rounded-xl overflow-hidden flex flex-col">
          <PanelHeader title="2026 Inspections by Status" actionIcon={Filter} actionText="Filter" />
          <CardContent className="p-5 flex-1 bg-white">
            <HorizontalBarChart data={statusChartData} />
          </CardContent>
        </Card>

        <Card className="border-zinc-200 shadow-sm rounded-xl overflow-hidden flex flex-col">
          <PanelHeader title="2026 Inspections by Month" />
          <CardContent className="p-5 flex-1 bg-white">
            <HorizontalBarChart data={monthChartData} />
          </CardContent>
        </Card>
      </div>

      <SectionDivider title="Needs Attention" />

      {/* Tables Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Overdue Panel */}
        <Card className="border-zinc-200 border-l-4 border-l-red-500 shadow-sm rounded-xl overflow-hidden flex flex-col">
          <PanelHeader title="All Overdue Inspections" actionIcon={AlertTriangle} actionText="View All" />
          <CardContent className="p-0 bg-rose-50/50 flex-1">
            <Table>
              <TableHeader className="bg-zinc-900/5">
                <TableRow className="border-zinc-200 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-zinc-600 h-10">Unit</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-600 h-10">Type</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-600 h-10">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-600 h-10 text-right">Aging</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueData.map((row, i) => (
                  <TableRow key={i} className="border-zinc-200 hover:bg-rose-100/30">
                    <TableCell className="py-3">
                      <div className="font-semibold text-zinc-900 text-sm">{row.unit}</div>
                      <div className="text-xs text-zinc-500">{row.building}</div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="secondary" className="bg-zinc-200/50 text-zinc-700 font-medium text-[10px]">{row.type}</Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <div className="text-sm font-medium text-red-600">{row.days}</div>
                      <div className="text-[11px] text-zinc-500">{row.date}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Upcoming Panel */}
        <Card className="border-zinc-200 border-l-4 border-l-blue-500 shadow-sm rounded-xl overflow-hidden flex flex-col">
          <PanelHeader title="Upcoming — Next 14 Days" actionIcon={CalendarDays} actionText="Schedule" />
          <CardContent className="p-0 bg-sky-50/30 flex-1">
            <Table>
              <TableHeader className="bg-zinc-900/5">
                <TableRow className="border-zinc-200 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-zinc-600 h-10">Unit</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-600 h-10">Type</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-600 h-10">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-600 h-10 text-right">Timeline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingData.map((row, i) => (
                  <TableRow key={i} className="border-zinc-200 hover:bg-sky-100/30">
                    <TableCell className="py-3">
                      <div className="font-semibold text-zinc-900 text-sm">{row.unit}</div>
                      <div className="text-xs text-zinc-500">{row.building}</div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="secondary" className="bg-zinc-200/50 text-zinc-700 font-medium text-[10px]">{row.type}</Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <div className="text-sm font-medium text-blue-600">{row.days}</div>
                      <div className="text-[11px] text-zinc-500">{row.date}</div>
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
