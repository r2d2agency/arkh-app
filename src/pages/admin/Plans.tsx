import AdminHeader from "@/components/admin/AdminHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Sparkles, Trash2, Bot } from "lucide-react";
import { Plan, usePlans, useUpdatePlan } from "@/hooks/useApi";
import PlanDialog from "@/components/admin/PlanDialog";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useState } from "react";

const Plans = () => {
  const { data: plans, isLoading } = usePlans();
  const updateMut = useUpdatePlan();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [disableTarget, setDisableTarget] = useState<Plan | null>(null);

  return (
    <>
      <AdminHeader title="Planos" subtitle="Gerencie os planos da plataforma" />
      <div className="flex-1 overflow-auto p-6 space-y-6 animate-slide-up">
        <div className="flex justify-end">
          <Button className="gap-2 rounded-xl gradient-primary border-0 shadow-md shadow-primary/20" onClick={() => { setEditPlan(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4" /> Novo Plano
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            {[1,2].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl">
            {(plans || []).length === 0 && (
              <p className="text-muted-foreground col-span-3 text-center py-8">Nenhum plano cadastrado</p>
            )}
            {(plans || []).map((plan) => (
              <Card key={plan.id} className={`p-6 rounded-2xl relative card-hover ${!plan.is_active ? 'opacity-50' : ''} ${plan.price > 0 ? "border-2 border-primary/50 glow-primary" : ""}`}>
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
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8" onClick={() => { setEditPlan(plan); setDialogOpen(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 text-destructive" onClick={() => setDisableTarget(plan)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-heading font-bold">R$ {Number(plan.price).toFixed(0)}</span>
                  <span className="text-muted-foreground">/{plan.interval === 'yearly' ? 'ano' : 'mês'}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">Máx. membros: <span className="text-foreground font-medium">{plan.max_members}</span></p>
                  <p className="text-muted-foreground">Máx. tokens IA: <span className="text-foreground font-medium">{plan.max_ai_tokens.toLocaleString('pt-BR')}</span></p>
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5" /> IA Assistente:{' '}
                    <span className={`font-medium ${(plan as any).ai_assistant_enabled ? 'text-success' : 'text-muted-foreground'}`}>
                      {(plan as any).ai_assistant_enabled ? `Ativo (${(plan as any).ai_assistant_daily_limit || '∞'}/dia)` : 'Desativado'}
                    </span>
                  </p>
                  {Array.isArray(plan.features) && plan.features.map((f: string) => (
                    <p key={f} className="text-success">✓ {f}</p>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <PlanDialog open={dialogOpen} onOpenChange={setDialogOpen} plan={editPlan} />

      <ConfirmDialog
        open={!!disableTarget}
        onOpenChange={(o) => { if (!o) setDisableTarget(null); }}
        title={disableTarget?.is_active ? "Desativar Plano" : "Ativar Plano"}
        description={`Tem certeza que deseja ${disableTarget?.is_active ? 'desativar' : 'ativar'} o plano "${disableTarget?.name}"?`}
        onConfirm={async () => { if (disableTarget) { await updateMut.mutateAsync({ id: disableTarget.id, is_active: !disableTarget.is_active }); setDisableTarget(null); } }}
        loading={updateMut.isPending}
        variant={disableTarget?.is_active ? "destructive" : "default"}
      />
    </>
  );
};

export default Plans;
