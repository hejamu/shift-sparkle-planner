import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AddShiftDialog from "./AddShiftDialog";
import EmployeeShiftsCard from "./EmployeeShiftsCard";
import ShiftEntry from "./ShiftEntry";

import { addShift, deleteShift, fetchShifts, Shift, updateShift } from "@/lib/shiftApi";
import { fetchEmployees } from "@/lib/employeeApi";
import { applyForShift, fetchShiftApplications, ShiftApplication } from "@/lib/shiftApplicationApi";
import { getISOWeek, getWeekEnd, getWeekStart } from "@/lib/week";
import { layoutShiftsForWeek, ShiftType } from "@/lib/shiftLayout";
import { useUser, useUserRole } from "@/hooks/use-user";

const HOUR_HEIGHT = 48;
const DAY_HEIGHT = 24 * HOUR_HEIGHT;
const VIEWPORT_HOURS = 10;
const VIEWPORT_HEIGHT = VIEWPORT_HOURS * HOUR_HEIGHT;
const DAY_COLUMN_MIN = 150;
const DEFAULT_SCROLL_HOUR = 14;

interface WeeklyCalendarProps {
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
}

const WeeklyCalendar = ({ currentDate: externalDate, onDateChange }: WeeklyCalendarProps = {}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const role = useUserRole();

  const [internalDate, setInternalDate] = useState(new Date());
  const currentDate = externalDate ?? internalDate;
  const setCurrentDate = onDateChange ?? setInternalDate;

  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  const { data: shifts = [] } = useQuery({ queryKey: ["shifts"], queryFn: fetchShifts });
  const { data: shiftTypes = [] } = useQuery<ShiftType[]>({
    queryKey: ["shiftTypes"],
    queryFn: async () => {
      const res = await fetch('/api/shift-types');
      if (!res.ok) throw new Error('Failed to fetch shift types');
      return res.json();
    },
  });
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: fetchEmployees });
  const { data: myApplications = [] } = useQuery({
    queryKey: ["my-applications", user?.id],
    queryFn: () => fetchShiftApplications(undefined, user?.id),
    enabled: !!user?.id,
  });
  const { data: selectedShiftApplications = [] } = useQuery({
    queryKey: ["shift-applications", selectedShift?.id],
    queryFn: () => fetchShiftApplications(selectedShift?.id),
    enabled: !!selectedShift?.id && (role === "manager" || role === "admin"),
  });

  const rejectedApplications = selectedShiftApplications.filter(
    (app: ShiftApplication) => app.status === "rejected",
  );

  const addShiftMutation = useMutation({
    mutationFn: addShift,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shifts"] }),
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
  const getMyApplicationForShift = (shiftId: number) =>
    myApplications.find((app) => app.shift_id === shiftId);

  const handleAssignShift = async (shift: Shift, employeeId: number | null) => {
    await updateShiftMutation.mutateAsync({
      id: shift.id,
      payload: {
        employee: employeeId,
        date: shift.date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        shift_type: shift.shift_type,
        notes: shift.notes || "",
      },
    });
  };

  const handleAddShift = async (shiftData: any) => {
    const employeeValue =
      !shiftData.employee || String(shiftData.employee).toLowerCase() === 'unassigned'
        ? null
        : Number(shiftData.employee);
    await addShiftMutation.mutateAsync({
      employee: employeeValue,
      date: shiftData.date,
      start_time: shiftData.time,
      end_time: shiftData.end_time,
      shift_type: Number(shiftData.shiftType),
      notes: shiftData.notes || "",
    });
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

  const laidOutShifts = layoutShiftsForWeek(shifts, weekStart, shiftTypes);

  // Apply flow state (employee).
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState(false);
  const [wasAutoAssigned, setWasAutoAssigned] = useState(false);

  const handleApplyForShift = async (shiftId: number) => {
    if (!user?.id) {
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

  // Cinetixx import.
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importCount, setImportCount] = useState(0);

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

      const weekEnd = getWeekEnd(currentDate);

      let successCount = 0;
      let skippedCount = 0;
      let outOfWeekCount = 0;
      for (const s of shows) {
        try {
          const startIso = s.start;
          if (!startIso) continue;
          const dt = new Date(startIso);
          if (isNaN(dt.getTime())) continue;
          if (dt < weekStart || dt > weekEnd) {
            outOfWeekCount += 1;
            continue;
          }
          const dateStr = dt.toISOString().slice(0, 10);
          const timeStr = dt.toTimeString().slice(0, 5);

          const exists = shifts.some((sh: any) => String(sh.date) === dateStr && String(sh.start_time) === timeStr);
          if (exists) {
            skippedCount += 1;
            continue;
          }

          let endTimeStr: string;
          if (s.end) {
            endTimeStr = new Date(s.end).toTimeString().slice(0, 5);
          } else {
            const endDt = new Date(dt);
            endDt.setHours(endDt.getHours() + 8);
            endTimeStr = endDt.toTimeString().slice(0, 5);
          }

          await addShiftMutation.mutateAsync({
            employee: null,
            date: dateStr,
            start_time: timeStr,
            end_time: endTimeStr,
            shift_type: 1,
            notes: `Imported from Cinetixx (SHOW_BEGINNING=${startIso})`,
          });
          successCount += 1;
        } catch (err) {
          console.warn('Failed to import show', s, err);
        }
      }
      setImportCount(successCount);
      const notes: string[] = [];
      if (skippedCount > 0) notes.push(`${skippedCount} already imported`);
      if (outOfWeekCount > 0) notes.push(`${outOfWeekCount} outside current week`);
      if (notes.length > 0) setImportError(notes.join('; '));
      setImporting(false);
    } catch (err: any) {
      setImportError(err.message || String(err));
      setImporting(false);
    }
  };

  // Scroll sync between the gutter and each day column.
  const dayRefs = useRef<Array<HTMLDivElement | null>>([]);
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const isSyncingRef = useRef(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>, sourceIndex: number | 'gutter') => {
    if (isSyncingRef.current) return;
    const scrollTop = e.currentTarget.scrollTop;
    isSyncingRef.current = true;
    dayRefs.current.forEach((el, idx) => {
      if (el && sourceIndex !== idx) el.scrollTop = scrollTop;
    });
    if (gutterRef.current && sourceIndex !== 'gutter') {
      gutterRef.current.scrollTop = scrollTop;
    }
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  };

  useEffect(() => {
    const scrollTop = DEFAULT_SCROLL_HOUR * HOUR_HEIGHT;
    dayRefs.current.forEach((el) => {
      if (el) el.scrollTop = scrollTop;
    });
    if (gutterRef.current) gutterRef.current.scrollTop = scrollTop;
  }, []);

  const isManagerOrAdmin = role === "manager" || role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-foreground">
            KW {getISOWeek(weekStart)} / {weekStart.getFullYear()}
          </h2>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              {t("today")}
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {isManagerOrAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={handleImportShows} disabled={importing}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                {importing ? t("importing") : t("importShows")}
              </Button>
              <div className="text-sm text-muted-foreground">
                {importError && <span className="text-destructive">{importError}</span>}
                {!importError && importCount > 0 && <span>{importCount} {t("imported")}</span>}
              </div>
              <AddShiftDialog onShiftAdded={handleAddShift}>
                <Button variant="hero" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("addShift")}
                </Button>
              </AddShiftDialog>
            </>
          )}
        </div>
      </div>

      {role === "employee" && user && (
        <EmployeeShiftsCard
          userId={user.id}
          shifts={laidOutShifts}
          weekDays={weekDays}
          shiftTypes={shiftTypes}
        />
      )}

      <Card className="shadow-card overflow-hidden border-0">
        <CardContent className="p-0">
          <div className="relative bg-gradient-to-b from-muted/30 to-background">
            <div className="flex">
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

              <div className="flex-1 overflow-x-auto">
                <div className="flex" style={{ minWidth: `${7 * DAY_COLUMN_MIN}px` }}>
                  {Array.from({ length: 7 }, (_, dayIndex) => {
                    const dayDate = weekDays[dayIndex];
                    const isToday = dayDate.toDateString() === new Date().toDateString();
                    const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;

                    return (
                      <div
                        key={dayIndex}
                        className={`flex-1 basis-0 border-r border-border/30 last:border-r-0 ${isWeekend ? 'bg-muted/20' : ''}`}
                        style={{ minWidth: `${DAY_COLUMN_MIN}px` }}
                      >
                        <div
                          ref={(el) => (dayRefs.current[dayIndex] = el)}
                          className="relative w-full overflow-y-auto hide-scrollbar"
                          style={{ height: VIEWPORT_HEIGHT }}
                          onScroll={(e) => handleScroll(e, dayIndex)}
                        >
                          <div className={`sticky top-0 z-10 py-3 border-b border-border/30 ${isToday ? 'bg-primary/10 backdrop-blur-sm' : 'bg-muted/50 backdrop-blur-sm'}`}>
                            <div className={`text-xs font-semibold uppercase tracking-wider text-center ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                              {dayDate.toLocaleDateString('de-DE', { weekday: 'short' })}
                            </div>
                            <div className={`text-lg font-bold text-center ${isToday ? 'text-primary' : ''}`}>
                              {dayDate.getDate()}
                            </div>
                            {isToday && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
                          </div>

                          <div className="relative w-full" style={{ height: DAY_HEIGHT }}>
                            {Array.from({ length: 24 }, (_, h) => (
                              <div
                                key={h}
                                className="absolute left-0 right-0 border-t border-border/20"
                                style={{ top: h * HOUR_HEIGHT }}
                              />
                            ))}

                            {laidOutShifts
                              .filter((shift) => shift.day === dayIndex)
                              .map((shift) => {
                                const top = (shift.startMinutes / 60) * HOUR_HEIGHT;
                                const height = (shift.duration || 8) * HOUR_HEIGHT;
                                const assignedName = shift.employee ? getEmployeeName(String(shift.employee)) : null;
                                const isMyShift = Boolean(user && shift.employee && String(shift.employee) === String(user.id));
                                return (
                                  <ShiftEntry
                                    key={shift.id}
                                    shift={shift}
                                    top={top}
                                    height={height}
                                    isOpen={selectedShift?.id === shift.id}
                                    onOpenChange={(open) => setSelectedShift(open ? shift : null)}
                                    isMyShift={isMyShift}
                                    assignedName={assignedName}
                                    shiftTypes={shiftTypes}
                                    employees={employees}
                                    role={role}
                                    rejectedApplications={rejectedApplications}
                                    myApplication={getMyApplicationForShift(shift.id)}
                                    applyLoading={applyLoading}
                                    applySuccess={applySuccess}
                                    wasAutoAssigned={wasAutoAssigned}
                                    applyError={applyError}
                                    onApply={handleApplyForShift}
                                    onDelete={(id) => deleteShiftMutation.mutate(id)}
                                    onAssign={handleAssignShift}
                                    getEmployeeName={getEmployeeName}
                                  />
                                );
                              })}
                          </div>
                        </div>

                        {isManagerOrAdmin && (
                          <div className="p-2">
                            <AddShiftDialog selectedDate={new Date(weekDays[dayIndex])} onShiftAdded={handleAddShift}>
                              <button className="w-full h-10 border-2 border-dashed border-muted/50 hover:border-primary hover:bg-primary/5 rounded-lg transition-all duration-200 flex items-center justify-center text-muted-foreground hover:text-primary group">
                                <Plus className="h-4 w-4 group-hover:scale-110 transition-transform" />
                              </button>
                            </AddShiftDialog>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
