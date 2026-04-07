import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Video, Plus, Search, Trash2, ExternalLink, Clock, User, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface Service {
  id: string;
  title: string;
  youtube_url: string;
  preacher: string;
  service_date: string;
  ai_start_time: string;
  ai_end_time: string;
  status: string;
  created_at: string;
}

const defaultForm = {
  title: '',
  youtube_url: '',
  preacher: '',
  service_date: new Date().toISOString().split('T')[0],
  ai_start_time: '00:00:00',
  ai_end_time: '',
};

const ChurchServices = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...defaultForm });

  const handleCreate = async () => {
    if (!form.title || !form.youtube_url) {
      toast({ title: 'Preencha o título e o link do YouTube', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/churches/services', form) as any;
      setServices(prev => [res.data, ...prev]);
      setForm({ ...defaultForm });
      setOpen(false);
      toast({ title: 'Culto adicionado com sucesso!' });
    } catch {
      const newService: Service = {
        id: crypto.randomUUID(),
        ...form,
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      setServices(prev => [newService, ...prev]);
      setForm({ ...defaultForm });
      setOpen(false);
      toast({ title: 'Culto adicionado localmente' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    setServices(prev => prev.filter(s => s.id !== id));
    toast({ title: 'Culto removido' });
  };

  const filtered = services.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.preacher?.toLowerCase().includes(search.toLowerCase())
  );

  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match?.[1];
  };

  const formatTime = (t: string) => {
    if (!t) return '';
    const parts = t.split(':');
    if (parts.length === 3 && parts[0] === '00') return `${parts[1]}:${parts[2]}`;
    return t;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Cultos</h1>
          <p className="text-sm text-muted-foreground">Adicione links do YouTube para transcrição e estudo com IA</p>
        </div>
        <Button className="rounded-xl gradient-primary border-0" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Novo culto
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar cultos..." className="pl-9 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 rounded-xl text-center space-y-4">
          <Video className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <h3 className="font-heading font-semibold text-lg">Nenhum culto adicionado</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Adicione seu primeiro culto colando o link do YouTube. A IA vai transcrever e gerar estudos automaticamente.
          </p>
          <Button className="rounded-xl gradient-primary border-0" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Adicionar primeiro culto
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(service => {
            const ytId = getYouTubeId(service.youtube_url);
            return (
              <Card key={service.id} className="rounded-xl overflow-hidden">
                {ytId && (
                  <img
                    src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                    alt={service.title}
                    className="w-full h-40 object-cover"
                  />
                )}
                <div className="p-4 space-y-2">
                  <h3 className="font-heading font-semibold truncate">{service.title}</h3>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {service.preacher && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {service.preacher}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(service.service_date || service.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    {(service.ai_start_time || service.ai_end_time) && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(service.ai_start_time)} - {formatTime(service.ai_end_time)}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="rounded-lg" asChild>
                      <a href={service.youtube_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3 mr-1" /> Assistir
                      </a>
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-lg text-destructive" onClick={() => handleDelete(service.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-xl max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Novo Culto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título do culto</Label>
              <Input placeholder="Ex: Culto de domingo 06/04" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data do culto</Label>
                <Input type="date" value={form.service_date} onChange={e => setForm(f => ({ ...f, service_date: e.target.value }))} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Pregador</Label>
                <Input placeholder="Nome do pregador" value={form.preacher} onChange={e => setForm(f => ({ ...f, preacher: e.target.value }))} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Link do YouTube</Label>
              <Input placeholder="https://youtube.com/watch?v=..." value={form.youtube_url} onChange={e => setForm(f => ({ ...f, youtube_url: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                Intervalo para IA processar
              </Label>
              <p className="text-xs text-muted-foreground">
                Defina o trecho do vídeo que a IA deve analisar (pregação). O membro ainda assiste o culto inteiro.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Início</Label>
                  <Input type="time" step="1" value={form.ai_start_time} onChange={e => setForm(f => ({ ...f, ai_start_time: e.target.value }))} className="rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Fim</Label>
                  <Input type="time" step="1" value={form.ai_end_time} onChange={e => setForm(f => ({ ...f, ai_end_time: e.target.value }))} className="rounded-xl" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleCreate} disabled={loading} className="rounded-xl gradient-primary border-0">
              {loading ? 'Salvando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChurchServices;
