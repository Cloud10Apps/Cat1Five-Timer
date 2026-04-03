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
  Edit2, 
  Trash2, 
  LayoutDashboard, 
  Building, 
  Activity, 
  Calendar, 
  Settings,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const data = [
  {
    id: 'c1',
    name: 'OSB Services',
    elevatorCount: 3,
    buildings: [
      {
        id: 'b1',
        name: 'Another Test Building',
        banks: [
          {
            id: 'ba1',
            name: 'Low Rise',
            elevators: [
              { id: 'e1', name: 'Preppy Pet North West Houston, TX', type: 'Hydraulic', unit: '87878', state: '98987', status: 'SCHEDULED', cat: 'CAT1', nextDue: '04/16/2028', scheduled: '04/22/2028' },
              { id: 'e2', name: 'Unit 1 - Dumbwaiter', type: 'Traction', unit: '', state: '', status: 'OVERDUE', cat: 'CAT1', nextDue: '04/10/1992', scheduled: '—' },
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'c2',
    name: 'Cloud10',
    elevatorCount: 4,
    buildings: [
      {
        id: 'b2',
        name: 'Tech Tower',
        banks: [
          {
            id: 'ba2',
            name: 'High Rise',
            elevators: [
              { id: 'e3', name: 'Unit A', type: 'Traction', unit: '87878', state: '98987', status: 'NOT_STARTED', cat: 'CAT1', nextDue: '04/10/2028', scheduled: '—' },
              { id: 'e4', name: 'Unit B', type: 'Traction', unit: '0980', state: '897987', status: 'NOT_STARTED', cat: 'CAT1', nextDue: '04/02/2027', scheduled: '—' },
              { id: 'e5', name: 'Unit C', type: 'Traction', unit: '', state: '', status: '', cat: '', nextDue: '—', scheduled: '—' },
            ]
          }
        ]
      }
    ]
  }
];

export function VariantA() {
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({ c1: true, c2: true });

  const toggleCustomer = (id: string) => {
    setExpandedCustomers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OVERDUE': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-red-50 text-red-600">Overdue</span>;
      case 'SCHEDULED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-50 text-blue-600">Scheduled</span>;
      case 'IN_PROGRESS': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-amber-50 text-amber-600">In Progress</span>;
      case 'COMPLETED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-50 text-green-600">Completed</span>;
      case 'NOT_STARTED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-zinc-100 text-zinc-500">Not Started</span>;
      default: return <span className="text-zinc-400">—</span>;
    }
  };

  const getTypeBadge = (cat: string) => {
    if (cat === 'CAT1') return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-sm font-bold bg-zinc-100 text-zinc-600">CAT1</span>;
    if (cat === 'CAT5') return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-sm font-bold bg-amber-100 text-amber-700">CAT5</span>;
    return <span className="text-zinc-400">—</span>;
  };

  const gridClass = "grid grid-cols-[1fr_155px_85px_125px_125px_68px] items-center";
  const cellBorderClass = "border-l border-zinc-200 pl-4 py-3 flex items-center h-full";

  return (
    <div className="flex h-screen bg-white font-sans text-zinc-950 overflow-hidden">
      {/* Sidebar */}
      <div className="w-[18rem] bg-zinc-950 text-zinc-400 flex flex-col flex-shrink-0">
        <div className="p-6 flex items-center gap-3 text-white font-bold text-xl tracking-tight">
          <div className="w-8 h-8 rounded bg-amber-400 flex items-center justify-center text-black">
            C1
          </div>
          Cat1Five Timer
        </div>
        
        <div className="px-4 py-2">
          <div className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2 px-2">Menu</div>
          <nav className="space-y-1">
            <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-zinc-900 hover:text-white transition-colors">
              <LayoutDashboard size={18} /> Dashboard
            </a>
            <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-zinc-900 hover:text-white transition-colors">
              <Users size={18} /> Customers
            </a>
            <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-zinc-900 hover:text-white transition-colors">
              <Building size={18} /> Buildings
            </a>
            <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-md bg-zinc-900 text-white transition-colors relative">
              <div className="absolute left-0 top-1 bottom-1 w-1 bg-amber-400 rounded-r-md"></div>
              <Layers size={18} /> Elevators
            </a>
            <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-zinc-900 hover:text-white transition-colors">
              <Activity size={18} /> Inspections
            </a>
            <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-zinc-900 hover:text-white transition-colors">
              <Calendar size={18} /> Calendar
            </a>
          </nav>
        </div>
        
        <div className="mt-auto px-4 py-6">
          <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-zinc-900 hover:text-white transition-colors">
            <Settings size={18} /> Settings
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="px-8 py-6 border-b border-zinc-200 flex items-start justify-between bg-white flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-zinc-950">Elevators</h1>
            <p className="text-sm text-zinc-500 mt-1">Manage your elevator inventory across all locations.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="text-zinc-600 border-zinc-300">
              <Download size={16} className="mr-2" />
              Export Excel
            </Button>
            <Button className="bg-amber-400 hover:bg-amber-500 text-black border-0">
              <Plus size={16} className="mr-2" />
              Add Elevator
            </Button>
          </div>
        </header>

        {/* Filter Bar */}
        <div className="px-8 py-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-4 flex-shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <Input placeholder="Search elevators, buildings, or units..." className="pl-9 bg-white border-zinc-200" />
          </div>
          <Button variant="outline" className="text-zinc-600 bg-white border-zinc-200">
            <Filter size={16} className="mr-2" />
            Filters
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-white">
          <div className="min-w-[1000px]">
            {/* Sticky Header Strip */}
            <div className={`sticky top-0 z-20 bg-white border-b-2 border-zinc-200 text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400 ${gridClass}`}>
              <div className="pl-8 py-3">Elevator</div>
              <div className={cellBorderClass}>Status</div>
              <div className={cellBorderClass}>Type</div>
              <div className={cellBorderClass}>Next Due</div>
              <div className={cellBorderClass}>Scheduled</div>
              <div className={`${cellBorderClass} justify-center pr-4`}></div>
            </div>

            {/* List */}
            <div className="pb-20">
              {data.map(customer => (
                <div key={customer.id} className="group">
                  {/* Customer Header */}
                  <div 
                    className="bg-zinc-900 text-white flex items-center px-4 py-2.5 cursor-pointer sticky top-[46px] z-10 border-b border-zinc-800"
                    onClick={() => toggleCustomer(customer.id)}
                  >
                    <div className="w-5 flex justify-center text-zinc-400 mr-2">
                      {expandedCustomers[customer.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                    <Users size={16} className="text-zinc-400 mr-3" />
                    <span className="font-bold text-sm mr-3">{customer.name}</span>
                    <span className="bg-zinc-700 text-zinc-300 text-xs px-2 py-0.5 rounded-full">
                      {customer.elevatorCount} elevators
                    </span>
                  </div>

                  {/* Customer Content */}
                  {expandedCustomers[customer.id] && (
                    <div className="flex flex-col">
                      {customer.buildings.map(building => (
                        <div key={building.id}>
                          {/* Building Header */}
                          <div className="bg-zinc-100 border-l-4 border-zinc-300 pl-6 py-2 flex items-center">
                            <Building2 size={16} className="text-zinc-400 mr-2" />
                            <span className="font-semibold text-zinc-600 text-sm">{building.name}</span>
                          </div>

                          {/* Building Content */}
                          <div>
                            {building.banks.map(bank => (
                              <div key={bank.id}>
                                {/* Bank Header */}
                                <div className="bg-zinc-50 border-l-2 border-zinc-200 pl-10 py-1.5 flex items-center">
                                  <Layers size={14} className="text-zinc-400 mr-2" />
                                  <span className="text-xs font-semibold text-zinc-500">Bank: {bank.name}</span>
                                </div>

                                {/* Bank Content / Elevators */}
                                <div className="flex flex-col">
                                  {bank.elevators.map(elevator => (
                                    <div 
                                      key={elevator.id} 
                                      className={`relative ${gridClass} border-b border-zinc-100 hover:bg-blue-50/30 transition-colors group/row`}
                                    >
                                      {/* Amber Accent */}
                                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-400/70" />
                                      
                                      {/* Elevator Info */}
                                      <div className="pl-16 py-3 pr-4 flex flex-col justify-center min-h-[64px]">
                                        <div className="font-semibold text-sm text-zinc-900 truncate" title={elevator.name}>
                                          {elevator.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1.5">
                                          <span>{elevator.type}</span>
                                          {elevator.unit && (
                                            <>
                                              <span className="text-zinc-300">•</span>
                                              <span>Unit {elevator.unit}</span>
                                            </>
                                          )}
                                          {elevator.state && (
                                            <>
                                              <span className="text-zinc-300">•</span>
                                              <span>State {elevator.state}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      {/* Data Cells */}
                                      <div className={cellBorderClass}>
                                        {getStatusBadge(elevator.status)}
                                      </div>
                                      <div className={cellBorderClass}>
                                        {getTypeBadge(elevator.cat)}
                                      </div>
                                      <div className={`${cellBorderClass} text-sm tabular-nums text-zinc-700`}>
                                        {elevator.nextDue}
                                      </div>
                                      <div className={`${cellBorderClass} text-sm tabular-nums text-zinc-600`}>
                                        {elevator.scheduled}
                                      </div>
                                      
                                      {/* Actions */}
                                      <div className={`${cellBorderClass} justify-center pr-4 border-l border-zinc-200 opacity-0 group-hover/row:opacity-100 transition-opacity`}>
                                        <div className="flex items-center gap-1">
                                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100">
                                            <Edit2 size={14} />
                                          </Button>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50">
                                            <Trash2 size={14} />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
