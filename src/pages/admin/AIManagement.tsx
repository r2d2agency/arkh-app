import AdminHeader from "@/components/admin/AdminHeader";
import StatCard from "@/components/admin/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Plus, Zap, AlertTriangle, DollarSign, MoreHorizontal, Pencil, Power } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const aiProviders = [
  { id: 1, name: "Transcrição de Vídeo", provider: "OpenAI Whisper", model: "whisper-large-v3", cost: "R$ 0,006/min", status: "active", priority: 1 },
  { id: 2, name: "Resumo de Culto", provider: "OpenAI", model: "gpt-4o", cost: "R$ 0,03/1K tokens", status: "active", priority: 1 },
  { id: 3, name: "Busca Semântica", provider: "OpenAI", model: "text-embedding-3-small", cost: "R$ 0,002/1K tokens", status: "active", priority: 1 },
  { id: 4, name: "Reflexão do Dia", provider: "OpenAI", model: "gpt-4o-mini", cost: "R$ 0,015/1K tokens", status: "active", priority: 1 },
  { id: 5, name: "Extração de Versículos", provider: "Anthropic", model: "claude-3-haiku", cost: "R$ 0,0025/1K tokens", status: "inactive", priority: 2 },
];

const AIManagement = () => {
  return (
    <>
      <AdminHeader title="Gestão de IA" subtitle="Provedores, consumo e configurações" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Requisições Hoje" value="1.234" change="+15% vs ontem" changeType="positive" icon={Zap} iconColor="bg-primary/10 text-primary" />
          <StatCard title="Custo Mensal" value="R$ 347" change="+8% vs mês anterior" changeType="negative" icon={DollarSign} iconColor="bg-warning/10 text-warning" />
          <StatCard title="Erros (24h)" value={3} change="99,7% uptime" changeType="positive" icon={AlertTriangle} iconColor="bg-destructive/10 text-destructive" />
          <StatCard title="Provedores Ativos" value={4} icon={Brain} iconColor="bg-success/10 text-success" />
        </div>

        {/* Consumption by Church */}
        <Card className="p-6">
          <h2 className="font-heading font-bold text-base mb-4">Consumo por Igreja (Top 5)</h2>
          <div className="space-y-3">
            {[
              { name: "Igreja Presbiteriana Renovada", usage: 85, cost: "R$ 98,40" },
              { name: "Igreja Batista Central", usage: 72, cost: "R$ 82,10" },
              { name: "Comunidade Graça e Paz", usage: 58, cost: "R$ 64,30" },
              { name: "Comunidade Vida Nova", usage: 34, cost: "R$ 41,20" },
              { name: "Assembleia de Deus Esperança", usage: 21, cost: "R$ 28,50" },
            ].map((item) => (
              <div key={item.name} className="flex items-center gap-4">
                <span className="text-sm w-64 truncate">{item.name}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${item.usage}%` }} />
                </div>
                <span className="text-sm font-medium w-20 text-right">{item.cost}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Providers Table */}
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-base">Provedores de IA</h2>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Provedor
          </Button>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Função</TableHead>
                <TableHead>Provedor</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aiProviders.map((ai) => (
                <TableRow key={ai.id}>
                  <TableCell className="font-medium text-sm">{ai.name}</TableCell>
                  <TableCell className="text-sm">{ai.provider}</TableCell>
                  <TableCell><Badge variant="secondary" className="font-mono text-xs">{ai.model}</Badge></TableCell>
                  <TableCell className="text-sm">{ai.cost}</TableCell>
                  <TableCell className="text-sm">{ai.priority}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={ai.status === "active" ? "border-success/50 text-success" : "border-destructive/50 text-destructive"}>
                      {ai.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2"><Pencil className="w-4 h-4" /> Editar</DropdownMenuItem>
                        <DropdownMenuItem className="gap-2"><Power className="w-4 h-4" /> Desativar</DropdownMenuItem>
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

export default AIManagement;
