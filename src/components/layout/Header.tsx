import { Calendar, Clock, Users, BarChart3, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation, Link } from "react-router-dom";

const Header = () => {
  const location = useLocation();
  
  const navItems = [
    { icon: BarChart3, label: "Dashboard", path: "/" },
    { icon: Calendar, label: "Schedule", path: "/schedule" },
    { icon: Users, label: "Employees", path: "/employees" },
    { icon: Clock, label: "Time Tracking", path: "/time-tracking" },
    { icon: Settings, label: "Settings", path: "/settings" },
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
                  variant={location.pathname === item.path ? "default" : "ghost"}
                  size="sm"
                  className="h-9 px-3 transition-smooth"
                  asChild
                >
                  <Link to={item.path}>
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Link>
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