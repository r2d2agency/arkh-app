import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/admin/AdminLayout";
import ChurchLayout from "@/components/church/ChurchLayout";
import Dashboard from "@/pages/admin/Dashboard";
import Churches from "@/pages/admin/Churches";
import UsersPage from "@/pages/admin/UsersPage";
import AIManagement from "@/pages/admin/AIManagement";
import AgentsPage from "@/pages/admin/AgentsPage";
import Plans from "@/pages/admin/Plans";
import SettingsPage from "@/pages/admin/SettingsPage";
import Logs from "@/pages/admin/Logs";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ChurchDashboard from "@/pages/church/ChurchDashboard";
import ChurchServices from "@/pages/church/ChurchServices";
import ChurchStudies from "@/pages/church/ChurchStudies";
import ChurchMembers from "@/pages/church/ChurchMembers";
import ChurchCustomize from "@/pages/church/ChurchCustomize";
import ChurchSettings from "@/pages/church/ChurchSettings";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    // Redirect based on role
    if (user.role === 'super_admin') return <Navigate to="/" replace />;
    return <Navigate to="/church" replace />;
  }
  return <>{children}</>;
}

function RedirectByRole() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'super_admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/church" replace />;
}

const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<RedirectByRole />} />

      {/* Super Admin */}
      <Route element={<ProtectedRoute roles={['super_admin']}><AdminLayout /></ProtectedRoute>}>
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/churches" element={<Churches />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/ai" element={<AIManagement />} />
        <Route path="/admin/plans" element={<Plans />} />
        <Route path="/admin/settings" element={<SettingsPage />} />
        <Route path="/admin/logs" element={<Logs />} />
      </Route>

      {/* Church Admin */}
      <Route element={<ProtectedRoute roles={['admin_church', 'leader']}><ChurchLayout /></ProtectedRoute>}>
        <Route path="/church" element={<ChurchDashboard />} />
        <Route path="/church/services" element={<ChurchServices />} />
        <Route path="/church/studies" element={<ChurchStudies />} />
        <Route path="/church/members" element={<ChurchMembers />} />
        <Route path="/church/customize" element={<ChurchCustomize />} />
        <Route path="/church/settings" element={<ChurchSettings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
