import { lazy, Suspense } from "react";
import { Navigate, BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useUserRole } from "@/hooks/use-user";

// Schedule + Login are on the hot path (every session lands here), so import
// them eagerly. The admin / employees / employee-settings / 404 routes are
// rarely hit; lazy-load them so they don't bloat the initial bundle.
import Schedule from "./pages/Schedule";
import LoginPage from "./pages/Login";
const Administration = lazy(() => import("./pages/Administration"));
const EmployeesPage = lazy(() => import("./pages/Employees"));
const EmployeeSettings = lazy(() => import("./pages/EmployeeSettings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const EmployeeOnly = ({ children }: { children: React.ReactNode }) => {
  const role = useUserRole();
  if (role === "employee") return <Navigate to="/schedule" replace />;
  return <>{children}</>;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<Navigate to="/schedule" replace />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/administration" element={<EmployeeOnly><Administration /></EmployeeOnly>} />
              <Route path="/employees" element={<EmployeeOnly><EmployeesPage /></EmployeeOnly>} />
              <Route path="/employee-settings" element={<EmployeeSettings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
