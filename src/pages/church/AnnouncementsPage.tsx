import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Megaphone, Plus, Trash2, Loader2, Pin, Bell, Image, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Announcement {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  is_pinned: boolean;
  notify_members: boolean;
  author_name: string | null;
  created_at: string;
}

const AnnouncementsPage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '', body: '', image_url: '', is_pinned: false, notify_members: false,
  });

  const isAdmin = user?.role === 'admin_church' || user?.role === 'leader';

  useEffect(() => {
    api.get<Announcement[]>('/api/church/announcements')
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!form.title.trim()) return toast.error('Título obrigatório');
    setSubmitting(true);
    try {
      const item = await api.post<Announcement>('/api/church/announcements', form);
      setItems(prev => [item, ...prev]);
      setForm({ title: '', body: '', image_url: '', is_pinned: false, notify_members: false });
      setCreateOpen(false);
      toast.success(form.notify_members ? 'Recado enviado com notificação!' : 'Recado publicado!');
    } catch {
      toast.error('Erro ao publicar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/church/announcements/${id}`);
      setItems(prev => prev.filter(a => a.id !== id));
      toast.success('Removido');
    } catch {
      toast.error('Erro ao remover');
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Mural de Recados</h1>
          <p className="text-sm text-muted-foreground">Avisos e comunicados da igreja</p>
        </div>
        {isAdmin && (
          <Button className="rounded-xl" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Novo recado
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <Card className="p-8 rounded-2xl text-center space-y-3">
          <Megaphone className="w-10 h-10 mx-auto text-muted-foreground/40" />
          <h3 className="font-heading font-semibold">Nenhum recado ainda</h3>
          <p className="text-sm text-muted-foreground">Os recados e avisos da igreja aparecerão aqui.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <Card key={item.id} className={`rounded-2xl overflow-hidden ${item.is_pinned ? 'border-primary/30 bg-primary/5' : ''}`}>
              {item.image_url && (
                <img src={item.image_url} alt={item.title} className="w-full h-48 object-cover" />
              )}
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {item.is_pinned && <Pin className="w-3.5 h-3.5 text-primary shrink-0" />}
                    <h3 className="font-heading font-semibold text-sm truncate">{item.title}</h3>
                  </div>
                  {isAdmin && (
                    <Button size="sm" variant="ghost" className="text-destructive shrink-0" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                {item.body && <p className="text-sm text-muted-foreground whitespace-pre-line">{item.body}</p>}
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>{item.author_name || 'Admin'}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR })}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-xl max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Recado</DialogTitle>
            <DialogDescription>Publique um aviso no mural da igreja</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="rounded-xl" placeholder="Ex: Ação social neste sábado" />
            </div>
            <div className="space-y-2">
              <Label>Mensagem (opcional)</Label>
              <Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} className="rounded-xl" rows={3} placeholder="Detalhes do aviso..." />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Image className="w-3.5 h-3.5" /> URL da imagem/arte (opcional)</Label>
              <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} className="rounded-xl" placeholder="https://..." />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_pinned} onCheckedChange={v => setForm(f => ({ ...f, is_pinned: v }))} />
              <Label className="flex items-center gap-1"><Pin className="w-3.5 h-3.5" /> Fixar no topo</Label>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Switch checked={form.notify_members} onCheckedChange={v => setForm(f => ({ ...f, notify_members: v }))} />
              <div>
                <Label className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                  <Bell className="w-3.5 h-3.5" /> Notificar membros
                </Label>
                <p className="text-[11px] text-muted-foreground">Envia uma notificação para todos os membros</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleCreate} disabled={submitting} className="rounded-xl">
              {submitting ? 'Publicando...' : 'Publicar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnnouncementsPage;
