import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, CheckCircle, Clock, UserMinus, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useShiftApplicationActions } from "@/hooks/use-shift-application-actions";
import type { Shift } from "@/lib/shiftApi";
import type { ShiftApplication } from "@/lib/shiftApplicationApi";
import type { LaidOutShift, ShiftType } from "@/lib/shiftLayout";
import type { EmployeeApi } from "@/lib/employeeApi";
import type { Role } from "@/hooks/use-user";

const GUTTER_PERCENT = 4;

type Props = {
  shift: LaidOutShift;
  top: number;
  height: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isMyShift: boolean;
  assignedName: string | null;
  shiftTypes: ShiftType[];
  employees: EmployeeApi[];
  role: Role | null;
  shiftApplications: ShiftApplication[];
  myApplication: ShiftApplication | undefined;
  applyLoading: boolean;
  applySuccess: boolean;
  wasAutoAssigned: boolean;
  applyError: string | null;
  onApply: (shiftId: number) => void;
  onDelete: (shiftId: number) => void;
  onAssign: (shift: Shift, employeeId: number | null) => Promise<void> | void;
  getEmployeeName: (id: string | number) => string;
};

const ShiftEntry = ({
  shift,
  top,
  height,
  isOpen,
  onOpenChange,
  isMyShift,
  assignedName,
  shiftTypes,
  employees,
  role,
  shiftApplications,
  myApplication,
  applyLoading,
  applySuccess,
  wasAutoAssigned,
  applyError,
  onApply,
  onDelete,
  onAssign,
  getEmployeeName,
}: Props) => {
  const { t } = useTranslation();
  const { approve, reject } = useShiftApplicationActions();
  const isManagerOrAdmin = role === "manager" || role === "admin";

  const availablePercent = 100 - GUTTER_PERCENT;
  const widthPercent = Math.max(6, availablePercent / shift.colCount - 1);
  const leftPercent = GUTTER_PERCENT / 2 + shift.colIndex * (availablePercent / shift.colCount);

  const shiftTypeName = shiftTypes.find((st) => String(st.id) === String(shift.shift_type))?.name ?? '';

  const pendingApplications = shiftApplications.filter((a) => a.status === "pending");
  const rejectedApplications = shiftApplications.filter((a) => a.status === "rejected");
  // Employees not currently assigned and not in pending applicants — candidates for direct assignment.
  const pendingIds = new Set(pendingApplications.map((a) => a.employee_id));
  const directAssignCandidates = employees.filter(
    (e) => Number(e.id) !== shift.employee && !pendingIds.has(Number(e.id)),
  );

  const renderEmployeeActions = () => {
    if (!shift.employee) {
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
      if (myApplication?.status === 'pending') {
        return (
          <div className="flex items-center gap-2 text-amber-600">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">{t("applicationPending")}</span>
          </div>
        );
      }
      if (myApplication?.status === 'rejected') {
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-sm">{t("applicationRejected")}</span>
          </div>
        );
      }
      return (
        <Button variant="default" size="sm" onClick={() => onApply(shift.id)} disabled={applyLoading}>
          {applyLoading ? t("applying") : t("applyForShift")}
        </Button>
      );
    }

    if (isMyShift && myApplication?.auto_assigned) {
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
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[11px] font-bold bg-white/20 px-1.5 py-0.5 rounded">{shift.time}</span>
              {isMyShift && <span className="text-[10px] bg-green-500/90 text-white px-1.5 py-0.5 rounded font-medium">★</span>}
              {!assignedName && <span className="text-[10px] bg-yellow-500/80 text-yellow-950 px-1.5 py-0.5 rounded font-medium">{t("open")}</span>}
              {isManagerOrAdmin && pendingApplications.length > 0 && (
                <span className="text-[10px] bg-blue-500/90 text-white px-1.5 py-0.5 rounded font-medium">
                  {pendingApplications.length}
                </span>
              )}
            </div>
            <div className="text-xs font-medium truncate flex-1">
              {assignedName || <span className="opacity-70 italic">{t("unassigned")}</span>}
            </div>
            {height > 60 && shiftTypeName && (
              <div className="text-[10px] opacity-75 truncate mt-auto">{shiftTypeName}</div>
            )}
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: shift.color }} />
            {new Date(shift.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' })}
            <span className="text-muted-foreground font-normal">·</span>
            <span className="text-muted-foreground font-normal">{shift.time} – {shift.end_time}</span>
            {shiftTypeName && (
              <>
                <span className="text-muted-foreground font-normal">·</span>
                <span className="text-muted-foreground font-normal">{shiftTypeName}</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {shift.notes && (
            <p className="text-sm bg-muted/50 rounded-md p-2">{shift.notes}</p>
          )}

          {isManagerOrAdmin ? (
            <ManagerAssignmentPanel
              shift={shift}
              employees={employees}
              pendingApplications={pendingApplications}
              rejectedApplications={rejectedApplications}
              directAssignCandidates={directAssignCandidates}
              getEmployeeName={getEmployeeName}
              onAssign={onAssign}
              approve={approve}
              reject={reject}
            />
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("employee")}</p>
              <p className="font-medium">
                {shift.employee
                  ? getEmployeeName(String(shift.employee))
                  : <span className="text-muted-foreground italic">{t("unassigned")}</span>}
              </p>
            </div>
          )}
        </div>

        <div className="pt-3 border-t flex items-center justify-between">
          {isManagerOrAdmin ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(shift.id)}
            >
              {t("delete")}
            </Button>
          ) : (
            <div className="flex-1">{renderEmployeeActions()}</div>
          )}
        </div>
        {applyError && <div className="text-destructive text-xs mt-2">{applyError}</div>}
      </DialogContent>
    </Dialog>
  );
};

