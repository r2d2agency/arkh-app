import AdminHeader from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, MoreHorizontal, Church as ChurchIcon, Users, Eye, Pencil, Power, Trash2, ArrowRightLeft } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { Church, useChurches, useDeleteChurch, useUpdateChurch, usePlans } from "@/hooks/useApi";
import ChurchDialog from "@/components/admin/ChurchDialog";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const statusLabels: Record<string, string> = {
  active: "Ativa", inactive: "Inativa", trial: "Trial", suspended: "Suspensa",
};

const Churches = () => {
  const [search, setSearch] = useState("");
  const { data: churches, isLoading } = useChurches();
  const { data: plans } = usePlans();
  const deleteMut = useDeleteChurch();
  const updateMut = useUpdateChurch();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editChurch, setEditChurch] = useState<Church | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Church | null>(null);
  const [planTarget, setPlanTarget] = useState<Church | null>(null);
  const [newPlanId, setNewPlanId] = useState("");

  const filtered = (churches || []).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleChangePlan = async () => {
    if (!planTarget) return;
    await updateMut.mutateAsync({ id: planTarget.id, plan_id: newPlanId === "none" ? undefined : newPlanId });
    setPlanTarget(null);
  };

  return (
    <>
      <AdminHeader title="Igrejas" subtitle="Gerencie todas as igrejas da plataforma" />
      <div className="flex-1 overflow-auto p-6 space-y-6 animate-slide-up">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 flex items-center gap-4 rounded-2xl card-hover">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-primary/10 text-primary"><ChurchIcon className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-heading font-bold">{churches?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Total de igrejas</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4 rounded-2xl card-hover">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-success/10 text-success"><Users className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-heading font-bold">{(churches || []).reduce((s, c) => s + (+c.member_count || 0), 0)}</p>
              <p className="text-xs text-muted-foreground">Total de membros</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4 rounded-2xl card-hover">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-warning/10 text-warning"><ArrowRightLeft className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-heading font-bold">{(churches || []).filter(c => c.status === 'trial').length}</p>
              <p className="text-xs text-muted-foreground">Em trial</p>
            </div>
          </Card>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar igrejas..." className="pl-9 rounded-xl bg-muted/50 border-transparent focus:border-primary/30" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button className="gap-2 rounded-xl gradient-primary border-0 shadow-md shadow-primary/20" onClick={() => { setEditChurch(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4" /> Nova Igreja
          </Button>
        </div>

        {isLoading ? <Skeleton className="h-64 rounded-2xl" /> : (
          <Card className="rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Igreja</TableHead>
                  <TableHead>Membros</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma igreja encontrada</TableCell></TableRow>
                )}
                {filtered.map((church) => (
                  <TableRow key={church.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center text-primary text-[10px] font-bold">
                          {church.name.split(" ").slice(0, 2).map(w => w[0]).join("")}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{church.name}</p>
                          <p className="text-xs text-muted-foreground">/{church.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{church.member_count}</TableCell>
                    <TableCell>
                      <Badge
                        variant={church.plan_name ? "default" : "secondary"}
                        className={`cursor-pointer ${church.plan_name ? "gradient-primary border-0 text-white" : ""}`}
                        onClick={() => { setPlanTarget(church); setNewPlanId(church.plan_id || "none"); }}
                      >
                        {church.plan_name || "Sem plano"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        church.status === "active" ? "border-success/50 text-success bg-success/5" :
                        church.status === "trial" ? "border-warning/50 text-warning bg-warning/5" :
                        "border-destructive/50 text-destructive bg-destructive/5"
                      }>
                        {statusLabels[church.status] || church.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(church.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem className="gap-2 rounded-lg" onClick={() => { setEditChurch(church); setDialogOpen(true); }}>
                            <Pencil className="w-4 h-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 rounded-lg" onClick={() => { setPlanTarget(church); setNewPlanId(church.plan_id || "none"); }}>
                            <ArrowRightLeft className="w-4 h-4" /> Trocar Plano
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 rounded-lg text-destructive" onClick={() => setDeleteTarget(church)}>
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

      <ChurchDialog open={dialogOpen} onOpenChange={setDialogOpen} church={editChurch} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Excluir Igreja"
        description={`Tem certeza que deseja excluir "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={async () => { if (deleteTarget) { await deleteMut.mutateAsync(deleteTarget.id); setDeleteTarget(null); } }}
        loading={deleteMut.isPending}
      />

      {/* Change Plan Dialog */}
      <Dialog open={!!planTarget} onOpenChange={(o) => { if (!o) setPlanTarget(null); }}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Trocar Plano</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Alterar o plano de <strong>{planTarget?.name}</strong></p>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Novo Plano</Label>
            <Select value={newPlanId} onValueChange={setNewPlanId}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecionar plano" /></SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="none">Sem plano</SelectItem>
                {(plans || []).map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — R$ {Number(p.price).toFixed(0)}/{p.interval === 'yearly' ? 'ano' : 'mês'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setPlanTarget(null)}>Cancelar</Button>
            <Button className="rounded-xl gradient-primary border-0" onClick={handleChangePlan} disabled={updateMut.isPending}>
              {updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Churches;
