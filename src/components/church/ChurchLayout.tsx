import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  Settings,
  Video,
  BookOpen,
  LogOut,
  Menu,
  X,
  Palette,
} from 'lucide-react';
import { useState } from 'react';
import logoImg from '@/assets/logo.png';

const navItems = [
  { path: '/church', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/church/services', label: 'Cultos', icon: Video },
  { path: '/church/studies', label: 'Estudos', icon: BookOpen },
  { path: '/church/members', label: 'Membros', icon: Users },
  { path: '/church/customize', label: 'Personalizar', icon: Palette },
  { path: '/church/settings', label: 'Config', icon: Settings },
];

const ChurchLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar - desktop only */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 glass-sidebar text-sidebar-foreground transform transition-transform duration-200 lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-5 border-b border-sidebar-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={logoImg} alt="ARKHÉ" className="w-9 h-9 rounded-lg object-contain" />
                <div>
                  <h2 className="font-heading text-sm font-bold text-sidebar-accent-foreground">Minha Igreja</h2>
                  <p className="text-xs text-gold">Painel da Igreja</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-sidebar-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-sidebar-accent text-gold font-medium'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-xs font-bold text-gold">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{user?.name}</p>
                <p className="text-xs text-sidebar-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start text-sidebar-foreground hover:text-destructive hover:bg-sidebar-accent"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <img src={logoImg} alt="ARKHÉ" className="w-7 h-7 object-contain" />
          <h1 className="font-heading text-lg font-bold gradient-text">ARKHÉ</h1>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-auto pb-20 lg:pb-8">
          <Outlet />
        </div>

        {/* Mobile bottom nav - PWA style */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-xl border-t border-border safe-bottom">
          <div className="flex items-center justify-around py-2">
            {navItems.slice(0, 5).map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-[56px] ${
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-gold' : ''}`} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </main>
    </div>
  );
};

export default ChurchLayout;