// --- Manager inline panel ---

type ManagerProps = {
  shift: LaidOutShift;
  employees: EmployeeApi[];
  pendingApplications: ShiftApplication[];
  rejectedApplications: ShiftApplication[];
  directAssignCandidates: EmployeeApi[];
  getEmployeeName: (id: string | number) => string;
  onAssign: (shift: Shift, employeeId: number | null) => Promise<void> | void;
  approve: ReturnType<typeof useShiftApplicationActions>["approve"];
  reject: ReturnType<typeof useShiftApplicationActions>["reject"];
};

const ManagerAssignmentPanel = ({
  shift,
  pendingApplications,
  rejectedApplications,
  directAssignCandidates,
  getEmployeeName,
  onAssign,
  approve,
  reject,
}: ManagerProps) => {
  const { t } = useTranslation();
  const [directPick, setDirectPick] = useState<string>("");

  const handleDirectAssign = async () => {
    if (!directPick) return;
    await onAssign(shift, Number(directPick));
    setDirectPick("");
  };

  return (
    <>
      {/* Currently assigned */}
      <section className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("assignedTo")}</p>
        {shift.employee ? (
          <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium">{getEmployeeName(String(shift.employee))}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onAssign(shift, null)}
            >
              <UserMinus className="h-4 w-4 mr-1" />
              {t("unassign")}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">{t("unassigned")}</p>
        )}
      </section>

      {/* Pending applicants */}
      {pendingApplications.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {t("pendingApplications")} · {pendingApplications.length}
          </p>
          <div className="space-y-1.5">
            {pendingApplications.map((app) => (
              <div key={app.id} className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2">
                <span className="text-sm font-medium">{getEmployeeName(app.employee_id)}</span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => reject.mutate(app)}
                    disabled={reject.isPending || approve.isPending}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => approve.mutate({ application: app, shift })}
                    disabled={approve.isPending || reject.isPending}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    {t("approve")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Direct assignment */}
      {directAssignCandidates.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("assignDirectly")}</p>
          <div className="flex items-center gap-2">
            <Select value={directPick} onValueChange={setDirectPick}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={t("selectEmployee")} />
              </SelectTrigger>
              <SelectContent>
                {directAssignCandidates.map((emp) => (
                  <SelectItem key={String(emp.id)} value={String(emp.id)}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleDirectAssign} disabled={!directPick}>
              <UserPlus className="h-4 w-4 mr-1" />
              {t("assign")}
            </Button>
          </div>
        </section>
      )}

      {/* Rejected (informational) */}
      {rejectedApplications.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("rejectedApplications")}</p>
          <div className="flex flex-wrap gap-1">
            {rejectedApplications.map((app) => (
              <span
                key={app.id}
                className="inline-flex items-center gap-1 text-xs bg-destructive/10 text-destructive rounded-full px-2 py-0.5"
              >
                <X className="h-3 w-3" />
                {getEmployeeName(app.employee_id)}
              </span>
            ))}
          </div>
        </section>
      )}
    </>
  );
};

export default ShiftEntry;
