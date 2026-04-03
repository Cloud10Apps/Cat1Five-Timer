import { useState } from "react";
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
import { X, CalendarIcon, Clock } from "lucide-react";

export function CompactInspector() {
  const [type, setType] = useState("CAT1");
  const [status, setStatus] = useState("Not Started");
  const [recurrence, setRecurrence] = useState("1");
  const [lastDate, setLastDate] = useState("2026-04-13");
  const [scheduledDate, setScheduledDate] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <h2 className="text-lg font-semibold text-neutral-900">Edit Inspection</h2>
          <button className="text-neutral-400 hover:text-neutral-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 flex flex-col gap-6">
          {/* 3-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-6">
            {/* Row 1 */}
            <div className="space-y-2">
              <Label htmlFor="type" className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type" className="w-full h-10 bg-neutral-50 border-neutral-200">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CAT1">CAT1 Annual</SelectItem>
                  <SelectItem value="CAT5">CAT5 5-Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status" className="w-full h-10 bg-neutral-50 border-neutral-200">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not Started">Not Started</SelectItem>
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurrence" className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Recurrence (Years)</Label>
              <div className="relative">
                <Input
                  id="recurrence"
                  type="number"
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value)}
                  className="w-full h-10 bg-neutral-50 border-neutral-200 pl-10"
                />
                <Clock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Row 2 */}
            <div className="space-y-2">
              <Label htmlFor="lastDate" className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Last Inspection</Label>
              <div className="relative">
                <Input
                  id="lastDate"
                  type="date"
                  value={lastDate}
                  onChange={(e) => setLastDate(e.target.value)}
                  className="w-full h-10 bg-neutral-50 border-neutral-200 pl-10"
                />
                <CalendarIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledDate" className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Scheduled Date</Label>
              <div className="relative">
                <Input
                  id="scheduledDate"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full h-10 bg-neutral-50 border-neutral-200 pl-10"
                />
                <CalendarIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="completionDate" className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Completion Date</Label>
              <div className="relative">
                <Input
                  id="completionDate"
                  type="date"
                  value={completionDate}
                  onChange={(e) => setCompletionDate(e.target.value)}
                  className="w-full h-10 bg-neutral-50 border-neutral-200 pl-10"
                />
                <CalendarIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>

          {/* Next Due Highlight Bar */}
          <div className="w-full h-16 bg-amber-500 rounded-lg flex items-center justify-between px-6 shadow-inner mt-2">
            <span className="text-amber-50 font-bold tracking-widest text-sm uppercase">Next Due</span>
            <span className="text-white font-bold text-2xl tracking-tight">Apr 13, 2027</span>
          </div>

          {/* Notes */}
          <div className="space-y-2 mt-2">
            <Label htmlFor="notes" className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any relevant inspection notes..."
              className="min-h-[100px] resize-none bg-neutral-50 border-neutral-200"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-end gap-3">
          <Button variant="outline" className="text-neutral-600 border-neutral-300 hover:bg-neutral-100">
            Cancel
          </Button>
          <Button className="bg-amber-500 hover:bg-amber-600 text-white font-medium px-6">
            Update Inspection
          </Button>
        </div>
      </div>
    </div>
  );
}
