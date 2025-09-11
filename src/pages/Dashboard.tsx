import Header from "@/components/layout/Header";
import { Link, useNavigate } from "react-router-dom";
import StatsCards from "@/components/dashboard/StatsCards";
import ScheduleOverview from "@/components/dashboard/ScheduleOverview";
import QuickActions from "@/components/dashboard/QuickActions";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      <main className="container mx-auto px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("dashboard")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("welcome")}
            </p>
          </div>
          <div>
            {/* Link to Schedule page using React Router */}
            <Link
              to="/schedule"
              className="inline-block px-4 py-2 bg-primary text-white rounded-md shadow hover:bg-primary/80 transition"
            >
              {t("schedule")}
            </Link>
          </div>
        </div>
        <StatsCards />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <ScheduleOverview />
          </div>
          <div>
            <QuickActions />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;