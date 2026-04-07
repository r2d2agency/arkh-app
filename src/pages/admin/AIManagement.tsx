import AdminHeader from "@/components/admin/AdminHeader";
import StatCard from "@/components/admin/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, Plus, Zap, DollarSign, MoreHorizontal, Pencil, Power } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAIProviders, useAIUsage } from "@/hooks/useApi";

const AIManagement = () => {
  const { data: providers, isLoading: loadingProviders } = useAIProviders();
  const { data: usage } = useAIUsage();

  const totalRequests = (usage || []).reduce((s, u) => s + (+u.requests || 0), 0);
  const totalCost = (usage || []).reduce((s, u) => s + (+u.total_cost || 0), 0);
  const activeProviders = (providers || []).filter(p => p.is_active).length;

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
          <Button className="gap-2 rounded-xl gradient-primary border-0 shadow-md shadow-primary/20">
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
                  <TableHead>Custo/1K tokens</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(providers || []).length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum provedor cadastrado</TableCell></TableRow>
                )}
                {(providers || []).map((ai) => (
                  <TableRow key={ai.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-sm">{ai.name}</TableCell>
                    <TableCell className="text-sm">{ai.provider}</TableCell>
                    <TableCell><Badge variant="secondary" className="font-mono text-xs rounded-lg">{ai.model}</Badge></TableCell>
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
                          <DropdownMenuItem className="gap-2 rounded-lg"><Pencil className="w-4 h-4" /> Editar</DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 rounded-lg"><Power className="w-4 h-4" /> Desativar</DropdownMenuItem>
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
    </>
  );
};

export default AIManagement;
