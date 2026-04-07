import { Bell, Search, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
}

const AdminHeader = ({ title, subtitle }: AdminHeaderProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || 'SA';

  return (
    <header className="h-[72px] border-b border-border bg-card/60 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h1 className="font-heading font-bold text-xl text-foreground tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-9 w-56 h-9 text-sm bg-muted/50 border-transparent focus:border-primary/30 rounded-xl" />
        </div>
        <Button variant="ghost" size="icon" className="relative rounded-xl h-9 w-9">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full ring-2 ring-card" />
        </Button>
        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-white text-xs font-bold cursor-pointer shadow-sm shadow-primary/20">
          {initials}
        </div>
        <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" onClick={handleLogout} title="Sair">
          <LogOut className="w-[18px] h-[18px]" />
        </Button>
      </div>
    </header>
  );
};

export default AdminHeader;
