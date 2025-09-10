import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, User } from "lucide-react";

const ScheduleOverview = () => {
  const todayShifts = [
    {
      id: 1,
      employee: "Sarah Johnson",
      role: "Manager",
      time: "8:00 AM - 4:00 PM",
      location: "Front Desk",
      status: "active",
    },
    {
      id: 2,
      employee: "Mike Chen",
      role: "Sales Associate",
      time: "10:00 AM - 6:00 PM",
      location: "Sales Floor",
      status: "scheduled",
    },
    {
      id: 3,
      employee: "Emily Davis",
      role: "Cashier",
      time: "2:00 PM - 10:00 PM",
      location: "Register 2",
      status: "scheduled",
    },
    {
      id: 4,
      employee: "David Wilson",
      role: "Stock Associate",
      time: "6:00 PM - 12:00 AM",
      location: "Warehouse",
      status: "pending",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success text-success-foreground";
      case "scheduled":
        return "bg-primary text-primary-foreground";
      case "pending":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-primary" />
          <span>Today's Schedule</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {todayShifts.map((shift) => (
          <div
            key={shift.id}
            className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-smooth"
          >
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-subtle rounded-full">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{shift.employee}</p>
                <p className="text-sm text-muted-foreground">{shift.role}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{shift.time}</p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 mr-1" />
                  {shift.location}
                </div>
              </div>
              <Badge className={getStatusColor(shift.status)} variant="secondary">
                {shift.status}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ScheduleOverview;