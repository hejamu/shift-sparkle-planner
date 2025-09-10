import Header from "@/components/layout/Header";
import StatsCards from "@/components/dashboard/StatsCards";
import ScheduleOverview from "@/components/dashboard/ScheduleOverview";
import QuickActions from "@/components/dashboard/QuickActions";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      <main className="container mx-auto px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back! Here's what's happening with your team today.
            </p>
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