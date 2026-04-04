import { useState } from "react";
import {
  Building2, Users, ChevronDown, ChevronRight,
  AlertTriangle, Clock, CheckCircle2, CalendarDays,
  Pencil, Plus, SlidersHorizontal, X, Layers,
  ArrowUpRight, MoreHorizontal, Download,
} from "lucide-react";

type Status = "NOT_STARTED" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
type InspType = "CAT1" | "CAT5";
type UnitType = "Traction" | "Hydraulic" | "Other";

interface ElevRow {
  id: number; name: string; unitId: string; type: UnitType;
  status: Status; inspType: InspType;
  lastCompleted: string | null; nextDue: string | null; agingDays: number | null;
}

interface BuildingData {
  id: number; name: string; customer: string; address: string;
  elevators: ElevRow[];
}

const BUILDINGS: BuildingData[] = [
  {
    id: 1, name: "Harbor Plaza", customer: "Apex Tower Management", address: "400 Harbor Blvd",
    elevators: [
      { id: 1,  name: "Unit 4A",      unitId: "HP-001", type: "Traction",  status: "OVERDUE",      inspType: "CAT1", lastCompleted: null,         nextDue: "2025-03-12", agingDays: 23 },
      { id: 2,  name: "Freight 1",    unitId: "HP-002", type: "Hydraulic", status: "SCHEDULED",     inspType: "CAT5", lastCompleted: null,         nextDue: "2025-04-14", agingDays: -10 },
      { id: 3,  name: "Main Lobby",   unitId: "HP-003", type: "Traction",  status: "IN_PROGRESS",  inspType: "CAT1", lastCompleted: null,         nextDue: "2025-01-15", agingDays: 79 },
      { id: 4,  name: "Unit 2B",      unitId: "HP-004", type: "Traction",  status: "OVERDUE",      inspType: "CAT1", lastCompleted: null,         nextDue: "2024-11-30", agingDays: 125 },
      { id: 5,  name: "Service Lift", unitId: "HP-005", type: "Hydraulic", status: "NOT_STARTED",  inspType: "CAT1", lastCompleted: "2024-04-01", nextDue: "2025-04-14", agingDays: -10 },
      { id: 6,  name: "Penthouse E",  unitId: "HP-006", type: "Traction",  status: "COMPLETED",    inspType: "CAT1", lastCompleted: "2025-03-01", nextDue: "2026-03-01", agingDays: -365 },
      { id: 7,  name: "Garage A",     unitId: "HP-007", type: "Hydraulic", status: "NOT_STARTED",  inspType: "CAT5", lastCompleted: "2023-06-01", nextDue: "2026-06-01", agingDays: -430 },
      { id: 8,  name: "Freight 2",    unitId: "HP-008", type: "Hydraulic", status: "COMPLETED",    inspType: "CAT1", lastCompleted: "2024-09-01", nextDue: "2025-09-01", agingDays: -150 },
    ],
  },
  {
    id: 2, name: "Meridian Tower", customer: "Apex Tower Management", address: "1200 Meridian Ave",
    elevators: [
      { id: 9,  name: "Unit 1A",  unitId: "MT-001", type: "Traction",  status: "SCHEDULED",    inspType: "CAT5", lastCompleted: "2022-04-08", nextDue: "2025-04-08", agingDays: -4 },
      { id: 10, name: "Unit 1B",  unitId: "MT-002", type: "Traction",  status: "NOT_STARTED",  inspType: "CAT1", lastCompleted: null,         nextDue: "2025-05-15", agingDays: -41 },
      { id: 11, name: "Lobby E",  unitId: "MT-003", type: "Traction",  status: "COMPLETED",    inspType: "CAT1", lastCompleted: "2025-02-01", nextDue: "2026-02-01", agingDays: -300 },
      { id: 12, name: "Freight",  unitId: "MT-004", type: "Hydraulic", status: "COMPLETED",    inspType: "CAT5", lastCompleted: "2020-08-01", nextDue: "2025-08-01", agingDays: -115 },
      { id: 13, name: "Service A",unitId: "MT-005", type: "Other",     status: "SCHEDULED",    inspType: "CAT1", lastCompleted: null,         nextDue: "2025-04-11", agingDays: -7 },
    ],
  },
  {
    id: 3, name: "Westgate Suites", customer: "Gulf Coast Properties", address: "88 West Gate Pkwy",
    elevators: [
      { id: 14, name: "Elevator C",  unitId: "WG-001", type: "Traction",  status: "NOT_STARTED", inspType: "CAT1", lastCompleted: null,         nextDue: "2025-04-11", agingDays: -7 },
      { id: 15, name: "Main Lobby",  unitId: "WG-002", type: "Traction",  status: "IN_PROGRESS", inspType: "CAT1", lastCompleted: null,         nextDue: "2025-01-15", agingDays: 79 },
      { id: 16, name: "Freight",     unitId: "WG-003", type: "Hydraulic", status: "COMPLETED",   inspType: "CAT5", lastCompleted: "2024-12-01", nextDue: "2029-12-01", agingDays: -1710 },
      { id: 17, name: "Parking",     unitId: "WG-004", type: "Hydraulic", status: "NOT_STARTED", inspType: "CAT1", lastCompleted: null,         nextDue: "2026-03-01", agingDays: -340 },
    ],
  },
  {
    id: 4, name: "Sunrise Center", customer: "Gulf Coast Properties", address: "2500 Sunrise Blvd",
    elevators: [
      { id: 18, name: "Unit A",  unitId: "SC-001", type: "Traction",  status: "COMPLETED",   inspType: "CAT1", lastCompleted: "2025-01-15", nextDue: "2026-01-15", agingDays: -285 },
      { id: 19, name: "Unit B",  unitId: "SC-002", type: "Traction",  status: "COMPLETED",   inspType: "CAT5", lastCompleted: "2023-06-01", nextDue: "2028-06-01", agingDays: -1520 },
      { id: 20, name: "Freight", unitId: "SC-003", type: "Hydraulic", status: "NOT_STARTED", inspType: "CAT1", lastCompleted: null,         nextDue: "2025-06-30", agingDays: -87 },
    ],
  },
  {
    id: 5, name: "Lakeview Plaza", customer: "Metro Real Estate", address: "7 Lakeview Dr",
    elevators: [
      { id: 21, name: "Main",    unitId: "LV-001", type: "Traction",  status: "OVERDUE",     inspType: "CAT1", lastCompleted: null,         nextDue: "2025-02-01", agingDays: 62 },
      { id: 22, name: "Service", unitId: "LV-002", type: "Hydraulic", status: "SCHEDULED",   inspType: "CAT1", lastCompleted: null,         nextDue: "2025-04-20", agingDays: -16 },
      { id: 23, name: "Freight", unitId: "LV-003", type: "Other",     status: "OVERDUE",     inspType: "CAT5", lastCompleted: "2020-01-01", nextDue: "2025-01-01", agingDays: 94 },
    ],
  },
  {
    id: 6, name: "Commerce Park", customer: "Metro Real Estate", address: "555 Commerce Way",
    elevators: [
      { id: 24, name: "Tower A", unitId: "CP-001", type: "Traction",  status: "COMPLETED",   inspType: "CAT1", lastCompleted: "2025-03-01", nextDue: "2026-03-01", agingDays: -340 },
      { id: 25, name: "Tower B", unitId: "CP-002", type: "Traction",  status: "NOT_STARTED", inspType: "CAT1", lastCompleted: null,         nextDue: "2025-09-01", agingDays: -150 },
      { id: 26, name: "Lobby",   unitId: "CP-003", type: "Traction",  status: "IN_PROGRESS", inspType: "CAT5", lastCompleted: "2020-06-01", nextDue: "2025-06-01", agingDays: -58 },
      { id: 27, name: "Parking", unitId: "CP-004", type: "Hydraulic", status: "COMPLETED",   inspType: "CAT1", lastCompleted: "2024-11-01", nextDue: "2025-11-01", agingDays: -210 },
    ],
  },
];

