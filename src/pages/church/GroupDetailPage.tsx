import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Users, Megaphone, BookOpen, Video, Plus, Trash2, UserPlus, Shield, Loader2, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface Group { id: string; name: string; description: string; member_count?: number; }
interface GroupMember { id: string; user_id: string; name: string; email: string; role: string; }
interface Announcement { id: string; content: string; author_name: string; created_at: string; author_id: string; }
interface GroupContent { id: string; content_type: string; content_id: string; content_title: string; created_at: string; }
interface ChurchMember { id: string; name: string; email: string; }

const GroupDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [contents, setContents] = useState<GroupContent[]>([]);
  const [churchMembers, setChurchMembers] = useState<ChurchMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [addContentOpen, setAddContentOpen] = useState(false);
  const [contentType, setContentType] = useState('service');
  const [availableContent, setAvailableContent] = useState<any[]>([]);
  const [selectedContentId, setSelectedContentId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.role === 'admin_church' || user?.role === 'leader';

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get<GroupMember[]>(`/api/church/groups/${id}/members`).catch(() => []),
      api.get<Announcement[]>(`/api/church/groups/${id}/announcements`).catch(() => []),
      api.get<GroupContent[]>(`/api/church/groups/${id}/content`).catch(() => []),
      api.get<ChurchMember[]>('/api/church/members').catch(() => []),
      api.get<Group[]>('/api/church/groups').catch(() => []),
    ]).then(([m, a, c, cm, groups]) => {
      setMembers(m || []);
      setAnnouncements(a || []);
      setContents(c || []);
      setChurchMembers(cm || []);
      const g = (groups || []).find((g: Group) => g.id === id);
      setGroup(g || null);
    }).finally(() => setLoading(false));
  }, [id]);

  const handlePostAnnouncement = async () => {
    if (!newAnnouncement.trim() || !id) return;
    setSubmitting(true);
    try {
      const ann = await api.post<Announcement>(`/api/church/groups/${id}/announcements`, { content: newAnnouncement });
      setAnnouncements(prev => [ann, ...prev]);
      setNewAnnouncement('');
    } catch { toast({ title: 'Erro ao publicar recado', variant: 'destructive' }); }
    finally { setSubmitting(false); }
  };

  const handleDeleteAnnouncement = async (annId: string) => {
    try {
      await api.delete(`/api/church/groups/${id}/announcements/${annId}`);
      setAnnouncements(prev => prev.filter(a => a.id !== annId));
    } catch { toast({ title: 'Erro', variant: 'destructive' }); }
  };

  const handleAddMember = async () => {
    if (!selectedUserId || !id) return;
    setSubmitting(true);
    try {
      await api.post(`/api/church/groups/${id}/members`, { user_id: selectedUserId, role: selectedRole });
      const m = await api.get<GroupMember[]>(`/api/church/groups/${id}/members`);
      setMembers(m || []);
      setAddMemberOpen(false);
      setSelectedUserId('');
      toast({ title: 'Membro adicionado!' });
    } catch (err: any) { toast({ title: err.message || 'Erro', variant: 'destructive' }); }
    finally { setSubmitting(false); }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await api.delete(`/api/church/groups/${id}/members/${memberId}`);
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch { toast({ title: 'Erro', variant: 'destructive' }); }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      await api.put(`/api/church/groups/${id}/members/${memberId}/role`, { role: newRole });
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    } catch { toast({ title: 'Erro', variant: 'destructive' }); }
  };

  const openAddContent = async (type: string) => {
    setContentType(type);
    setSelectedContentId('');
    try {
      if (type === 'service') {
        const s = await api.get<any[]>('/api/church/services');
        setAvailableContent(s || []);
      } else {
        const s = await api.get<any[]>('/api/church/studies');
        setAvailableContent((s || []).filter((st: any) => st.is_published));
      }
    } catch { setAvailableContent([]); }
    setAddContentOpen(true);
  };

  const handleAddContent = async () => {
    if (!selectedContentId || !id) return;
    setSubmitting(true);
    try {
      await api.post(`/api/church/groups/${id}/content`, { content_type: contentType, content_id: selectedContentId });
      const c = await api.get<GroupContent[]>(`/api/church/groups/${id}/content`);
      setContents(c || []);
      setAddContentOpen(false);
      toast({ title: 'Conteúdo vinculado!' });
    } catch { toast({ title: 'Erro', variant: 'destructive' }); }
    finally { setSubmitting(false); }
  };

  const handleDeleteContent = async (contentId: string) => {
    try {
      await api.delete(`/api/church/groups/${id}/content/${contentId}`);
      setContents(prev => prev.filter(c => c.id !== contentId));
    } catch { toast({ title: 'Erro', variant: 'destructive' }); }
  };

  const availableMembersToAdd = churchMembers.filter(cm => !members.some(m => m.user_id === cm.id));

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!group) return <div className="p-6 text-center text-muted-foreground">Grupo não encontrado</div>;

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-heading text-xl font-bold">{group.name}</h1>
          {group.description && <p className="text-sm text-muted-foreground">{group.description}</p>}
        </div>
      </div>

      <Tabs defaultValue="announcements" className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-xl">
          <TabsTrigger value="announcements" className="rounded-xl text-xs">
            <Megaphone className="w-3.5 h-3.5 mr-1.5" /> Recados
          </TabsTrigger>
          <TabsTrigger value="content" className="rounded-xl text-xs">
            <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Conteúdos
          </TabsTrigger>
          <TabsTrigger value="members" className="rounded-xl text-xs">
            <Users className="w-3.5 h-3.5 mr-1.5" /> Membros
          </TabsTrigger>
        </TabsList>

        {/* RECADOS */}
        <TabsContent value="announcements" className="space-y-4 mt-4">
          {isAdmin && (
            <div className="flex gap-2">
              <Textarea
                placeholder="Escreva um recado para o grupo..."
                value={newAnnouncement}
                onChange={e => setNewAnnouncement(e.target.value)}
                className="rounded-xl min-h-[60px] flex-1"
              />
              <Button onClick={handlePostAnnouncement} disabled={submitting || !newAnnouncement.trim()} size="icon" className="rounded-xl shrink-0 self-end">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
          {announcements.length === 0 ? (
            <Card className="p-8 rounded-xl text-center">
              <Megaphone className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum recado ainda</p>
            </Card>
          ) : announcements.map(a => (
            <Card key={a.id} className="p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {a.author_name?.charAt(0)}
                  </div>
                  <span className="text-sm font-medium">{a.author_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString('pt-BR')}</span>
                  {(isAdmin || a.author_id === user?.id) && (
                    <Button size="sm" variant="ghost" className="text-destructive h-7 w-7 p-0" onClick={() => handleDeleteAnnouncement(a.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap">{a.content}</p>
            </Card>
          ))}
        </TabsContent>

        {/* CONTEÚDOS */}
        <TabsContent value="content" className="space-y-4 mt-4">
          {isAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-xl flex-1" onClick={() => openAddContent('service')}>
                <Video className="w-4 h-4 mr-2" /> Vincular Culto
              </Button>
              <Button variant="outline" className="rounded-xl flex-1" onClick={() => openAddContent('study')}>
                <BookOpen className="w-4 h-4 mr-2" /> Vincular Estudo
              </Button>
            </div>
          )}
          {contents.length === 0 ? (
            <Card className="p-8 rounded-xl text-center">
              <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum conteúdo vinculado</p>
            </Card>
          ) : contents.map(c => (
            <Card key={c.id} className="p-4 rounded-xl flex items-center gap-3">
              {c.content_type === 'service' ? <Video className="w-5 h-5 text-primary shrink-0" /> : <BookOpen className="w-5 h-5 text-primary shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.content_title || 'Sem título'}</p>
                <p className="text-xs text-muted-foreground capitalize">{c.content_type === 'service' ? 'Culto' : 'Estudo'}</p>
              </div>
              {isAdmin && (
                <Button size="sm" variant="ghost" className="text-destructive shrink-0" onClick={() => handleDeleteContent(c.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </Card>
          ))}
        </TabsContent>

        {/* MEMBROS */}
        <TabsContent value="members" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{members.length} membro(s)</p>
            {isAdmin && (
              <Button size="sm" className="rounded-xl" onClick={() => setAddMemberOpen(true)}>
                <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Adicionar
              </Button>
            )}
          </div>
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {m.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.name}</p>
                <p className="text-xs text-muted-foreground truncate">{m.email}</p>
              </div>
              {isAdmin && (
                <>
                  <Select value={m.role} onValueChange={v => handleChangeRole(m.id, v)}>
                    <SelectTrigger className="w-24 h-8 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Membro</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" className="text-destructive shrink-0" onClick={() => handleRemoveMember(m.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="rounded-xl max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar membro</DialogTitle>
            <DialogDescription>Selecione um membro da igreja</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Membro</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {availableMembersToAdd.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name} ({m.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Função</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Membro</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleAddMember} disabled={submitting || !selectedUserId} className="rounded-xl">
              {submitting ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Content Dialog */}
      <Dialog open={addContentOpen} onOpenChange={setAddContentOpen}>
        <DialogContent className="rounded-xl max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular {contentType === 'service' ? 'Culto' : 'Estudo'}</DialogTitle>
            <DialogDescription>Selecione o conteúdo para vincular ao grupo</DialogDescription>
          </DialogHeader>
          <Select value={selectedContentId} onValueChange={setSelectedContentId}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {availableContent.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddContentOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleAddContent} disabled={submitting || !selectedContentId} className="rounded-xl">
              {submitting ? 'Vinculando...' : 'Vincular'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupDetailPage;
