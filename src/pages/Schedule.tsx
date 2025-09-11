import Header from "@/components/layout/Header";
import ScheduleStats from "@/components/schedule/ScheduleStats";
import WeeklyCalendar from "@/components/schedule/WeeklyCalendar";
import { useTranslation } from "react-i18next";

const Schedule = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("schedule")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("manage_shifts")}
            </p>
          </div>
        </div>
        <ScheduleStats />
        <WeeklyCalendar />
      </main>
    </div>
  );
};

export default Schedule;