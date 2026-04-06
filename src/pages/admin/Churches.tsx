import AdminHeader from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MoreHorizontal, Church, Users, Video, Eye, Pencil, Power } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";

const churchesData = [
  { id: 1, name: "Igreja Batista Central", slug: "batista-central", members: 245, services: 89, plan: "Premium", status: "active", created: "15/01/2026" },
  { id: 2, name: "Comunidade Vida Nova", slug: "vida-nova", members: 120, services: 34, plan: "Gratuito", status: "active", created: "20/02/2026" },
  { id: 3, name: "Igreja Presbiteriana Renovada", slug: "presbiteriana-renovada", members: 380, services: 156, plan: "Premium", status: "active", created: "10/11/2025" },
  { id: 4, name: "Assembleia de Deus Esperança", slug: "ad-esperanca", members: 95, services: 22, plan: "Gratuito", status: "active", created: "05/03/2026" },
  { id: 5, name: "Igreja Metodista Livre", slug: "metodista-livre", members: 67, services: 15, plan: "Gratuito", status: "inactive", created: "18/12/2025" },
  { id: 6, name: "Comunidade Graça e Paz", slug: "graca-paz", members: 198, services: 72, plan: "Premium", status: "active", created: "22/09/2025" },
];

const Churches = () => {
  const [search, setSearch] = useState("");
  const filtered = churchesData.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <AdminHeader title="Igrejas" subtitle="Gerencie todas as igrejas da plataforma" />
      <div className="flex-1 overflow-auto p-6 space-y-6 animate-slide-up">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Church, color: "bg-primary/10 text-primary", value: "47", label: "Total de igrejas" },
            { icon: Users, color: "bg-success/10 text-success", value: "3.842", label: "Total de membros" },
            { icon: Video, color: "bg-accent/10 text-accent", value: "892", label: "Total de cultos" },
          ].map((s) => (
            <Card key={s.label} className="p-4 flex items-center gap-4 rounded-2xl card-hover">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar igrejas..."
              className="pl-9 rounded-xl bg-muted/50 border-transparent focus:border-primary/30"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button className="gap-2 rounded-xl gradient-primary border-0 shadow-md shadow-primary/20">
            <Plus className="w-4 h-4" />
            Nova Igreja
          </Button>
        </div>

        <Card className="rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Igreja</TableHead>
                <TableHead>Membros</TableHead>
                <TableHead>Cultos</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
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
                  <TableCell className="text-sm">{church.members}</TableCell>
                  <TableCell className="text-sm">{church.services}</TableCell>
                  <TableCell>
                    <Badge
                      variant={church.plan === "Premium" ? "default" : "secondary"}
                      className={church.plan === "Premium" ? "gradient-primary border-0 text-white" : ""}
                    >
                      {church.plan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        church.status === "active"
                          ? "border-success/50 text-success bg-success/5"
                          : "border-destructive/50 text-destructive bg-destructive/5"
                      }
                    >
                      {church.status === "active" ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{church.created}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
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
      </div>
    </>
  );
};

export default Churches;
