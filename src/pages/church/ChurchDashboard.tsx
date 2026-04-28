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
  const [showChurchSheet, setShowChurchSheet] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);

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

  const copyPix = () => {
    if (churchInfo?.pix_key) {
      navigator.clipboard.writeText(churchInfo.pix_key);
      setPixCopied(true);
      toast('Chave PIX copiada!');
      setTimeout(() => setPixCopied(false), 2000);
    }
  };

  const openMaps = () => {
    if (churchInfo?.lat && churchInfo?.lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${churchInfo.lat},${churchInfo.lng}`, '_blank');
    } else if (churchInfo?.address) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(churchInfo.address + (churchInfo.city ? ', ' + churchInfo.city : ''))}`, '_blank');
    }
  };

  const pixTypeLabel: Record<string, string> = {
    cpf: 'CPF', cnpj: 'CNPJ', email: 'E-mail', phone: 'Telefone', random: 'Aleatória',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Church Info Sheet */}
      {showChurchSheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowChurchSheet(false)} />
          <div className="relative bg-background rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold flex items-center gap-2">
                <Church className="w-5 h-5 text-primary" />
                {churchInfo?.name || 'Igreja'}
              </h2>
              <button onClick={() => setShowChurchSheet(false)} className="p-1 rounded-lg hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Como chegar */}
            {(churchInfo?.address || (churchInfo?.lat && churchInfo?.lng)) && (
              <button onClick={openMaps} className="w-full flex items-center gap-3 p-4 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors text-left">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <Navigation className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">Como chegar</p>
                  <p className="text-xs text-muted-foreground truncate">{churchInfo.address}{churchInfo.city ? `, ${churchInfo.city}` : ''}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            )}

            {/* PIX / Oferta */}
            {churchInfo?.pix_enabled && churchInfo?.pix_key && (
              <div className="space-y-3">
                <h3 className="font-heading text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-accent" />
                  Oferta & Dízimo
                </h3>
                <div className="p-4 rounded-xl border border-accent/20 bg-accent/5 space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Chave PIX ({pixTypeLabel[churchInfo.pix_key_type || ''] || churchInfo.pix_key_type})
                    </p>
                    <p className="font-mono text-sm font-medium break-all">{churchInfo.pix_key}</p>
                    {churchInfo.pix_beneficiary && (
                      <p className="text-xs text-muted-foreground">Favorecido: {churchInfo.pix_beneficiary}</p>
                    )}
                  </div>
                  <Button onClick={copyPix} variant="outline" className="w-full rounded-xl border-accent/30 hover:bg-accent/10" size="sm">
                    {pixCopied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
                    {pixCopied ? 'Copiada!' : 'Copiar chave PIX'}
                  </Button>
                </div>
              </div>
            )}

            {/* Contatos */}
            {(churchInfo?.phone || churchInfo?.whatsapp) && (
              <div className="space-y-3">
                <h3 className="font-heading text-sm font-semibold flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  Contatos
                </h3>
                <div className="space-y-2">
                  {churchInfo.phone && (
                    <a href={`tel:${churchInfo.phone}`} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{churchInfo.phone}</span>
                    </a>
                  )}
                  {churchInfo.whatsapp && (
                    <a href={`https://wa.me/${churchInfo.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 hover:bg-green-500/20 transition-colors">
                      <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.934 11.934 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.319 0-4.476-.673-6.303-1.833l-.452-.276-2.642.886.886-2.642-.276-.452A9.935 9.935 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
                      <span className="text-sm">WhatsApp</span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Grupos */}
            <Link to="/church/groups" onClick={() => setShowChurchSheet(false)}
              className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Grupos da igreja</p>
                <p className="text-xs text-muted-foreground">Células, ministérios e mais</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold">
            {greeting()}, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            {churchInfo?.name || 'Minha Igreja'}
          </p>
        </div>
        <button onClick={() => setShowChurchSheet(true)}
          className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors shrink-0">
          <Church className="w-5 h-5 text-primary" />
        </button>
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
          <Card className="p-5 rounded-xl card-hover text-center space-y-2 h-full border-accent/20">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6 text-accent" />
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
      <Card className="p-5 rounded-xl border-accent/20 bg-accent/5 space-y-3">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-accent" />
          <h2 className="font-heading text-sm font-semibold">Devocional do dia</h2>
        </div>
        <blockquote className="text-sm text-muted-foreground italic border-l-2 border-accent/40 pl-3">
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
