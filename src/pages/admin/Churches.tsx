import AdminHeader from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, MoreHorizontal, Church, Users, Eye, Pencil, Power } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { useChurches } from "@/hooks/useApi";

const Churches = () => {
  const [search, setSearch] = useState("");
  const { data: churches, isLoading } = useChurches();

  const filtered = (churches || []).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <AdminHeader title="Igrejas" subtitle="Gerencie todas as igrejas da plataforma" />
      <div className="flex-1 overflow-auto p-6 space-y-6 animate-slide-up">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 flex items-center gap-4 rounded-2xl card-hover">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
              <Church className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold">{churches?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Total de igrejas</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4 rounded-2xl card-hover">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-success/10 text-success">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold">{(churches || []).reduce((s, c) => s + (+c.member_count || 0), 0)}</p>
              <p className="text-xs text-muted-foreground">Total de membros</p>
            </div>
          </Card>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar igrejas..." className="pl-9 rounded-xl bg-muted/50 border-transparent focus:border-primary/30" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button className="gap-2 rounded-xl gradient-primary border-0 shadow-md shadow-primary/20">
            <Plus className="w-4 h-4" /> Nova Igreja
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 rounded-2xl" />
        ) : (
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
                      <Badge variant={church.plan_name ? "default" : "secondary"} className={church.plan_name ? "gradient-primary border-0 text-white" : ""}>
                        {church.plan_name || "Sem plano"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={church.status === "active" ? "border-success/50 text-success bg-success/5" : "border-destructive/50 text-destructive bg-destructive/5"}>
                        {church.status === "active" ? "Ativa" : church.status}
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
                          <DropdownMenuItem className="gap-2 rounded-lg"><Eye className="w-4 h-4" /> Ver detalhes</DropdownMenuItem>
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

export default Churches;
