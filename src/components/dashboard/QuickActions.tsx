import { Plus, UserPlus, Calendar, Clock, FileText, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserRole } from "@/hooks/use-user";

const QuickActions = () => {
  const role = useUserRole();
  const actions = [
    {
      icon: Plus,
      label: "Add Shift",
      description: "Create a new shift",
      variant: "hero" as const,
      roles: ["manager", "admin"],
    },
    {
      icon: UserPlus,
      label: "Add Employee",
      description: "Add team member",
      variant: "default" as const,
      roles: ["admin"],
    },
    {
      icon: Calendar,
      label: "View Schedule",
      description: "Full calendar view",
      variant: "outline" as const,
      roles: ["employee", "manager", "admin"],
    },
    {
      icon: Clock,
      label: "Time Reports",
      description: "Hours & attendance",
      variant: "outline" as const,
      roles: ["manager", "admin"],
    },
    {
      icon: FileText,
      label: "Generate Report",
      description: "Export data",
      variant: "outline" as const,
      roles: ["admin"],
    },
    {
  icon: Settings,
  label: "Administration",
      description: "App configuration",
      variant: "outline" as const,
      roles: ["manager", "admin"],
    },
  ];

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.filter(a => role !== null && a.roles.includes(role)).map((action) => (
            <Button
              key={action.label}
              variant={action.variant}
              className="h-auto p-4 flex-col items-start text-left space-y-2 transition-smooth hover:scale-105"
            >
              <action.icon className="h-5 w-5" />
              <div>
                <div className="font-medium">{action.label}</div>
                <div className="text-xs opacity-80">{action.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;