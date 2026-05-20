import { useState } from "react";
import Header from "@/components/layout/Header";
import WeeklyCalendar from "@/components/schedule/WeeklyCalendar";
import ShiftApplicationsManager from "@/components/schedule/ShiftApplicationsManager";
import { useTranslation } from "react-i18next";
import { useUserRole } from "@/hooks/use-user";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, ClipboardList } from "lucide-react";

const Schedule = () => {
  const { t } = useTranslation();
  const role = useUserRole();
  const isManagerOrAdmin = role === "manager" || role === "admin";
  const [currentDate, setCurrentDate] = useState(new Date());

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

        {isManagerOrAdmin ? (
          <Tabs defaultValue="calendar" className="mt-6">
            <TabsList>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t("calendar")}
              </TabsTrigger>
              <TabsTrigger value="applications" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                {t("applicationsAndOpenShifts")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="calendar" className="mt-4">
              <WeeklyCalendar currentDate={currentDate} onDateChange={setCurrentDate} />
            </TabsContent>
            <TabsContent value="applications" className="mt-4">
              <ShiftApplicationsManager currentDate={currentDate} onDateChange={setCurrentDate} />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="mt-6">
            <WeeklyCalendar currentDate={currentDate} onDateChange={setCurrentDate} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Schedule;