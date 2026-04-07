import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Key, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
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
  { value: "google", label: "Google AI (Gemini)" },
  { value: "anthropic", label: "Anthropic" },
  { value: "groq", label: "Groq" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "custom", label: "Custom" },
];

const MODELS_BY_PROVIDER: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-4", label: "GPT-4" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    { value: "o1", label: "O1" },
    { value: "o1-mini", label: "O1 Mini" },
    { value: "o1-preview", label: "O1 Preview" },
  ],
  google: [
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  ],
  anthropic: [
    { value: "claude-4-sonnet", label: "Claude 4 Sonnet" },
    { value: "claude-4-opus", label: "Claude 4 Opus" },
    { value: "claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-opus", label: "Claude 3 Opus" },
    { value: "claude-3-haiku", label: "Claude 3 Haiku" },
  ],
  groq: [
    { value: "llama-3.3-70b-versatile", label: "LLaMA 3.3 70B" },
    { value: "llama-3.1-8b-instant", label: "LLaMA 3.1 8B" },
    { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
  ],
  deepseek: [
    { value: "deepseek-chat", label: "DeepSeek Chat" },
    { value: "deepseek-reasoner", label: "DeepSeek Reasoner" },
  ],
};

export default function AIProviderDialog({ open, onOpenChange, provider, onSave, loading }: Props) {
  const [name, setName] = useState("");
  const [providerType, setProviderType] = useState("openai");
  const [model, setModel] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [apiKeys, setApiKeys] = useState<string[]>([""]);
  const [isActive, setIsActive] = useState(true);
  const [costPer1k, setCostPer1k] = useState("0");

  const models = MODELS_BY_PROVIDER[providerType] || [];
  const useCustomInput = providerType === "custom" || models.length === 0;

  useEffect(() => {
    if (provider) {
      setName(provider.name);
      setProviderType(provider.provider);
      const providerModels = MODELS_BY_PROVIDER[provider.provider] || [];
      if (providerModels.find(m => m.value === provider.model)) {
        setModel(provider.model);
        setCustomModel("");
      } else {
        setModel("custom");
        setCustomModel(provider.model);
      }
      setApiKeys(provider.api_keys?.length ? provider.api_keys : [""]);
      setIsActive(provider.is_active);
      setCostPer1k(String(provider.cost_per_1k_tokens));
    } else {
      setName("");
      setProviderType("openai");
      setModel("gpt-4o");
      setCustomModel("");
      setApiKeys([""]);
      setIsActive(true);
      setCostPer1k("0");
    }
  }, [provider, open]);

  useEffect(() => {
    if (!provider) {
      const firstModel = MODELS_BY_PROVIDER[providerType]?.[0]?.value;
      setModel(firstModel || "");
      setCustomModel("");
    }
  }, [providerType]);

  const addKey = () => setApiKeys([...apiKeys, ""]);
  const removeKey = (i: number) => setApiKeys(apiKeys.filter((_, idx) => idx !== i));
  const updateKey = (i: number, val: string) => {
    const copy = [...apiKeys];
    copy[i] = val;
    setApiKeys(copy);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalModel = useCustomInput ? customModel : (model === "custom" ? customModel : model);
    onSave({
      name,
      provider: providerType,
      model: finalModel,
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
              {useCustomInput ? (
                <Input value={customModel} onChange={e => setCustomModel(e.target.value)} placeholder="nome-do-modelo" required className="rounded-xl" />
              ) : (
                <>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {models.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                      <SelectItem value="custom">Outro (digitar)</SelectItem>
                    </SelectContent>
                  </Select>
                  {model === "custom" && (
                    <Input value={customModel} onChange={e => setCustomModel(e.target.value)} placeholder="nome-do-modelo" required className="rounded-xl mt-2" />
                  )}
                </>
              )}
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
