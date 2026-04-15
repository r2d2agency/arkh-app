import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Users, Plus, Trash2, Loader2, Search, MapPin, Clock, Heart, Edit } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface Group {
  id: string; name: string; description: string; created_at: string; member_count?: number;
  address?: string; lat?: number; lng?: number; meeting_day?: string; meeting_time?: string;
  leader1_name?: string; leader2_name?: string;
}

const dayLabels: Record<string, string> = {
  monday: 'Segunda', tuesday: 'Terça', wednesday: 'Quarta', thursday: 'Quinta',
  friday: 'Sexta', saturday: 'Sábado', sunday: 'Domingo',
};

const GroupsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [fetching, setFetching] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', description: '', address: '', meeting_day: '', meeting_time: '', leader1_name: '', leader2_name: '' });

  const isAdmin = user?.role === 'admin_church' || user?.role === 'leader';

  useEffect(() => {
    api.get<Group[]>('/api/church/groups')
      .then(r => setGroups(r || []))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const resetForm = () => setForm({ name: '', description: '', address: '', meeting_day: '', meeting_time: '', leader1_name: '', leader2_name: '' });

  const openEdit = (e: React.MouseEvent, g: Group) => {
    e.stopPropagation();
    setForm({
      name: g.name || '', description: g.description || '', address: g.address || '',
      meeting_day: g.meeting_day || '', meeting_time: g.meeting_time?.slice(0,5) || '',
      leader1_name: g.leader1_name || '', leader2_name: g.leader2_name || '',
    });
    setEditGroup(g);
  };

  const handleCreate = async () => {
    if (!form.name) { toast({ title: 'Nome obrigatório', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const g = await api.post<Group>('/api/church/groups', form);
      setGroups(prev => [g, ...prev]);
      resetForm();
      setCreateOpen(false);
      toast({ title: 'Grupo criado!' });
    } catch (err: any) { toast({ title: err.message || 'Erro', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const handleEdit = async () => {
    if (!editGroup || !form.name) return;
    setLoading(true);
    try {
      const g = await api.put<Group>(`/api/church/groups/${editGroup.id}`, form);
      setGroups(prev => prev.map(gr => gr.id === editGroup.id ? { ...gr, ...g } : gr));
      setEditGroup(null);
      resetForm();
      toast({ title: 'Grupo atualizado!' });
    } catch (err: any) { toast({ title: err.message || 'Erro', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.delete(`/api/church/groups/${id}`);
      setGroups(prev => prev.filter(g => g.id !== id));
      toast({ title: 'Grupo removido' });
    } catch { toast({ title: 'Erro', variant: 'destructive' }); }
  };

  const filtered = groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

  const formFields = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nome do grupo *</Label>
        <Input placeholder="Ex: Jovens, Louvor..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="rounded-xl" />
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea placeholder="Breve descrição do grupo" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="rounded-xl min-h-[60px]" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Líder 1</Label>
          <Input placeholder="Nome do líder" value={form.leader1_name} onChange={e => setForm(f => ({ ...f, leader1_name: e.target.value }))} className="rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label>Líder 2</Label>
          <Input placeholder="Nome do cônjuge" value={form.leader2_name} onChange={e => setForm(f => ({ ...f, leader2_name: e.target.value }))} className="rounded-xl" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Endereço da reunião</Label>
        <Input placeholder="Rua, número, bairro..." value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Dia da reunião</Label>
          <Select value={form.meeting_day} onValueChange={v => setForm(f => ({ ...f, meeting_day: v }))}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecionar" /></SelectTrigger>
            <SelectContent>
              {Object.entries(dayLabels).map(([k,v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Horário</Label>
          <Input type="time" value={form.meeting_time} onChange={e => setForm(f => ({ ...f, meeting_time: e.target.value }))} className="rounded-xl" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Grupos</h1>
          <p className="text-sm text-muted-foreground">Gerencie os grupos da sua igreja</p>
        </div>
        {isAdmin && (
          <Button className="rounded-xl" onClick={() => { resetForm(); setCreateOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Novo grupo
          </Button>
        )}
      </div>

      {groups.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar grupos..." className="pl-9 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {fetching ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 rounded-xl text-center space-y-4">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <h3 className="font-heading font-semibold text-lg">Nenhum grupo criado</h3>
          <p className="text-sm text-muted-foreground">Crie grupos para organizar seus membros</p>
          {isAdmin && (
            <Button className="rounded-xl" onClick={() => { resetForm(); setCreateOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Criar primeiro grupo
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(group => (
            <Card
              key={group.id}
              className="p-5 rounded-xl border-border/60 cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => navigate(`/church/groups/${group.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1 min-w-0">
                  <h3 className="font-heading font-semibold truncate">{group.name}</h3>
                  {group.description && <p className="text-xs text-muted-foreground line-clamp-2">{group.description}</p>}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={e => openEdit(e, group)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive h-7 w-7 p-0" onClick={e => handleDelete(e, group.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              {(group.leader1_name || group.leader2_name) && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                  <Heart className="w-3 h-3 text-pink-500" />
                  <span>{[group.leader1_name, group.leader2_name].filter(Boolean).join(' & ')}</span>
                </div>
              )}
              {group.address && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{group.address}</span>
                </div>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {group.member_count ?? 0} membros</span>
                {group.meeting_day && (
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {dayLabels[group.meeting_day]}{group.meeting_time ? ` ${group.meeting_time.slice(0,5)}` : ''}</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-xl max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Grupo</DialogTitle>
            <DialogDescription>Defina os detalhes do grupo e a reunião semanal</DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleCreate} disabled={loading} className="rounded-xl">
              {loading ? 'Criando...' : 'Criar grupo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editGroup} onOpenChange={o => { if (!o) { setEditGroup(null); resetForm(); } }}>
        <DialogContent className="rounded-xl max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Grupo</DialogTitle>
            <DialogDescription>Atualize os dados do grupo</DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditGroup(null); resetForm(); }} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleEdit} disabled={loading} className="rounded-xl">
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupsPage;
