import React from "react";
import { X, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

export function StatusDashboard() {
  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4 font-sans">
      <Card className="w-full max-w-2xl bg-white shadow-xl border-neutral-200 rounded-xl overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <h2 className="text-lg font-semibold text-neutral-900">Edit Inspection</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-neutral-900 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-8">
          
          {/* Summary Strip - "Status-First Dashboard" */}
          <div className="bg-amber-50/50 border border-amber-100/50 rounded-xl p-5 flex items-center justify-between shadow-sm">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-amber-900/60 uppercase tracking-wider">Current Status</span>
              <div>
                <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-transparent px-3 py-1 shadow-sm text-sm">
                  Not Started
                </Badge>
              </div>
            </div>
            
            <div className="text-right space-y-1">
              <span className="text-xs font-medium text-amber-900/60 uppercase tracking-wider">Next Due Date</span>
              <div className="text-3xl font-bold text-amber-950 tracking-tight">
                Apr 13, 2027
              </div>
            </div>
          </div>

          {/* 2-Column Grid for Editables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
            
            {/* Column 1 */}
            <div className="space-y-2">
              <Label htmlFor="type" className="text-neutral-700">Type</Label>
              <Select defaultValue="cat1">
                <SelectTrigger id="type" className="bg-white">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cat1">CAT1 Annual</SelectItem>
                  <SelectItem value="cat5">CAT5 5-Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurrence" className="text-neutral-700">Recurrence (Years)</Label>
              <Input id="recurrence" type="number" defaultValue="1" className="bg-white" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-neutral-700">Status</Label>
              <Select defaultValue="not-started">
                <SelectTrigger id="status" className="bg-white">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not-started">Not Started</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Column 2 */}
            <div className="space-y-2">
              <Label htmlFor="last-date" className="text-neutral-700">Last Inspection Date</Label>
              <div className="relative">
                <Input id="last-date" type="date" defaultValue="2026-04-13" className="bg-white" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled-date" className="text-neutral-700">Scheduled Date</Label>
              <div className="relative">
                <Input id="scheduled-date" type="date" className="bg-white text-neutral-400" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="completion-date" className="text-neutral-700">Completion Date</Label>
              <div className="relative">
                <Input id="completion-date" type="date" className="bg-white text-neutral-400" />
              </div>
            </div>
          </div>

          {/* Full Width Notes */}
          <div className="space-y-2 pt-2">
            <Label htmlFor="notes" className="text-neutral-700">Notes</Label>
            <Textarea 
              id="notes" 
              placeholder="Add any relevant notes or context for this inspection..." 
              className="min-h-[100px] resize-y bg-white" 
            />
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-neutral-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-neutral-100">
          <Button variant="outline" className="border-neutral-200 text-neutral-700 hover:bg-neutral-100">
            Cancel
          </Button>
          <Button className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm font-medium border-transparent">
            Update Inspection
          </Button>
        </div>

      </Card>
    </div>
  );
}
