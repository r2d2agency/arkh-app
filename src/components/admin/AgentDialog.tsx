import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Loader2 } from "lucide-react";
import type { AIAgent, AIProvider } from "@/hooks/useApi";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: AIAgent | null;
  providers: AIProvider[];
  onSave: (data: {
    name: string;
    description: string;
    role: string;
    provider_id: string | null;
    system_prompt: string;
    temperature: number;
    max_tokens: number;
    is_active: boolean;
  }) => void;
  loading?: boolean;
}

const AGENT_ROLES = [
  { value: "transcriber", label: "Transcritor", desc: "Transcreve áudio/vídeo de cultos" },
  { value: "summarizer", label: "Resumidor", desc: "Gera resumos de pregações" },
  { value: "study_generator", label: "Gerador de Estudos", desc: "Cria estudos bíblicos a partir de pregações" },
  { value: "verse_finder", label: "Localizador de Versículos", desc: "Identifica e contextualiza versículos" },
  { value: "devotional", label: "Devocional", desc: "Gera devocionais diários" },
  { value: "chat_assistant", label: "Assistente de Chat", desc: "Responde perguntas dos membros" },
  { value: "custom", label: "Personalizado", desc: "Defina um papel customizado" },
];

export default function AgentDialog({ open, onOpenChange, agent, providers, onSave, loading }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [role, setRole] = useState("transcriber");
  const [providerId, setProviderId] = useState<string>("none");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setDescription(agent.description || "");
      setRole(agent.role);
      setProviderId(agent.provider_id || "none");
      setSystemPrompt(agent.system_prompt || "");
      setTemperature(Number(agent.temperature) || 0.7);
      setMaxTokens(agent.max_tokens || 2048);
      setIsActive(agent.is_active);
    } else {
      setName("");
      setDescription("");
      setRole("transcriber");
      setProviderId("none");
      setSystemPrompt("");
      setTemperature(0.7);
      setMaxTokens(2048);
      setIsActive(true);
    }
  }, [agent, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description,
      role,
      provider_id: providerId === "none" ? null : providerId,
      system_prompt: systemPrompt,
      temperature,
      max_tokens: maxTokens,
      is_active: isActive,
    });
  };

  const isEditing = !!agent;
  const activeProviders = providers.filter(p => p.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEditing ? "Editar Agente" : "Novo Agente de IA"}</DialogTitle>
          <DialogDescription>Configure o agente, sua função e qual provedor de IA ele utilizará.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Agente</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Transcritor Principal" required className="rounded-xl" />
          </div>

          <div className="space-y-2">
            <Label>Função</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl">
                {AGENT_ROLES.map(r => (
                  <SelectItem key={r.value} value={r.value}>
                    <div>
                      <span className="font-medium">{r.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">— {r.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve descrição do agente" className="rounded-xl" />
          </div>

          <div className="space-y-2">
            <Label>Provedor de IA</Label>
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="none">Nenhum (selecionar depois)</SelectItem>
                {activeProviders.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.provider} / {p.model})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeProviders.length === 0 && (
              <p className="text-xs text-warning">Nenhum provedor ativo. Crie um provedor primeiro.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>System Prompt</Label>
            <Textarea
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              placeholder="Instruções para o agente..."
              rows={4}
              className="rounded-xl text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Temperatura: {temperature}</Label>
              <Slider
                value={[temperature]}
                onValueChange={([v]) => setTemperature(v)}
                min={0}
                max={2}
                step={0.1}
              />
              <p className="text-xs text-muted-foreground">0 = preciso, 2 = criativo</p>
            </div>
            <div className="space-y-2">
              <Label>Max Tokens</Label>
              <Input type="number" value={maxTokens} onChange={e => setMaxTokens(parseInt(e.target.value) || 2048)} className="rounded-xl" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border p-3">
            <Label>Agente ativo</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="rounded-xl gradient-primary border-0 shadow-md shadow-primary/20" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isEditing ? "Salvar" : "Criar Agente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
