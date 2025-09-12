import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Plus, Filter, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddShiftDialog from "./AddShiftDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchShifts, addShift, updateShift, deleteShift, Shift } from "@/lib/shiftApi";
import { fetchEmployees } from "@/lib/employeeApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { applyForShift } from "@/lib/shiftApplicationApi";

const WeeklyCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const queryClient = useQueryClient();
  const { data: shifts = [], isLoading, error } = useQuery({
    queryKey: ["shifts"],
    queryFn: fetchShifts,
  });

  const { data: shiftTypes = [] } = useQuery({
    queryKey: ["shiftTypes"],
    queryFn: async () => {
      const res = await fetch('/api/shift-types');
      if (!res.ok) throw new Error('Failed to fetch shift types');
      return res.json();
    }
  });

    // Fetch employees for name lookup
    const { data: employees = [] } = useQuery({
      queryKey: ["employees"],
      queryFn: fetchEmployees,
    });

  const addShiftMutation = useMutation({
    mutationFn: addShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: deleteShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      setSelectedShift(null);
    },
  });


  // Color rotation for new shifts
  const shiftColors = [
    "bg-primary",
    "bg-accent", 
    "bg-success",
    "bg-warning",
    "bg-destructive",
  ];

    // Helper to get employee name by id
    const getEmployeeName = (employeeId: string | number) => {
      const emp = employees.find((e: any) => String(e.id) === String(employeeId));
      return emp ? emp.name : "Unknown";
    };

  const getNextShiftColor = () => {
    return shiftColors[shifts.length % shiftColors.length];
  };

  // Replace setShifts([...shifts, newShift]) with API call
  const handleAddShift = async (shiftData: any) => {
    // Map shiftData to API format
    const shiftPayload = {
      employee: shiftData.employee, // employee id
      date: shiftData.date, // YYYY-MM-DD
  start_time: shiftData.time, // HH:MM
  end_time: shiftData.end_time, // HH:MM
  shift_type: shiftData.shiftType, // shift type id
      notes: shiftData.notes || "",
    };
    await addShiftMutation.mutateAsync(shiftPayload);
  };
  
  // Get the start of the week (Thursday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    // Thursday is 4, so calculate how many days to subtract to get to Thursday
    const diff = d.getDate() - ((day + 7 - 4) % 7);
    return new Date(d.setDate(diff));
  };

  const weekStart = getWeekStart(currentDate);
  // Create week days starting from Thursday
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

  // Filter shifts to only those in the current week
  const weekStartDate = new Date(weekStart);
  const weekEndDate = new Date(weekStart);
  weekEndDate.setDate(weekStart.getDate() + 6);

  const mappedShifts = shifts
    .filter((shift) => {
      const shiftDate = new Date(shift.date);
      return shiftDate >= weekStartDate && shiftDate <= weekEndDate;
    })
    .map((shift) => {
      const shiftDate = new Date(shift.date);
      // Calculate day index for Thursday week start
      const day = ((shiftDate.getDay() + 7 - 4) % 7);
      // Get shift type info (color) from shiftTypes and compute duration from start/end
      const st = shiftTypes.find((t: any) => String(t.id) === String(shift.shift_type));
  const color = st ? st.color : "#60a5fa";
      let duration = 8;
      try {
        const [sh, sm] = (shift.start_time || "00:00").split(":").map((s: string) => parseInt(s, 10));
        const [eh, em] = (shift.end_time || "00:00").split(":").map((s: string) => parseInt(s, 10));
        const startMinutes = (isNaN(sh) ? 0 : sh) * 60 + (isNaN(sm) ? 0 : sm);
        const endMinutes = (isNaN(eh) ? 0 : eh) * 60 + (isNaN(em) ? 0 : em);
        const diff = (endMinutes - startMinutes) / 60;
        duration = diff > 0 ? diff : 8;
      } catch (e) {
        duration = 8;
      }
      return {
        ...shift,
        day,
        time: shift.start_time,
  end_time: shift.end_time,
  duration,
  color,
  startMinutes: (() => {
    const [sh, sm] = (shift.start_time || "00:00").split(":").map((s: string) => parseInt(s, 10));
    return (isNaN(sh) ? 0 : sh) * 60 + (isNaN(sm) ? 0 : sm);
  })(),
  endMinutes: (() => {
    const [eh, em] = (shift.end_time || "00:00").split(":").map((s: string) => parseInt(s, 10));
    return (isNaN(eh) ? 0 : eh) * 60 + (isNaN(em) ? 0 : em);
  })(),
      };
    });

  // Compute overlap layout per day so overlapping shifts are shown side-by-side
  const layoutedShifts = (() => {
    const byDay: Record<number, any[]> = {};
    mappedShifts.forEach((s: any) => {
      (byDay[s.day] ||= []).push(s);
    });

    const result: any[] = [];

    Object.keys(byDay).forEach((k) => {
      const list = byDay[Number(k)].slice().sort((a: any, b: any) => a.startMinutes - b.startMinutes);

      // Build overlapping clusters
      const clusters: any[][] = [];
      let current: any[] = [];
      let currentMax = -1;
      list.forEach((s: any) => {
        if (current.length === 0) {
          current.push(s);
          currentMax = s.endMinutes;
        } else {
          if (s.startMinutes < currentMax) {
            current.push(s);
            currentMax = Math.max(currentMax, s.endMinutes);
          } else {
            clusters.push(current);
            current = [s];
            currentMax = s.endMinutes;
          }
        }
      });
      if (current.length) clusters.push(current);

      // Assign columns per cluster
      clusters.forEach((cluster) => {
        const colsEnd: number[] = [];
        const assignments: { shift: any; col: number }[] = [];
        const sorted = cluster.slice().sort((a: any, b: any) => a.startMinutes - b.startMinutes);
        sorted.forEach((s: any) => {
          let placed = false;
          for (let ci = 0; ci < colsEnd.length; ci++) {
            if (s.startMinutes >= colsEnd[ci]) {
              assignments.push({ shift: s, col: ci });
              colsEnd[ci] = s.endMinutes;
              placed = true;
              break;
            }
          }
          if (!placed) {
            const ci = colsEnd.length;
            colsEnd.push(s.endMinutes);
            assignments.push({ shift: s, col: ci });
          }
        });

        const colCount = Math.max(1, colsEnd.length);
        assignments.forEach((a) => {
          result.push({ ...a.shift, _colIndex: a.col, _colCount: colCount });
        });
      });
    });

    return result;
  })();

  // Debug: log all loaded shifts and mapped shifts
  console.log("Loaded shifts from backend:", shifts);
  console.log("Mapped shifts for calendar:", mappedShifts);
  console.log("Layouted shifts for calendar:", layoutedShifts);

  // Use layouted shifts for display when available
  const allShifts = layoutedShifts.length ? layoutedShifts : mappedShifts;

  const formatDateHeader = (date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    return {
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: date.getDate(),
      isToday,
    };
  };

  // Helper to get ISO week number (Kalenderwoche)
  const getISOWeek = (date: Date) => {
    const tempDate = new Date(date.getTime());
    tempDate.setHours(0, 0, 0, 0);
    // Thursday in current week decides the year
    tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
    // January 4th is always in week 1
    const week1 = new Date(tempDate.getFullYear(), 0, 4);
    // Adjust to Thursday in week 1
    week1.setDate(week1.getDate() + 3 - ((week1.getDay() + 6) % 7));
    // Calculate full weeks to this date
    return 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3) / 7);
  };

  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Import from external XML API
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importCount, setImportCount] = useState<number>(0);

  // For demo: hardcoded current employee id
  const currentEmployeeId = 1;

  const handleApplyForShift = async (shiftId: number) => {
    setApplyLoading(true);
    setApplyError(null);
    try {
      await applyForShift(shiftId, currentEmployeeId);
      setApplyLoading(false);
      setSelectedShift(null);
    } catch (err: any) {
      setApplyError(err.message || "Failed to apply for shift");
      setApplyLoading(false);
    }
  };

  const getUserRole = () => {
    try {
      const user = localStorage.getItem("user");
      if (user) {
        return JSON.parse(user).role;
      }
    } catch {}
    return null;
  };

  const role = getUserRole();

  // Layout constants: pixels per hour and total day height (24h)
  const HOUR_HEIGHT = 48; // px per hour
  const DAY_HEIGHT = 24 * HOUR_HEIGHT; // total height for a day column
  // Visible viewport height (how many hours are visible without scrolling)
  const VIEWPORT_HOURS = 10; // show ~10 hours by default
  const VIEWPORT_HEIGHT = VIEWPORT_HOURS * HOUR_HEIGHT;

  // Layout sizing for responsive columns
  const DAY_COLUMN_MIN = 150; // px minimum per day column
  const GUTTER_WIDTH = 64; // px width of the left time gutter (w-16)

  // Refs to each day's scrollable viewport so we can set default scroll position
  const dayRefs = useRef<Array<HTMLDivElement | null>>([]);
  const gutterRef = useRef<HTMLDivElement | null>(null);

  // Ref to prevent recursive programmatic scroll events
  const isSyncingRef = useRef(false);

  const handleScroll = (e: any, sourceIndex: number | 'gutter') => {
    if (isSyncingRef.current) return;
    const scrollTop = e.currentTarget.scrollTop;
    isSyncingRef.current = true;

    // Sync day columns
    dayRefs.current.forEach((el, idx) => {
      if (el && sourceIndex !== idx) el.scrollTop = scrollTop;
    });

    // Sync gutter if a day triggered the scroll
    if (gutterRef.current && sourceIndex !== 'gutter') {
      gutterRef.current.scrollTop = scrollTop;
    }

    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  };

  // On mount, scroll all day viewports and gutter to 14:00
  useEffect(() => {
    const startHour = 14; // default start view
    const scrollTop = startHour * HOUR_HEIGHT;
    dayRefs.current.forEach((el) => {
      if (el) el.scrollTop = scrollTop;
    });
    if (gutterRef.current) gutterRef.current.scrollTop = scrollTop;
  }, []);

  // Handler: fetch XML from Cinetixx and create shifts from SHOW_BEGINNING tags
  const handleImportShows = async () => {
    setImporting(true);
    setImportError(null);
    setImportCount(0);
    try {
      const res = await fetch('/api/proxy/cinetixx-shows');
      if (!res.ok) throw new Error('Failed to fetch shows from server proxy');
  const data = await res.json();
  const shows: { start: string; end?: string | null }[] = data.shows || [];
      if (shows.length === 0) {
        setImportError('No shows returned from proxy');
        setImporting(false);
        return;
      }

      let successCount = 0;
      for (const s of shows) {
        // s is { start: ISO, end: ISO | null }
        try {
          const startIso = s.start;
          if (!startIso) continue;
          const dt = new Date(startIso);
          if (isNaN(dt.getTime())) continue;
          const dateStr = dt.toISOString().slice(0, 10);
          const timeStr = dt.toTimeString().slice(0, 5);
          let endTimeStr: string;
          if (s.end) {
            const endDt = new Date(s.end);
            endTimeStr = endDt.toTimeString().slice(0,5);
          } else {
            // fallback to +8h
            const endDt = new Date(dt);
            endDt.setHours(endDt.getHours() + 8);
            endTimeStr = endDt.toTimeString().slice(0,5);
          }
          const payload = {
            employee: currentEmployeeId,
            date: dateStr,
            start_time: timeStr,
            end_time: endTimeStr,
            shift_type: 1,
            notes: `Imported from Cinetixx (SHOW_BEGINNING=${startIso})`,
          } as any;
          await addShiftMutation.mutateAsync(payload);
          successCount += 1;
        } catch (err) {
          console.warn('Failed to import show', s, err);
        }
      }

      setImportCount(successCount);
      setImporting(false);
    } catch (err: any) {
      setImportError(err.message || String(err));
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-foreground">
            KW {getISOWeek(weekStart)} / {weekStart.getFullYear()}
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
          {(role === "manager" || role === "admin") && (
            <>
              <Button variant="outline" size="sm" onClick={handleImportShows} disabled={importing}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                {importing ? 'Importing...' : 'Import Shows'}
              </Button>
              <div className="text-sm text-muted-foreground">
                {importError && <span className="text-destructive">{importError}</span>}
                {!importError && importCount > 0 && <span>{importCount} imported</span>}
              </div>
            </>
          )}
          {(role === "manager" || role === "admin") && (
            <AddShiftDialog onShiftAdded={handleAddShift}>
              <Button variant="hero" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Shift
              </Button>
            </AddShiftDialog>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          {/* top date header removed — each column has its own sticky header */}

          {/* Time slots and shifts: left sticky gutter with time labels + 7 day columns */}
          <div className="relative"> 
            <div className="flex">
              {/* Left sticky time gutter (sticky to viewport, visually distinct) */}
              <div className="sticky left-0 top-20 z-40 w-16 mr-3 flex-shrink-0">{/* top-20 assumes header height; adjust if needed */}
                <div className="bg-background/90 backdrop-blur-sm border-r border-muted/10 rounded-md shadow-sm">
                  <div
                    ref={(el) => (gutterRef.current = el)}
                    className="relative w-full overflow-y-auto hide-scrollbar"
                    style={{ height: VIEWPORT_HEIGHT }}
                    onScroll={(e) => handleScroll(e, 'gutter')}
                  >
                    <div className="sticky top-0 py-2 flex items-center justify-center">
                      <div className="text-sm font-medium text-muted-foreground">Time</div>
                    </div>
                    <div className="relative w-full" style={{ height: DAY_HEIGHT }}>
                      {Array.from({ length: 24 }, (_, h) => (
                        <div
                          key={h}
                          className="absolute left-0 right-0 text-xs text-muted-foreground pl-3"
                          style={{ top: h * HOUR_HEIGHT }}
                        >
                          {String(h).padStart(2, '0')}:00
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Horizontally scrollable days container. Gutter stays pinned on the left. */}
              <div className="flex-1 overflow-x-auto">
                <div className="flex" style={{ minWidth: `${7 * DAY_COLUMN_MIN}px` }}>
                  {Array.from({ length: 7 }, (_, dayIndex) => (
                    <div key={dayIndex} className="flex-1 basis-0" style={{ minWidth: `${DAY_COLUMN_MIN}px` }}>
                  {/* day timeline viewport (scrollable) */}
                  <div
                    ref={(el) => (dayRefs.current[dayIndex] = el)}
                    className="relative w-full overflow-y-auto hide-scrollbar"
                    style={{ height: VIEWPORT_HEIGHT }}
                    onScroll={(e) => handleScroll(e, dayIndex)}
                  >
                    {/* sticky header inside scrollable viewport */}
                    <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 py-2">
                      <div className="text-sm font-medium text-muted-foreground text-center">{weekDays[dayIndex].toLocaleDateString('de-DE', { weekday: 'short' })}</div>
                      <div className="text-lg font-semibold text-center">{weekDays[dayIndex].toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</div>
                    </div>
                    {/* inner timeline of full day height */}
                    <div className="relative w-full" style={{ height: DAY_HEIGHT }}>
                      {/* Hour lines only (labels live in left gutter) */}
                      {Array.from({ length: 24 }, (_, h) => (
                        <div
                          key={h}
                          className={`absolute left-0 right-0 border-t border-dashed border-transparent/20`}
                          style={{ top: h * HOUR_HEIGHT }}
                        />
                      ))}

                      {allShifts
                        .filter((shift) => shift.day === dayIndex)
                        .map((shift) => {
                          // parse shift.time "HH:MM"
                          const [hh, mm] = (shift.time || "00:00").split(":").map((s: string) => parseInt(s, 10));
                          const startMinutes = (isNaN(hh) ? 0 : hh) * 60 + (isNaN(mm) ? 0 : mm);
                          const top = (startMinutes / 60) * HOUR_HEIGHT;
                          const height = (shift.duration || 8) * HOUR_HEIGHT;
      const assignedName = shift.employee ? getEmployeeName(String(shift.employee)) : null;

      // column layout for overlapping shifts
      const colIndex = (shift as any)._colIndex ?? 0;
      const colCount = (shift as any)._colCount ?? 1;
      const gutterPercent = 4; // total left+right gutter
      const availablePercent = 100 - gutterPercent; // percent available for columns
      const widthPercent = Math.max(6, availablePercent / colCount - 1);
      const leftPercent = (gutterPercent / 2) + colIndex * (availablePercent / colCount);

      return (
                          <Dialog key={shift.id} open={selectedShift?.id === shift.id} onOpenChange={(open) => setSelectedShift(open ? shift : null)}>
                            <DialogTrigger asChild>
                                <div
                                className={`text-white p-2 rounded-md shadow-sm hover:shadow-hover transition-smooth cursor-pointer absolute overflow-hidden`}
                                style={{ top, height, left: `${leftPercent}%`, width: `${widthPercent}%`, background: shift.color }}
                              >
        {/* Show only start time on the compact card */}
        <div className="text-xs font-medium mb-1">{shift.time}</div>
        {/* Show assignment status: employee name or Unassigned */}
        <div className="text-xs">{assignedName ? `Assigned: ${assignedName}` : 'Unassigned'}</div>
        <div className="text-xs opacity-90">{shift.shift_type}</div>
                              </div>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Shift Details</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-2">
                                <div><strong>Date:</strong> {shift.date}</div>
                                <div><strong>Time:</strong> {shift.time} - {shift.end_time}</div>
                                <div><strong>Employee:</strong> {getEmployeeName(String(shift.employee))}</div>
                                <div><strong>Shift Type:</strong> {shift.shift_type}</div>
                                {shift.notes && <div><strong>Notes:</strong> {shift.notes}</div>}
                              </div>
                              {role !== "employee" && (
                                <Button variant="destructive" onClick={() => deleteShiftMutation.mutate(shift.id)}>
                                  Delete Shift
                                </Button>
                              )}
                              {role === "employee" && (
                                <Button variant="outline" onClick={() => handleApplyForShift(shift.id)} disabled={applyLoading}>
                                  {applyLoading ? "Applying..." : "Apply for Shift"}
                                </Button>
                              )}
                              {applyError && <div className="text-destructive text-xs mt-2">{applyError}</div>}
                            </DialogContent>
                          </Dialog>
                        );
                      })}
                    </div>

                  </div>

                  {/* Add shift button (show for manager/admin even if shifts exist) */}
                  {(role === "manager" || role === "admin") && (
                    <div className="mt-2">
                      <AddShiftDialog selectedDate={new Date(weekDays[dayIndex])} onShiftAdded={handleAddShift}>
                        <button className="w-full h-12 border-2 border-dashed border-muted hover:border-primary hover:bg-primary/5 rounded-md transition-smooth flex items-center justify-center text-muted-foreground hover:text-primary">
                          <Plus className="h-4 w-4" />
                        </button>
                      </AddShiftDialog>
                    </div>
                  )}
                </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeeklyCalendar;