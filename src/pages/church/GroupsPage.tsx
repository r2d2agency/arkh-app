import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Trash2, UserPlus, Shield, Loader2, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface Group {
  id: string;
  name: string;
  description: string;
  created_at: string;
  member_count?: number;
}

interface GroupMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string; // 'admin' | 'member'
}

interface ChurchMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

const GroupsPage = () => {
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<ChurchMember[]>([]);
  const [fetching, setFetching] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailGroup, setDetailGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', description: '' });

  useEffect(() => {
    Promise.all([
      api.get<Group[]>('/api/church/groups').catch(() => []),
      api.get<ChurchMember[]>('/api/church/members').catch(() => []),
    ]).then(([g, m]) => {
      setGroups(g || []);
      setMembers(m || []);
    }).finally(() => setFetching(false));
  }, []);

  const handleCreate = async () => {
    if (!form.name) {
      toast({ title: 'Nome do grupo é obrigatório', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const newGroup = await api.post<Group>('/api/church/groups', form);
      setGroups(prev => [newGroup, ...prev]);
      setForm({ name: '', description: '' });
      setCreateOpen(false);
      toast({ title: 'Grupo criado com sucesso!' });
    } catch (err: any) {
      toast({ title: err.message || 'Erro ao criar grupo', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/church/groups/${id}`);
      setGroups(prev => prev.filter(g => g.id !== id));
      if (detailGroup?.id === id) setDetailGroup(null);
      toast({ title: 'Grupo removido' });
    } catch {
      toast({ title: 'Erro ao remover grupo', variant: 'destructive' });
    }
  };

  const openDetail = async (group: Group) => {
    setDetailGroup(group);
    try {
      const gm = await api.get<GroupMember[]>(`/api/church/groups/${group.id}/members`);
      setGroupMembers(gm || []);
    } catch {
      setGroupMembers([]);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId || !detailGroup) return;
    setLoading(true);
    try {
      await api.post(`/api/church/groups/${detailGroup.id}/members`, {
        user_id: selectedUserId,
        role: selectedRole,
      });
      const gm = await api.get<GroupMember[]>(`/api/church/groups/${detailGroup.id}/members`);
      setGroupMembers(gm || []);
      setAddMemberOpen(false);
      setSelectedUserId('');
      setSelectedRole('member');
      toast({ title: 'Membro adicionado ao grupo!' });
    } catch (err: any) {
      toast({ title: err.message || 'Erro ao adicionar membro', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!detailGroup) return;
    try {
      await api.delete(`/api/church/groups/${detailGroup.id}/members/${memberId}`);
      setGroupMembers(prev => prev.filter(m => m.id !== memberId));
      toast({ title: 'Membro removido do grupo' });
    } catch {
      toast({ title: 'Erro ao remover membro', variant: 'destructive' });
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    if (!detailGroup) return;
    try {
      await api.put(`/api/church/groups/${detailGroup.id}/members/${memberId}/role`, { role: newRole });
      setGroupMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      toast({ title: 'Função atualizada!' });
    } catch {
      toast({ title: 'Erro ao atualizar função', variant: 'destructive' });
    }
  };

  const filtered = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const availableMembers = members.filter(
    m => !groupMembers.some(gm => gm.user_id === m.id)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Grupos</h1>
          <p className="text-sm text-muted-foreground">Gerencie os grupos da sua igreja</p>
        </div>
        <Button className="rounded-xl bg-primary hover:bg-primary/90 border-0 text-primary-foreground" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Novo grupo
        </Button>
      </div>

      {groups.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar grupos..." className="pl-9 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {fetching ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 rounded-xl text-center space-y-4">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <h3 className="font-heading font-semibold text-lg">Nenhum grupo criado</h3>
          <p className="text-sm text-muted-foreground">Crie grupos para organizar seus membros</p>
          <Button className="rounded-xl bg-primary hover:bg-primary/90 border-0 text-primary-foreground" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Criar primeiro grupo
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(group => (
            <Card
              key={group.id}
              className="p-5 rounded-xl border-border/60 cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => openDetail(group)}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1 min-w-0">
                  <h3 className="font-heading font-semibold truncate">{group.name}</h3>
                  {group.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{group.description}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive shrink-0"
                  onClick={e => { e.stopPropagation(); handleDelete(group.id); }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span>{group.member_count ?? 0} membros</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Group Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-xl max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Grupo</DialogTitle>
            <DialogDescription>Crie um grupo para organizar seus membros</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do grupo</Label>
              <Input placeholder="Ex: Jovens, Louvor, Líderes..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input placeholder="Breve descrição do grupo" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleCreate} disabled={loading} className="rounded-xl bg-primary hover:bg-primary/90 border-0 text-primary-foreground">
              {loading ? 'Criando...' : 'Criar grupo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Detail Dialog */}
      <Dialog open={!!detailGroup} onOpenChange={open => !open && setDetailGroup(null)}>
        <DialogContent className="rounded-xl max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {detailGroup?.name}
            </DialogTitle>
            <DialogDescription>{detailGroup?.description || 'Gerencie os membros deste grupo'}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{groupMembers.length} membro(s)</p>
            <Button size="sm" className="rounded-lg" onClick={() => setAddMemberOpen(true)}>
              <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Adicionar
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {groupMembers.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Nenhum membro neste grupo</div>
            ) : (
              groupMembers.map(gm => (
                <div key={gm.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {gm.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{gm.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{gm.email}</p>
                  </div>
                  <Select value={gm.role} onValueChange={v => handleChangeRole(gm.id, v)}>
                    <SelectTrigger className="w-28 h-8 rounded-lg text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Membro</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" className="text-destructive shrink-0" onClick={() => handleRemoveMember(gm.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member to Group Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="rounded-xl max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar membro ao grupo</DialogTitle>
            <DialogDescription>Selecione um membro da igreja</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Membro</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecione um membro" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name} ({m.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Função no grupo</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Membro</SelectItem>
                  <SelectItem value="admin">Admin do grupo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleAddMember} disabled={loading || !selectedUserId} className="rounded-xl bg-primary hover:bg-primary/90 border-0 text-primary-foreground">
              {loading ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupsPage;
