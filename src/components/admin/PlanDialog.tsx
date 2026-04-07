import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, X } from "lucide-react";
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
    } else {
      setName(""); setPrice("0"); setInterval("monthly"); setMaxMembers("50"); setMaxAiTokens("100000"); setFeatures([]);
    }
    setNewFeature("");
  }, [plan, open]);

  const addFeature = () => {
    if (newFeature.trim()) { setFeatures(f => [...f, newFeature.trim()]); setNewFeature(""); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { name, price: +price, interval, max_members: +maxMembers, max_ai_tokens: +maxAiTokens, features };
    if (isEdit) {
      await updateMut.mutateAsync({ id: plan!.id, ...data });
    } else {
      await createMut.mutateAsync(data);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-lg">
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
