import AdminHeader from "@/components/admin/AdminHeader";
import StatCard from "@/components/admin/StatCard";
import { Church, Users, Video, UsersRound, BookOpen, Calendar, Brain, Crown, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard, useChurches } from "@/hooks/useApi";

const Dashboard = () => {
  const { data: stats, isLoading } = useDashboard();
  const { data: churches } = useChurches();

  const recentChurches = (churches || []).slice(0, 4);

  if (isLoading) {
    return (
      <>
        <AdminHeader title="Dashboard" subtitle="Visão geral da plataforma ARKHÉ" />
        <div className="flex-1 overflow-auto p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="Dashboard" subtitle="Visão geral da plataforma ARKHÉ" />
      <div className="flex-1 overflow-auto p-6 space-y-6 animate-slide-up">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Igrejas Cadastradas" value={stats?.churches.total ?? 0} icon={Church} iconColor="bg-primary/10 text-primary" />
          <StatCard title="Usuários Totais" value={stats?.users.total ?? 0} icon={Users} iconColor="bg-success/10 text-success" />
          <StatCard title="Usuários Ativos" value={stats?.users.active ?? 0} icon={UsersRound} iconColor="bg-accent/10 text-accent" />
          <StatCard title="Cultos Processados" value={stats?.services.total ?? 0} icon={Video} iconColor="bg-destructive/10 text-destructive" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading font-bold text-sm flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                <Brain className="w-4 h-4 text-primary" />
                Consumo de IA
              </h2>
              <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">Este mês</span>
            </div>
            <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Tokens utilizados</p>
              <p className="text-sm font-heading font-bold">{(stats?.ai.tokens ?? 0).toLocaleString('pt-BR')}</p>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Custo estimado</p>
              <p className="text-sm font-heading font-bold">R$ {(stats?.ai.cost ?? 0).toFixed(2)}</p>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading font-bold text-sm flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                <Church className="w-4 h-4 text-primary" />
                Igrejas Recentes
              </h2>
            </div>
            <div className="space-y-1">
              {recentChurches.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma igreja cadastrada</p>
              )}
              {recentChurches.map((church) => (
                <div key={church.id} className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-muted/50 transition-colors -mx-1 cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      {church.name.split(" ").slice(0, 2).map(w => w[0]).join("")}
                    </div>
                    <div>
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">{church.name}</p>
                      <p className="text-xs text-muted-foreground">{church.member_count} membros</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    church.plan_name ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
                  }`}>
                    {church.plan_name || "Sem plano"}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
