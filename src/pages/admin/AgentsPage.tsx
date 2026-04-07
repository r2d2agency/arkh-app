import { useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Plus, MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAgents, useAIProviders, useCreateAgent, useUpdateAgent, useDeleteAgent, useToggleAgent } from "@/hooks/useApi";
import type { AIAgent } from "@/hooks/useApi";
import AgentDialog from "@/components/admin/AgentDialog";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

const ROLE_LABELS: Record<string, string> = {
  transcriber: "Transcritor",
  summarizer: "Resumidor",
  study_generator: "Gerador de Estudos",
  verse_finder: "Localizador de Versículos",
  devotional: "Devocional",
  chat_assistant: "Assistente de Chat",
  custom: "Personalizado",
};

const AgentsPage = () => {
  const { data: agents, isLoading } = useAgents();
  const { data: providers } = useAIProviders();
  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();
  const deleteAgent = useDeleteAgent();
  const toggleAgent = useToggleAgent();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AIAgent | null>(null);

  const handleOpenNew = () => { setEditingAgent(null); setDialogOpen(true); };
  const handleEdit = (a: AIAgent) => { setEditingAgent(a); setDialogOpen(true); };

  const handleSave = (data: any) => {
    if (editingAgent) {
      updateAgent.mutate({ id: editingAgent.id, ...data }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createAgent.mutate(data, { onSuccess: () => setDialogOpen(false) });
    }
  };

  return (
    <>
      <AdminHeader title="Agentes de IA" subtitle="Configure agentes com funções específicas e seus provedores" />
      <div className="flex-1 overflow-auto p-6 space-y-6 animate-slide-up">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-sm uppercase tracking-wider text-muted-foreground">Agentes</h2>
          <Button className="gap-2 rounded-xl gradient-primary border-0 shadow-md shadow-primary/20" onClick={handleOpenNew}>
            <Plus className="w-4 h-4" /> Novo Agente
          </Button>
        </div>

        {isLoading ? <Skeleton className="h-48 rounded-2xl" /> : (
          <Card className="rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Nome</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Provedor</TableHead>
                  <TableHead>Temp.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(agents || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Bot className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                      <p className="text-muted-foreground">Nenhum agente configurado</p>
                      <p className="text-xs text-muted-foreground mt-1">Crie agentes para automatizar transcrições, resumos e estudos bíblicos</p>
                    </TableCell>
                  </TableRow>
                )}
                {(agents || []).map((agent) => (
                  <TableRow key={agent.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div>
                        <span className="font-medium text-sm">{agent.name}</span>
                        {agent.description && <p className="text-xs text-muted-foreground">{agent.description}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="rounded-lg text-xs">
                        {ROLE_LABELS[agent.role] || agent.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {agent.provider_name ? (
                        <span className="text-sm">
                          {agent.provider_name}
                          <span className="text-xs text-muted-foreground ml-1">({agent.provider_model})</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Não definido</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-mono">{Number(agent.temperature).toFixed(1)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={agent.is_active ? "border-success/50 text-success bg-success/5" : "border-destructive/50 text-destructive bg-destructive/5"}>
                        {agent.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem className="gap-2 rounded-lg" onClick={() => handleEdit(agent)}>
                            <Pencil className="w-4 h-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 rounded-lg" onClick={() => toggleAgent.mutate(agent.id)}>
                            <Power className="w-4 h-4" /> {agent.is_active ? "Desativar" : "Ativar"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 rounded-lg text-destructive" onClick={() => setDeleteTarget(agent)}>
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

      <AgentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        agent={editingAgent}
        providers={providers || []}
        onSave={handleSave}
        loading={createAgent.isPending || updateAgent.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Excluir Agente"
        description={`Tem certeza que deseja excluir "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={() => deleteTarget && deleteAgent.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        loading={deleteAgent.isPending}
      />
    </>
  );
};

export default AgentsPage;