const STATUS_META: Record<Status, { label: string; color: string; bg: string; dot: string; icon: React.ReactNode }> = {
  OVERDUE:     { label: "Overdue",       color: "text-red-700",   bg: "bg-red-500",   dot: "bg-red-500",   icon: <AlertTriangle className="h-3 w-3" /> },
  NOT_STARTED: { label: "Not Scheduled", color: "text-zinc-500",  bg: "bg-zinc-400",  dot: "bg-zinc-400",  icon: <MoreHorizontal className="h-3 w-3" /> },
  SCHEDULED:   { label: "Scheduled",     color: "text-blue-700",  bg: "bg-blue-500",  dot: "bg-blue-500",  icon: <CalendarDays className="h-3 w-3" /> },
  IN_PROGRESS: { label: "In Progress",   color: "text-amber-700", bg: "bg-amber-500", dot: "bg-amber-500", icon: <Clock className="h-3 w-3" /> },
  COMPLETED:   { label: "Completed",     color: "text-green-700", bg: "bg-green-500", dot: "bg-green-500", icon: <CheckCircle2 className="h-3 w-3" /> },
};

function StatusPill({ status }: { status: Status }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap
      ${status === "OVERDUE"     ? "bg-red-50 border-red-200 text-red-700" : ""}
      ${status === "NOT_STARTED" ? "bg-zinc-100 border-zinc-200 text-zinc-600" : ""}
      ${status === "SCHEDULED"   ? "bg-blue-50 border-blue-200 text-blue-700" : ""}
      ${status === "IN_PROGRESS" ? "bg-amber-50 border-amber-200 text-amber-700" : ""}
      ${status === "COMPLETED"   ? "bg-green-50 border-green-200 text-green-700" : ""}
    `}>
      {m.icon}{m.label}
    </span>
  );
}

function DistributionBar({ elevators }: { elevators: ElevRow[] }) {
  const n = elevators.length;
  if (n === 0) return null;
  const counts: Record<Status, number> = { OVERDUE: 0, NOT_STARTED: 0, SCHEDULED: 0, IN_PROGRESS: 0, COMPLETED: 0 };
  elevators.forEach(e => counts[e.status]++);
  const order: Status[] = ["OVERDUE", "IN_PROGRESS", "SCHEDULED", "NOT_STARTED", "COMPLETED"];
  return (
    <div className="flex h-2 rounded-full overflow-hidden gap-px">
      {order.map(s => counts[s] > 0 && (
        <div
          key={s}
          className={`${STATUS_META[s].bg} transition-all`}
          style={{ width: `${(counts[s] / n) * 100}%` }}
          title={`${counts[s]} ${STATUS_META[s].label}`}
        />
      ))}
    </div>
  );
}

function AgingChip({ days }: { days: number | null }) {
  if (days === null) return <span className="text-zinc-400 text-xs">—</span>;
  if (days > 0) return <span className="text-xs font-semibold text-red-600 tabular-nums">+{days}d</span>;
  if (days >= -14) return <span className="text-xs font-semibold text-amber-600 tabular-nums">{Math.abs(days)}d</span>;
  return <span className="text-xs text-zinc-500 tabular-nums">{Math.abs(days)}d</span>;
}

function BuildingCard({ building }: { building: BuildingData }) {
  const [expanded, setExpanded] = useState(false);
  const elevs = building.elevators;
  const overdue    = elevs.filter(e => e.status === "OVERDUE").length;
  const inProgress = elevs.filter(e => e.status === "IN_PROGRESS").length;
  const scheduled  = elevs.filter(e => e.status === "SCHEDULED").length;
  const notSched   = elevs.filter(e => e.status === "NOT_STARTED").length;
  const completed  = elevs.filter(e => e.status === "COMPLETED").length;
  const cat1 = elevs.filter(e => e.inspType === "CAT1").length;
  const cat5 = elevs.filter(e => e.inspType === "CAT5").length;
  const compliancePct = Math.round((completed / elevs.length) * 100);
  const hasIssues = overdue > 0 || inProgress > 0;

  return (
    <div className={`rounded-xl border shadow-sm overflow-hidden flex flex-col transition-all
      ${hasIssues ? "border-red-200" : "border-zinc-200"}
    `}>
      {/* Card header */}
      <div className={`px-4 pt-4 pb-3 ${hasIssues ? "bg-white" : "bg-white"}`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`flex items-center justify-center h-8 w-8 rounded-lg shrink-0
              ${hasIssues ? "bg-red-50 border border-red-200" : "bg-zinc-100 border border-zinc-200"}`}>
              <Building2 className={`h-4 w-4 ${hasIssues ? "text-red-500" : "text-zinc-500"}`} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm text-zinc-900 truncate leading-tight">{building.name}</div>
              <div className="text-[11px] text-zinc-400 truncate leading-tight mt-0.5">{building.address}</div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[11px] font-bold text-zinc-500 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-full">
              {elevs.length} units
            </span>
            <button className="h-6 w-6 flex items-center justify-center rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Status distribution bar */}
        <DistributionBar elevators={elevs} />

        {/* Quick stat pills */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {overdue > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
              <AlertTriangle className="h-2.5 w-2.5" />{overdue} overdue
            </span>
          )}
          {inProgress > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              <Clock className="h-2.5 w-2.5" />{inProgress} in progress
            </span>
          )}
          {scheduled > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
              <CalendarDays className="h-2.5 w-2.5" />{scheduled} scheduled
            </span>
          )}
          {notSched > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-full">
              {notSched} not scheduled
            </span>
          )}
          {completed > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="h-2.5 w-2.5" />{completed} done
            </span>
          )}
        </div>

        {/* Footer row: type badges + expand toggle */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100">
          <div className="flex items-center gap-1.5">
            {cat1 > 0 && (
              <span className="text-[10px] font-bold bg-zinc-800 text-white px-1.5 py-0.5 rounded">CAT1 ×{cat1}</span>
            )}
            {cat5 > 0 && (
              <span className="text-[10px] font-bold bg-yellow-400 text-zinc-900 px-1.5 py-0.5 rounded">CAT5 ×{cat5}</span>
            )}
          </div>
          <button
            onClick={() => setExpanded(x => !x)}
            className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {expanded ? "Hide units" : "Show units"}
          </button>
        </div>
      </div>

      {/* Expanded elevator list */}
      {expanded && (
        <div className="border-t border-zinc-200">
          {/* Mini table header */}
          <div className="grid grid-cols-[1fr_70px_90px_55px_90px_55px_36px] gap-0 bg-zinc-50 border-b border-zinc-200 px-3 py-1.5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Unit</span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">Type</span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">Status</span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">Insp</span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">Next Due</span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">Aging</span>
            <span />
          </div>
          {elevs.map((e, i) => (
            <div
              key={e.id}
              className={`grid grid-cols-[1fr_70px_90px_55px_90px_55px_36px] gap-0 px-3 py-2 items-center group
                ${i % 2 === 0 ? "bg-white" : "bg-zinc-50/50"}
                ${e.status === "OVERDUE" ? "border-l-2 border-l-red-400" : "border-l-2 border-l-transparent"}
                hover:bg-amber-50/50 transition-colors border-b border-zinc-100 last:border-b-0`}
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-800 truncate">{e.name}</div>
                <div className="text-[10px] text-zinc-400">{e.unitId}</div>
              </div>
              <div className="text-center">
                <span className="text-[10px] font-medium text-zinc-500 capitalize">{e.type}</span>
              </div>
              <div className="flex justify-center">
                <StatusPill status={e.status} />
              </div>
              <div className="text-center">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded
                  ${e.inspType === "CAT5" ? "bg-yellow-300 text-zinc-900" : "bg-zinc-800 text-white"}`}>
                  {e.inspType}
                </span>
              </div>
              <div className="text-center">
                <span className="text-[10px] tabular-nums text-zinc-700">
                  {e.nextDue ? new Date(e.nextDue + "T00:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" }) : "—"}
                </span>
              </div>
              <div className="text-center">
                <AgingChip days={e.agingDays} />
              </div>
              <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="h-6 w-6 flex items-center justify-center rounded hover:bg-zinc-200 text-zinc-400 hover:text-zinc-700">
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
          {/* Add unit row */}
          <button className="w-full flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium text-zinc-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors border-t border-zinc-100">
            <Plus className="h-3 w-3" /> Add unit
          </button>
        </div>
      )}
    </div>
  );
}

