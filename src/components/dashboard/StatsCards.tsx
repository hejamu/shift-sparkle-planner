import { Users, Clock, Calendar, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { fetchEmployees } from "@/lib/employeeApi";
import { fetchShifts, type Shift } from "@/lib/shiftApi";
import { fetchShiftApplications, type ShiftApplication } from "@/lib/shiftApplicationApi";

const StatsCards = () => {
  const { data: employees = [], isLoading: loadingEmployees } = useQuery({ queryKey: ["employees"], queryFn: fetchEmployees });
  const { data: shifts = [], isLoading: loadingShifts } = useQuery<Shift[]>({ queryKey: ["shifts"], queryFn: fetchShifts });
  const { data: applications = [], isLoading: loadingApps } = useQuery<ShiftApplication[]>({ queryKey: ["shift-applications"], queryFn: () => fetchShiftApplications() });

  const totalEmployeesValue = loadingEmployees ? "..." : String(employees.length || 0);

  // Helpers for date calculations
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;

  const startOfWeek = (() => {
    const t = new Date(today);
    // Set start of week to Monday (0=Sun..6=Sat)
    const day = t.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // moves to Monday
    t.setDate(t.getDate() + diff);
    t.setHours(0, 0, 0, 0);
    return t;
  })();
  const endOfWeek = (() => {
    const e = new Date(startOfWeek);
    e.setDate(e.getDate() + 6);
    e.setHours(23, 59, 59, 999);
    return e;
  })();

  const startOfLastWeek = (() => {
    const s = new Date(startOfWeek);
    s.setDate(s.getDate() - 7);
    return s;
  })();
  const endOfLastWeek = (() => {
    const e = new Date(endOfWeek);
    e.setDate(e.getDate() - 7);
    return e;
  })();

  const toDate = (dateStr: string) => new Date(`${dateStr}T00:00:00`);
  const toDateTime = (dateStr: string, timeStr: string) => new Date(`${dateStr}T${timeStr}:00`);
  const hoursBetween = (startIso: Date, endIso: Date) => Math.max(0, (endIso.getTime() - startIso.getTime()) / (1000 * 60 * 60));

  const weekHours = !loadingShifts
    ? shifts
        .filter((s) => {
          const dt = toDate(s.date);
          return dt >= startOfWeek && dt <= endOfWeek;
        })
        .reduce((acc, s) => acc + hoursBetween(toDateTime(s.date, s.start_time), toDateTime(s.date, s.end_time)), 0)
    : 0;

  const lastWeekHours = !loadingShifts
    ? shifts
        .filter((s) => {
          const dt = toDate(s.date);
          return dt >= startOfLastWeek && dt <= endOfLastWeek;
        })
        .reduce((acc, s) => acc + hoursBetween(toDateTime(s.date, s.start_time), toDateTime(s.date, s.end_time)), 0)
    : 0;

  const weekHoursValue = loadingShifts ? "..." : weekHours.toFixed(1).replace(/\.0$/, "");
  const weekHoursChange = !loadingShifts
    ? (lastWeekHours > 0
        ? `${(((weekHours - lastWeekHours) / lastWeekHours) * 100).toFixed(0)}% from last week`
        : "vs last week")
    : "";

  const todaysShifts = !loadingShifts ? shifts.filter((s) => s.date === todayStr) : [];
  const shiftsTodayValue = loadingShifts ? "..." : String(todaysShifts.length);

  const pendingToday = !loadingApps && !loadingShifts
    ? applications.filter((a) => a.status === "pending" && todaysShifts.some((ts) => ts.id === a.shift_id)).length
    : 0;
  const shiftsTodayChange = loadingApps || loadingShifts ? "" : `${pendingToday} pending`;

  const HOURLY_RATE = 15; // USD per hour (adjust as needed)
  const laborCost = weekHours * HOURLY_RATE;
  const lastLaborCost = lastWeekHours * HOURLY_RATE;
  const currencyFmt = (n: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
  const laborCostValue = loadingShifts ? "..." : currencyFmt(laborCost);
  const laborCostChange = !loadingShifts
    ? (lastLaborCost > 0
        ? `${(((laborCost - lastLaborCost) / lastLaborCost) * 100).toFixed(0)}% from last week`
        : "vs last week")
    : "";

  const stats = [
    {
      title: "Total Employees",
      value: totalEmployeesValue,
      change: "+2 this week",
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Hours This Week",
      value: weekHoursValue,
      change: weekHoursChange,
      icon: Clock,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Shifts Today",
      value: shiftsTodayValue,
      change: shiftsTodayChange,
      icon: Calendar,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Labor Cost",
      value: laborCostValue,
      change: laborCostChange,
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <Card key={stat.title} className="shadow-card hover:shadow-hover transition-smooth">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-foreground mb-1">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stat.change}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;