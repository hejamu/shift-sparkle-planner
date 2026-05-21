import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchShiftApplications, ShiftApplication } from "@/lib/shiftApplicationApi";
import { fetchShifts } from "@/lib/shiftApi";
import { fetchEmployees } from "@/lib/employeeApi";
import { getISOWeek, getWeekEnd, getWeekStart } from "@/lib/week";
import type { ShiftType } from "@/lib/shiftLayout";
import { useShiftApplicationActions } from "@/hooks/use-shift-application-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Clock, User, Calendar, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface ShiftApplicationsManagerProps {
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
}

const ShiftApplicationsManager = ({ currentDate: externalDate, onDateChange }: ShiftApplicationsManagerProps = {}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { approve, reject } = useShiftApplicationActions();
  const [internalDate, setInternalDate] = useState(new Date());
  
  // Use external date if provided, otherwise use internal state
  const currentDate = externalDate ?? internalDate;
  const setCurrentDate = onDateChange ?? setInternalDate;

  const weekStart = getWeekStart(currentDate);
  const weekEnd = getWeekEnd(currentDate);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  const { data: applications = [], isLoading: loadingApps } = useQuery({
    queryKey: ["shift-applications"],
    queryFn: () => fetchShiftApplications(),
  });

  const { data: shifts = [], isLoading: loadingShifts } = useQuery({
    queryKey: ["shifts"],
    queryFn: fetchShifts,
  });

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: fetchEmployees,
  });

  const { data: shiftTypes = [] } = useQuery<ShiftType[]>({
    queryKey: ["shiftTypes"],
    queryFn: async () => {
      const res = await fetch('/api/shift-types');
      if (!res.ok) throw new Error('Failed to fetch shift types');
      return res.json();
    }
  });

  const getEmployeeName = (id: number) => {
    const emp = employees.find((e) => e.id === id);
    return emp?.name || `Employee #${id}`;
  };

  const getShift = (id: number) => shifts.find((s) => s.id === id);

  const getShiftTypeName = (typeId: number) => {
    const st = shiftTypes.find((t) => t.id === typeId);
    return st?.name || `Type #${typeId}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
  };

  const isInCurrentWeek = (dateStr: string) => {
    const shiftDate = new Date(dateStr);
    shiftDate.setHours(0, 0, 0, 0);
    return shiftDate >= weekStart && shiftDate <= weekEnd;
  };

  // Pending applications for current week only
  const pendingApplications = applications.filter((a) => {
    if (a.status !== "pending") return false;
    const shift = getShift(a.shift_id);
    return shift && isInCurrentWeek(shift.date);
  });

  // Open (unassigned) shifts for current week only
  const openShifts = shifts.filter((s) => s.employee === null && isInCurrentWeek(s.date));

  // Group applications by shift
  const applicationsByShift = pendingApplications.reduce((acc, app) => {
    if (!acc[app.shift_id]) acc[app.shift_id] = [];
    acc[app.shift_id].push(app);
    return acc;
  }, {} as Record<number, ShiftApplication[]>);

  const handleApprove = async (application: ShiftApplication) => {
    const shift = getShift(application.shift_id);
    if (!shift) return;
    try {
      await approve.mutateAsync({ application, shift });
      toast({ title: t("applicationApproved"), description: t("shiftAssignedToEmployee") });
    } catch {
      toast({ title: t("error"), description: t("failedToUpdateApplication"), variant: "destructive" });
    }
  };

  const handleReject = async (application: ShiftApplication) => {
    try {
      await reject.mutateAsync(application);
      toast({ title: t("applicationRejected") });
    } catch {
      toast({ title: t("error"), description: t("failedToUpdateApplication"), variant: "destructive" });
    }
  };

  const isLoading = loadingApps || loadingShifts || loadingEmployees;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t("loading")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week Navigation Header */}
      <div className="flex items-center justify-between">
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

      <Tabs defaultValue="applications" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="applications" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {t("applications")}
            {pendingApplications.length > 0 && (
              <Badge variant="secondary" className="ml-1">{pendingApplications.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="open-shifts" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {t("openShifts")}
            {openShifts.length > 0 && (
              <Badge variant="outline" className="ml-1">{openShifts.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Applications Tab */}
        <TabsContent value="applications" className="mt-4">
          {pendingApplications.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t("noApplicationsThisWeek")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(applicationsByShift).map(([shiftIdStr, apps]) => {
                const shiftId = Number(shiftIdStr);
                const shift = getShift(shiftId);
                if (!shift || !isInCurrentWeek(shift.date)) return null;

                return (
                  <Card key={shiftId}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDate(shift.date)} • {shift.start_time} – {shift.end_time}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {getShiftTypeName(shift.shift_type)}
                          </p>
                        </div>
                        <Badge variant="outline">{apps.length} {apps.length !== 1 ? t("applicants") : t("applicant")}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {apps.map((app) => (
                          <div
                            key={app.id}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{getEmployeeName(app.employee_id)}</p>
                                <p className="text-xs text-muted-foreground">
                                  Applied {new Date(app.created_at).toLocaleDateString('de-DE')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => handleReject(app)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(app)}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                {t("approve")}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Open Shifts Tab */}
        <TabsContent value="open-shifts" className="mt-4">
          {openShifts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Check className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t("allShiftsAssigned")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {openShifts
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((shift) => {
                  const appsForShift = applications.filter(
                    (a) => a.shift_id === shift.id && a.status === "pending"
                  );

                  return (
                    <Card key={shift.id} className="overflow-hidden">
                      <div className="flex items-center">
                        <div
                          className="w-1.5 self-stretch"
                          style={{
                            background: shiftTypes.find((st) => st.id === shift.shift_type)?.color || '#60a5fa',
                          }}
                        />
                        <div className="flex-1 p-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {formatDate(shift.date)} • {shift.start_time} – {shift.end_time}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {getShiftTypeName(shift.shift_type)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {appsForShift.length > 0 ? (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {appsForShift.length} {appsForShift.length !== 1 ? t("applicants") : t("applicant")}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                {t("noApplicants")}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ShiftApplicationsManager;
