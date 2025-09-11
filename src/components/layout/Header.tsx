import { Calendar, Clock, Users, BarChart3, Settings } from "lucide-react";
import LanguageSwitcher from "../LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";

const Header = () => {
  const location = useLocation();
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);

  // Only show Schedule for employees
  const navItems = user && user.role === "employee"
    ? [
        { icon: Calendar, label: "Schedule", path: "/schedule" },
        { icon: Settings, label: "Settings", path: "/employee-settings" },
      ]
    : [
        { icon: BarChart3, label: "Dashboard", path: "/" },
        { icon: Calendar, label: "Schedule", path: "/schedule" },
        { icon: Users, label: "Employees", path: "/employees" },
  { icon: Settings, label: "Administration", path: "/administration" },
      ];

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, [location]);

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

          {/* Removed Clock In and Add Shift buttons */}

          <div className="flex items-center space-x-4">
            {user && (
              <span className="text-muted-foreground">{user.username} ({user.role})</span>
            )}
            <LanguageSwitcher />
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  localStorage.removeItem("user");
                  setUser(null);
                  window.location.href = "/login";
                }}
              >
                Logout
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;