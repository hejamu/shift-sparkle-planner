import { useTranslation } from "react-i18next";
import { Check, CheckCircle, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AssignShiftDialog from "./AssignShiftDialog";
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
  rejectedApplications: ShiftApplication[];
  myApplication: ShiftApplication | undefined;
  applyLoading: boolean;
  applySuccess: boolean;
  wasAutoAssigned: boolean;
  applyError: string | null;
  onApply: (shiftId: number) => void;
  onDelete: (shiftId: number) => void;
  onAssign: (shift: Shift, employeeId: number | null) => void;
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
  rejectedApplications,
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

  const availablePercent = 100 - GUTTER_PERCENT;
  const widthPercent = Math.max(6, availablePercent / shift.colCount - 1);
  const leftPercent = GUTTER_PERCENT / 2 + shift.colIndex * (availablePercent / shift.colCount);

  const shiftTypeName = shiftTypes.find((st) => String(st.id) === String(shift.shift_type))?.name ?? '';

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: shift.color }} />
            {t("shiftDetails")}
          </DialogTitle>
        </DialogHeader>

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
              <p className="font-medium">{shiftTypeName || shift.shift_type}</p>
            </div>
          </div>

          {shift.notes && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("notes")}</p>
              <p className="text-sm bg-muted/50 rounded-md p-2">{shift.notes}</p>
            </div>
          )}

          {(role === "manager" || role === "admin") && rejectedApplications.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("rejectedApplications")}</p>
              <div className="space-y-1">
                {rejectedApplications.map((app) => (
                  <div key={app.id} className="flex items-center gap-2 text-sm bg-destructive/10 text-destructive rounded-md px-2 py-1">
                    <X className="h-3 w-3" />
                    <span>{getEmployeeName(app.employee_id)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t flex items-center justify-between">
          {role !== "employee" ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(shift.id)}
              >
                {t("delete")}
              </Button>
              <AssignShiftDialog
                employees={employees as any}
                currentAssignment={shift.employee as any}
                onAssign={(empId) => onAssign(shift, empId as number | null)}
              >
                <Button variant="default" size="sm">{t("assignUnassign")}</Button>
              </AssignShiftDialog>
            </>
          ) : (
            renderEmployeeActions()
          )}
        </div>
        {applyError && <div className="text-destructive text-xs mt-2">{applyError}</div>}
      </DialogContent>
    </Dialog>
  );
};

export default ShiftEntry;
