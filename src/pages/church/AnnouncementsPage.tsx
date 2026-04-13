import { useState, useEffect, Fragment, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Megaphone, Plus, Trash2, Loader2, Pin, Bell, ImageIcon, CalendarIcon,
  Clock, Video, Link as LinkIcon, ExternalLink, X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  media_urls: string[];
  video_url: string | null;
  event_date: string | null;
  event_time: string | null;
  is_pinned: boolean;
  notify_members: boolean;
  author_name: string | null;
  author_avatar: string | null;
  created_at: string;
}

// Render text with clickable links
const RenderBody = ({ text }: { text: string }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return (
    <p className="text-sm text-muted-foreground whitespace-pre-line">
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-0.5 break-all"
          >
            {part.length > 50 ? part.slice(0, 50) + '…' : part}
            <ExternalLink className="w-3 h-3 inline shrink-0" />
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </p>
  );
};

// YouTube embed helper
const getYouTubeId = (url: string) => {
  const match = url.match(/(?:youtu\.be\/|v=|\/embed\/)([^&?#]+)/);
  return match ? match[1] : null;
};

const AnnouncementsPage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', body: '', image_url: '', media_urls: [] as string[], video_url: '',
    event_date: null as Date | null, event_time: '', is_pinned: false, notify_members: false,
  });
  const [newMediaUrl, setNewMediaUrl] = useState('');

  const isAdmin = user?.role === 'admin_church' || user?.role === 'leader';

  useEffect(() => {
    api.get<Announcement[]>('/api/church/announcements')
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => setForm({
    title: '', body: '', image_url: '', media_urls: [], video_url: '',
    event_date: null, event_time: '', is_pinned: false, notify_members: false,
  });

  const handleCreate = async () => {
    if (!form.title.trim()) return toast.error('Título obrigatório');
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        image_url: form.image_url || (form.media_urls.length > 0 ? form.media_urls[0] : null),
        event_date: form.event_date ? format(form.event_date, 'yyyy-MM-dd') : null,
        event_time: form.event_time || null,
      };
      const item = await api.post<Announcement>('/api/church/announcements', payload);
      setItems(prev => [item, ...prev]);
      resetForm();
      setCreateOpen(false);
      toast.success(form.notify_members ? 'Recado enviado com notificação!' : 'Recado publicado!');
    } catch {
      toast.error('Erro ao publicar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este recado?')) return;
    try {
      await api.delete(`/api/church/announcements/${id}`);
      setItems(prev => prev.filter(a => a.id !== id));
      toast.success('Removido');
    } catch {
      toast.error('Erro ao remover');
    }
  };

  const addMediaUrl = () => {
    if (!newMediaUrl.trim()) return;
    setForm(f => ({ ...f, media_urls: [...f.media_urls, newMediaUrl.trim()] }));
    setNewMediaUrl('');
  };

  const removeMediaUrl = (idx: number) => {
    setForm(f => ({ ...f, media_urls: f.media_urls.filter((_, i) => i !== idx) }));
  };

  // Sort: pinned first, then by date
  const sorted = [...items].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Mural de Recados</h1>
          <p className="text-sm text-muted-foreground">Avisos e comunicados da igreja</p>
        </div>
        {isAdmin && (
          <Button className="rounded-xl" onClick={() => { resetForm(); setCreateOpen(true); }}>
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
          {sorted.map(item => {
            const allMedia = [
              ...(item.image_url ? [item.image_url] : []),
              ...(item.media_urls || []).filter(u => u !== item.image_url),
            ];
            const ytId = item.video_url ? getYouTubeId(item.video_url) : null;

            return (
              <Card key={item.id} className={`rounded-2xl overflow-hidden ${item.is_pinned ? 'border-primary/30 bg-primary/5' : ''}`}>
                {/* Author header */}
                <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0 overflow-hidden">
                    {item.author_avatar ? (
                      <img src={item.author_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      item.author_name?.charAt(0) || 'A'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{item.author_name || 'Admin'}</span>
                      {item.is_pinned && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 gap-0.5 border-primary/30 text-primary">
                          <Pin className="w-2.5 h-2.5" /> Fixado
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  {isAdmin && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                {/* Title + Body */}
                <div className="px-4 pb-2 space-y-1.5">
                  <h3 className="font-heading font-semibold text-base">{item.title}</h3>
                  {item.body && <RenderBody text={item.body} />}
                </div>

                {/* Event date badge */}
                {item.event_date && (
                  <div className="px-4 pb-2">
                    <Badge variant="outline" className="gap-1.5 text-xs rounded-lg">
                      <CalendarIcon className="w-3 h-3" />
                      {format(new Date(item.event_date + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                      {item.event_time && (
                        <>
                          <Clock className="w-3 h-3 ml-1" />
                          {item.event_time.slice(0, 5)}
                        </>
                      )}
                    </Badge>
                  </div>
                )}

                {/* Media gallery */}
                {allMedia.length > 0 && (
                  <div className={`${allMedia.length === 1 ? '' : 'grid grid-cols-2 gap-0.5'}`}>
                    {allMedia.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt=""
                        className={`w-full object-cover cursor-pointer hover:opacity-90 transition-opacity ${
                          allMedia.length === 1 ? 'max-h-80' : 'h-40'
                        }`}
                        onClick={() => setExpandedImage(url)}
                      />
                    ))}
                  </div>
                )}

                {/* Video */}
                {ytId && (
                  <div className="aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}`}
                      className="w-full h-full"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                    />
                  </div>
                )}
                {item.video_url && !ytId && (
                  <div className="px-4 pb-3">
                    <a href={item.video_url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                      <Video className="w-4 h-4" /> Assistir vídeo
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* Bottom spacing */}
                <div className="h-2" />
              </Card>
            );
          })}
        </div>
      )}

      {/* Image fullscreen */}
      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-3xl p-2 rounded-2xl bg-transparent border-0 shadow-none">
          {expandedImage && (
            <img src={expandedImage} alt="" className="w-full rounded-xl" />
          )}
        </DialogContent>
      </Dialog>

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
              <Label>Mensagem (links serão clicáveis)</Label>
              <Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} className="rounded-xl" rows={4} placeholder="Escreva o recado... Links como https://... ficam clicáveis automaticamente" />
            </div>

            {/* Media URLs */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /> Fotos / Artes</Label>
              {form.media_urls.map((url, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <img src={url} alt="" className="w-10 h-10 rounded object-cover" />
                  <span className="text-xs text-muted-foreground flex-1 truncate">{url}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeMediaUrl(i)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newMediaUrl}
                  onChange={e => setNewMediaUrl(e.target.value)}
                  className="rounded-xl flex-1"
                  placeholder="URL da imagem..."
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addMediaUrl())}
                />
                <Button size="sm" variant="outline" className="rounded-xl" onClick={addMediaUrl} disabled={!newMediaUrl.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Video URL */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Video className="w-3.5 h-3.5" /> Vídeo (YouTube ou link)</Label>
              <Input value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} className="rounded-xl" placeholder="https://youtube.com/watch?v=..." />
            </div>

            {/* Event Date + Time */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" /> Data do evento (aparece no calendário)</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("flex-1 justify-start rounded-xl text-left font-normal", !form.event_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.event_date ? format(form.event_date, "dd/MM/yyyy") : 'Selecionar data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.event_date || undefined}
                      onSelect={d => setForm(f => ({ ...f, event_date: d || null }))}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={form.event_time}
                  onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))}
                  className="rounded-xl w-28"
                  placeholder="Horário"
                />
              </div>
              {form.event_date && (
                <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => setForm(f => ({ ...f, event_date: null, event_time: '' }))}>
                  <X className="w-3 h-3 mr-1" /> Remover data
                </Button>
              )}
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
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Publicando...</> : 'Publicar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnnouncementsPage;
