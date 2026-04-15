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
import { ArrowLeft, Users, Megaphone, BookOpen, Video, Plus, Trash2, UserPlus, Shield, Loader2, Send, Sparkles, Zap, Clock, UsersRound, MessageCircle, Star, MapPin, Heart, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { toast as sonnerToast } from 'sonner';

interface Group { id: string; name: string; description: string; member_count?: number; address?: string; meeting_day?: string; meeting_time?: string; leader1_name?: string; leader2_name?: string; }
interface GroupMember { id: string; user_id: string; name: string; email: string; role: string; }
interface Announcement { id: string; content: string; author_name: string; created_at: string; author_id: string; }
interface GroupContent { id: string; content_type: string; content_id: string; content_title: string; created_at: string; }
interface ChurchMember { id: string; name: string; email: string; }
interface Dynamic {
  id: string;
  title: string;
  description: string;
  instructions: string;
  category: string;
  emoji: string;
  min_participants: number;
  max_participants: number | null;
  duration_minutes: number;
  is_auto_generated: boolean;
  is_global: boolean;
}
interface DynamicResponse {
  id: string;
  user_name: string;
  response: string;
  created_at: string;
}
interface JoinRequest {
  id: string; user_name: string; user_email: string; user_id: string; created_at: string;
}

const categoryLabels: Record<string, string> = {
  icebreaker: 'Quebra-gelo',
  spiritual: 'Espiritual',
  reflection: 'Reflexão',
  game: 'Jogo',
  creative: 'Criativo',
};

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

  // Dynamics state
  const [dynamics, setDynamics] = useState<Dynamic[]>([]);
  const [selectedDynamic, setSelectedDynamic] = useState<Dynamic | null>(null);
  const [dynamicDetailOpen, setDynamicDetailOpen] = useState(false);
  const [dynamicResponses, setDynamicResponses] = useState<DynamicResponse[]>([]);
  const [myResponse, setMyResponse] = useState('');
  const [generatingDynamic, setGeneratingDynamic] = useState(false);
  const [respondingDynamic, setRespondingDynamic] = useState(false);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);

  const isAdmin = user?.role === 'admin_church' || user?.role === 'leader';

  const dayLabels: Record<string, string> = {
    monday: 'Segunda', tuesday: 'Terça', wednesday: 'Quarta', thursday: 'Quinta',
    friday: 'Sexta', saturday: 'Sábado', sunday: 'Domingo',
  };

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get<GroupMember[]>(`/api/church/groups/${id}/members`).catch(() => []),
      api.get<Announcement[]>(`/api/church/groups/${id}/announcements`).catch(() => []),
      api.get<GroupContent[]>(`/api/church/groups/${id}/content`).catch(() => []),
      api.get<ChurchMember[]>('/api/church/members').catch(() => []),
      api.get<Group[]>('/api/church/groups').catch(() => []),
      api.get<Dynamic[]>('/api/church/groups/dynamics/available').catch(() => []),
      api.get<JoinRequest[]>(`/api/church/groups/${id}/join-requests`).catch(() => []),
    ]).then(([m, a, c, cm, groups, dyn, jr]) => {
      setMembers(m || []);
      setAnnouncements(a || []);
      setContents(c || []);
      setChurchMembers(cm || []);
      const g = (groups || []).find((g: Group) => g.id === id);
      setGroup(g || null);
      setDynamics(dyn || []);
      setJoinRequests(jr || []);
    }).finally(() => setLoading(false));
  }, [id]);

  // --- Announcements ---
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

  // --- Members ---
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

  // --- Content ---
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

  // --- Dynamics ---
  const openDynamic = async (dyn: Dynamic) => {
    setSelectedDynamic(dyn);
    setDynamicDetailOpen(true);
    setMyResponse('');
    try {
      const responses = await api.get<DynamicResponse[]>(`/api/church/groups/${id}/dynamics/${dyn.id}/responses`);
      setDynamicResponses(responses || []);
    } catch { setDynamicResponses([]); }
  };

  const handleUseDynamic = async () => {
    if (!selectedDynamic || !id) return;
    try {
      await api.post(`/api/church/groups/${id}/dynamics/${selectedDynamic.id}/use`, {});
      sonnerToast.success('Dinâmica marcada como usada!');
    } catch { sonnerToast.error('Erro ao marcar'); }
  };

  const handleRespondDynamic = async () => {
    if (!myResponse.trim() || !selectedDynamic || !id) return;
    setRespondingDynamic(true);
    try {
      await api.post(`/api/church/groups/${id}/dynamics/${selectedDynamic.id}/respond`, { response: myResponse });
      const responses = await api.get<DynamicResponse[]>(`/api/church/groups/${id}/dynamics/${selectedDynamic.id}/responses`);
      setDynamicResponses(responses || []);
      setMyResponse('');
      sonnerToast.success('Resposta enviada!');
    } catch { sonnerToast.error('Erro ao responder'); }
    finally { setRespondingDynamic(false); }
  };

  const handleGenerateDynamic = async () => {
    setGeneratingDynamic(true);
    try {
      const newDyn = await api.post<Dynamic>('/api/church/groups/dynamics/generate', {});
      setDynamics(prev => [newDyn, ...prev]);
      sonnerToast.success(`Nova dinâmica criada: ${newDyn.title}`);
    } catch (err: any) {
      sonnerToast.error(err.message || 'Erro ao gerar dinâmica');
    }
    setGeneratingDynamic(false);
  };

  const handleJoinRequest = async (reqId: string, status: 'approved' | 'rejected') => {
    try {
      await api.put(`/api/church/groups/${id}/join-requests/${reqId}`, { status });
      setJoinRequests(prev => prev.filter(r => r.id !== reqId));
      if (status === 'approved') {
        const m = await api.get<GroupMember[]>(`/api/church/groups/${id}/members`);
        setMembers(m || []);
      }
      toast({ title: status === 'approved' ? 'Membro aprovado!' : 'Solicitação rejeitada' });
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

      {/* Group Info Card */}
      <Card className="p-4 rounded-2xl border-primary/10 space-y-2">
        {(group.leader1_name || group.leader2_name) && (
          <div className="flex items-center gap-2 text-sm">
            <Heart className="w-4 h-4 text-pink-500" />
            <span className="font-medium">Líderes:</span>
            <span className="text-muted-foreground">{[group.leader1_name, group.leader2_name].filter(Boolean).join(' & ')}</span>
          </div>
        )}
        {group.meeting_day && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="font-medium">Reunião:</span>
            <span className="text-muted-foreground">{dayLabels[group.meeting_day]}{group.meeting_time ? ` às ${group.meeting_time.slice(0,5)}` : ''} (semanal)</span>
          </div>
        )}
        {group.address && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">{group.address}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">{members.length} membros</span>
        </div>
      </Card>

      {/* Join Requests for admins */}
      {isAdmin && joinRequests.length > 0 && (
        <Card className="p-4 rounded-2xl border-yellow-500/20 bg-yellow-500/5 space-y-3">
          <h3 className="font-heading text-sm font-semibold flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-yellow-600" />
            Solicitações pendentes ({joinRequests.length})
          </h3>
          {joinRequests.map(req => (
            <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-background border">
              <div>
                <p className="text-sm font-medium">{req.user_name}</p>
                <p className="text-xs text-muted-foreground">{req.user_email}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="rounded-xl text-green-600 border-green-500/30 h-8" onClick={() => handleJoinRequest(req.id, 'approved')}>
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Aceitar
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl text-destructive h-8" onClick={() => handleJoinRequest(req.id, 'rejected')}>
                  <XCircle className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Tabs defaultValue="announcements" className="w-full">
        <TabsList className="grid w-full grid-cols-4 rounded-xl">
          <TabsTrigger value="announcements" className="rounded-xl text-xs">
            <Megaphone className="w-3.5 h-3.5 mr-1" /> Recados
          </TabsTrigger>
          <TabsTrigger value="dynamics" className="rounded-xl text-xs">
            <Zap className="w-3.5 h-3.5 mr-1" /> Dinâmicas
          </TabsTrigger>
          <TabsTrigger value="content" className="rounded-xl text-xs">
            <BookOpen className="w-3.5 h-3.5 mr-1" /> Conteúdos
          </TabsTrigger>
          <TabsTrigger value="members" className="rounded-xl text-xs">
            <Users className="w-3.5 h-3.5 mr-1" /> Membros
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

        {/* DINÂMICAS */}
        <TabsContent value="dynamics" className="space-y-4 mt-4">
          {isAdmin && (
            <Card className="p-4 rounded-2xl border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-heading text-sm font-semibold">Gerar Dinâmica com IA</h3>
                    <p className="text-[11px] text-muted-foreground">Crie novas dinâmicas automaticamente</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="rounded-xl text-xs"
                  onClick={handleGenerateDynamic}
                  disabled={generatingDynamic}
                >
                  {generatingDynamic ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                  Gerar nova
                </Button>
              </div>
            </Card>
          )}

          {dynamics.length === 0 ? (
            <Card className="p-8 rounded-xl text-center">
              <Zap className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma dinâmica disponível</p>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {dynamics.map(dyn => (
                <Card
                  key={dyn.id}
                  className="p-4 rounded-2xl cursor-pointer hover:border-primary/30 transition-all hover:shadow-md"
                  onClick={() => openDynamic(dyn)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{dyn.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{dyn.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{dyn.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {dyn.duration_minutes} min
                        </span>
                        <span className="flex items-center gap-1">
                          <UsersRound className="w-3 h-3" /> {dyn.min_participants}+ pessoas
                        </span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                          {categoryLabels[dyn.category] || dyn.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {dyn.is_auto_generated && (
                    <Badge variant="outline" className="mt-2 text-[9px] border-primary/30 text-primary">
                      <Sparkles className="w-2.5 h-2.5 mr-0.5" /> Gerada por IA
                    </Badge>
                  )}
                </Card>
              ))}
            </div>
          )}
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

      {/* Dynamic Detail Dialog */}
      <Dialog open={dynamicDetailOpen} onOpenChange={setDynamicDetailOpen}>
        <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedDynamic && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-2xl">{selectedDynamic.emoji}</span>
                  {selectedDynamic.title}
                </DialogTitle>
                <DialogDescription>{selectedDynamic.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {selectedDynamic.duration_minutes} min</span>
                  <span className="flex items-center gap-1"><UsersRound className="w-3.5 h-3.5" /> {selectedDynamic.min_participants}+ pessoas</span>
                  <Badge variant="outline" className="text-xs">{categoryLabels[selectedDynamic.category] || selectedDynamic.category}</Badge>
                </div>

                <div className="bg-muted/50 rounded-xl p-4">
                  <h4 className="font-heading text-sm font-semibold mb-2">📋 Como fazer</h4>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedDynamic.instructions}</p>
                </div>

                {isAdmin && (
                  <Button variant="outline" className="w-full rounded-xl" onClick={handleUseDynamic}>
                    <Star className="w-4 h-4 mr-2" /> Marcar como usada neste grupo
                  </Button>
                )}

                {/* Responses section */}
                <div className="border-t pt-4 space-y-3">
                  <h4 className="font-heading text-sm font-semibold flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" /> Respostas do grupo
                  </h4>

                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Compartilhe sua resposta..."
                      value={myResponse}
                      onChange={e => setMyResponse(e.target.value)}
                      className="rounded-xl min-h-[50px] flex-1 text-sm"
                      rows={2}
                    />
                    <Button
                      onClick={handleRespondDynamic}
                      disabled={respondingDynamic || !myResponse.trim()}
                      size="icon"
                      className="rounded-xl shrink-0 self-end"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>

                  {dynamicResponses.length > 0 && (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {dynamicResponses.map(r => (
                        <div key={r.id} className="bg-muted/40 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">
                              {r.user_name?.charAt(0)}
                            </div>
                            <span className="text-xs font-medium">{r.user_name}</span>
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              {new Date(r.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-sm">{r.response}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
