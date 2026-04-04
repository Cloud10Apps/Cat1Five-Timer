import React from "react";
import { RefreshCcw, ChevronDown, Download, AlertCircle, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function PolishA() {
  return (
    <div className="min-h-screen bg-zinc-50 p-8 space-y-6 font-sans">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" className="text-zinc-500 gap-2">
          <RefreshCcw className="w-4 h-4" />
          Refresh
        </Button>
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Compliance Dashboard</h1>
        <Button variant="outline" size="sm" className="gap-2">
          All Customers
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        </Button>
      </div>

      {/* KPI Strip */}
      <Card className="rounded-xl shadow-sm border-zinc-200 overflow-hidden bg-white">
        <div className="grid grid-cols-6 divide-x divide-zinc-200">
          <div className="p-6 pb-5 text-center border-b-[3px] border-b-zinc-400 bg-white flex flex-col items-center justify-center space-y-2">
            <span className="text-xs font-medium text-zinc-600 uppercase tracking-wide">Not Scheduled</span>
            <span className="text-5xl font-black text-zinc-900 tracking-tighter">12</span>
          </div>
          <div className="p-6 pb-5 text-center border-b-[3px] border-b-blue-500 bg-white flex flex-col items-center justify-center space-y-2">
            <span className="text-xs font-medium text-zinc-600 uppercase tracking-wide">Scheduled</span>
            <span className="text-5xl font-black text-blue-600 tracking-tighter">8</span>
          </div>
          <div className="p-6 pb-5 text-center border-b-[3px] border-b-amber-500 bg-white flex flex-col items-center justify-center space-y-2">
            <span className="text-xs font-medium text-zinc-600 uppercase tracking-wide">In Progress</span>
            <span className="text-5xl font-black text-amber-500 tracking-tighter">3</span>
          </div>
          <div className="p-6 pb-5 text-center border-b-[3px] border-b-green-500 bg-white flex flex-col items-center justify-center space-y-2">
            <span className="text-xs font-medium text-zinc-600 uppercase tracking-wide">Completed</span>
            <span className="text-5xl font-black text-green-600 tracking-tighter">47</span>
          </div>
          <div className="p-6 pb-5 text-center border-b-[3px] border-b-zinc-300 bg-white flex flex-col items-center justify-center space-y-2">
            <span className="text-xs font-medium text-zinc-600 uppercase tracking-wide">Avg Days to Schedule</span>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-red-500 tracking-tighter">2.3</span>
              <span className="text-sm text-green-600 font-medium flex items-center"><ArrowDownRight className="w-4 h-4 mr-0.5"/>12%</span>
            </div>
          </div>
          <div className="p-6 pb-5 text-center border-b-[3px] border-b-zinc-300 bg-white flex flex-col items-center justify-center space-y-2">
            <span className="text-xs font-medium text-zinc-600 uppercase tracking-wide">Avg Days to Complete</span>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-green-500 tracking-tighter">5.1</span>
              <span className="text-sm text-red-600 font-medium flex items-center"><ArrowUpRight className="w-4 h-4 mr-0.5"/>4%</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Section Divider */}
      <div className="pt-2 pb-1">
        <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">INSPECTION ANALYTICS</h2>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-6">
        <Card className="shadow-sm border-zinc-200 overflow-hidden">
          <CardHeader className="bg-zinc-50/80 border-b border-zinc-200 px-5 py-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold text-zinc-800">All Open by Aging & Status</CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-600 -mr-2">
              <Download className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-zinc-500">
                <span>&lt; 30 Days</span>
                <span>8</span>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-2.5 flex overflow-hidden">
                <div className="bg-blue-500 h-full" style={{ width: '40%' }}></div>
                <div className="bg-amber-500 h-full" style={{ width: '20%' }}></div>
                <div className="bg-zinc-400 h-full" style={{ width: '40%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-zinc-500">
                <span>30-60 Days</span>
                <span>12</span>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-2.5 flex overflow-hidden">
                <div className="bg-blue-500 h-full" style={{ width: '30%' }}></div>
                <div className="bg-amber-500 h-full" style={{ width: '10%' }}></div>
                <div className="bg-zinc-400 h-full" style={{ width: '60%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-zinc-500">
                <span>60-90 Days</span>
                <span>3</span>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-2.5 flex overflow-hidden">
                <div className="bg-amber-500 h-full" style={{ width: '40%' }}></div>
                <div className="bg-zinc-400 h-full" style={{ width: '60%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-zinc-500">
                <span>90+ Days</span>
                <span>4</span>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-2.5 flex overflow-hidden">
                <div className="bg-red-500 h-full" style={{ width: '100%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-zinc-200 overflow-hidden">
          <CardHeader className="bg-zinc-50/80 border-b border-zinc-200 px-5 py-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold text-zinc-800">2026 Inspections by Status</CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-600 -mr-2">
              <Download className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-zinc-500">
                <span>Completed</span>
                <span>47 (67%)</span>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-2.5">
                <div className="bg-green-500 h-full rounded-full" style={{ width: '67%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-zinc-500">
                <span>Not Scheduled</span>
                <span>12 (17%)</span>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-2.5">
                <div className="bg-zinc-400 h-full rounded-full" style={{ width: '17%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-zinc-500">
                <span>Scheduled</span>
                <span>8 (11%)</span>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-2.5">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: '11%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-zinc-500">
                <span>In Progress</span>
                <span>3 (5%)</span>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-2.5">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: '5%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-zinc-200 overflow-hidden">
          <CardHeader className="bg-zinc-50/80 border-b border-zinc-200 px-5 py-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold text-zinc-800">2026 Inspections by Month</CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-600 -mr-2">
              <Download className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-5 h-[200px] flex items-end gap-[3px]">
            {[20, 35, 45, 30, 15, 10, 25, 40, 50, 60, 45, 30].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end items-center group cursor-pointer h-full">
                <div 
                  className="w-full bg-blue-100 group-hover:bg-blue-200 rounded-t-sm transition-colors relative" 
                  style={{ height: `${val}%` }}
                >
                  <div className="absolute inset-x-0 bottom-0 bg-blue-500 rounded-t-sm" style={{ height: `${val * 0.4}%` }}></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Section Divider */}
      <div className="pt-2 pb-1">
        <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">ACTION REQUIRED</h2>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="shadow-sm border-zinc-200 overflow-hidden">
          <CardHeader className="bg-zinc-50/80 border-b border-zinc-200 px-5 py-3 flex flex-row items-center justify-between space-y-0 border-t-[3px] border-t-red-500">
            <CardTitle className="text-sm font-bold text-zinc-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              All Overdue Inspections
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-600 -mr-2">
              <Download className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="bg-red-50/40 p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b-zinc-200/60 hover:bg-transparent">
                  <TableHead className="text-zinc-700 font-bold text-xs h-10 px-5">ELEVATOR / BUILDING</TableHead>
                  <TableHead className="text-zinc-700 font-bold text-xs h-10">TYPE</TableHead>
                  <TableHead className="text-zinc-700 font-bold text-xs h-10">STATUS</TableHead>
                  <TableHead className="text-zinc-700 font-bold text-xs h-10">DUE DATE</TableHead>
                  <TableHead className="text-zinc-700 font-bold text-xs h-10 text-right px-5">AGING</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-b-zinc-200/60 hover:bg-red-50/80 transition-colors">
                  <TableCell className="px-5 py-3">
                    <div className="font-semibold text-sm text-zinc-900">Unit 4A</div>
                    <div className="text-xs text-zinc-500">Harbor Plaza</div>
                  </TableCell>
                  <TableCell className="py-3"><Badge variant="outline" className="text-[10px] font-mono uppercase bg-white/60 border-zinc-200 text-zinc-600">CAT1</Badge></TableCell>
                  <TableCell className="py-3"><Badge variant="secondary" className="bg-zinc-100 text-zinc-600 hover:bg-zinc-100 border border-zinc-200 uppercase text-[10px]">NOT STARTED</Badge></TableCell>
                  <TableCell className="text-sm text-zinc-700 font-medium py-3">Mar 12, 2025</TableCell>
                  <TableCell className="text-right px-5 py-3">
                    <span className="inline-flex items-center text-xs font-bold text-red-700 bg-red-100/80 border border-red-200/50 px-2 py-0.5 rounded">
                      23d overdue
                    </span>
                  </TableCell>
                </TableRow>
                <TableRow className="border-b-zinc-200/60 hover:bg-red-50/80 transition-colors">
                  <TableCell className="px-5 py-3">
                    <div className="font-semibold text-sm text-zinc-900">Freight 1</div>
                    <div className="text-xs text-zinc-500">Meridian Tower</div>
                  </TableCell>
                  <TableCell className="py-3"><Badge variant="outline" className="text-[10px] font-mono uppercase bg-white/60 border-zinc-200 text-zinc-600">CAT5</Badge></TableCell>
                  <TableCell className="py-3"><Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border border-blue-200 shadow-none uppercase text-[10px]">SCHEDULED</Badge></TableCell>
                  <TableCell className="text-sm text-zinc-700 font-medium py-3">Feb 28, 2025</TableCell>
                  <TableCell className="text-right px-5 py-3">
                    <span className="inline-flex items-center text-xs font-bold text-red-700 bg-red-100/80 border border-red-200/50 px-2 py-0.5 rounded">
                      35d overdue
                    </span>
                  </TableCell>
                </TableRow>
                <TableRow className="border-b-zinc-200/60 hover:bg-red-50/80 transition-colors">
                  <TableCell className="px-5 py-3">
                    <div className="font-semibold text-sm text-zinc-900">Main Lobby</div>
                    <div className="text-xs text-zinc-500">Westgate Suites</div>
                  </TableCell>
                  <TableCell className="py-3"><Badge variant="outline" className="text-[10px] font-mono uppercase bg-white/60 border-zinc-200 text-zinc-600">CAT1</Badge></TableCell>
                  <TableCell className="py-3"><Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border border-amber-200 shadow-none uppercase text-[10px]">IN PROGRESS</Badge></TableCell>
                  <TableCell className="text-sm text-zinc-700 font-medium py-3">Jan 15, 2025</TableCell>
                  <TableCell className="text-right px-5 py-3">
                    <span className="inline-flex items-center text-xs font-bold text-red-700 bg-red-100/80 border border-red-200/50 px-2 py-0.5 rounded">
                      79d overdue
                    </span>
                  </TableCell>
                </TableRow>
                <TableRow className="border-b-zinc-200/60 hover:bg-red-50/80 transition-colors">
                  <TableCell className="px-5 py-3">
                    <div className="font-semibold text-sm text-zinc-900">Unit 2B</div>
                    <div className="text-xs text-zinc-500">Harbor Plaza</div>
                  </TableCell>
                  <TableCell className="py-3"><Badge variant="outline" className="text-[10px] font-mono uppercase bg-white/60 border-zinc-200 text-zinc-600">CAT1</Badge></TableCell>
                  <TableCell className="py-3"><Badge variant="secondary" className="bg-zinc-100 text-zinc-600 hover:bg-zinc-100 border border-zinc-200 uppercase text-[10px]">NOT STARTED</Badge></TableCell>
                  <TableCell className="text-sm text-zinc-700 font-medium py-3">Nov 30, 2024</TableCell>
                  <TableCell className="text-right px-5 py-3">
                    <span className="inline-flex items-center text-xs font-bold text-red-700 bg-red-100/80 border border-red-200/50 px-2 py-0.5 rounded">
                      125d overdue
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-zinc-200 overflow-hidden">
          <CardHeader className="bg-zinc-50/80 border-b border-zinc-200 px-5 py-3 flex flex-row items-center justify-between space-y-0 border-t-[3px] border-t-blue-500">
            <CardTitle className="text-sm font-bold text-zinc-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Upcoming — Next 14 Days
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-600 -mr-2">
              <Download className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="bg-blue-50/20 p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b-zinc-200/60 hover:bg-transparent">
                  <TableHead className="text-zinc-700 font-bold text-xs h-10 px-5">ELEVATOR / BUILDING</TableHead>
                  <TableHead className="text-zinc-700 font-bold text-xs h-10">TYPE</TableHead>
                  <TableHead className="text-zinc-700 font-bold text-xs h-10">STATUS</TableHead>
                  <TableHead className="text-zinc-700 font-bold text-xs h-10">DUE DATE</TableHead>
                  <TableHead className="text-zinc-700 font-bold text-xs h-10 text-right px-5">TIMELINE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-b-zinc-200/60 hover:bg-blue-50/60 transition-colors">
                  <TableCell className="px-5 py-3">
                    <div className="font-semibold text-sm text-zinc-900">Unit 1A</div>
                    <div className="text-xs text-zinc-500">Meridian Tower</div>
                  </TableCell>
                  <TableCell className="py-3"><Badge variant="outline" className="text-[10px] font-mono uppercase bg-white/60 border-zinc-200 text-zinc-600">CAT5</Badge></TableCell>
                  <TableCell className="py-3"><Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border border-blue-200 shadow-none uppercase text-[10px]">SCHEDULED</Badge></TableCell>
                  <TableCell className="text-sm text-zinc-700 font-medium py-3">Apr 8, 2025</TableCell>
                  <TableCell className="text-right px-5 py-3">
                    <span className="inline-flex items-center text-xs font-semibold text-zinc-600 bg-white border border-zinc-200 px-2 py-0.5 rounded shadow-sm">
                      4d away
                    </span>
                  </TableCell>
                </TableRow>
                <TableRow className="border-b-zinc-200/60 hover:bg-blue-50/60 transition-colors">
                  <TableCell className="px-5 py-3">
                    <div className="font-semibold text-sm text-zinc-900">Elevator C</div>
                    <div className="text-xs text-zinc-500">Westgate Suites</div>
                  </TableCell>
                  <TableCell className="py-3"><Badge variant="outline" className="text-[10px] font-mono uppercase bg-white/60 border-zinc-200 text-zinc-600">CAT1</Badge></TableCell>
                  <TableCell className="py-3"><Badge variant="secondary" className="bg-zinc-100 text-zinc-600 hover:bg-zinc-100 border border-zinc-200 uppercase text-[10px]">NOT STARTED</Badge></TableCell>
                  <TableCell className="text-sm text-zinc-700 font-medium py-3">Apr 11, 2025</TableCell>
                  <TableCell className="text-right px-5 py-3">
                    <span className="inline-flex items-center text-xs font-semibold text-zinc-600 bg-white border border-zinc-200 px-2 py-0.5 rounded shadow-sm">
                      7d away
                    </span>
                  </TableCell>
                </TableRow>
                <TableRow className="border-b-zinc-200/60 hover:bg-blue-50/60 transition-colors">
                  <TableCell className="px-5 py-3">
                    <div className="font-semibold text-sm text-zinc-900">Service Lift</div>
                    <div className="text-xs text-zinc-500">Harbor Plaza</div>
                  </TableCell>
                  <TableCell className="py-3"><Badge variant="outline" className="text-[10px] font-mono uppercase bg-white/60 border-zinc-200 text-zinc-600">CAT1</Badge></TableCell>
                  <TableCell className="py-3"><Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border border-blue-200 shadow-none uppercase text-[10px]">SCHEDULED</Badge></TableCell>
                  <TableCell className="text-sm text-zinc-700 font-medium py-3">Apr 14, 2025</TableCell>
                  <TableCell className="text-right px-5 py-3">
                    <span className="inline-flex items-center text-xs font-semibold text-zinc-600 bg-white border border-zinc-200 px-2 py-0.5 rounded shadow-sm">
                      10d away
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
