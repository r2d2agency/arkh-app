import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import AIAssistant from '@/components/church/AIAssistant';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Home,
  Video,
  Search,
  BookOpen,
  User,
  Settings,
  Users,
  UsersRound,
  Palette,
  Shield,
  LogOut,
  Lock,
  Menu,
  X,
  Bell,
  Calendar,
  Heart,
  BarChart3,
  GraduationCap,
  HelpCircle,
  Gamepad2,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import logoImg from '@/assets/logo.png';

const memberBottomNav = [
  { path: '/church', label: 'Início', icon: Home },
  { path: '/church/services', label: 'Cultos', icon: Video },
  { path: '/church/agenda', label: 'Agenda', icon: Calendar },
  { path: '/church/studies', label: 'Estudar', icon: BookOpen },
  { path: '/church/profile', label: 'Perfil', icon: User },
];

const adminSidebarItems = [
  { path: '/church/manage-services', label: 'Gerenciar Cultos', icon: Video },
  { path: '/church/manage-studies', label: 'Estudos Bíblicos', icon: BookOpen },
  { path: '/church/manage-school', label: 'Escola Bíblica', icon: GraduationCap },
  { path: '/church/agenda', label: 'Agenda / Eventos', icon: Calendar },
  { path: '/church/groups', label: 'Grupos', icon: UsersRound },
  { path: '/church/polls', label: 'Enquetes', icon: BarChart3 },
  { path: '/church/manage-quizzes', label: 'Quizzes', icon: Gamepad2 },
  { path: '/church/members', label: 'Membros', icon: Users },
  { path: '/church/customize', label: 'Personalizar', icon: Palette },
  { path: '/church/settings', label: 'Configurações', icon: Settings },
];

const MemberLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [churchName, setChurchName] = useState<string>('');
  const [churchLogo, setChurchLogo] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const isAdmin = user?.role === 'admin_church' || user?.role === 'leader';
  const isSchoolRoute = location.pathname.startsWith('/church/school');

  useEffect(() => {
    api.get<{ name: string; logo_url: string | null }>('/api/church/info')
      .then(info => {
        setChurchName(info.name || '');
        setChurchLogo(info.logo_url || null);
      })
      .catch(() => {});
    
    api.get<{ count: number }>('/api/church/notifications/unread-count')
      .then(r => setUnreadCount(r.count))
      .catch(() => {});
    
    // Poll every 30s
    const interval = setInterval(() => {
      api.get<{ count: number }>('/api/church/notifications/unread-count')
        .then(r => setUnreadCount(r.count))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <img src={churchLogo || logoImg} alt={churchName || 'ARKHÉ'} className="w-8 h-8 rounded-lg object-contain shrink-0" />
          <h1 className="font-heading text-base font-bold text-foreground truncate max-w-[160px]">
            {churchName || 'ARKHÉ'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/church/school"
            className={`relative p-2 rounded-xl transition-colors ${
              isSchoolRoute
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            aria-label="Escola Bíblica"
            title="Escola Bíblica"
          >
            <GraduationCap className="w-5 h-5" />
          </Link>
          <Link to="/church/help" className="relative p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Ajuda">
            <HelpCircle className="w-5 h-5" />
          </Link>
          <Link to="/church/notifications" className="relative p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          {isAdmin && (
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <Shield className="w-5 h-5 text-gold" />
            </button>
          )}
        </div>
      </header>

      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed right-0 top-0 bottom-0 z-50 w-72 bg-card border-l border-border shadow-2xl animate-slide-in-right">
            <div className="flex flex-col h-full">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-gold" />
                  <h2 className="font-heading font-bold text-sm">Administração</h2>
                </div>
                <button onClick={() => setSidebarOpen(false)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <nav className="flex-1 p-3 space-y-1">
                {adminSidebarItems.map(item => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="p-4 border-t border-border">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </div>
            </div>
          </aside>
        </>
      )}

      <main className="flex-1 overflow-auto pb-24">
        <Outlet />
      </main>

      <AIAssistant />

      <nav className="fixed bottom-0 left-0 right-0 z-30 backdrop-blur-xl border-t border-white/10 safe-bottom" style={{ background: "linear-gradient(135deg, hsl(215 45% 12%) 0%, hsl(215 65% 25%) 100%)" }}>
        <div className="flex items-center justify-around py-2 max-w-lg mx-auto">
          {memberBottomNav.map(item => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/church' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[60px] ${
                  isActive
                    ? 'text-white'
                    : 'text-white/50 hover:text-white/70'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                <span className={`text-[11px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default MemberLayout;