import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Filter, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddShiftDialog from "./AddShiftDialog";

interface Shift {
  id: number;
  employee: string;
  role: string;
  start: string;
  end: string;
  day: number;
  color: string;
  location?: string;
}

const WeeklyCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);

  // Employee data for mapping IDs to names
  const employees = [
    { id: "1", name: "Sarah Johnson" },
    { id: "2", name: "Mike Chen" },
    { id: "3", name: "Emily Davis" },
    { id: "4", name: "David Wilson" },
    { id: "5", name: "Lisa Brown" },
    { id: "6", name: "John Smith" },
    { id: "7", name: "Anna Garcia" },
  ];

  const getEmployeeName = (id: string) => {
    return employees.find(emp => emp.id === id)?.name || "Unknown Employee";
  };

  // Color rotation for new shifts
  const shiftColors = [
    "bg-primary",
    "bg-accent", 
    "bg-success",
    "bg-warning",
    "bg-destructive",
  ];

  const getNextShiftColor = () => {
    return shiftColors[shifts.length % shiftColors.length];
  };

  const handleAddShift = (shiftData: any) => {
    const shiftDate = new Date(shiftData.date);
    const dayOfWeek = shiftDate.getDay();
    
    const newShift: Shift = {
      id: shifts.length + 1,
      employee: getEmployeeName(shiftData.employee),
      role: shiftData.role,
      start: new Date(`2000-01-01T${shiftData.startTime}`).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      end: new Date(`2000-01-01T${shiftData.endTime}`).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit', 
        hour12: false,
      }),
      day: dayOfWeek,
      color: getNextShiftColor(),
      location: shiftData.location,
    };

    setShifts([...shifts, newShift]);
  };
  
  // Get the start of the week (Sunday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const weekStart = getWeekStart(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    return day;
  });

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  // Sample static shift data
  const staticShifts: Shift[] = [
    {
      id: 1,
      employee: "Sarah Johnson",
      role: "Manager",
      start: "08:00",
      end: "16:00",
      day: 1, // Monday
      color: "bg-primary",
    },
    {
      id: 2,
      employee: "Mike Chen",
      role: "Sales",
      start: "10:00",
      end: "18:00",
      day: 1,
      color: "bg-accent",
    },
    {
      id: 3,
      employee: "Emily Davis",
      role: "Cashier",
      start: "14:00",
      end: "22:00",
      day: 2, // Tuesday
      color: "bg-success",
    },
    {
      id: 4,
      employee: "David Wilson",
      role: "Stock",
      start: "06:00",
      end: "14:00",
      day: 3, // Wednesday
      color: "bg-warning",
    },
    {
      id: 5,
      employee: "Lisa Brown",
      role: "Cashier",
      start: "12:00",
      end: "20:00",
      day: 4, // Thursday
      color: "bg-accent",
    },
  ];

  // Combine static shifts with dynamic shifts for display
  const allShifts = [...staticShifts, ...shifts];

  const formatDateHeader = (date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    return {
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: date.getDate(),
      isToday,
    };
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-foreground">
            {weekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Select defaultValue="week">
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          
          <AddShiftDialog onShiftAdded={handleAddShift}>
            <Button variant="hero" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Shift
            </Button>
          </AddShiftDialog>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b">
            {weekDays.map((day, index) => {
              const { dayName, dayNumber, isToday } = formatDateHeader(day);
              return (
                <div
                  key={index}
                  className={`p-4 border-r last:border-r-0 text-center ${
                    isToday ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    {dayName}
                  </div>
                  <div
                    className={`text-lg font-semibold ${
                      isToday ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {dayNumber}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time slots and shifts */}
          <div className="grid grid-cols-7 min-h-96">
            {Array.from({ length: 7 }, (_, dayIndex) => (
              <div
                key={dayIndex}
                className="border-r last:border-r-0 p-2 space-y-2 min-h-96"
              >
                {allShifts
                  .filter((shift) => shift.day === dayIndex)
                  .map((shift) => (
                    <div
                      key={shift.id}
                      className={`${shift.color} text-white p-2 rounded-md shadow-sm hover:shadow-hover transition-smooth cursor-pointer`}
                    >
                      <div className="text-xs font-medium mb-1">
                        {shift.start} - {shift.end}
                      </div>
                      <div className="text-xs">{shift.employee}</div>
                      <div className="text-xs opacity-90">{shift.role}</div>
                      {shift.location && (
                        <div className="text-xs opacity-75">{shift.location}</div>
                      )}
                    </div>
                  ))}
                
                {/* Add shift button for empty days */}
                {allShifts.filter((shift) => shift.day === dayIndex).length === 0 && (
                  <AddShiftDialog 
                    selectedDate={weekDays[dayIndex]} 
                    onShiftAdded={handleAddShift}
                  >
                    <button className="w-full h-12 border-2 border-dashed border-muted hover:border-primary hover:bg-primary/5 rounded-md transition-smooth flex items-center justify-center text-muted-foreground hover:text-primary">
                      <Plus className="h-4 w-4" />
                    </button>
                  </AddShiftDialog>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeeklyCalendar;