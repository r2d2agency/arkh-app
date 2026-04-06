import AdminHeader from "@/components/admin/AdminHeader";
import StatCard from "@/components/admin/StatCard";
import { Church, Users, Video, UsersRound, BookOpen, Calendar, Brain, Crown, TrendingUp, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";

const recentChurches = [
  { name: "Igreja Batista Central", members: 245, plan: "Premium", date: "02/04/2026" },
  { name: "Comunidade Vida Nova", members: 120, plan: "Gratuito", date: "01/04/2026" },
  { name: "Igreja Presbiteriana Renovada", members: 380, plan: "Premium", date: "28/03/2026" },
  { name: "Assembleia de Deus Esperança", members: 95, plan: "Gratuito", date: "25/03/2026" },
];

const Dashboard = () => {
  return (
    <>
      <AdminHeader title="Dashboard" subtitle="Visão geral da plataforma ARKHÉ" />
      <div className="flex-1 overflow-auto p-6 space-y-6 animate-slide-up">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Igrejas Cadastradas"
            value={47}
            change="+5 este mês"
            changeType="positive"
            icon={Church}
            iconColor="bg-primary/10 text-primary"
          />
          <StatCard
            title="Usuários Totais"
            value="3.842"
            change="+312 este mês"
            changeType="positive"
            icon={Users}
            iconColor="bg-success/10 text-success"
          />
          <StatCard
            title="Usuários Ativos"
            value="1.567"
            change="40,8% do total"
            changeType="neutral"
            icon={UsersRound}
            iconColor="bg-accent/10 text-accent"
          />
          <StatCard
            title="Cultos Processados"
            value={892}
            change="+68 esta semana"
            changeType="positive"
            icon={Video}
            iconColor="bg-destructive/10 text-destructive"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Grupos" value={134} icon={UsersRound} />
          <StatCard title="Estudos" value={256} icon={BookOpen} />
          <StatCard title="Eventos" value={89} icon={Calendar} />
          <StatCard
            title="Igrejas Premium"
            value={18}
            change="38,3% do total"
            changeType="positive"
            icon={Crown}
            iconColor="bg-warning/10 text-warning"
          />
        </div>

        {/* AI Usage + Recent Churches */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Consumption */}
          <Card className="p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading font-bold text-sm flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                <Brain className="w-4 h-4 text-primary" />
                Consumo de IA
              </h2>
              <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">Este mês</span>
            </div>
            <div className="space-y-4">
              {[
                { label: "Transcrições", used: 342, limit: 500, color: "bg-primary" },
                { label: "Resumos", used: 289, limit: 500, color: "bg-success" },
                { label: "Busca Semântica", used: 156, limit: 300, color: "bg-accent" },
                { label: "Reflexão do Dia", used: 423, limit: 1000, color: "bg-warning" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground text-xs">{item.label}</span>
                    <span className="font-medium text-xs">{item.used}<span className="text-muted-foreground">/{item.limit}</span></span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color} transition-all duration-500`}
                      style={{ width: `${(item.used / item.limit) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Custo estimado</p>
              <p className="text-sm font-heading font-bold">R$ 347,20</p>
            </div>
          </Card>

          {/* Recent Churches */}
          <Card className="p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading font-bold text-sm flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                <Church className="w-4 h-4 text-primary" />
                Igrejas Recentes
              </h2>
              <button className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors">
                Ver todas <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-1">
              {recentChurches.map((church, i) => (
                <div
                  key={church.name}
                  className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-muted/50 transition-colors -mx-1 cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      {church.name.split(" ").slice(0, 2).map(w => w[0]).join("")}
                    </div>
                    <div>
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">{church.name}</p>
                      <p className="text-xs text-muted-foreground">{church.members} membros · {church.date}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      church.plan === "Premium"
                        ? "bg-warning/10 text-warning"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {church.plan}
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
