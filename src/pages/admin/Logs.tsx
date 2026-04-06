import AdminHeader from "@/components/admin/AdminHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

const logsData = [
  { id: 1, type: "action", message: "Igreja 'Batista Central' criada", user: "admin@arkhe.app", date: "06/04/2026 14:32", level: "info" },
  { id: 2, type: "action", message: "Plano alterado para Premium - Comunidade Graça e Paz", user: "admin@arkhe.app", date: "06/04/2026 13:15", level: "info" },
  { id: 3, type: "error", message: "Falha na transcrição - timeout API OpenAI", user: "system", date: "06/04/2026 12:48", level: "error" },
  { id: 4, type: "action", message: "Usuário pedro@email.com bloqueado", user: "admin@arkhe.app", date: "06/04/2026 11:20", level: "warning" },
  { id: 5, type: "usage", message: "Limite de IA atingido - Assembleia de Deus Esperança", user: "system", date: "06/04/2026 10:05", level: "warning" },
  { id: 6, type: "error", message: "Erro ao processar vídeo YT-abc123", user: "system", date: "05/04/2026 22:30", level: "error" },
  { id: 7, type: "action", message: "Novo estudo publicado - Igreja Presbiteriana", user: "pastor@presbi.com", date: "05/04/2026 18:45", level: "info" },
  { id: 8, type: "usage", message: "500 transcrições processadas hoje", user: "system", date: "05/04/2026 17:00", level: "info" },
];

const levelColors: Record<string, string> = {
  info: "bg-primary/10 text-primary border-primary/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
};

const Logs = () => {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const filtered = logsData.filter((log) => {
    const matchSearch = log.message.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === "all" || log.type === tab;
    return matchSearch && matchTab;
  });

  return (
    <>
      <AdminHeader title="Logs" subtitle="Ações, erros e uso da plataforma" />
      <div className="flex-1 overflow-auto p-6 space-y-6 animate-slide-up">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TabsList className="rounded-xl bg-muted/50">
              <TabsTrigger value="all" className="rounded-lg">Todos</TabsTrigger>
              <TabsTrigger value="action" className="rounded-lg">Ações</TabsTrigger>
              <TabsTrigger value="error" className="rounded-lg">Erros</TabsTrigger>
              <TabsTrigger value="usage" className="rounded-lg">Uso</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar logs..."
                  className="pl-9 w-64 rounded-xl bg-muted/50 border-transparent focus:border-primary/30"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" className="rounded-xl"><RefreshCw className="w-4 h-4" /></Button>
            </div>
          </div>

          <TabsContent value={tab} className="mt-4">
            <Card className="rounded-2xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Nível</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <Badge variant="outline" className={`${levelColors[log.level]} rounded-lg`}>
                          {log.level.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-md">{log.message}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{log.user}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{log.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default Logs;
