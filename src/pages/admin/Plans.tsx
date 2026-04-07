import AdminHeader from "@/components/admin/AdminHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Sparkles } from "lucide-react";
import { usePlans } from "@/hooks/useApi";

const Plans = () => {
  const { data: plans, isLoading } = usePlans();

  return (
    <>
      <AdminHeader title="Planos" subtitle="Gerencie os planos da plataforma" />
      <div className="flex-1 overflow-auto p-6 space-y-6 animate-slide-up">
        <div className="flex justify-end">
          <Button className="gap-2 rounded-xl gradient-primary border-0 shadow-md shadow-primary/20">
            <Plus className="w-4 h-4" /> Novo Plano
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            {[1,2].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            {(plans || []).length === 0 && (
              <p className="text-muted-foreground col-span-2 text-center py-8">Nenhum plano cadastrado</p>
            )}
            {(plans || []).map((plan, i) => (
              <Card key={plan.id} className={`p-6 rounded-2xl relative card-hover ${plan.price > 0 ? "border-2 border-primary/50 glow-primary" : ""}`}>
                {plan.price > 0 && (
                  <Badge className="absolute -top-3 left-6 gradient-primary border-0 text-white gap-1 shadow-md shadow-primary/20">
                    <Sparkles className="w-3 h-3" /> Premium
                  </Badge>
                )}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-heading font-bold text-xl">{plan.name}</h3>
                    <p className="text-muted-foreground text-sm">{plan.church_count} igrejas</p>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-xl"><Pencil className="w-4 h-4" /></Button>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-heading font-bold">R$ {Number(plan.price).toFixed(0)}</span>
                  <span className="text-muted-foreground">/{plan.interval === 'yearly' ? 'ano' : 'mês'}</span>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Máx. membros: {plan.max_members}</p>
                  <p>Máx. tokens IA: {plan.max_ai_tokens.toLocaleString('pt-BR')}</p>
                  {Array.isArray(plan.features) && plan.features.map((f: string) => (
                    <p key={f}>✓ {f}</p>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Plans;
