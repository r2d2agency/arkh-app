import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Users, Plus, Trash2, Loader2, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface Group { id: string; name: string; description: string; created_at: string; member_count?: number; }

const GroupsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [fetching, setFetching] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', description: '' });

  const isAdmin = user?.role === 'admin_church' || user?.role === 'leader';

  useEffect(() => {
    api.get<Group[]>('/api/church/groups')
      .then(r => setGroups(r || []))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const handleCreate = async () => {
    if (!form.name) { toast({ title: 'Nome obrigatório', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const g = await api.post<Group>('/api/church/groups', form);
      setGroups(prev => [g, ...prev]);
      setForm({ name: '', description: '' });
      setCreateOpen(false);
      toast({ title: 'Grupo criado!' });
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Grupos</h1>
          <p className="text-sm text-muted-foreground">Gerencie os grupos da sua igreja</p>
        </div>
        {isAdmin && (
          <Button className="rounded-xl" onClick={() => setCreateOpen(true)}>
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
            <Button className="rounded-xl" onClick={() => setCreateOpen(true)}>
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
                  <Button size="sm" variant="ghost" className="text-destructive shrink-0" onClick={e => handleDelete(e, group.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span>{group.member_count ?? 0} membros</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-xl max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Grupo</DialogTitle>
            <DialogDescription>Crie um grupo para organizar seus membros</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do grupo</Label>
              <Input placeholder="Ex: Jovens, Louvor..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input placeholder="Breve descrição" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleCreate} disabled={loading} className="rounded-xl">
              {loading ? 'Criando...' : 'Criar grupo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupsPage;
