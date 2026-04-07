import AdminHeader from "@/components/admin/AdminHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useLogs } from "@/hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";

const levelColors: Record<string, string> = {
  info: "bg-primary/10 text-primary border-primary/20",
  warn: "bg-warning/10 text-warning border-warning/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
  critical: "bg-destructive/10 text-destructive border-destructive/20",
};

const Logs = () => {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const queryClient = useQueryClient();
  const level = tab === "all" ? undefined : tab;
  const { data: logs, isLoading } = useLogs(level);

  const filtered = (logs || []).filter((log) =>
    (log.action + (log.message || '')).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <AdminHeader title="Logs" subtitle="Ações, erros e uso da plataforma" />
      <div className="flex-1 overflow-auto p-6 space-y-6 animate-slide-up">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TabsList className="rounded-xl bg-muted/50">
              <TabsTrigger value="all" className="rounded-lg">Todos</TabsTrigger>
              <TabsTrigger value="info" className="rounded-lg">Info</TabsTrigger>
              <TabsTrigger value="warn" className="rounded-lg">Avisos</TabsTrigger>
              <TabsTrigger value="error" className="rounded-lg">Erros</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar logs..." className="pl-9 w-64 rounded-xl bg-muted/50 border-transparent focus:border-primary/30" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Button variant="outline" size="icon" className="rounded-xl" onClick={() => queryClient.invalidateQueries({ queryKey: ['logs'] })}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <TabsContent value={tab} className="mt-4">
            {isLoading ? <Skeleton className="h-64 rounded-2xl" /> : (
              <Card className="rounded-2xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Nível</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum log encontrado</TableCell></TableRow>
                    )}
                    {filtered.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <Badge variant="outline" className={`${levelColors[log.level] || ''} rounded-lg`}>
                            {log.level.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{log.action}</TableCell>
                        <TableCell className="text-sm max-w-md text-muted-foreground">{log.message || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{log.user_name || "system"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default Logs;
