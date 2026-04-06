import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AdminLayout from "@/components/admin/AdminLayout";
import Dashboard from "@/pages/admin/Dashboard";
import Churches from "@/pages/admin/Churches";
import UsersPage from "@/pages/admin/UsersPage";
import AIManagement from "@/pages/admin/AIManagement";
import Plans from "@/pages/admin/Plans";
import SettingsPage from "@/pages/admin/SettingsPage";
import Logs from "@/pages/admin/Logs";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/churches" element={<Churches />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/ai" element={<AIManagement />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/logs" element={<Logs />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
