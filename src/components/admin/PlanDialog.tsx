import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, X, Bot } from "lucide-react";
import { Plan, useCreatePlan, useUpdatePlan } from "@/hooks/useApi";
import { Badge } from "@/components/ui/badge";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: Plan | null;
}

export default function PlanDialog({ open, onOpenChange, plan }: Props) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const [interval, setInterval] = useState("monthly");
  const [maxMembers, setMaxMembers] = useState("50");
  const [maxAiTokens, setMaxAiTokens] = useState("100000");
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState("");
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(false);
  const [aiAssistantDailyLimit, setAiAssistantDailyLimit] = useState("0");
  const [aiAssistantMaxTokens, setAiAssistantMaxTokens] = useState("2000");
  const createMut = useCreatePlan();
  const updateMut = useUpdatePlan();
  const isEdit = !!plan;
  const loading = createMut.isPending || updateMut.isPending;

  useEffect(() => {
    if (plan) {
      setName(plan.name);
      setPrice(String(plan.price));
      setInterval(plan.interval);
      setMaxMembers(String(plan.max_members));
      setMaxAiTokens(String(plan.max_ai_tokens));
      setFeatures(Array.isArray(plan.features) ? plan.features : []);
      setAiAssistantEnabled((plan as any).ai_assistant_enabled || false);
      setAiAssistantDailyLimit(String((plan as any).ai_assistant_daily_limit || 0));
      setAiAssistantMaxTokens(String((plan as any).ai_assistant_max_tokens_per_msg || 2000));
    } else {
      setName(""); setPrice("0"); setInterval("monthly"); setMaxMembers("50"); setMaxAiTokens("100000"); setFeatures([]);
      setAiAssistantEnabled(false); setAiAssistantDailyLimit("0"); setAiAssistantMaxTokens("2000");
    }
    setNewFeature("");
  }, [plan, open]);

  const addFeature = () => {
    if (newFeature.trim()) { setFeatures(f => [...f, newFeature.trim()]); setNewFeature(""); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name, price: +price, interval, max_members: +maxMembers, max_ai_tokens: +maxAiTokens, features,
      ai_assistant_enabled: aiAssistantEnabled,
      ai_assistant_daily_limit: +aiAssistantDailyLimit,
      ai_assistant_max_tokens_per_msg: +aiAssistantMaxTokens,
    };
    if (isEdit) {
      await updateMut.mutateAsync({ id: plan!.id, ...data });
    } else {
      await createMut.mutateAsync(data);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEdit ? "Editar Plano" : "Novo Plano"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome do Plano</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Premium" className="rounded-xl" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Preço (R$)</Label>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} min="0" step="0.01" className="rounded-xl" required />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Intervalo</Label>
              <Select value={interval} onValueChange={setInterval}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Máx. Membros</Label>
              <Input type="number" value={maxMembers} onChange={e => setMaxMembers(e.target.value)} min="1" className="rounded-xl" required />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Máx. Tokens IA</Label>
              <Input type="number" value={maxAiTokens} onChange={e => setMaxAiTokens(e.target.value)} min="0" className="rounded-xl" required />
            </div>
          </div>

          {/* AI Assistant Section */}
          <div className="rounded-xl border border-primary/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                <Label className="text-sm font-medium">IA Assistente</Label>
              </div>
              <Switch checked={aiAssistantEnabled} onCheckedChange={setAiAssistantEnabled} />
            </div>
            {aiAssistantEnabled && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Interações/dia</Label>
                  <Input type="number" value={aiAssistantDailyLimit} onChange={e => setAiAssistantDailyLimit(e.target.value)} min="0" className="rounded-xl" placeholder="0 = ilimitado" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Max tokens/msg</Label>
                  <Input type="number" value={aiAssistantMaxTokens} onChange={e => setAiAssistantMaxTokens(e.target.value)} min="500" className="rounded-xl" />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Funcionalidades</Label>
            <div className="flex gap-2">
              <Input value={newFeature} onChange={e => setNewFeature(e.target.value)} placeholder="Ex: Cultos ilimitados" className="rounded-xl"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }} />
              <Button type="button" variant="outline" size="icon" className="rounded-xl shrink-0" onClick={addFeature}><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {features.map((f, i) => (
                <Badge key={i} variant="secondary" className="rounded-lg gap-1 pr-1">
                  {f}
                  <button type="button" onClick={() => setFeatures(features.filter((_, j) => j !== i))} className="hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="rounded-xl gradient-primary border-0" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
