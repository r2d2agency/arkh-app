import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Calendar, Plus, Trash2, Pencil, Loader2, MapPin, Clock, ChevronLeft, ChevronRight, Repeat } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Event {
  id: string; title: string; description: string; location: string;
  event_type: string; starts_at: string; ends_at: string; all_day: boolean;
}

const eventTypeLabels: Record<string, string> = {
  service: 'Culto', communion: 'Santa Ceia', prayer: 'Oração',
  youth_service: 'Culto Jovem', worship: 'Louvor',
  meeting: 'Reunião', event: 'Evento', group: 'Grupo', general: 'Geral',
};
const eventTypeColors: Record<string, string> = {
  service: 'bg-primary', communion: 'bg-rose-500', prayer: 'bg-amber-500',
  youth_service: 'bg-emerald-500', worship: 'bg-violet-500',
  meeting: 'bg-orange-500', event: 'bg-cyan-500', group: 'bg-indigo-500', general: 'bg-muted-foreground',
};

const emptyForm = {
  title: '', description: '', location: '', event_type: 'general',
  starts_at: '', ends_at: '', all_day: false, recurrence_rule: '', recurrence_until: '',
};

const AgendaPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const isAdmin = user?.role === 'admin_church' || user?.role === 'leader';

  const fetchEvents = (month: Date) => {
    const m = format(month, 'yyyy-MM');
    api.get<Event[]>(`/api/church/events?month=${m}`)
      .then(r => setEvents(r || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEvents(currentMonth); }, [currentMonth]);

  const openCreate = (date?: Date) => {
    setEditingEvent(null);
    const dateStr = date ? format(date, "yyyy-MM-dd'T'HH:mm") : '';
    setForm({ ...emptyForm, starts_at: dateStr });
    setDialogOpen(true);
  };

  const openEdit = (ev: Event) => {
    setEditingEvent(ev);
    setForm({
      title: ev.title || '',
      description: ev.description || '',
      location: ev.location || '',
      event_type: ev.event_type || 'general',
      starts_at: ev.starts_at ? ev.starts_at.slice(0, 16) : '',
      ends_at: ev.ends_at ? ev.ends_at.slice(0, 16) : '',
      all_day: ev.all_day || false,
      recurrence_rule: '',
      recurrence_until: '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.starts_at) {
      toast({ title: 'Título e data são obrigatórios', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      if (editingEvent) {
        const updated = await api.put<Event>(`/api/church/events/${editingEvent.id}`, {
          title: form.title, description: form.description, location: form.location,
          event_type: form.event_type, starts_at: form.starts_at, ends_at: form.ends_at || null,
          all_day: form.all_day,
        });
        setEvents(prev => prev.map(e => e.id === editingEvent.id ? updated : e));
        toast({ title: 'Evento atualizado!' });
      } else {
        const ev = await api.post<Event | Event[]>('/api/church/events', form);
        const newEvents = Array.isArray(ev) ? ev : [ev];
        setEvents(prev => [...prev, ...newEvents].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()));
        toast({ title: 'Evento criado!' });
      }
      setDialogOpen(false);
    } catch { toast({ title: 'Erro ao salvar evento', variant: 'destructive' }); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/church/events/${id}`);
      setEvents(prev => prev.filter(e => e.id !== id));
      toast({ title: 'Evento removido' });
    } catch { toast({ title: 'Erro', variant: 'destructive' }); }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);
  const eventsOnDate = (date: Date) => events.filter(e => isSameDay(new Date(e.starts_at), date));
  const selectedDateEvents = selectedDate ? eventsOnDate(selectedDate) : [];
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Agenda</h1>
          <p className="text-sm text-muted-foreground">Eventos e compromissos da igreja</p>
        </div>
        {isAdmin && (
          <Button className="rounded-xl" onClick={() => openCreate()}>
            <Plus className="w-4 h-4 mr-2" /> Novo evento
          </Button>
        )}
      </div>

      {/* Calendar */}
      <Card className="p-4 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-heading font-semibold capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {weekDays.map(d => (
            <div key={d} className="text-xs font-medium text-muted-foreground py-2">{d}</div>
          ))}
          {Array.from({ length: startDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
          {days.map(day => {
            const dayEvents = eventsOnDate(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            return (
              <button key={day.toISOString()} onClick={() => setSelectedDate(day)}
                onDoubleClick={() => isAdmin && openCreate(day)}
                className={`relative p-2 rounded-xl text-sm transition-colors ${
                  isSelected ? 'bg-primary text-primary-foreground' :
                  isToday ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted'
                }`}>
                {format(day, 'd')}
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 justify-center mt-0.5">
                    {dayEvents.slice(0, 3).map((e, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${eventTypeColors[e.event_type] || 'bg-primary'}`} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Selected date events */}
      {selectedDate && (
        <div className="space-y-3">
          <h3 className="font-heading font-semibold text-sm">
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h3>
          {selectedDateEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento neste dia</p>
          ) : selectedDateEvents.map(ev => (
            <Card key={ev.id} className="p-4 rounded-xl space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${eventTypeColors[ev.event_type] || 'bg-primary'}`} />
                  <h4 className="font-medium text-sm">{ev.title}</h4>
                  <Badge variant="secondary" className="text-[10px]">{eventTypeLabels[ev.event_type] || ev.event_type}</Badge>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(ev)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteConfirm(ev.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              {ev.description && <p className="text-sm text-muted-foreground">{ev.description}</p>}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {ev.all_day ? 'Dia inteiro' : format(new Date(ev.starts_at), 'HH:mm')}
                  {ev.ends_at && !ev.all_day && ` - ${format(new Date(ev.ends_at), 'HH:mm')}`}
                </span>
                {ev.location && (
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.location}</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upcoming events */}
      <div className="space-y-3">
        <h3 className="font-heading font-semibold text-sm">Próximos eventos</h3>
        {events.filter(e => new Date(e.starts_at) >= new Date()).length === 0 ? (
          <Card className="p-8 rounded-xl text-center">
            <Calendar className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum evento agendado</p>
          </Card>
        ) : events.filter(e => new Date(e.starts_at) >= new Date()).slice(0, 10).map(ev => (
          <Card key={ev.id} className="p-4 rounded-xl flex items-center gap-3">
            <div className="text-center shrink-0 w-12">
              <p className="text-xs text-muted-foreground uppercase">{format(new Date(ev.starts_at), 'MMM', { locale: ptBR })}</p>
              <p className="text-lg font-bold">{format(new Date(ev.starts_at), 'd')}</p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{ev.title}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-[10px]">{eventTypeLabels[ev.event_type] || ev.event_type}</Badge>
                {!ev.all_day && <span>{format(new Date(ev.starts_at), 'HH:mm')}</span>}
                {ev.location && <span>• {ev.location}</span>}
              </div>
            </div>
            {isAdmin && (
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => openEdit(ev)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteConfirm(ev.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Create/Edit Event Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-xl max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
            <DialogDescription>{editingEvent ? 'Altere os dados do evento' : 'Adicione um evento à agenda da igreja'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="rounded-xl" placeholder="Ex: Culto de Domingo" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.event_type} onValueChange={v => setForm(f => ({ ...f, event_type: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Culto</SelectItem>
                  <SelectItem value="communion">Santa Ceia</SelectItem>
                  <SelectItem value="prayer">Culto de Oração</SelectItem>
                  <SelectItem value="youth_service">Culto Jovem</SelectItem>
                  <SelectItem value="worship">Louvor & Adoração</SelectItem>
                  <SelectItem value="meeting">Reunião</SelectItem>
                  <SelectItem value="event">Evento Especial</SelectItem>
                  <SelectItem value="group">Grupo / Célula</SelectItem>
                  <SelectItem value="general">Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="rounded-xl" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Local (opcional)</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="rounded-xl" placeholder="Ex: Templo principal" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.all_day} onCheckedChange={v => setForm(f => ({ ...f, all_day: v }))} />
              <Label>Dia inteiro</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Início</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Fim (opcional)</Label>
                <Input type="datetime-local" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} className="rounded-xl" />
              </div>
            </div>

            {/* Recurrence - only for new events */}
            {!editingEvent && (
              <div className="space-y-2 p-3 rounded-xl bg-muted/50 border border-border">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Repeat className="w-3.5 h-3.5" /> Recorrência
                </Label>
                <Select value={form.recurrence_rule} onValueChange={v => setForm(f => ({ ...f, recurrence_rule: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Sem recorrência" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem recorrência</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="biweekly">Quinzenal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
                {form.recurrence_rule && form.recurrence_rule !== 'none' && (
                  <div className="space-y-2">
                    <Label className="text-xs">Repetir até</Label>
                    <Input type="date" value={form.recurrence_until} onChange={e => setForm(f => ({ ...f, recurrence_until: e.target.value }))} className="rounded-xl" />
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleSave} disabled={submitting} className="rounded-xl">
              {submitting ? 'Salvando...' : editingEvent ? 'Salvar' : 'Criar evento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
        title="Excluir evento"
        description="Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita."
        onConfirm={() => { if (deleteConfirm) { handleDelete(deleteConfirm); setDeleteConfirm(null); } }}
      />
    </div>
  );
};

export default AgendaPage;
