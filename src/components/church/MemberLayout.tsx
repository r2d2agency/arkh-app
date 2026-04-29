import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import AIAssistant from '@/components/church/AIAssistant';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  Megaphone,
  Music,
  BookMarked,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import logoImg from '@/assets/logo.png';

const memberBottomNav = [
  { path: '/church', label: 'Início', icon: Home },
  { path: '/church/services', label: 'Cultos', icon: Video },
  { path: '/church/announcements', label: 'Recados', icon: Megaphone },
  { path: '/church/studies', label: 'Estudar', icon: BookOpen },
  { path: '/church/profile', label: 'Perfil', icon: User },
];

const adminSidebarItems = [
  { path: '/church/manage-services', label: 'Gerenciar Cultos', icon: Video },
  { path: '/church/manage-studies', label: 'Estudos Bíblicos', icon: BookOpen },
  { path: '/church/manage-school', label: 'Escola Bíblica', icon: GraduationCap },
  { path: '/church/agenda', label: 'Agenda / Eventos', icon: Calendar },
  { path: '/church/announcements', label: 'Mural de Recados', icon: Megaphone },
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
  const [popupNotif, setPopupNotif] = useState<{ id: string; title: string; body: string } | null>(null);
  const [lastNotifCheck, setLastNotifCheck] = useState<string | null>(null);

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
    
    // Poll every 30s for unread count and new announcements
    const checkNotifications = () => {
      api.get<{ count: number }>('/api/church/notifications/unread-count')
        .then(r => setUnreadCount(r.count))
        .catch(() => {});
      // Check for new announcement notifications to show popup
      api.get<Array<{ id: string; title: string; body: string; type: string; is_read: boolean; created_at: string }>>('/api/church/notifications')
        .then(notifs => {
          const announcements = notifs.filter(n => n.type === 'announcement' && !n.is_read);
          if (announcements.length > 0) {
            const newest = announcements[0];
            if (!lastNotifCheck || newest.created_at > lastNotifCheck) {
              setPopupNotif({ id: newest.id, title: newest.title, body: newest.body });
              setLastNotifCheck(newest.created_at);
            }
          }
        })
        .catch(() => {});
    };
    checkNotifications();
    const interval = setInterval(checkNotifications, 30000);
    return () => clearInterval(interval);
  }, [lastNotifCheck]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-primary/20 shrink-0 bg-muted">
            <img src={churchLogo || logoImg} alt={churchName || 'ARKHÉ'} className="w-full h-full object-cover" />
          </div>
          <h1 className="font-heading text-base font-bold text-primary truncate max-w-[180px] tracking-tight">
            {churchName || 'ARKHÉ'}
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <Link
            to="/church/school"
            className={`relative p-2 rounded-full transition-colors ${
              isSchoolRoute
                ? 'bg-primary/10 text-primary'
                : 'text-primary/70 hover:bg-primary/10 hover:text-primary'
            }`}
            aria-label="Escola Bíblica"
            title="Escola Bíblica"
          >
            <GraduationCap className="w-5 h-5" />
          </Link>
          <Link to="/church/help" className="relative p-2 rounded-full hover:bg-primary/10 transition-colors text-primary/70 hover:text-primary" title="Ajuda">
            <HelpCircle className="w-5 h-5" />
          </Link>
          <Link to="/church/notifications" className="relative p-2 rounded-full hover:bg-primary/10 transition-colors text-primary/70 hover:text-primary">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          {isAdmin && (
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-full hover:bg-accent/15 transition-colors text-accent">
              <Shield className="w-5 h-5" />
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
                  <Shield className="w-5 h-5 text-accent" />
                  <h2 className="font-heading font-bold text-sm">Administração</h2>
                </div>
                <button onClick={() => setSidebarOpen(false)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {adminSidebarItems.map(item => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary font-semibold'
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
                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 rounded-2xl"
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

      <main className="flex-1 overflow-auto pb-32">
        <Outlet />
      </main>

      <AIAssistant />

      <nav
        className="fixed bottom-0 left-0 right-0 z-30 bg-background/90 backdrop-blur-xl border-t border-primary/5 safe-bottom rounded-t-[32px]"
        style={{ boxShadow: '0 -12px 32px rgba(61,90,254,0.06)' }}
      >
        <div className="flex items-center justify-around px-4 pt-3 pb-3 max-w-lg mx-auto">
          {memberBottomNav.map(item => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/church' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 transition-all min-w-[56px] ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground/70 hover:text-primary'
                }`}
              >
                <item.icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.4 : 2} />
                <span className={`text-[10px] tracking-wide ${isActive ? 'font-bold' : 'font-semibold'}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Notification Popup */}
      <Dialog open={!!popupNotif} onOpenChange={() => {
        if (popupNotif) {
          api.put(`/api/church/notifications/${popupNotif.id}/read`, {}).catch(() => {});
          setUnreadCount(c => Math.max(0, c - 1));
        }
        setPopupNotif(null);
      }}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              {popupNotif?.title}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{popupNotif?.body}</p>
          <Button className="rounded-xl w-full" onClick={() => {
            if (popupNotif) {
              api.put(`/api/church/notifications/${popupNotif.id}/read`, {}).catch(() => {});
              setUnreadCount(c => Math.max(0, c - 1));
            }
            setPopupNotif(null);
          }}>
            Entendi
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemberLayout;