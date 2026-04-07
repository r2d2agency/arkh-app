import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  User, Lock, LogOut, Bell, Moon, ChevronRight, Heart,
  BookOpen, Video, Settings,
} from 'lucide-react';

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { icon: Lock, label: 'Alterar senha', path: '/church/password', color: 'text-primary' },
    { icon: Bell, label: 'Notificações', path: '/church/notifications', color: 'text-gold' },
    { icon: BookOpen, label: 'Meu caderno', path: '/church/notebook', color: 'text-green-500' },
    { icon: Video, label: 'Cultos assistidos', path: '/church/services', color: 'text-purple-500' },
  ];

  return (
    <div className="space-y-6 animate-fade-in p-4">
      {/* Profile header */}
      <div className="flex flex-col items-center text-center space-y-3 pt-4">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
          {user?.name?.charAt(0)?.toUpperCase() || 'A'}
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold">{user?.name}</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 rounded-2xl text-center">
          <p className="font-heading text-xl font-bold text-primary">0</p>
          <p className="text-[10px] text-muted-foreground">Cultos</p>
        </Card>
        <Card className="p-3 rounded-2xl text-center">
          <p className="font-heading text-xl font-bold text-gold">0</p>
          <p className="text-[10px] text-muted-foreground">Anotações</p>
        </Card>
        <Card className="p-3 rounded-2xl text-center">
          <p className="font-heading text-xl font-bold text-green-500">0</p>
          <p className="text-[10px] text-muted-foreground">Versículos</p>
        </Card>
      </div>

      {/* Menu */}
      <Card className="rounded-2xl overflow-hidden divide-y divide-border">
        {menuItems.map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex items-center gap-3 px-4 py-3.5 w-full hover:bg-muted/50 transition-colors"
          >
            <div className={`w-8 h-8 rounded-xl bg-muted flex items-center justify-center`}>
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </Card>

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full rounded-2xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={handleLogout}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sair da conta
      </Button>
    </div>
  );
};

export default ProfilePage;
