import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Church,
  Users,
  Brain,
  CreditCard,
  Settings,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Church, label: "Igrejas", path: "/churches" },
  { icon: Users, label: "Usuários", path: "/users" },
  { icon: Brain, label: "IA", path: "/ai" },
  { icon: CreditCard, label: "Planos", path: "/plans" },
  { icon: Settings, label: "Configurações", path: "/settings" },
  { icon: ScrollText, label: "Logs", path: "/logs" },
];

const AdminSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "h-screen glass-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border transition-all duration-300 sticky top-0 relative",
        collapsed ? "w-[72px]" : "w-[264px]"
      )}
    >
      {/* Subtle glow accent */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-[72px] border-b border-sidebar-border relative z-10">
        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-white font-heading font-bold text-sm shrink-0 shadow-lg shadow-primary/20">
          A
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-heading font-bold text-base text-white tracking-tight leading-tight">
              ARKHÉ
            </span>
            <span className="text-[10px] text-sidebar-foreground/60 tracking-widest uppercase">
              Super Admin
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-5 px-3 space-y-1 relative z-10">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                isActive
                  ? "bg-sidebar-accent text-white shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full gradient-primary" />
              )}
              <item.icon className={cn(
                "w-[18px] h-[18px] shrink-0 transition-colors",
                isActive ? "text-primary" : "text-sidebar-foreground group-hover:text-sidebar-accent-foreground"
              )} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-sidebar-border space-y-1 relative z-10">
        <button
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive w-full transition-colors"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent/40 w-full transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 shrink-0" />
              <span>Recolher</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
