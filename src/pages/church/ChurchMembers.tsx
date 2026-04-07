import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Users, Plus, Search, Trash2, Copy, Link2, Loader2, Check, Mail, MoreVertical, Shield, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

const roleLabels: Record<string, string> = {
  admin_church: 'Administrador',
  leader: 'Líder',
  member: 'Membro',
};

const roleIcons: Record<string, typeof Shield> = {
  admin_church: ShieldCheck,
  leader: Shield,
  member: User,
};

const ChurchMembers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ email: string; temp_password: string } | null>(null);
  const [churchSlug, setChurchSlug] = useState('');
  const [copied, setCopied] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'member' });

  const isAdmin = user?.role === 'admin_church';

  useEffect(() => {
    fetchMembers();
    fetchSlug();
  }, []);

  const fetchMembers = async () => {
    try {
      const data = await api.get<Member[]>('/api/church/members');
      setMembers(data);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSlug = async () => {
    try {
      const data = await api.get<{ slug: string }>('/api/church/invite-link');
      setChurchSlug(data.slug);
    } catch {}
  };

  const handleInvite = async () => {
    if (!inviteForm.name || !inviteForm.email) {
      toast({ title: 'Preencha nome e email', variant: 'destructive' });
      return;
    }
    setInviteLoading(true);
    try {
      const data = await api.post<Member & { temp_password: string }>('/api/church/members/invite', inviteForm);
      setMembers(prev => [data, ...prev]);
      setInviteResult({ email: data.email, temp_password: data.temp_password });
      toast({ title: 'Membro convidado com sucesso!' });
    } catch (err: any) {
      toast({ title: err.message || 'Erro ao convidar', variant: 'destructive' });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/church/members/${id}`);
      setMembers(prev => prev.filter(m => m.id !== id));
      toast({ title: 'Membro removido' });
    } catch (err: any) {
      toast({ title: err.message || 'Erro ao remover', variant: 'destructive' });
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const updated = await api.put<Member>(`/api/church/members/${memberId}/role`, { role: newRole });
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: updated.role } : m));
      toast({ title: `Função alterada para ${roleLabels[newRole]}` });
    } catch (err: any) {
      toast({ title: err.message || 'Erro ao alterar função', variant: 'destructive' });
    }
  };

  const inviteLink = churchSlug ? `${window.location.origin}/join/${churchSlug}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast({ title: 'Link copiado!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Membros</h1>
          <p className="text-sm text-muted-foreground">Gerencie os membros e líderes da sua igreja</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => setLinkOpen(true)}>
            <Link2 className="w-4 h-4 mr-2" /> Link de convite
          </Button>
          {isAdmin && (
            <Button className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => { setInviteOpen(true); setInviteResult(null); setInviteForm({ name: '', email: '', role: 'member' }); }}>
              <Plus className="w-4 h-4 mr-2" /> Convidar
            </Button>
          )}
        </div>
      </div>

      {members.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar membros..." className="pl-9 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 && !search ? (
        <Card className="p-12 rounded-xl text-center space-y-4">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <h3 className="font-heading font-semibold text-lg">Nenhum membro ainda</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Compartilhe o link de convite para membros se cadastrarem.
          </p>
          <Button variant="outline" className="rounded-xl" onClick={() => setLinkOpen(true)}>
            <Link2 className="w-4 h-4 mr-2" /> Copiar link de convite
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(member => {
            const RoleIcon = roleIcons[member.role] || User;
            return (
              <Card key={member.id} className="p-4 rounded-xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0 gap-1">
                  <RoleIcon className="w-3 h-3" />
                  {roleLabels[member.role] || member.role}
                </Badge>
                {isAdmin && member.id !== user?.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className="shrink-0 h-8 w-8 p-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      {member.role !== 'admin_church' && (
                        <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'admin_church')} className="gap-2 rounded-lg">
                          <ShieldCheck className="w-4 h-4" /> Promover a Admin
                        </DropdownMenuItem>
                      )}
                      {member.role !== 'leader' && (
                        <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'leader')} className="gap-2 rounded-lg">
                          <Shield className="w-4 h-4" /> Tornar Líder
                        </DropdownMenuItem>
                      )}
                      {member.role !== 'member' && (
                        <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'member')} className="gap-2 rounded-lg">
                          <User className="w-4 h-4" /> Tornar Membro
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleDelete(member.id)} className="gap-2 rounded-lg text-destructive">
                        <Trash2 className="w-4 h-4" /> Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="rounded-xl max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar Membro</DialogTitle>
            <DialogDescription>Adicione um membro com email e senha temporária.</DialogDescription>
          </DialogHeader>
          {inviteResult ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-success/10 border border-success/20 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Check className="w-4 h-4 text-success" /> Membro convidado!
                </p>
                <p className="text-xs text-muted-foreground">Envie estas credenciais para o membro:</p>
                <div className="bg-card p-3 rounded-lg space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Email:</span> {inviteResult.email}</p>
                  <p><span className="text-muted-foreground">Senha temporária:</span> <code className="bg-muted px-1 rounded">{inviteResult.temp_password}</code></p>
                </div>
              </div>
              <Button onClick={() => setInviteOpen(false)} className="w-full rounded-xl">Fechar</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input placeholder="Nome completo" value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="email@exemplo.com" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} className="rounded-xl" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)} className="rounded-xl">Cancelar</Button>
                <Button onClick={handleInvite} disabled={inviteLoading} className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground">
                  {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Mail className="w-4 h-4 mr-2" /> Convidar</>}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invite Link Dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="rounded-xl max-w-md">
          <DialogHeader>
            <DialogTitle>Link de Convite</DialogTitle>
            <DialogDescription>Compartilhe este link para membros se cadastrarem como membro da sua igreja.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input value={inviteLink} readOnly className="rounded-xl text-sm" />
              <Button variant="outline" className="rounded-xl shrink-0" onClick={copyLink}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Todos entram como <strong>Membro</strong>. Você pode promover para Líder ou Admin depois.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChurchMembers;
