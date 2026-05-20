import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Check, Clock, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AddShiftDialog from "./AddShiftDialog";
import AssignShiftDialog from "./AssignShiftDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchShifts, addShift, updateShift, deleteShift, Shift } from "@/lib/shiftApi";
import { fetchEmployees } from "@/lib/employeeApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { applyForShift, fetchShiftApplications, ShiftApplication } from "@/lib/shiftApplicationApi";
import { useUserRole, useUser } from "@/hooks/use-user";
import { useTranslation } from "react-i18next";

interface WeeklyCalendarProps {
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
}

const WeeklyCalendar = ({ currentDate: externalDate, onDateChange }: WeeklyCalendarProps = {}) => {
  const { t } = useTranslation();
  const [internalDate, setInternalDate] = useState(new Date());
  
  // Use external date if provided, otherwise use internal state
  const currentDate = externalDate ?? internalDate;
  const setCurrentDate = onDateChange ?? setInternalDate;
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const queryClient = useQueryClient();
  const { data: shifts = [] } = useQuery({
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

  // Get current user for applications
  const { user } = useUser();
  const role = useUserRole();

  // Fetch user's applications
  const { data: myApplications = [] } = useQuery({
    queryKey: ["my-applications", user?.id],
    queryFn: () => fetchShiftApplications(undefined, user?.id),
    enabled: !!user?.id,
  });

  // Helper to get user's application for a specific shift
  const getMyApplicationForShift = (shiftId: number): ShiftApplication | undefined => {
    return myApplications.find(app => app.shift_id === shiftId);
  };

  // Fetch all applications for the selected shift (for managers to see rejected applications)
  const { data: selectedShiftApplications = [] } = useQuery({
    queryKey: ["shift-applications", selectedShift?.id],
    queryFn: () => fetchShiftApplications(selectedShift?.id),
    enabled: !!selectedShift?.id && (role === "manager" || role === "admin"),
  });

  // Get rejected applications for the selected shift
  const rejectedApplications = selectedShiftApplications.filter(
    (app: ShiftApplication) => app.status === "rejected"
  );

  const addShiftMutation = useMutation({
    mutationFn: addShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Omit<Shift, "id"> }) => updateShift(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
      setSelectedShift(null);
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: deleteShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      setSelectedShift(null);
    },
  });


  const getEmployeeName = (employeeId: string | number) => {
    const emp = employees.find((e: any) => String(e.id) === String(employeeId));
    return emp ? emp.name : "Unknown";
  };

  const handleAssignShift = async (shift: Shift, employeeId: number | null) => {
    const payload = {
      employee: employeeId,
      date: shift.date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      shift_type: shift.shift_type,
      notes: shift.notes || "",
    } as Omit<Shift, "id">;
    await updateShiftMutation.mutateAsync({ id: shift.id, payload });
  };

  // Replace setShifts([...shifts, newShift]) with API call
  const handleAddShift = async (shiftData: any) => {
    // Map shiftData to API format, normalize unassigned to null and convert ids to numbers
    const employeeValue =
      !shiftData.employee || String(shiftData.employee).toLowerCase() === 'unassigned'
        ? null
        : Number(shiftData.employee);
    const shiftPayload = {
      employee: employeeValue,
      date: shiftData.date, // YYYY-MM-DD
      start_time: shiftData.time, // HH:MM
      end_time: shiftData.end_time, // HH:MM
      shift_type: Number(shiftData.shiftType), // shift type id
      notes: shiftData.notes || "",
    } as any;
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

  // Use layouted shifts for display when available
  const allShifts = layoutedShifts.length ? layoutedShifts : mappedShifts;

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
  const [applySuccess, setApplySuccess] = useState(false);
  const [wasAutoAssigned, setWasAutoAssigned] = useState(false);

  // Import from external XML API
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importCount, setImportCount] = useState<number>(0);

  const handleApplyForShift = async (shiftId: number) => {
    if (!user || !user.id) {
      setApplyError("You must be logged in to apply for shifts");
      return;
    }
    setApplyLoading(true);
    setApplyError(null);
    setApplySuccess(false);
    setWasAutoAssigned(false);
    try {
      const response = await applyForShift(shiftId, user.id);
      setApplySuccess(true);
      setWasAutoAssigned(response.auto_assigned || false);
      setApplyLoading(false);
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
      setTimeout(() => {
        setSelectedShift(null);
        setApplySuccess(false);
        setWasAutoAssigned(false);
      }, 2000);
    } catch (err: any) {
      setApplyError(err.message || "Failed to apply for shift");
      setApplyLoading(false);
    }
  };

  // Layout constants: pixels per hour and total day height (24h)
  const HOUR_HEIGHT = 48; // px per hour
  const DAY_HEIGHT = 24 * HOUR_HEIGHT; // total height for a day column
  // Visible viewport height (how many hours are visible without scrolling)
  const VIEWPORT_HOURS = 10; // show ~10 hours by default
  const VIEWPORT_HEIGHT = VIEWPORT_HOURS * HOUR_HEIGHT;

  const DAY_COLUMN_MIN = 150;

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
      let skippedCount = 0;
      for (const s of shows) {
        // s is { start: ISO, end: ISO | null }
        try {
          const startIso = s.start;
          if (!startIso) continue;
          const dt = new Date(startIso);
          if (isNaN(dt.getTime())) continue;
          const dateStr = dt.toISOString().slice(0, 10);
          const timeStr = dt.toTimeString().slice(0, 5);

          // Check if a shift with same date and start_time already exists
          const exists = shifts.some((sh: any) => String(sh.date) === dateStr && String(sh.start_time) === timeStr);
          if (exists) {
            skippedCount += 1;
            continue;
          }

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
            employee: null, // imported shifts start unassigned
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
      if (skippedCount > 0) {
        setImportError((prev) => (prev ? prev + ` (${skippedCount} shows skipped as already imported)` : `${skippedCount} shows skipped as already imported`));
      }
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
              {t("today")}
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {(role === "manager" || role === "admin") && (
            <>
              <Button variant="outline" size="sm" onClick={handleImportShows} disabled={importing}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                {importing ? t("importing") : t("importShows")}
              </Button>
              <div className="text-sm text-muted-foreground">
                {importError && <span className="text-destructive">{importError}</span>}
                {!importError && importCount > 0 && <span>{importCount} {t("imported")}</span>}
              </div>
            </>
          )}
          {(role === "manager" || role === "admin") && (
            <AddShiftDialog onShiftAdded={handleAddShift}>
              <Button variant="hero" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                {t("addShift")}
              </Button>
            </AddShiftDialog>
          )}
        </div>
      </div>

      {/* Employee's Shifts This Week */}
      {role === "employee" && user && (() => {
        const myShiftsThisWeek = mappedShifts
          .filter((shift) => shift.employee && String(shift.employee) === String(user.id))
          .sort((a, b) => {
            // Sort by day first, then by start time
            if (a.day !== b.day) return a.day - b.day;
            return a.startMinutes - b.startMinutes;
          });
        
        const totalHours = myShiftsThisWeek.reduce((sum, shift) => sum + (shift.duration || 0), 0);
        
        return (
          <Card className="shadow-card border-green-200 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {t("yourShiftsThisWeek")}
                </h3>
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {myShiftsThisWeek.length} {myShiftsThisWeek.length === 1 ? t("shift") : t("shifts")} · {totalHours.toFixed(1)} {t("hours")}
                </Badge>
              </div>
              
              {myShiftsThisWeek.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">{t("noShiftsThisWeek")}</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {myShiftsThisWeek.map((shift) => {
                    const shiftType = shiftTypes.find((st: any) => String(st.id) === String(shift.shift_type));
                    const dayDate = weekDays[shift.day];
                    
                    return (
                      <div
                        key={shift.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-white/60 dark:bg-white/5 border border-green-100 dark:border-green-800"
                      >
                        <div
                          className="w-2 h-10 rounded-full flex-shrink-0"
                          style={{ background: shift.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {dayDate.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {shift.time} – {shift.end_time} · {shiftType?.name || t("shift")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Calendar Grid */}
      <Card className="shadow-card overflow-hidden border-0">
        <CardContent className="p-0">
          {/* top date header removed — each column has its own sticky header */}

          {/* Time slots and shifts: left sticky gutter with time labels + 7 day columns */}
          <div className="relative bg-gradient-to-b from-muted/30 to-background"> 
            <div className="flex">
              {/* Left sticky time gutter (sticky to viewport, visually distinct) */}
              <div className="sticky left-0 top-20 z-40 w-16 flex-shrink-0 border-r border-border/50">
                <div className="bg-muted/50 backdrop-blur-md">
                  <div
                    ref={(el) => (gutterRef.current = el)}
                    className="relative w-full overflow-y-auto hide-scrollbar"
                    style={{ height: VIEWPORT_HEIGHT }}
                    onScroll={(e) => handleScroll(e, 'gutter')}
                  >
                    <div className="sticky top-0 py-3 flex items-center justify-center bg-muted/80 backdrop-blur-sm border-b border-border/30">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time</div>
                    </div>
                    <div className="relative w-full" style={{ height: DAY_HEIGHT }}>
                      {Array.from({ length: 24 }, (_, h) => (
                        <div
                          key={h}
                          className="absolute left-0 right-0 text-[11px] font-medium text-muted-foreground/70 pl-2 flex items-center"
                          style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
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
                  {Array.from({ length: 7 }, (_, dayIndex) => {
                    const isToday = weekDays[dayIndex].toDateString() === new Date().toDateString();
                    const isWeekend = weekDays[dayIndex].getDay() === 0 || weekDays[dayIndex].getDay() === 6;
                    
                    return (
                    <div 
                      key={dayIndex} 
                      className={`flex-1 basis-0 border-r border-border/30 last:border-r-0 ${isWeekend ? 'bg-muted/20' : ''}`} 
                      style={{ minWidth: `${DAY_COLUMN_MIN}px` }}
                    >
                  {/* day timeline viewport (scrollable) */}
                  <div
                    ref={(el) => (dayRefs.current[dayIndex] = el)}
                    className="relative w-full overflow-y-auto hide-scrollbar"
                    style={{ height: VIEWPORT_HEIGHT }}
                    onScroll={(e) => handleScroll(e, dayIndex)}
                  >
                    {/* sticky header inside scrollable viewport */}
                    <div className={`sticky top-0 z-10 py-3 border-b border-border/30 ${isToday ? 'bg-primary/10 backdrop-blur-sm' : 'bg-muted/50 backdrop-blur-sm'}`}>
                      <div className={`text-xs font-semibold uppercase tracking-wider text-center ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                        {weekDays[dayIndex].toLocaleDateString('de-DE', { weekday: 'short' })}
                      </div>
                      <div className={`text-lg font-bold text-center ${isToday ? 'text-primary' : ''}`}>
                        {weekDays[dayIndex].getDate()}
                      </div>
                      {isToday && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                      )}
                    </div>
                    {/* inner timeline of full day height */}
                    <div className="relative w-full" style={{ height: DAY_HEIGHT }}>
                      {/* Hour lines only (labels live in left gutter) */}
                      {Array.from({ length: 24 }, (_, h) => (
                        <div
                          key={h}
                          className="absolute left-0 right-0 border-t border-border/20"
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
      const isMyShift = user && shift.employee && String(shift.employee) === String(user.id);

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
                                className={`text-white rounded-lg shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer absolute overflow-hidden border ${isMyShift ? 'ring-2 ring-offset-2 ring-green-500 border-green-400' : 'border-white/20'}`}
                                style={{ 
                                  top, 
                                  height: Math.max(height, 32), 
                                  left: `${leftPercent}%`, 
                                  width: `${widthPercent}%`, 
                                  background: `linear-gradient(135deg, ${shift.color} 0%, ${shift.color}dd 100%)`,
                                }}
                              >
                                <div className="p-2 h-full flex flex-col">
                                  {/* Time badge */}
                                  <div className="flex items-center gap-1 mb-1">
                                    <span className="text-[11px] font-bold bg-white/20 px-1.5 py-0.5 rounded">
                                      {shift.time}
                                    </span>
                                    {isMyShift && (
                                      <span className="text-[10px] bg-green-500/90 text-white px-1.5 py-0.5 rounded font-medium">
                                        ★
                                      </span>
                                    )}
                                    {!assignedName && (
                                      <span className="text-[10px] bg-yellow-500/80 text-yellow-950 px-1.5 py-0.5 rounded font-medium">
                                        Open
                                      </span>
                                    )}
                                  </div>
                                  {/* Employee name or unassigned */}
                                  <div className="text-xs font-medium truncate flex-1">
                                    {assignedName || <span className="opacity-70 italic">Unassigned</span>}
                                  </div>
                                  {/* Shift type - only show if there's enough space */}
                                  {height > 60 && (
                                    <div className="text-[10px] opacity-75 truncate mt-auto">
                                      {shiftTypes.find((t: any) => String(t.id) === String(shift.shift_type))?.name || ''}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader className="pb-4 border-b">
                                <DialogTitle className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ background: shift.color }}
                                  />
                                  {t("shiftDetails")}
                                </DialogTitle>
                              </DialogHeader>

                              {/* Shift info grid */}
                              <div className="py-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("date")}</p>
                                    <p className="font-medium">{new Date(shift.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("time")}</p>
                                    <p className="font-medium">{shift.time} – {shift.end_time}</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("employee")}</p>
                                    <p className="font-medium">{shift.employee ? getEmployeeName(String(shift.employee)) : <span className="text-muted-foreground italic">{t("unassigned")}</span>}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("shiftType")}</p>
                                    <p className="font-medium">{shiftTypes.find((st: any) => String(st.id) === String(shift.shift_type))?.name || shift.shift_type}</p>
                                  </div>
                                </div>

                                {shift.notes && (
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("notes")}</p>
                                    <p className="text-sm bg-muted/50 rounded-md p-2">{shift.notes}</p>
                                  </div>
                                )}

                                {/* Rejected applications - visible to managers */}
                                {(role === "manager" || role === "admin") && rejectedApplications.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("rejectedApplications")}</p>
                                    <div className="space-y-1">
                                      {rejectedApplications.map((app: ShiftApplication) => (
                                        <div key={app.id} className="flex items-center gap-2 text-sm bg-destructive/10 text-destructive rounded-md px-2 py-1">
                                          <X className="h-3 w-3" />
                                          <span>{getEmployeeName(app.employee_id)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="pt-4 border-t flex items-center justify-between">
                                {role !== "employee" && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => deleteShiftMutation.mutate(shift.id)}
                                    >
                                      {t("delete")}
                                    </Button>
                                    <AssignShiftDialog
                                      employees={employees as any}
                                      currentAssignment={shift.employee as any}
                                      onAssign={(empId) => handleAssignShift(shift as any, empId as any)}
                                    >
                                      <Button variant="default" size="sm">{t("assignUnassign")}</Button>
                                    </AssignShiftDialog>
                                  </>
                                )}
                                {role === "employee" && !shift.employee && (() => {
                                  const myApp = getMyApplicationForShift(shift.id);
                                  
                                  // Show success message right after applying
                                  if (applySuccess) {
                                    return (
                                      <div className={`flex items-center gap-2 ${wasAutoAssigned ? 'text-green-600' : 'text-amber-600'}`}>
                                        <Check className="h-4 w-4" />
                                        <span className="text-sm font-medium">
                                          {wasAutoAssigned ? t("shiftAssignedToYou") : t("applicationSubmittedForApproval")}
                                        </span>
                                      </div>
                                    );
                                  }
                                  
                                  // Already has a pending application
                                  if (myApp && myApp.status === 'pending') {
                                    return (
                                      <div className="flex items-center gap-2 text-amber-600">
                                        <Clock className="h-4 w-4" />
                                        <span className="text-sm font-medium">{t("applicationPending")}</span>
                                      </div>
                                    );
                                  }
                                  
                                  // Application was rejected
                                  if (myApp && myApp.status === 'rejected') {
                                    return (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <span className="text-sm">{t("applicationRejected")}</span>
                                      </div>
                                    );
                                  }
                                  
                                  // No application yet - show apply button
                                  return (
                                    <Button variant="default" size="sm" onClick={() => handleApplyForShift(shift.id)} disabled={applyLoading}>
                                      {applyLoading ? t("applying") : t("applyForShift")}
                                    </Button>
                                  );
                                })()}
                                {role === "employee" && shift.employee && (() => {
                                  const isMyShift = user && String(shift.employee) === String(user.id);
                                  const myApp = getMyApplicationForShift(shift.id);
                                  
                                  if (isMyShift && myApp?.auto_assigned) {
                                    return (
                                      <div className="flex items-center gap-2 text-green-600">
                                        <CheckCircle className="h-4 w-4" />
                                        <span className="text-sm font-medium">{t("autoAssignedToYou")}</span>
                                      </div>
                                    );
                                  }
                                  
                                  if (isMyShift) {
                                    return (
                                      <div className="flex items-center gap-2 text-green-600">
                                        <CheckCircle className="h-4 w-4" />
                                        <span className="text-sm font-medium">{t("assignedToYou")}</span>
                                      </div>
                                    );
                                  }
                                  
                                  return <p className="text-sm text-muted-foreground italic">{t("shiftAlreadyAssigned")}</p>;
                                })()}
                              </div>
                              {applyError && <div className="text-destructive text-xs mt-2">{applyError}</div>}
                            </DialogContent>
                          </Dialog>
                        );
                      })}
                    </div>

                  </div>

                  {/* Add shift button (show for manager/admin even if shifts exist) */}
                  {(role === "manager" || role === "admin") && (
                    <div className="p-2">
                      <AddShiftDialog selectedDate={new Date(weekDays[dayIndex])} onShiftAdded={handleAddShift}>
                        <button className="w-full h-10 border-2 border-dashed border-muted/50 hover:border-primary hover:bg-primary/5 rounded-lg transition-all duration-200 flex items-center justify-center text-muted-foreground hover:text-primary group">
                          <Plus className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        </button>
                      </AddShiftDialog>
                    </div>
                  )}
                </div>
                  )})}
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