function CustomerSection({ customer, buildings }: { customer: string; buildings: BuildingData[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const totalElevs = buildings.reduce((s, b) => s + b.elevators.length, 0);
  const totalOverdue = buildings.reduce((s, b) => s + b.elevators.filter(e => e.status === "OVERDUE").length, 0);

  return (
    <div>
      {/* Customer section header */}
      <button
        onClick={() => setCollapsed(x => !x)}
        className="w-full flex items-center gap-2.5 px-1 py-2 mb-3 group"
      >
        {collapsed
          ? <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
          : <ChevronDown className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 transition-colors" />}
        <Users className="h-4 w-4 text-zinc-500" />
        <span className="text-sm font-bold text-zinc-800 tracking-tight">{customer}</span>
        <span className="text-xs text-zinc-400 font-medium">{buildings.length} buildings · {totalElevs} units</span>
        {totalOverdue > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
            <AlertTriangle className="h-2.5 w-2.5" />{totalOverdue} overdue
          </span>
        )}
        <div className="flex-1 h-px bg-zinc-200 ml-2" />
      </button>

      {!collapsed && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {buildings.map(b => <BuildingCard key={b.id} building={b} />)}
        </div>
      )}
    </div>
  );
}

export function CardPortfolio() {
  const allElevs = BUILDINGS.flatMap(b => b.elevators);
  const totalOverdue    = allElevs.filter(e => e.status === "OVERDUE").length;
  const totalScheduled  = allElevs.filter(e => e.status === "SCHEDULED").length;
  const totalInProgress = allElevs.filter(e => e.status === "IN_PROGRESS").length;
  const totalCompleted  = allElevs.filter(e => e.status === "COMPLETED").length;
  const totalNotSched   = allElevs.filter(e => e.status === "NOT_STARTED").length;

  const customers = [...new Set(BUILDINGS.map(b => b.customer))];

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Page header */}
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-zinc-900 tracking-tight">Elevator Portfolio</h1>
            <p className="text-xs text-zinc-500 mt-0.5">{BUILDINGS.length} buildings · {allElevs.length} units across {customers.length} customers</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200 hover:border-zinc-300 px-3 py-1.5 rounded-lg shadow-sm transition-colors">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button className="flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg shadow-sm transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add Elevator
            </button>
          </div>
        </div>

        {/* Portfolio KPI strip */}
        <div className="flex items-center gap-0 mt-4 rounded-lg border border-zinc-200 overflow-hidden divide-x divide-zinc-200 bg-white shadow-sm">
          {[
            { label: "Not Scheduled", value: totalNotSched, color: "text-zinc-700",  accent: "bg-zinc-400" },
            { label: "Scheduled",     value: totalScheduled,  color: "text-blue-700",  accent: "bg-blue-500" },
            { label: "In Progress",   value: totalInProgress, color: "text-amber-700", accent: "bg-amber-500" },
            { label: "Completed",     value: totalCompleted,  color: "text-green-700", accent: "bg-green-500" },
            { label: "Overdue",       value: totalOverdue,    color: "text-red-700",   accent: "bg-red-500" },
          ].map(item => (
            <div key={item.label} className="flex-1 px-4 py-3 relative">
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${item.accent}`} />
              <div className={`text-2xl font-black ${item.color} leading-none`}>{item.value}</div>
              <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mt-1">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Slim filter bar */}
        <div className="flex items-center gap-2 mt-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 border border-zinc-200 rounded-lg px-3 py-1.5 bg-white">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="font-semibold uppercase tracking-widest text-[11px]">Filters</span>
          </div>
          {["All Customers", "All Buildings", "All Statuses", "All Insp Types"].map(f => (
            <button key={f} className="flex items-center gap-1 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 hover:border-zinc-300 px-3 py-1.5 rounded-lg transition-colors">
              {f} <ChevronDown className="h-3 w-3 text-zinc-400" />
            </button>
          ))}
          <div className="flex-1" />
          <span className="text-xs text-zinc-400 tabular-nums">
            <span className="font-bold text-zinc-700">{allElevs.length}</span> elevators
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="px-6 py-5">
        {customers.map(customer => (
          <CustomerSection
            key={customer}
            customer={customer}
            buildings={BUILDINGS.filter(b => b.customer === customer)}
          />
        ))}
      </div>
    </div>
  );
}
