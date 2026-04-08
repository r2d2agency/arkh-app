import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Video, Search, Clock, User, Calendar, Play, Loader2, Sparkles, Heart } from 'lucide-react';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface Service {
  id: string;
  title: string;
  youtube_url: string;
  preacher: string;
  service_date: string;
  ai_status: string;
  created_at: string;
}

const getYouTubeId = (url: string) => {
  const match = url?.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1];
};

const MemberServices = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      api.get<Service[]>('/api/church/services'),
      api.get<any[]>('/api/church/media/favorites').catch(() => []),
    ]).then(([data, favs]) => {
      setServices(data);
      setFavIds(new Set(favs.filter((f: any) => f.content_type === 'service').map((f: any) => f.content_id)));
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleFav = async (e: React.MouseEvent, serviceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const isFav = favIds.has(serviceId);
    try {
      if (isFav) {
        await api.delete(`/api/church/media/favorites/service/${serviceId}`);
        setFavIds(prev => { const n = new Set(prev); n.delete(serviceId); return n; });
        toast.success('Removido dos favoritos');
      } else {
        await api.post('/api/church/media/favorites', { content_type: 'service', content_id: serviceId });
        setFavIds(prev => new Set(prev).add(serviceId));
        toast.success('Adicionado aos favoritos!');
      }
    } catch {
      toast.error('Erro ao atualizar favorito');
    }
  };

  const filtered = services
    .filter(s =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.preacher?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = new Date(a.service_date || a.created_at).getTime();
      const dateB = new Date(b.service_date || b.created_at).getTime();
      return dateB - dateA;
    });

  return (
    <div className="space-y-5 animate-fade-in p-4">
      <div>
        <h1 className="font-heading text-2xl font-bold">Cultos</h1>
        <p className="text-sm text-muted-foreground">Assista e estude os cultos da sua igreja</p>
      </div>

      {services.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cultos, pregadores..."
            className="pl-9 rounded-2xl bg-muted/50 border-0"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 rounded-2xl text-center space-y-3">
          <Video className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <h3 className="font-heading font-semibold text-lg">Nenhum culto encontrado</h3>
          <p className="text-sm text-muted-foreground">Os cultos adicionados pela liderança aparecerão aqui.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(service => {
            const ytId = getYouTubeId(service.youtube_url);
            return (
              <Link key={service.id} to={`/church/services/${service.id}`}>
                <Card className="rounded-2xl overflow-hidden card-hover">
                  {ytId && (
                    <div className="relative w-full aspect-video">
                      <img
                        src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                        alt={service.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <Play className="w-7 h-7 text-white fill-white ml-1" />
                        </div>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="font-heading font-semibold text-white text-base truncate">{service.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          {service.preacher && (
                            <span className="text-white/80 text-xs flex items-center gap-1">
                              <User className="w-3 h-3" /> {service.preacher}
                            </span>
                          )}
                          <span className="text-white/80 text-xs flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(service.service_date || service.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <div className="absolute top-3 right-3 flex gap-1.5">
                        {service.ai_status === 'completed' && (
                          <Badge className="bg-primary/90 text-primary-foreground border-0 text-[10px] gap-1">
                            <Sparkles className="w-3 h-3" /> Estudo disponível
                          </Badge>
                        )}
                        <button
                          onClick={(e) => toggleFav(e, service.id)}
                          className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition-colors"
                        >
                          <Heart className={`w-4 h-4 ${favIds.has(service.id) ? 'text-rose-500 fill-rose-500' : 'text-white'}`} />
                        </button>
                      </div>
                    </div>
                  )}
                  {!ytId && (
                    <div className="p-4 space-y-2">
                      <h3 className="font-heading font-semibold">{service.title}</h3>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        {service.preacher && <span>{service.preacher}</span>}
                        <span>{new Date(service.service_date || service.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MemberServices;
