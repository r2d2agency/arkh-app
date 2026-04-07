import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { BarChart3, Plus, Trash2, Loader2, CheckCircle2, Vote } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface PollOption { id: string; label: string; position: number; votes: number; }
interface Poll { id: string; title: string; description: string; is_active: boolean; options: PollOption[]; my_vote: string | null; created_at: string; ends_at: string | null; }

const PollsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', options: ['', ''] });
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.role === 'admin_church' || user?.role === 'leader';

  useEffect(() => {
    api.get<Poll[]>('/api/church/polls')
      .then(r => setPolls(r || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    const options = form.options.filter(o => o.trim());
    if (!form.title || options.length < 2) {
      toast({ title: 'Título e pelo menos 2 opções são necessários', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const poll = await api.post<Poll>('/api/church/polls', { title: form.title, description: form.description, options });
      setPolls(prev => [poll, ...prev]);
      setForm({ title: '', description: '', options: ['', ''] });
      setCreateOpen(false);
      toast({ title: 'Enquete criada!' });
    } catch { toast({ title: 'Erro ao criar enquete', variant: 'destructive' }); }
    finally { setSubmitting(false); }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    try {
      await api.post(`/api/church/polls/${pollId}/vote`, { option_id: optionId });
      setPolls(prev => prev.map(p => {
        if (p.id !== pollId) return p;
        const oldVote = p.my_vote;
        const newOptions = p.options.map(o => ({
          ...o,
          votes: o.id === optionId ? o.votes + 1 : (o.id === oldVote ? o.votes - 1 : o.votes)
        }));
        return { ...p, options: newOptions, my_vote: optionId };
      }));
    } catch { toast({ title: 'Erro ao votar', variant: 'destructive' }); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/church/polls/${id}`);
      setPolls(prev => prev.filter(p => p.id !== id));
      toast({ title: 'Enquete removida' });
    } catch { toast({ title: 'Erro', variant: 'destructive' }); }
  };

  const addOption = () => setForm(f => ({ ...f, options: [...f.options, ''] }));
  const updateOption = (i: number, val: string) => setForm(f => ({ ...f, options: f.options.map((o, idx) => idx === i ? val : o) }));
  const removeOption = (i: number) => setForm(f => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }));

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Enquetes</h1>
          <p className="text-sm text-muted-foreground">Participe das votações da igreja</p>
        </div>
        {isAdmin && (
          <Button className="rounded-xl" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nova enquete
          </Button>
        )}
      </div>

      {polls.length === 0 ? (
        <Card className="p-12 rounded-xl text-center space-y-3">
          <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground/30" />
          <h3 className="font-heading font-semibold">Nenhuma enquete</h3>
          <p className="text-sm text-muted-foreground">As enquetes da igreja aparecerão aqui</p>
        </Card>
      ) : polls.map(poll => {
        const totalVotes = poll.options?.reduce((sum, o) => sum + (o.votes || 0), 0) || 0;
        return (
          <Card key={poll.id} className="p-5 rounded-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-heading font-semibold">{poll.title}</h3>
                {poll.description && <p className="text-sm text-muted-foreground mt-1">{poll.description}</p>}
              </div>
              {isAdmin && (
                <Button size="sm" variant="ghost" className="text-destructive shrink-0" onClick={() => handleDelete(poll.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {poll.options?.map(opt => {
                const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                const isMyVote = poll.my_vote === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleVote(poll.id, opt.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${
                      isMyVote ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium flex items-center gap-2">
                        {isMyVote && <CheckCircle2 className="w-4 h-4 text-primary" />}
                        {opt.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{totalVotes} voto(s) • {new Date(poll.created_at).toLocaleDateString('pt-BR')}</p>
          </Card>
        );
      })}

      {/* Create Poll Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-xl max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Enquete</DialogTitle>
            <DialogDescription>Crie uma votação para a igreja</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pergunta</Label>
              <Input placeholder="Ex: Qual tema gostariam no próximo estudo?" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea placeholder="Detalhes..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="rounded-xl" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Opções</Label>
              {form.options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder={`Opção ${i + 1}`} value={opt} onChange={e => updateOption(i, e.target.value)} className="rounded-xl" />
                  {form.options.length > 2 && (
                    <Button size="icon" variant="ghost" className="text-destructive shrink-0" onClick={() => removeOption(i)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" className="rounded-xl" onClick={addOption}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Adicionar opção
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleCreate} disabled={submitting} className="rounded-xl">
              {submitting ? 'Criando...' : 'Criar enquete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PollsPage;
