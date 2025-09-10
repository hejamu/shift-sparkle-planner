import { Plus, UserPlus, Calendar, Clock, FileText, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const QuickActions = () => {
  const actions = [
    {
      icon: Plus,
      label: "Add Shift",
      description: "Create a new shift",
      variant: "hero" as const,
    },
    {
      icon: UserPlus,
      label: "Add Employee",
      description: "Add team member",
      variant: "default" as const,
    },
    {
      icon: Calendar,
      label: "View Schedule",
      description: "Full calendar view",
      variant: "outline" as const,
    },
    {
      icon: Clock,
      label: "Time Reports",
      description: "Hours & attendance",
      variant: "outline" as const,
    },
    {
      icon: FileText,
      label: "Generate Report",
      description: "Export data",
      variant: "outline" as const,
    },
    {
      icon: Settings,
      label: "Settings",
      description: "App configuration",
      variant: "outline" as const,
    },
  ];

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
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