import AdminHeader from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, MoreHorizontal, Eye, Ban, Filter } from "lucide-react";
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

const usersData = [
  { id: 1, name: "João Silva", email: "joao@email.com", church: "Igreja Batista Central", role: "Membro", status: "active", lastAccess: "06/04/2026" },
  { id: 2, name: "Maria Oliveira", email: "maria@email.com", church: "Comunidade Vida Nova", role: "Admin", status: "active", lastAccess: "05/04/2026" },
  { id: 3, name: "Pedro Santos", email: "pedro@email.com", church: "Igreja Presbiteriana Renovada", role: "Membro", status: "blocked", lastAccess: "01/03/2026" },
  { id: 4, name: "Ana Costa", email: "ana@email.com", church: "Igreja Batista Central", role: "Líder", status: "active", lastAccess: "06/04/2026" },
  { id: 5, name: "Lucas Almeida", email: "lucas@email.com", church: "Assembleia de Deus Esperança", role: "Membro", status: "active", lastAccess: "04/04/2026" },
  { id: 6, name: "Isabela Ferreira", email: "isabela@email.com", church: "Comunidade Graça e Paz", role: "Admin", status: "active", lastAccess: "06/04/2026" },
];

const UsersPage = () => {
  const [search, setSearch] = useState("");
  const filtered = usersData.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <AdminHeader title="Usuários" subtitle="Visualize e gerencie todos os usuários" />
      <div className="flex-1 overflow-auto p-6 space-y-6 animate-slide-up">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              className="pl-9 rounded-xl bg-muted/50 border-transparent focus:border-primary/30"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" className="gap-2 rounded-xl">
            <Filter className="w-4 h-4" />
            Filtrar
          </Button>
        </div>

        <Card className="rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Usuário</TableHead>
                <TableHead>Igreja</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-white text-xs font-bold">
                        {user.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{user.church}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="rounded-lg">{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        user.status === "active"
                          ? "border-success/50 text-success bg-success/5"
                          : "border-destructive/50 text-destructive bg-destructive/5"
                      }
                    >
                      {user.status === "active" ? "Ativo" : "Bloqueado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.lastAccess}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem className="gap-2 rounded-lg"><Eye className="w-4 h-4" /> Ver perfil</DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 rounded-lg text-destructive"><Ban className="w-4 h-4" /> Bloquear</DropdownMenuItem>
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

export default UsersPage;
