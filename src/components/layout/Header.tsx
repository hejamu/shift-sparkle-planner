import { Calendar, Users, BarChart3, Settings } from "lucide-react";
import LanguageSwitcher from "../LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { useLocation, Link } from "react-router-dom";
import { useMemo } from "react";
import { logout, useInvalidateUser, useUser } from "@/hooks/use-user";
import { useTranslation } from "react-i18next";

const Header = () => {
  const location = useLocation();
  const { user } = useUser();
  const invalidateUser = useInvalidateUser();
  const { t } = useTranslation();

  const navItems = useMemo(() => {
    if (user && user.role === "employee") {
      return [
        { icon: Calendar, label: t("schedule"), path: "/schedule" },
        { icon: Settings, label: t("settings"), path: "/employee-settings" },
      ];
    }
    return [
      { icon: BarChart3, label: t("dashboard"), path: "/" },
      { icon: Calendar, label: t("schedule"), path: "/schedule" },
      { icon: Users, label: t("employees"), path: "/employees" },
      { icon: Settings, label: t("administration"), path: "/administration" },
    ];
  }, [user, t]);

  return (
    <header className="border-b bg-card shadow-card">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-foreground">{t("appTitle")}</h1>
            </div>
            
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <Button
                  key={item.path}
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
                onClick={async () => {
                  await logout();
                  await invalidateUser();
                  window.location.href = "/login";
                }}
              >
                {t("logout")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;