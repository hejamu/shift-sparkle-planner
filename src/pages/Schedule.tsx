import Header from "@/components/layout/Header";
import ScheduleStats from "@/components/schedule/ScheduleStats";
import WeeklyCalendar from "@/components/schedule/WeeklyCalendar";

const Schedule = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Schedule</h1>
            <p className="text-muted-foreground mt-1">
              Manage your team's shifts and coverage
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