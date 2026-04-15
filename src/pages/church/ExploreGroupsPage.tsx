import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Search, MapPin, Clock, Heart, Loader2, UserPlus, Check, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface Group {
  id: string; name: string; description: string; member_count?: number;
  address?: string; lat?: number; lng?: number; meeting_day?: string; meeting_time?: string;
  leader1_name?: string; leader2_name?: string;
  is_member?: boolean; join_request_status?: string | null;
}

const dayLabels: Record<string, string> = {
  monday: 'Segunda', tuesday: 'Terça', wednesday: 'Quarta', thursday: 'Quinta',
  friday: 'Sexta', saturday: 'Sábado', sunday: 'Domingo',
};

const ExploreGroupsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState('');
  const [requesting, setRequesting] = useState<string | null>(null);

  useEffect(() => {
    api.get<Group[]>('/api/church/groups/explore')
      .then(r => setGroups(r || []))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const handleJoinRequest = async (groupId: string) => {
    setRequesting(groupId);
    try {
      await api.post(`/api/church/groups/${groupId}/join`, {});
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, join_request_status: 'pending' } : g));
      toast({ title: 'Solicitação enviada!' });
    } catch (err: any) {
      toast({ title: err.message || 'Erro', variant: 'destructive' });
    } finally { setRequesting(null); }
  };

  const filtered = groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()) || (g.address || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in p-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-bold">Grupos</h1>
          <p className="text-sm text-muted-foreground">Encontre um grupo perto de você</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou endereço..." className="pl-9 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {fetching ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 rounded-xl text-center space-y-4">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <h3 className="font-heading font-semibold text-lg">Nenhum grupo disponível</h3>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(group => (
            <Card key={group.id} className="p-5 rounded-2xl border-border/60">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-heading font-semibold text-base">{group.name}</h3>
                  {group.is_member ? (
                    <Badge variant="outline" className="text-xs border-green-500/30 text-green-600 shrink-0">
                      <Check className="w-3 h-3 mr-1" /> Membro
                    </Badge>
                  ) : group.join_request_status === 'pending' ? (
                    <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-600 shrink-0">
                      <Clock className="w-3 h-3 mr-1" /> Aguardando
                    </Badge>
                  ) : null}
                </div>
                {group.description && <p className="text-sm text-muted-foreground line-clamp-2">{group.description}</p>}

                {(group.leader1_name || group.leader2_name) && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Heart className="w-3 h-3 text-pink-500" />
                    <span>Líderes: {[group.leader1_name, group.leader2_name].filter(Boolean).join(' & ')}</span>
                  </div>
                )}
                {group.address && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3 text-primary" />
                    <span>{group.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {group.member_count ?? 0} membros</span>
                  {group.meeting_day && (
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {dayLabels[group.meeting_day]}{group.meeting_time ? ` às ${group.meeting_time.slice(0,5)}` : ''}</span>
                  )}
                </div>

                {group.is_member ? (
                  <Button variant="outline" className="rounded-xl w-full mt-2" onClick={() => navigate(`/church/groups/${group.id}`)}>
                    Acessar grupo
                  </Button>
                ) : group.join_request_status === 'pending' ? (
                  <Button variant="outline" className="rounded-xl w-full mt-2" disabled>
                    <Clock className="w-4 h-4 mr-2" /> Solicitação pendente
                  </Button>
                ) : (
                  <Button className="rounded-xl w-full mt-2" onClick={() => handleJoinRequest(group.id)} disabled={requesting === group.id}>
                    {requesting === group.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                    Solicitar participação
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExploreGroupsPage;
