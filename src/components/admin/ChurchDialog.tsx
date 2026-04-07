import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Church, useCreateChurch, useUpdateChurch, usePlans } from "@/hooks/useApi";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  church?: Church | null;
}

export default function ChurchDialog({ open, onOpenChange, church }: Props) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [planId, setPlanId] = useState<string>("");
  const [status, setStatus] = useState("trial");
  const { data: plans } = usePlans();
  const createMut = useCreateChurch();
  const updateMut = useUpdateChurch();
  const isEdit = !!church;
  const loading = createMut.isPending || updateMut.isPending;

  useEffect(() => {
    if (church) {
      setName(church.name);
      setSlug(church.slug);
      setPlanId(church.plan_id || "");
      setStatus(church.status);
    } else {
      setName(""); setSlug(""); setPlanId(""); setStatus("trial");
    }
  }, [church, open]);

  const generateSlug = (val: string) =>
    val.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { name, slug, plan_id: planId || undefined, status };
    if (isEdit) {
      await updateMut.mutateAsync({ id: church!.id, ...data });
    } else {
      await createMut.mutateAsync(data);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEdit ? "Editar Igreja" : "Nova Igreja"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome da Igreja</Label>
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); if (!isEdit) setSlug(generateSlug(e.target.value)); }}
              placeholder="Igreja Batista Central"
              className="rounded-xl"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Slug (URL)</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(generateSlug(e.target.value))}
              placeholder="batista-central"
              className="rounded-xl font-mono text-sm"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Plano</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecionar plano" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">Sem plano</SelectItem>
                  {(plans || []).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — R$ {Number(p.price).toFixed(0)}/{p.interval === 'yearly' ? 'ano' : 'mês'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="inactive">Inativa</SelectItem>
                  <SelectItem value="suspended">Suspensa</SelectItem>
                </SelectContent>
              </Select>
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
