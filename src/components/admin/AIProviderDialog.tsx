import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Key } from "lucide-react";
import type { AIProvider } from "@/hooks/useApi";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider?: AIProvider | null;
  onSave: (data: {
    name: string;
    provider: string;
    model: string;
    api_keys: string[];
    is_active: boolean;
    cost_per_1k_tokens: number;
  }) => void;
  loading?: boolean;
}

const PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "google", label: "Google AI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "groq", label: "Groq" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "custom", label: "Custom" },
];

export default function AIProviderDialog({ open, onOpenChange, provider, onSave, loading }: Props) {
  const [name, setName] = useState("");
  const [providerType, setProviderType] = useState("openai");
  const [model, setModel] = useState("");
  const [apiKeys, setApiKeys] = useState<string[]>([""]);
  const [isActive, setIsActive] = useState(true);
  const [costPer1k, setCostPer1k] = useState("0");

  useEffect(() => {
    if (provider) {
      setName(provider.name);
      setProviderType(provider.provider);
      setModel(provider.model);
      setApiKeys(provider.api_keys?.length ? provider.api_keys : [""]);
      setIsActive(provider.is_active);
      setCostPer1k(String(provider.cost_per_1k_tokens));
    } else {
      setName("");
      setProviderType("openai");
      setModel("");
      setApiKeys([""]);
      setIsActive(true);
      setCostPer1k("0");
    }
  }, [provider, open]);

  const addKey = () => setApiKeys([...apiKeys, ""]);
  const removeKey = (i: number) => setApiKeys(apiKeys.filter((_, idx) => idx !== i));
  const updateKey = (i: number, val: string) => {
    const copy = [...apiKeys];
    copy[i] = val;
    setApiKeys(copy);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      provider: providerType,
      model,
      api_keys: apiKeys.filter(k => k.trim() !== ""),
      is_active: isActive,
      cost_per_1k_tokens: parseFloat(costPer1k) || 0,
    });
  };

  const isEditing = !!provider;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEditing ? "Editar Provedor" : "Novo Provedor de IA"}</DialogTitle>
          <DialogDescription>Preencha os dados do provedor. Você pode adicionar múltiplos tokens de acesso.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: GPT-4 Principal" required className="rounded-xl" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Provedor</Label>
              <Select value={providerType} onValueChange={setProviderType}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {PROVIDERS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input value={model} onChange={e => setModel(e.target.value)} placeholder="gpt-4o" required className="rounded-xl" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Custo por 1K tokens (R$)</Label>
            <Input type="number" step="0.0001" value={costPer1k} onChange={e => setCostPer1k(e.target.value)} className="rounded-xl" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2"><Key className="w-4 h-4" /> Tokens de Acesso (API Keys)</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addKey} className="gap-1 text-xs rounded-lg">
                <Plus className="w-3 h-3" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {apiKeys.map((key, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    type="password"
                    value={key}
                    onChange={e => updateKey(i, e.target.value)}
                    placeholder={`Token ${i + 1}`}
                    className="rounded-xl font-mono text-xs"
                  />
                  {apiKeys.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeKey(i)} className="shrink-0 h-10 w-10 rounded-lg text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Múltiplos tokens permitem balanceamento de carga e fallback automático.</p>
          </div>

          <div className="flex items-center justify-between rounded-xl border p-3">
            <Label>Provedor ativo</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="rounded-xl gradient-primary border-0 shadow-md shadow-primary/20" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isEditing ? "Salvar" : "Criar Provedor"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
