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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Megaphone, Plus, Trash2, Loader2, Pin, Bell, ImageIcon, CalendarIcon,
  Clock, Video, ExternalLink, X, Upload, Pencil, RefreshCw, Repeat,
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
  recurrence: string | null;
  recurrence_day: number | null;
  recurrence_time: string | null;
  last_sent_at: string | null;
  author_name: string | null;
  author_avatar: string | null;
  created_at: string;
}

const RenderBody = ({ text }: { text: string }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return (
    <p className="text-sm text-muted-foreground whitespace-pre-line">
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-0.5 break-all">
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

const getYouTubeId = (url: string) => {
  const match = url.match(/(?:youtu\.be\/|v=|\/embed\/)([^&?#]+)/);
  return match ? match[1] : null;
};

const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

interface FormState {
  title: string;
  body: string;
  media_urls: string[];
  video_url: string;
  event_date: Date | null;
  event_time: string;
  is_pinned: boolean;
  notify_members: boolean;
  recurrence: string;
  recurrence_day: number;
  recurrence_time: string;
}

const emptyForm: FormState = {
  title: '', body: '', media_urls: [], video_url: '',
  event_date: null, event_time: '', is_pinned: false, notify_members: false,
  recurrence: 'none', recurrence_day: 0, recurrence_time: '09:00',
};

const AnnouncementsPage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...emptyForm });
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === 'admin_church' || user?.role === 'leader';

  useEffect(() => {
    api.get<Announcement[]>('/api/church/announcements')
      .then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setMediaFiles([]);
    setMediaPreviews([]);
    setEditingId(null);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (ann: Announcement) => {
    setEditingId(ann.id);
    setForm({
      title: ann.title,
      body: ann.body || '',
      media_urls: ann.media_urls || [],
      video_url: ann.video_url || '',
      event_date: ann.event_date ? new Date(ann.event_date + 'T12:00:00') : null,
      event_time: ann.event_time?.slice(0, 5) || '',
      is_pinned: ann.is_pinned,
      notify_members: false,
      recurrence: ann.recurrence || 'none',
      recurrence_day: ann.recurrence_day ?? 0,
      recurrence_time: ann.recurrence_time?.slice(0, 5) || '09:00',
    });
    setMediaFiles([]);
    setMediaPreviews([]);
    setDialogOpen(true);
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setMediaFiles(prev => [...prev, ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setMediaPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (idx: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== idx));
    setMediaPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const removeExistingMedia = (idx: number) => {
    setForm(f => ({ ...f, media_urls: f.media_urls.filter((_, i) => i !== idx) }));
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (!mediaFiles.length) return [];
    const formData = new FormData();
    mediaFiles.forEach(f => formData.append('files', f));
    const token = localStorage.getItem('access_token');
    const raw = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const baseUrl = raw.replace(/\/api\/?$/, '').replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/api/church/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    return data.urls;
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return toast.error('Título obrigatório');
    setSubmitting(true);
    try {
      setUploading(mediaFiles.length > 0);
      const uploadedUrls = await uploadFiles();
      const allMedia = [...form.media_urls, ...uploadedUrls];
      const payload = {
        title: form.title,
        body: form.body || null,
        image_url: allMedia.length > 0 ? allMedia[0] : null,
        media_urls: allMedia,
        video_url: form.video_url || null,
        event_date: form.event_date ? format(form.event_date, 'yyyy-MM-dd') : null,
        event_time: form.event_time || null,
        is_pinned: form.is_pinned,
        notify_members: form.notify_members,
        recurrence: form.recurrence === 'none' ? null : form.recurrence,
        recurrence_day: form.recurrence !== 'none' ? form.recurrence_day : null,
        recurrence_time: form.recurrence_time || '09:00',
      };

      if (editingId) {
        const updated = await api.put<Announcement>(`/api/church/announcements/${editingId}`, payload);
        setItems(prev => prev.map(a => a.id === editingId ? updated : a));
        toast.success('Recado atualizado!');
      } else {
        const item = await api.post<Announcement>('/api/church/announcements', payload);
        setItems(prev => [item, ...prev]);
        toast.success(form.notify_members ? 'Recado enviado com notificação!' : 'Recado publicado!');
      }
      resetForm();
      setDialogOpen(false);
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleResend = async (id: string) => {
    setResending(id);
    try {
      await api.post(`/api/church/announcements/${id}/resend`, {});
      toast.success('Notificação reenviada para todos os membros!');
    } catch {
      toast.error('Erro ao reenviar');
    } finally {
      setResending(null);
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
          <Button className="rounded-xl" onClick={openCreate}>
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
                {/* Header — no author name, just time + badges */}
                <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Megaphone className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Aviso da Igreja</span>
                      {item.is_pinned && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 gap-0.5 border-primary/30 text-primary">
                          <Pin className="w-2.5 h-2.5" /> Fixado
                        </Badge>
                      )}
                      {item.recurrence && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 gap-0.5 border-green-500/30 text-green-600">
                          <Repeat className="w-2.5 h-2.5" /> Semanal
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => openEdit(item)} title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-500" onClick={() => handleResend(item.id)}
                        disabled={resending === item.id} title="Reenviar notificação">
                        {resending === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id)} title="Remover">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
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
                      <img key={i} src={url} alt="" onClick={() => setExpandedImage(url)}
                        className={`w-full object-cover cursor-pointer hover:opacity-90 transition-opacity ${allMedia.length === 1 ? 'max-h-80' : 'h-40'}`} />
                    ))}
                  </div>
                )}

                {/* Video */}
                {ytId && (
                  <div className="aspect-video">
                    <iframe src={`https://www.youtube.com/embed/${ytId}`} className="w-full h-full" allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope" />
                  </div>
                )}
                {item.video_url && !ytId && (
                  <div className="px-4 pb-3">
                    <a href={item.video_url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                      <Video className="w-4 h-4" /> Assistir vídeo <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                <div className="h-2" />
              </Card>
            );
          })}
        </div>
      )}

      {/* Image fullscreen */}
      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-3xl p-2 rounded-2xl bg-transparent border-0 shadow-none">
          {expandedImage && <img src={expandedImage} alt="" className="w-full rounded-xl" />}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-xl max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Recado' : 'Novo Recado'}</DialogTitle>
            <DialogDescription>{editingId ? 'Atualize o recado no mural' : 'Publique um aviso no mural da igreja'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="rounded-xl" placeholder="Ex: Ação social neste sábado" />
            </div>
            <div className="space-y-2">
              <Label>Mensagem (links serão clicáveis)</Label>
              <Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} className="rounded-xl" rows={4} placeholder="Escreva o recado..." />
            </div>

            {/* Existing media */}
            {form.media_urls.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Fotos existentes</Label>
                <div className="grid grid-cols-3 gap-2">
                  {form.media_urls.map((src, i) => (
                    <div key={i} className="relative group">
                      <img src={src} alt="" className="w-full h-20 rounded-lg object-cover" />
                      <button onClick={() => removeExistingMedia(i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Media Upload */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /> Fotos / Artes</Label>
              {mediaPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {mediaPreviews.map((src, i) => (
                    <div key={i} className="relative group">
                      <img src={src} alt="" className="w-full h-20 rounded-lg object-cover" />
                      <button onClick={() => removeFile(i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*,video/mp4,video/webm" multiple className="hidden" onChange={handleFilesSelected} />
              <Button type="button" variant="outline" className="w-full rounded-xl border-dashed border-2" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                {mediaPreviews.length > 0 || form.media_urls.length > 0 ? 'Adicionar mais fotos' : 'Enviar fotos ou vídeos'}
              </Button>
            </div>

            {/* Video URL */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Video className="w-3.5 h-3.5" /> Vídeo (YouTube ou link)</Label>
              <Input value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} className="rounded-xl" placeholder="https://youtube.com/watch?v=..." />
            </div>

            {/* Event Date + Time */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" /> Data do evento</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("flex-1 justify-start rounded-xl text-left font-normal", !form.event_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.event_date ? format(form.event_date, "dd/MM/yyyy") : 'Selecionar data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.event_date || undefined}
                      onSelect={d => setForm(f => ({ ...f, event_date: d || null }))} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
                <Input type="time" value={form.event_time} onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))} className="rounded-xl w-28" />
              </div>
              {form.event_date && (
                <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => setForm(f => ({ ...f, event_date: null, event_time: '' }))}>
                  <X className="w-3 h-3 mr-1" /> Remover data
                </Button>
              )}
            </div>

            {/* Schedule weekly */}
            <div className="space-y-3 p-3 rounded-xl bg-green-500/5 border border-green-500/20">
              <Label className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
                <Repeat className="w-3.5 h-3.5" /> Agendar envio semanal
              </Label>
              <Select value={form.recurrence} onValueChange={v => setForm(f => ({ ...f, recurrence: v }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Sem agendamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem agendamento</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                </SelectContent>
              </Select>
              {form.recurrence === 'weekly' && (
                <div className="flex gap-2">
                  <Select value={String(form.recurrence_day)} onValueChange={v => setForm(f => ({ ...f, recurrence_day: Number(v) }))}>
                    <SelectTrigger className="rounded-xl flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dayNames.map((name, i) => (
                        <SelectItem key={i} value={String(i)}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="time" value={form.recurrence_time} onChange={e => setForm(f => ({ ...f, recurrence_time: e.target.value }))}
                    className="rounded-xl w-28" />
                </div>
              )}
              {form.recurrence === 'weekly' && (
                <p className="text-[11px] text-muted-foreground">
                  A notificação será reenviada automaticamente toda {dayNames[form.recurrence_day]} às {form.recurrence_time}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.is_pinned} onCheckedChange={v => setForm(f => ({ ...f, is_pinned: v }))} />
              <Label className="flex items-center gap-1"><Pin className="w-3.5 h-3.5" /> Fixar no topo</Label>
            </div>

            {!editingId && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Switch checked={form.notify_members} onCheckedChange={v => setForm(f => ({ ...f, notify_members: v }))} />
                <div>
                  <Label className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                    <Bell className="w-3.5 h-3.5" /> Notificar membros
                  </Label>
                  <p className="text-[11px] text-muted-foreground">Envia uma notificação para todos os membros</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="rounded-xl">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> {uploading ? 'Enviando fotos...' : 'Salvando...'}</> : editingId ? 'Salvar' : 'Publicar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnnouncementsPage;
