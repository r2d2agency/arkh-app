import { useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import StatCard from "@/components/admin/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, Plus, Zap, DollarSign, MoreHorizontal, Pencil, Power, Trash2, Key } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAIProviders, useAIUsage, useCreateAIProvider, useUpdateAIProvider, useDeleteAIProvider, useToggleAIProvider } from "@/hooks/useApi";
import type { AIProvider } from "@/hooks/useApi";
import AIProviderDialog from "@/components/admin/AIProviderDialog";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

const AIManagement = () => {
  const { data: providers, isLoading: loadingProviders } = useAIProviders();
  const { data: usage } = useAIUsage();
  const createProvider = useCreateAIProvider();
  const updateProvider = useUpdateAIProvider();
  const deleteProvider = useDeleteAIProvider();
  const toggleProvider = useToggleAIProvider();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AIProvider | null>(null);

  const totalRequests = (usage || []).reduce((s, u) => s + (+u.requests || 0), 0);
  const totalCost = (usage || []).reduce((s, u) => s + (+u.total_cost || 0), 0);
  const activeProviders = (providers || []).filter(p => p.is_active).length;

  const handleOpenNew = () => {
    setEditingProvider(null);
    setDialogOpen(true);
  };

  const handleEdit = (p: AIProvider) => {
    setEditingProvider(p);
    setDialogOpen(true);
  };

  const handleSave = (data: { name: string; provider: string; model: string; api_keys: string[]; is_active: boolean; cost_per_1k_tokens: number }) => {
    if (editingProvider) {
      updateProvider.mutate({ id: editingProvider.id, ...data }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createProvider.mutate(data, { onSuccess: () => setDialogOpen(false) });
    }
  };

  return (
    <>
      <AdminHeader title="Gestão de IA" subtitle="Provedores, consumo e configurações" />
      <div className="flex-1 overflow-auto p-6 space-y-6 animate-slide-up">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title="Requisições (mês)" value={totalRequests} icon={Zap} iconColor="bg-primary/10 text-primary" />
          <StatCard title="Custo Mensal" value={`R$ ${totalCost.toFixed(2)}`} icon={DollarSign} iconColor="bg-warning/10 text-warning" />
          <StatCard title="Provedores Ativos" value={activeProviders} icon={Brain} iconColor="bg-success/10 text-success" />
        </div>

        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-sm uppercase tracking-wider text-muted-foreground">Provedores de IA</h2>
          <Button className="gap-2 rounded-xl gradient-primary border-0 shadow-md shadow-primary/20" onClick={handleOpenNew}>
            <Plus className="w-4 h-4" /> Novo Provedor
          </Button>
        </div>

        {loadingProviders ? <Skeleton className="h-48 rounded-2xl" /> : (
          <Card className="rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Nome</TableHead>
                  <TableHead>Provedor</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Custo/1K</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(providers || []).length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum provedor cadastrado</TableCell></TableRow>
                )}
                {(providers || []).map((ai) => (
                  <TableRow key={ai.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-sm">{ai.name}</TableCell>
                    <TableCell className="text-sm capitalize">{ai.provider}</TableCell>
                    <TableCell><Badge variant="secondary" className="font-mono text-xs rounded-lg">{ai.model}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Key className="w-3 h-3" />
                        {ai.api_key_count ?? 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">R$ {Number(ai.cost_per_1k_tokens).toFixed(4)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={ai.is_active ? "border-success/50 text-success bg-success/5" : "border-destructive/50 text-destructive bg-destructive/5"}>
                        {ai.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem className="gap-2 rounded-lg" onClick={() => handleEdit(ai)}>
                            <Pencil className="w-4 h-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 rounded-lg" onClick={() => toggleProvider.mutate(ai.id)}>
                            <Power className="w-4 h-4" /> {ai.is_active ? "Desativar" : "Ativar"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 rounded-lg text-destructive" onClick={() => setDeleteTarget(ai)}>
                            <Trash2 className="w-4 h-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <AIProviderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        provider={editingProvider}
        onSave={handleSave}
        loading={createProvider.isPending || updateProvider.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Excluir Provedor"
        description={`Tem certeza que deseja excluir "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={() => deleteTarget && deleteProvider.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        loading={deleteProvider.isPending}
      />
    </>
  );
};

export default AIManagement;
