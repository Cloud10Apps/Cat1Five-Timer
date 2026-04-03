import React from "react";
import { X, Calendar, ArrowRight, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TimelineFlow() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4 font-sans">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Edit Inspection</h2>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 -mr-2">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6">
          <div className="mb-8">
            <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Inspection Type</Label>
            <Select defaultValue="cat1">
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cat1">CAT1 Annual</SelectItem>
                <SelectItem value="cat5">CAT5 5-Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Timeline Section */}
          <div className="relative mb-8 pt-4 pb-6 px-6 bg-slate-50/50 rounded-lg border border-slate-100">
            {/* Connecting line */}
            <div className="absolute top-1/2 left-1/4 right-1/4 h-px bg-slate-200 -translate-y-1/2 hidden md:block"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
              
              {/* Past Region */}
              <div className="space-y-5 bg-white p-4 rounded-lg shadow-sm border border-slate-100 relative">
                <div className="absolute -top-3 left-4 bg-white px-2 text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Past
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Last Inspection</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input type="date" defaultValue="2026-04-13" className="pl-9" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Recurrence (Years)</Label>
                  <Input type="number" defaultValue={1} className="w-full" />
                </div>
              </div>

              {/* Future Region */}
              <div className="space-y-5 bg-amber-50/30 p-4 rounded-lg shadow-sm border border-amber-100/50 relative">
                <div className="absolute -top-3 left-4 bg-white px-2 text-xs font-semibold uppercase tracking-wider text-amber-600 flex items-center gap-1.5 rounded-full border border-amber-100">
                  <ArrowRight className="w-3.5 h-3.5" /> Future
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Next Due Date</Label>
                  <div className="h-10 flex items-center px-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 font-semibold text-lg shadow-inner">
                    Apr 13, 2027
                  </div>
                  <p className="text-xs text-amber-600/80 mt-1">Calculated from Last Inspection + Recurrence</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Scheduled Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input type="date" className="pl-9 bg-white" />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Outcomes / Bottom Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Status</Label>
              <Select defaultValue="not_started">
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Completion Date</Label>
              <div className="relative">
                <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input type="date" className="pl-9" />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-sm font-medium text-slate-700">Notes</Label>
              <Textarea placeholder="Add any inspection notes or findings here..." className="min-h-[100px] resize-y" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
            <Button variant="outline">Cancel</Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white border-0">
              Update Inspection
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
