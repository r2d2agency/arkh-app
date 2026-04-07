import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
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
  Palette,
  Shield,
  LogOut,
  Lock,
  Menu,
  X,
  Bell,
  Calendar,
  Heart,
} from 'lucide-react';
import { useState } from 'react';
import logoImg from '@/assets/logo.png';

const memberBottomNav = [
  { path: '/church', label: 'Início', icon: Home },
  { path: '/church/services', label: 'Cultos', icon: Video },
  { path: '/church/explore', label: 'Explorar', icon: Search },
  { path: '/church/notebook', label: 'Caderno', icon: BookOpen },
  { path: '/church/profile', label: 'Perfil', icon: User },
];

const adminSidebarItems = [
  { path: '/church/members', label: 'Membros', icon: Users },
  { path: '/church/customize', label: 'Personalizar', icon: Palette },
  { path: '/church/settings', label: 'Configurações', icon: Settings },
];

const MemberLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = user?.role === 'admin_church' || user?.role === 'leader';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top header - mobile */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="ARKHÉ" className="w-8 h-8 object-contain" />
          <h1 className="font-heading text-lg font-bold text-foreground">ARKHÉ</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/church/notifications" className="relative p-2 rounded-xl hover:bg-muted transition-colors">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </Link>
          {isAdmin && (
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <Shield className="w-5 h-5 text-gold" />
            </button>
          )}
        </div>
      </header>

      {/* Admin sidebar overlay */}
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

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-24">
        <Outlet />
      </main>

      {/* Bottom navigation - PWA style */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-xl border-t border-border safe-bottom">
        <div className="flex items-center justify-around py-1.5 max-w-lg mx-auto">
          {memberBottomNav.map(item => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/church' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[60px] ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default MemberLayout;
