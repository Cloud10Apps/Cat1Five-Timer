import { useState } from "react";
import { useListInspections, getListInspectionsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import dayjs from "dayjs";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/status-badge";
import { InspectionTypeBadge } from "@/components/inspection-type-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);

  const startOfMonth = currentDate.startOf('month');
  const endOfMonth = currentDate.endOf('month');
  
  const { data: inspections, isLoading } = useListInspections(
    { 
      month: currentDate.month() + 1,
      year: currentDate.year()
    },
    { query: { queryKey: getListInspectionsQueryKey({ month: currentDate.month() + 1, year: currentDate.year() }) } }
  );

  const prevMonth = () => setCurrentDate(currentDate.subtract(1, 'month'));
  const nextMonth = () => setCurrentDate(currentDate.add(1, 'month'));

  // Generate calendar grid
  const startDay = startOfMonth.day(); // 0 is Sunday
  const daysInMonth = endOfMonth.date();
  
  const calendarDays = [];
  
  // Fill in blanks for previous month
  for (let i = 0; i < startDay; i++) {
    calendarDays.push(null);
  }
  
  // Fill in days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(currentDate.date(i));
  }

  const getDayInspections = (date: dayjs.Dayjs) => {
    if (!inspections) return [];
    return inspections.filter(insp => {
      if (insp.status === 'COMPLETED' && insp.completionDate) {
        return dayjs(insp.completionDate).isSame(date, 'day');
      } else if (insp.scheduledDate) {
        return dayjs(insp.scheduledDate).isSame(date, 'day');
      } else if (insp.nextDueDate) {
        return dayjs(insp.nextDueDate).isSame(date, 'day');
      }
      return false;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-green-500";
      case "OVERDUE": return "bg-red-500";
      case "IN_PROGRESS": return "bg-yellow-500";
      case "SCHEDULED": return "bg-blue-500";
      default: return "bg-gray-400";
    }
  };

  const selectedDayInspections = selectedDate ? getDayInspections(selectedDate) : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">Inspection schedule and due dates.</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-lg min-w-[140px] text-center">
            {currentDate.format("MMMM YYYY")}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="p-0 flex-1 flex flex-col">
          {isLoading && !inspections ? (
            <div className="flex-1 flex items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-7 grid-rows-[auto_1fr] bg-border border-b">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="bg-card py-2 text-center text-sm font-semibold border-b border-r">
                  {day}
                </div>
              ))}
              
              {/* Using a grid to fill the remaining space evenly */}
              <div className="col-span-7 grid grid-cols-7 auto-rows-fr h-full">
                {calendarDays.map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="bg-muted/30 border-r border-b p-2 min-h-[100px]" />;
                  }
                  
                  const isToday = dayjs().isSame(date, 'day');
                  const dayInspections = getDayInspections(date);
                  
                  return (
                    <div 
                      key={date.format()} 
                      className={`bg-card border-r border-b p-2 min-h-[100px] cursor-pointer hover:bg-muted/50 transition-colors ${isToday ? 'bg-primary/5' : ''}`}
                      onClick={() => setSelectedDate(date)}
                    >
                      <div className={`font-medium text-sm flex h-6 w-6 items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground' : ''}`}>
                        {date.date()}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {dayInspections.slice(0, 4).map((insp) => (
                          <div 
                            key={insp.id} 
                            className={`h-2.5 w-2.5 rounded-full ${getStatusColor(insp.status)}`}
                            title={`${insp.elevatorName} - ${insp.status}`}
                          />
                        ))}
                        {dayInspections.length > 4 && (
                          <span className="text-xs text-muted-foreground">+{dayInspections.length - 4}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {selectedDate?.format("dddd, MMMM D, YYYY")}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {selectedDayInspections.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No inspections scheduled or due on this date.
              </div>
            ) : (
              <div className="space-y-4 pr-4 py-2">
                {selectedDayInspections.map(insp => (
                  <div key={insp.id} className="border rounded-lg p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-lg">{insp.elevatorName}</h4>
                        <div className="text-sm text-muted-foreground">{insp.buildingName}</div>
                      </div>
                      <StatusBadge status={insp.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <div className="flex items-center gap-2"><span className="text-muted-foreground">Type:</span> <InspectionTypeBadge type={insp.inspectionType} /></div>
                      <div><span className="text-muted-foreground">Customer:</span> {insp.customerName}</div>
                      {insp.scheduledDate && <div><span className="text-muted-foreground">Scheduled:</span> {dayjs(insp.scheduledDate).format("MMM D")}</div>}
                      {insp.nextDueDate && <div><span className="text-muted-foreground">Due:</span> {dayjs(insp.nextDueDate).format("MMM D")}</div>}
                    </div>
                    {insp.notes && (
                      <div className="mt-2 text-sm bg-muted/50 p-2 rounded border">
                        <span className="font-semibold block mb-1">Notes:</span>
                        {insp.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}