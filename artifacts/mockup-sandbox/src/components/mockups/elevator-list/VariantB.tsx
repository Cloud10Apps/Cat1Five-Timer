import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Users, 
  Building2, 
  Layers, 
  Search, 
  Filter, 
  Download, 
  Plus,
  LayoutDashboard,
  Users2,
  ListOrdered,
  Calendar,
  Settings,
  MoreHorizontal
} from 'lucide-react';

// Reusable components for the variant
const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'OVERDUE':
      return <span className="inline-flex items-center border border-red-200 border-l-[3px] border-l-red-500 bg-red-50 text-red-700 rounded-full px-2.5 py-0.5 text-[13px] font-medium tracking-tight">OVERDUE</span>;
    case 'SCHEDULED':
      return <span className="inline-flex items-center border border-blue-200 border-l-[3px] border-l-blue-500 bg-blue-50 text-blue-700 rounded-full px-2.5 py-0.5 text-[13px] font-medium tracking-tight">SCHEDULED</span>;
    case 'IN_PROGRESS':
      return <span className="inline-flex items-center border border-amber-200 border-l-[3px] border-l-amber-500 bg-amber-50 text-amber-700 rounded-full px-2.5 py-0.5 text-[13px] font-medium tracking-tight">IN PROGRESS</span>;
    case 'COMPLETED':
      return <span className="inline-flex items-center border border-green-200 border-l-[3px] border-l-green-500 bg-green-50 text-green-700 rounded-full px-2.5 py-0.5 text-[13px] font-medium tracking-tight">COMPLETED</span>;
    case 'NOT_STARTED':
      return <span className="inline-flex items-center border border-zinc-200 border-l-[3px] border-l-zinc-400 bg-zinc-50 text-zinc-600 rounded-full px-2.5 py-0.5 text-[13px] font-medium tracking-tight">NOT STARTED</span>;
    default:
      return null;
  }
};

const TypeChip = ({ type }: { type: string }) => {
  if (type === 'CAT1') {
    return <span className="inline-block bg-zinc-800 text-white text-[11px] font-bold px-2 py-0.5 rounded-full tracking-wide">CAT1</span>;
  }
  if (type === 'CAT5') {
    return <span className="inline-block bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full tracking-wide">CAT5</span>;
  }
  return null;
};

