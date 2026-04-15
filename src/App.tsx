import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/admin/AdminLayout";
import MemberLayout from "@/components/church/MemberLayout";
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
import JoinChurch from "@/pages/JoinChurch";
import MemberHome from "@/pages/church/MemberHome";
import MemberServices from "@/pages/church/MemberServices";
import ServiceDetail from "@/pages/church/ServiceDetail";
import MemberStudies from "@/pages/church/MemberStudies";
import StudyDetail from "@/pages/church/StudyDetail";
import MemberTrails from "@/pages/church/MemberTrails";
import ExplorePage from "@/pages/church/ExplorePage";
import NotebookPage from "@/pages/church/NotebookPage";
import ProfilePage from "@/pages/church/ProfilePage";
import ReflectionPage from "@/pages/church/ReflectionPage";
import NotificationsPage from "@/pages/church/NotificationsPage";
import ChangePassword from "@/pages/church/ChangePassword";
import ChurchMembers from "@/pages/church/ChurchMembers";
import ChurchCustomize from "@/pages/church/ChurchCustomize";
import ChurchSettings from "@/pages/church/ChurchSettings";
import ChurchServices from "@/pages/church/ChurchServices";
import ChurchStudiesAdmin from "@/pages/church/ChurchStudiesAdmin";
import GroupsPage from "@/pages/church/GroupsPage";
import GroupDetailPage from "@/pages/church/GroupDetailPage";
import PollsPage from "@/pages/church/PollsPage";
import AgendaPage from "@/pages/church/AgendaPage";
import SchoolPage from "@/pages/church/SchoolPage";
import SchoolClassDetail from "@/pages/church/SchoolClassDetail";
import SchoolAdmin from "@/pages/church/SchoolAdmin";
import OnboardingPage from "@/pages/church/OnboardingPage";
import FavoritesPage from "@/pages/church/FavoritesPage";
import HelpPage from "@/pages/church/HelpPage";
import QuizListPage from "@/pages/church/QuizListPage";
import QuizPlayPage from "@/pages/church/QuizPlayPage";
import QuizAdminPage from "@/pages/church/QuizAdminPage";
import AnnouncementsPage from "@/pages/church/AnnouncementsPage";
import WorshipPage from "@/pages/church/WorshipPage";
import SocialPostPage from "@/pages/church/SocialPostPage";
import WordSearchPage from "@/pages/church/WordSearchPage";
import ExploreGroupsPage from "@/pages/church/ExploreGroupsPage";
import ReadingPlanPage from "@/pages/church/ReadingPlanPage";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    if (user.role === 'super_admin') return <Navigate to="/" replace />;
    return <Navigate to="/church" replace />;
  }
  return <>{children}</>;
}

function AutoRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Index />;
  if (user.role === 'super_admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/church" replace />;
}

const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/join/:slug" element={<JoinChurch />} />
      <Route path="/" element={<AutoRedirect />} />

      {/* Super Admin */}
      <Route element={<ProtectedRoute roles={['super_admin']}><AdminLayout /></ProtectedRoute>}>
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/churches" element={<Churches />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/ai" element={<AIManagement />} />
        <Route path="/admin/agents" element={<AgentsPage />} />
        <Route path="/admin/plans" element={<Plans />} />
        <Route path="/admin/settings" element={<SettingsPage />} />
        <Route path="/admin/logs" element={<Logs />} />
      </Route>

      {/* Member app - all church roles */}
      <Route element={<ProtectedRoute roles={['admin_church', 'leader', 'member']}><MemberLayout /></ProtectedRoute>}>
        <Route path="/church" element={<MemberHome />} />
        <Route path="/church/services" element={<MemberServices />} />
        <Route path="/church/services/:id" element={<ServiceDetail />} />
        <Route path="/church/studies" element={<MemberStudies />} />
        <Route path="/church/studies/:id" element={<StudyDetail />} />
        <Route path="/church/trails" element={<MemberTrails />} />
        <Route path="/church/explore" element={<ExplorePage />} />
        <Route path="/church/notebook" element={<NotebookPage />} />
        <Route path="/church/profile" element={<ProfilePage />} />
        <Route path="/church/reflection" element={<ReflectionPage />} />
        <Route path="/church/notifications" element={<NotificationsPage />} />
        <Route path="/church/password" element={<ChangePassword />} />
        <Route path="/church/polls" element={<PollsPage />} />
        <Route path="/church/agenda" element={<AgendaPage />} />
        <Route path="/church/announcements" element={<AnnouncementsPage />} />
        <Route path="/church/groups/:id" element={<GroupDetailPage />} />
        <Route path="/church/school" element={<SchoolPage />} />
        <Route path="/church/school/:id" element={<SchoolClassDetail />} />
        <Route path="/church/favorites" element={<FavoritesPage />} />
        <Route path="/church/help" element={<HelpPage />} />
        <Route path="/church/onboarding" element={<OnboardingPage />} />
        <Route path="/church/quiz" element={<QuizListPage />} />
        <Route path="/church/quiz/:id" element={<QuizPlayPage />} />
        <Route path="/church/worship" element={<WorshipPage />} />
        <Route path="/church/social-post" element={<SocialPostPage />} />
        <Route path="/church/word-search" element={<WordSearchPage />} />
        <Route path="/church/explore-groups" element={<ExploreGroupsPage />} />
        <Route path="/church/reading-plan" element={<ReadingPlanPage />} />
      </Route>

      {/* Admin-only management pages (with sidebar layout) */}
      <Route element={<ProtectedRoute roles={['admin_church', 'leader']}><MemberLayout /></ProtectedRoute>}>
        <Route path="/church/members" element={<ChurchMembers />} />
        <Route path="/church/customize" element={<ChurchCustomize />} />
        <Route path="/church/settings" element={<ChurchSettings />} />
        <Route path="/church/manage-services" element={<ChurchServices />} />
        <Route path="/church/manage-studies" element={<ChurchStudiesAdmin />} />
        <Route path="/church/groups" element={<GroupsPage />} />
        <Route path="/church/manage-school" element={<SchoolAdmin />} />
        <Route path="/church/manage-quizzes" element={<QuizAdminPage />} />
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
