import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon } from "lucide-react";
import type { LaidOutShift, ShiftType } from "@/lib/shiftLayout";

type Props = {
  userId: number | undefined;
  shifts: LaidOutShift[];
  weekDays: Date[];
  shiftTypes: ShiftType[];
};

const EmployeeShiftsCard = ({ userId, shifts, weekDays, shiftTypes }: Props) => {
  const { t } = useTranslation();

  if (userId === undefined) return null;

  const mine = shifts
    .filter((shift) => shift.employee && String(shift.employee) === String(userId))
    .sort((a, b) => (a.day !== b.day ? a.day - b.day : a.startMinutes - b.startMinutes));

  const totalHours = mine.reduce((sum, shift) => sum + (shift.duration || 0), 0);

  return (
    <Card className="shadow-card border-green-200 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            {t("yourShiftsThisWeek")}
          </h3>
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            {mine.length} {mine.length === 1 ? t("shift") : t("shifts")} · {totalHours.toFixed(1)} {t("hours")}
          </Badge>
        </div>

        {mine.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{t("noShiftsThisWeek")}</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {mine.map((shift) => {
              const shiftType = shiftTypes.find((st) => String(st.id) === String(shift.shift_type));
              const dayDate = weekDays[shift.day];
              return (
                <div
                  key={shift.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-white/60 dark:bg-white/5 border border-green-100 dark:border-green-800"
                >
                  <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ background: shift.color }} />
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
};

export default EmployeeShiftsCard;