export function VariantB() {
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({
    'osb': true,
    'cloud10': true,
  });

  const toggleCustomer = (id: string) => {
    setExpandedCustomers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex h-screen w-full bg-white text-zinc-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-[18rem] bg-zinc-950 text-zinc-300 flex flex-col flex-shrink-0">
        <div className="p-6 flex items-center gap-3 text-white">
          <div className="w-8 h-8 rounded bg-amber-500 flex items-center justify-center font-bold text-black">
            C1
          </div>
          <span className="font-bold text-lg tracking-tight">Cat1Five Timer</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium text-sm">Dashboard</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-colors">
            <Users2 className="w-5 h-5" />
            <span className="font-medium text-sm">Customers</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-colors">
            <Building2 className="w-5 h-5" />
            <span className="font-medium text-sm">Buildings</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md bg-zinc-900 text-white transition-colors">
            <ListOrdered className="w-5 h-5" />
            <span className="font-medium text-sm">Elevators</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-colors">
            <svg xmlns="http://www.w3.org/-2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/></svg>
            <span className="font-medium text-sm">Inspections</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-colors">
            <Calendar className="w-5 h-5" />
            <span className="font-medium text-sm">Calendar</span>
          </a>
        </nav>
        
        <div className="p-4 mt-auto">
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-colors">
            <Settings className="w-5 h-5" />
            <span className="font-medium text-sm">Settings</span>
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        {/* Header */}
        <header className="px-8 py-6 border-b border-zinc-200 flex items-start justify-between bg-white flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Elevators</h1>
            <p className="text-sm text-zinc-500 mt-1">Manage your elevator inventory.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-zinc-300 rounded-md text-sm font-medium hover:bg-zinc-50 transition-colors">
              <Download className="w-4 h-4" />
              Export Excel
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-amber-400 text-amber-950 rounded-md text-sm font-medium hover:bg-amber-500 transition-colors shadow-sm">
              <Plus className="w-4 h-4" />
              Add Elevator
            </button>
          </div>
        </header>

        {/* Filter Bar */}
        <div className="px-8 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50 flex-shrink-0">
          <div className="relative w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search elevators..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-zinc-200 rounded-md text-sm font-medium hover:bg-zinc-50 text-zinc-700">
              <Filter className="w-4 h-4 text-zinc-400" />
              Filters
            </button>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* Customer 1: OSB Services */}
            <div className="rounded-lg border border-zinc-200 overflow-hidden shadow-sm bg-white">
              {/* Customer Header */}
              <div 
                className="grid grid-cols-[1fr_155px_85px_125px_125px_68px] bg-zinc-900 cursor-pointer select-none"
                onClick={() => toggleCustomer('osb')}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  {expandedCustomers['osb'] ? (
                    <ChevronDown className="w-5 h-5 text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-zinc-400" />
                  )}
                  <Users className="w-5 h-5 text-zinc-400" />
                  <span className="font-bold text-base text-white tracking-tight">OSB Services</span>
                  <span className="text-xs font-medium bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full ml-2">3</span>
                </div>
                <div className="flex items-center px-4 py-3 border-l border-zinc-700">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Status</span>
                </div>
                <div className="flex items-center px-4 py-3 border-l border-zinc-700">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Type</span>
                </div>
                <div className="flex items-center px-4 py-3 border-l border-zinc-700">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Next Due</span>
                </div>
                <div className="flex items-center px-4 py-3 border-l border-zinc-700">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Scheduled</span>
                </div>
                <div className="flex items-center justify-center px-4 py-3 border-l border-zinc-700">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Actions</span>
                </div>
              </div>

              {/* Expandable Content */}
              {expandedCustomers['osb'] && (
                <div className="flex flex-col">
                  {/* Building */}
                  <div className="flex items-center gap-2 bg-zinc-50 border-l-[3px] border-zinc-400 pl-6 py-2.5 border-b border-zinc-100">
                    <Building2 className="w-4 h-4 text-zinc-500" />
                    <span className="font-semibold text-sm text-zinc-700">Another Test Building</span>
                  </div>

                  {/* Bank */}
                  <div className="flex items-center gap-2 bg-white border-l-[2px] border-zinc-200 pl-12 py-1.5 border-b border-zinc-100">
                    <Layers className="w-3.5 h-3.5 text-zinc-300" />
                    <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Bank: Low Rise</span>
                  </div>

                  {/* Elevator Row 1 */}
                  <div className="grid grid-cols-[1fr_155px_85px_125px_125px_68px] relative group hover:bg-amber-50/40 border-b border-zinc-100 transition-colors">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber-500/80"></div>
                    <div className="flex flex-col justify-center px-4 py-2 pl-[4.5rem]">
                      <span className="font-semibold text-sm text-zinc-900">Preppy Pet North West Houston, TX</span>
                      <span className="text-xs text-zinc-500 mt-0.5">Hydraulic • Unit 87878 • State 98987</span>
                    </div>
                    <div className="flex items-center px-4 py-2 border-l border-zinc-150">
                      <StatusBadge status="SCHEDULED" />
                    </div>
                    <div className="flex items-center px-4 py-2 border-l border-zinc-150">
                      <TypeChip type="CAT1" />
                    </div>
                    <div className="flex items-center px-4 py-2 border-l border-zinc-150">
                      <span className="text-sm font-medium text-zinc-600">Apr 16, 2028</span>
                    </div>
                    <div className="flex items-center px-4 py-2 border-l border-zinc-150">
                      <span className="text-sm text-zinc-500">Apr 22, 2028</span>
                    </div>
                    <div className="flex items-center justify-center px-4 py-2 border-l border-zinc-150">
                      <button className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-md hover:bg-zinc-100 transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Elevator Row 2 */}
                  <div className="grid grid-cols-[1fr_155px_85px_125px_125px_68px] relative group hover:bg-amber-50/40 transition-colors">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber-500/80"></div>
                    <div className="flex flex-col justify-center px-4 py-2 pl-[4.5rem]">
                      <span className="font-semibold text-sm text-zinc-900">Unit 1 - Dumbwaiter</span>
                      <span className="text-xs text-zinc-500 mt-0.5">Traction</span>
                    </div>
                    <div className="flex items-center px-4 py-2 border-l border-zinc-150">
                      <StatusBadge status="OVERDUE" />
                    </div>
                    <div className="flex items-center px-4 py-2 border-l border-zinc-150">
                      <TypeChip type="CAT1" />
                    </div>
                    <div className="flex items-center px-4 py-2 border-l border-zinc-150">
                      <span className="text-sm font-semibold text-red-600">Apr 10, 1992</span>
                    </div>
                    <div className="flex items-center px-4 py-2 border-l border-zinc-150">
                      <span className="text-sm text-zinc-400">—</span>
                    </div>
                    <div className="flex items-center justify-center px-4 py-2 border-l border-zinc-150">
                      <button className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-md hover:bg-zinc-100 transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Customer 2: Cloud10 */}
            <div className="rounded-lg border border-zinc-200 overflow-hidden shadow-sm bg-white">
              {/* Customer Header */}
              <div 
                className="grid grid-cols-[1fr_155px_85px_125px_125px_68px] bg-zinc-900 cursor-pointer select-none"
                onClick={() => toggleCustomer('cloud10')}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  {expandedCustomers['cloud10'] ? (
                    <ChevronDown className="w-5 h-5 text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-zinc-400" />
                  )}
                  <Users className="w-5 h-5 text-zinc-400" />
                  <span className="font-bold text-base text-white tracking-tight">Cloud10</span>
                  <span className="text-xs font-medium bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full ml-2">4</span>
                </div>
                <div className="flex items-center px-4 py-3 border-l border-zinc-700">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Status</span>
                </div>
                <div className="flex items-center px-4 py-3 border-l border-zinc-700">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Type</span>
                </div>
                <div className="flex items-center px-4 py-3 border-l border-zinc-700">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Next Due</span>
                </div>
                <div className="flex items-center px-4 py-3 border-l border-zinc-700">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Scheduled</span>
                </div>
                <div className="flex items-center justify-center px-4 py-3 border-l border-zinc-700">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Actions</span>
                </div>
              </div>

              {/* Expandable Content */}
              {expandedCustomers['cloud10'] && (
                <div className="flex flex-col">
                  {/* Building */}
                  <div className="flex items-center gap-2 bg-zinc-50 border-l-[3px] border-zinc-400 pl-6 py-2.5 border-b border-zinc-100">
                    <Building2 className="w-4 h-4 text-zinc-500" />
                    <span className="font-semibold text-sm text-zinc-700">Tech Tower</span>
                  </div>

                  {/* Bank */}
                  <div className="flex items-center gap-2 bg-white border-l-[2px] border-zinc-200 pl-12 py-1.5 border-b border-zinc-100">
                    <Layers className="w-3.5 h-3.5 text-zinc-300" />
                    <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Bank: High Rise</span>
                  </div>

                  {/* Elevator Row 1 */}
                  <div className="grid grid-cols-[1fr_155px_85px_125px_125px_68px] relative group hover:bg-amber-50/40 border-b border-zinc-100 transition-colors">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber-500/80"></div>
                    <div className="flex flex-col justify-center px-4 py-2 pl-[4.5rem]">
                      <span className="font-semibold text-sm text-zinc-900">Unit A</span>
                      <span className="text-xs text-zinc-500 mt-0.5">Traction • Unit 87878 • State 98987</span>
                    </div>
                    <div className="flex items-center px-4 py-2 border-l border-zinc-150">
                      <StatusBadge status="NOT_STARTED" />
                    </div>
                    <div className="flex items-center px-4 py-2 border-l border-zinc-150">
                      <TypeChip type="CAT1" />
                    </div>
                    <div className="flex items-center px-4 py-2 border-l border-zinc-150">
                      <span className="text-sm font-medium text-zinc-600">Apr 10, 2028</span>
                    </div>
                    <div className="flex items-center px-4 py-2 border-l border-zinc-150">
                      <span className="text-sm text-zinc-400">—</span>
                    </div>
                    <div className="flex items-center justify-center px-4 py-2 border-l border-zinc-150">
                      <button className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-md hover:bg-zinc-100 transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Elevator Row 2 */}
                  <div className="grid grid-cols-[1fr_155px_85px_125px_125px_68px] relative group hover:bg-amber-50/40 border-b border-zinc-100 transition-colors">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber-500/80"></div>
                    <div className="flex flex-col justify-center px-4 py-2 pl-[4.5rem]">
                      <span className="font-semibold text-sm text-zinc-900">Unit B</span>
                      <span className="text-xs text-zinc-500 mt-0.5">Traction • Unit 0980 • State 897987</span>
                    </div>
                    <div className="flex items-center px-4 py-2 border-l border-zinc-150">
                      <StatusBadge status="NOT_STARTED" />
                    </div>
                    <div className="flex items-center px-4 py-2 border-l border-zinc-150">
                      <TypeChip type="CAT1" />
                    </div>
                    <div className="flex items-center px-4 py-2 border-l border-zinc-150">
                      <span className="text-sm font-medium text-amber-600">Apr 02, 2027</span>
                    </div>
                    <div className="flex items-center px-4 py-2 border-l border-zinc-150">
                      <span className="text-sm text-zinc-400">—</span>
                    </div>
                    <div className="flex items-center justify-center px-4 py-2 border-l border-zinc-150">
                      <button className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-md hover:bg-zinc-100 transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Elevator Row 3 */}
                  <div className="grid grid-cols-[1fr_155px_85px_125px_125px_68px] relative group hover:bg-amber-50/40 transition-colors">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber-500/80"></div>
                    <div className="flex flex-col justify-center px-4 py-2 pl-[4.5rem]">
                      <span className="font-semibold text-sm text-zinc-900">Unit C</span>
                      <span className="text-xs text-zinc-500 mt-0.5">Traction</span>
                    </div>
                    <div className="flex items-center px-4 py-2 border-l border-zinc-150">
                      <span className="text-sm text-zinc-400 italic">No inspection</span>
                    </div>
                    <div className="flex items-center px-4 py-2 border-l border-zinc-150">
                      <span className="text-sm text-zinc-400">—</span>
                    </div>
                    <div className="flex items-center px-4 py-2 border-l border-zinc-150">
                      <span className="text-sm text-zinc-400">—</span>
                    </div>
                    <div className="flex items-center px-4 py-2 border-l border-zinc-150">
                      <span className="text-sm text-zinc-400">—</span>
                    </div>
                    <div className="flex items-center justify-center px-4 py-2 border-l border-zinc-150">
                      <button className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-md hover:bg-zinc-100 transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
