import { Navigate, BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useUserRole } from "@/hooks/use-user";
import Schedule from "./pages/Schedule";
import Administration from "./pages/Administration";
import LoginPage from "./pages/Login";
import EmployeesPage from "./pages/Employees";
import EmployeeSettings from "./pages/EmployeeSettings";
import NotFound from "./pages/NotFound";

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
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/schedule" replace />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/administration" element={<EmployeeOnly><Administration /></EmployeeOnly>} />
            <Route path="/employees" element={<EmployeeOnly><EmployeesPage /></EmployeeOnly>} />
            <Route path="/employee-settings" element={<EmployeeSettings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
