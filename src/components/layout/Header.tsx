import { Calendar, Clock, Users, BarChart3, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
  const navItems = [
    { icon: BarChart3, label: "Dashboard", active: true },
    { icon: Calendar, label: "Schedule" },
    { icon: Users, label: "Employees" },
    { icon: Clock, label: "Time Tracking" },
    { icon: Settings, label: "Settings" },
  ];

  return (
    <header className="border-b bg-card shadow-card">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-foreground">ShiftPlanner</h1>
            </div>
            
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <Button
                  key={item.label}
                  variant={item.active ? "default" : "ghost"}
                  size="sm"
                  className="h-9 px-3 transition-smooth"
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              ))}
            </nav>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm">
              <Clock className="h-4 w-4 mr-2" />
              Clock In
            </Button>
            <Button variant="hero" size="sm">
              Add Shift
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;