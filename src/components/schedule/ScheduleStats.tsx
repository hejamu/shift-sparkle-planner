import { Users, Clock, Calendar, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { fetchEmployees } from "@/lib/employeeApi";
import { fetchShifts } from "@/lib/shiftApi";

const ScheduleStats = () => {
  const { data: employees = [], isLoading: empLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: fetchEmployees,
  });
  // Calculate start and end of current week (Thursday-based, like WeeklyCalendar)
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - ((day + 7 - 4) % 7);
    return new Date(d.setDate(diff));
  };
  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["shifts"],
    queryFn: fetchShifts,
  });

  // Coverage calculation: percentage of future shifts with employee assigned
  const futureShifts = shifts.filter((shift: any) => new Date(shift.date) >= now);
  const weekShifts = shifts.filter((shift: any) => {
    const shiftDate = new Date(shift.date);
    return shiftDate >= weekStart && shiftDate <= weekEnd;
  });
  const assignedShifts = futureShifts.filter((shift: any) => !!shift.employee);
  const coveragePercent = futureShifts.length > 0 ? Math.round((assignedShifts.length / futureShifts.length) * 100) : 0;
  const openShifts = futureShifts.length - assignedShifts.length;

  const stats = [
    {
      title: "This Week",
      value: isLoading ? "..." : `${weekShifts.length} shifts`,
      subtext: "",
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Scheduled Hours",
      value: "318 hrs",
      subtext: "avg 45.4/employee",
      icon: Clock,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Coverage",
      value: isLoading ? "..." : `${coveragePercent}%`,
      subtext: isLoading ? "" : `${openShifts} open shifts`,
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "On Schedule",
      value: empLoading ? "..." : `${employees.filter((e: any) => e.active).length} people`,
      subtext: "",
      icon: Users,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <Card key={stat.title} className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {stat.title}
                </p>
                <p className="text-xl font-bold text-foreground mb-1">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stat.subtext}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ScheduleStats;