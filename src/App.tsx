import EmployeeSettings from "./pages/EmployeeSettings";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Schedule from "./pages/Schedule";
import NotFound from "./pages/NotFound";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Administration from "./pages/Administration";
import LoginPage from "./pages/Login";
import EmployeesPage from "./pages/Employees";

const queryClient = new QueryClient();


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {/* Removed duplicate LanguageSwitcher from top */}
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {/* Employee route guard: redirect if not on /schedule */}
          <Route
            path="*"
            element={(() => {
              const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null;
              let role = null;
              try {
                if (userStr) role = JSON.parse(userStr).role;
              } catch {}
              if (role === "employee" && window.location.pathname !== "/schedule") {
                window.location.replace("/schedule");
                return null;
              }
              return null;
            })()}
          />
          <Route path="/" element={<Index />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/administration" element={<Administration />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/employee-settings" element={<EmployeeSettings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
