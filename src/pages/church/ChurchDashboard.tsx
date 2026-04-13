import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Video, BookOpen, ArrowRight, Play, Clock, Heart, Calendar, MapPin, Sparkles, Church, Navigation, CreditCard, Phone, Copy, Check, Users, ExternalLink, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/sonner';

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  location: string | null;
}

interface Service {
  id: string;
  title: string;
  thumbnail_url: string | null;
  preacher: string | null;
  service_date: string | null;
  youtube_url: string;
  created_at: string;
}

interface ChurchInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  whatsapp: string | null;
  phone: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
  pix_beneficiary: string | null;
  pix_enabled: boolean;
}

const ChurchDashboard = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [churchInfo, setChurchInfo] = useState<ChurchInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Service[]>('/api/church/services').catch(() => []),
      api.get<ChurchInfo>('/api/church/info').catch(() => null),
      api.get<Event[]>('/api/church/events').catch(() => []),
    ]).then(([svc, info, evts]) => {
      const sorted = (svc || []).sort((a: Service, b: Service) => {
        const dateA = new Date(a.service_date || a.created_at).getTime();
        const dateB = new Date(b.service_date || b.created_at).getTime();
        return dateB - dateA;
      });
      setServices(sorted);
      setChurchInfo(info);
      // Filter only future events and sort ascending
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const upcoming = (evts || [])
        .filter(e => new Date(e.event_date) >= now)
        .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
      setEvents(upcoming);
    }).finally(() => setLoading(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-1 pt-2">
        <h1 className="font-heading text-2xl font-bold">
          {greeting()}, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          {churchInfo?.name || 'Minha Igreja'}
        </p>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/church/services">
          <Card className="p-5 rounded-xl card-hover text-center space-y-2 h-full border-primary/20">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <Video className="w-6 h-6 text-primary" />
            </div>
            <p className="font-heading font-semibold text-sm">Cultos</p>
            <p className="text-xs text-muted-foreground">{services.length} disponíveis</p>
          </Card>
        </Link>
        <Link to="/church/studies">
          <Card className="p-5 rounded-xl card-hover text-center space-y-2 h-full border-gold/20">
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6 text-gold" />
            </div>
            <p className="font-heading font-semibold text-sm">Estudos</p>
            <p className="text-xs text-muted-foreground">Gerados por IA</p>
          </Card>
        </Link>
      </div>

      {/* Upcoming Events */}
      {events.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Próximos Eventos
            </h2>
            <Link to="/church/agenda" className="text-xs text-primary font-medium flex items-center gap-1">
              Ver agenda <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {events.slice(0, 3).map(evt => {
              const evtDate = new Date(evt.event_date + 'T00:00:00');
              const dayNum = evtDate.getDate();
              const monthShort = evtDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
              const weekDay = evtDate.toLocaleDateString('pt-BR', { weekday: 'short' });
              return (
                <Card key={evt.id} className="rounded-xl overflow-hidden card-hover border-primary/15">
                  <div className="flex gap-3 p-3 items-center">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                      <span className="text-lg font-bold text-primary leading-none">{dayNum}</span>
                      <span className="text-[10px] font-semibold text-primary/70 uppercase">{monthShort}</span>
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <h3 className="font-medium text-sm truncate">{evt.title}</h3>
                      <p className="text-xs text-muted-foreground capitalize">{weekDay}{evt.event_time ? ` • ${evt.event_time.slice(0, 5)}` : ''}</p>
                      {evt.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {evt.location}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Devotional Card */}
      <Card className="p-5 rounded-xl border-gold/20 bg-gold/5 space-y-3">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-gold" />
          <h2 className="font-heading text-sm font-semibold">Devocional do dia</h2>
        </div>
        <blockquote className="text-sm text-muted-foreground italic border-l-2 border-gold/40 pl-3">
          "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna."
        </blockquote>
        <p className="text-xs text-muted-foreground font-medium">João 3:16</p>
      </Card>

      {/* Recent Services */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-lg font-semibold">Últimos Cultos</h2>
          <Link to="/church/services" className="text-xs text-primary font-medium flex items-center gap-1">
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {services.length === 0 ? (
          <Card className="p-8 rounded-xl text-center">
            <Video className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum culto disponível ainda</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {services.slice(0, 4).map(svc => (
              <Card key={svc.id} className="rounded-xl overflow-hidden card-hover">
                <div className="flex gap-3 p-3">
                  <div className="relative w-28 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
                    {svc.thumbnail_url ? (
                      <img src={svc.thumbnail_url} alt={svc.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="w-6 h-6 text-white fill-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="font-medium text-sm truncate">{svc.title}</h3>
                    {svc.preacher && <p className="text-xs text-muted-foreground">{svc.preacher}</p>}
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {svc.service_date
                        ? new Date(svc.service_date).toLocaleDateString('pt-BR')
                        : new Date(svc.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChurchDashboard;
