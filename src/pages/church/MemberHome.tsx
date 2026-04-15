import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import {
  Video, BookOpen, ArrowRight, Play, Clock, Heart, Sparkles,
  Sun, CloudRain, Smile, Frown, Flame, HelpCircle, Zap, GraduationCap, Gamepad2, Calendar, MapPin,
  Church, Navigation, CreditCard, Phone, Copy, Check, Users, ExternalLink, X, Megaphone, Share2, Music,
  Home, UsersRound, HandHeart, Landmark, Cross, PersonStanding, Baby, Mic2, BookHeart, Globe, Star, type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/sonner';

interface Service {
  id: string;
  title: string;
  thumbnail_url: string | null;
  preacher: string | null;
  service_date: string | null;
  youtube_url: string;
  ai_status: string;
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
  settings?: {
    groups_shortcut?: { label?: string; icon?: string; color?: string; };
    [key: string]: any;
  };
}

interface Announcement {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  is_pinned: boolean;
  created_at: string;
  author_name: string | null;
}

interface Devotional {
  verse: string;
  verse_reference: string;
  reflection: string;
  generated: boolean;
}

interface ContinueWatching {
  id: string;
  title: string;
  thumbnail_url: string | null;
  youtube_url: string;
  progress_seconds: number;
  duration_seconds: number;
  progress_pct: number;
}

interface SchoolClassPreview {
  id: string;
  title: string;
  description: string | null;
  teacher_name: string | null;
  schedule: string | null;
  lesson_count: number;
  student_count: number;
  is_enrolled: boolean;
  is_pending: boolean;
}

const moodOptions = [
  { key: 'grateful', label: 'Grato', icon: Heart, color: 'text-pink-500' },
  { key: 'peaceful', label: 'Em paz', icon: Sun, color: 'text-gold' },
  { key: 'motivated', label: 'Motivado', icon: Flame, color: 'text-orange-500' },
  { key: 'happy', label: 'Feliz', icon: Smile, color: 'text-green-500' },
  { key: 'sad', label: 'Desanimado', icon: Frown, color: 'text-blue-400' },
  { key: 'anxious', label: 'Ansioso', icon: CloudRain, color: 'text-purple-500' },
  { key: 'confused', label: 'Confuso', icon: HelpCircle, color: 'text-muted-foreground' },
  { key: 'tired', label: 'Cansado', icon: Zap, color: 'text-yellow-600' },
];

const getYouTubeId = (url: string) => {
  const match = url?.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1];
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

interface UpcomingEvent {
  id: string; title: string; event_type: string;
  starts_at: string; ends_at: string; location: string; all_day: boolean;
}

const eventTypeLabels: Record<string, string> = {
  service: 'Culto', communion: 'Santa Ceia', prayer: 'Oração',
  youth_service: 'Culto Jovem', worship: 'Louvor',
  meeting: 'Reunião', event: 'Evento', group: 'Grupo', general: 'Geral',
};

const MemberHome = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [churchInfo, setChurchInfo] = useState<ChurchInfo | null>(null);
  const [devotional, setDevotional] = useState<Devotional | null>(null);
  const [continueWatching, setContinueWatching] = useState<ContinueWatching[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<SchoolClassPreview[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [showChurchSheet, setShowChurchSheet] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);

  useEffect(() => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    Promise.all([
      api.get<Service[]>('/api/church/services').catch(() => []),
      api.get<ChurchInfo>('/api/church/info').catch(() => null),
      api.get<Devotional>('/api/church/devotional').catch(() => null),
      api.get<ContinueWatching[]>('/api/church/suggestions/continue-watching').catch(() => []),
      api.get<SchoolClassPreview[]>('/api/church/school/classes').catch(() => []),
      api.get<UpcomingEvent[]>(`/api/church/events?month=${month}`).catch(() => []),
      api.get<Announcement[]>('/api/church/announcements').catch(() => []),
    ]).then(([svc, info, dev, cw, school, events, ann]) => {
      setServices(svc || []);
      setChurchInfo(info);
      setDevotional(dev);
      setContinueWatching(cw || []);
      setSchoolClasses(school || []);
      const futureEvents = (events || []).filter(e => new Date(e.starts_at) >= now);
      setUpcomingEvents(futureEvents.slice(0, 5));
      // Sort: pinned first, then recent
      const sorted = (ann || []).sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setAnnouncements(sorted.slice(0, 3));
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
    <div className="space-y-6 animate-fade-in p-4">
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

            {churchInfo?.pix_enabled && churchInfo?.pix_key && (
              <div className="space-y-3">
                <h3 className="font-heading text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gold" />
                  Oferta & Dízimo
                </h3>
                <div className="p-4 rounded-xl border border-gold/20 bg-gold/5 space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Chave PIX ({pixTypeLabel[churchInfo.pix_key_type || ''] || churchInfo.pix_key_type})
                    </p>
                    <p className="font-mono text-sm font-medium break-all">{churchInfo.pix_key}</p>
                    {churchInfo.pix_beneficiary && (
                      <p className="text-xs text-muted-foreground">Favorecido: {churchInfo.pix_beneficiary}</p>
                    )}
                  </div>
                  <Button onClick={copyPix} variant="outline" className="w-full rounded-xl border-gold/30 hover:bg-gold/10" size="sm">
                    {pixCopied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
                    {pixCopied ? 'Copiada!' : 'Copiar chave PIX'}
                  </Button>
                </div>
              </div>
            )}

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
                       className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors">
                      <span className="text-sm">WhatsApp</span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto" />
                    </a>
                  )}
                </div>
              </div>
            )}

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

      <div className="flex items-center justify-between pt-1">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{churchInfo?.name || 'Minha Igreja'}</p>
          <h1 className="font-heading text-2xl font-bold">
            {greeting()}, {user?.name?.split(' ')[0]} 👋
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              const slug = churchInfo?.slug;
              if (!slug) return;
              const url = `${window.location.origin}/join/${slug}`;
              const text = `Venha fazer parte da ${churchInfo?.name || 'nossa igreja'}! Cadastre-se:`;
              if (navigator.share) {
                navigator.share({ title: churchInfo?.name || 'Igreja', text, url });
              } else {
                navigator.clipboard.writeText(url);
                toast('Link copiado!');
              }
            }}
            className="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center hover:bg-green-500/20 transition-colors"
          >
            <Share2 className="w-5 h-5 text-green-500" />
          </button>
          <button onClick={() => setShowChurchSheet(true)}
            className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
            <Church className="w-5 h-5 text-primary" />
          </button>
        </div>
      </div>

      <Card className="p-4 rounded-2xl border-primary/10 space-y-3">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-primary" />
          <h2 className="font-heading text-sm font-semibold">Como você está hoje?</h2>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {moodOptions.map(mood => {
            const isSelected = selectedMood === mood.key;
            return (
              <button
                key={mood.key}
                onClick={() => setSelectedMood(isSelected ? null : mood.key)}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all text-center ${
                  isSelected
                    ? 'bg-primary/10 ring-2 ring-primary/30'
                    : 'bg-muted/50 hover:bg-muted'
                }`}
              >
                <mood.icon className={`w-5 h-5 ${mood.color}`} />
                <span className="text-[10px] font-medium text-muted-foreground">{mood.label}</span>
              </button>
            );
          })}
        </div>
        {selectedMood && (
          <Link to={`/church/reflection?mood=${selectedMood}`}>
            <Button size="sm" className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Receber reflexão personalizada
            </Button>
          </Link>
        )}
      </Card>

      <Card className="p-4 rounded-2xl border-gold/20 bg-gold/5 space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-gold" />
          <h2 className="font-heading text-sm font-semibold">Devocional do dia</h2>
          {devotional?.generated && (
            <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">IA</span>
          )}
        </div>
        <blockquote className="text-sm text-muted-foreground italic border-l-2 border-gold/40 pl-3">
          "{devotional?.verse || 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.'}"
        </blockquote>
        <p className="text-xs text-gold font-semibold">{devotional?.verse_reference || 'João 3:16'}</p>
        {devotional?.reflection && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{devotional.reflection}</p>
        )}
      </Card>

      {continueWatching.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-lg font-semibold">Continuar Assistindo</h2>
          </div>
          <div className="space-y-2">
            {continueWatching.map(item => {
              const ytId = getYouTubeId(item.youtube_url);
              return (
                <Link key={item.id} to={`/church/services/${item.id}`}>
                  <Card className="rounded-2xl overflow-hidden card-hover">
                    <div className="flex gap-3 p-3">
                      <div className="relative w-28 h-20 rounded-xl overflow-hidden bg-muted shrink-0">
                        {ytId && (
                          <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt={item.title} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
                          <Play className="w-6 h-6 text-white fill-white" />
                        </div>
                        <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1 rounded">
                          {formatTime(item.progress_seconds)} / {formatTime(item.duration_seconds)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <h3 className="font-medium text-sm truncate">{item.title}</h3>
                        <Progress value={item.progress_pct || 0} className="h-1.5" />
                        <p className="text-[10px] text-muted-foreground">{item.progress_pct || 0}% assistido</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-5 gap-2.5">
        <Link to="/church/services">
          <Card className="p-3 rounded-2xl card-hover text-center space-y-1.5 h-full border-primary/15">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <Video className="w-4.5 h-4.5 text-primary" />
            </div>
            <p className="font-heading font-semibold text-[10px]">Cultos</p>
          </Card>
        </Link>
        <Link to="/church/studies">
          <Card className="p-3 rounded-2xl card-hover text-center space-y-1.5 h-full border-gold/15">
            <div className="w-9 h-9 rounded-xl bg-gold/10 flex items-center justify-center mx-auto">
              <BookOpen className="w-4.5 h-4.5 text-gold" />
            </div>
            <p className="font-heading font-semibold text-[10px]">Estudar</p>
          </Card>
        </Link>
        <Link to="/church/school">
          <Card className="p-3 rounded-2xl card-hover text-center space-y-1.5 h-full border-primary/15">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <GraduationCap className="w-4.5 h-4.5 text-primary" />
            </div>
            <p className="font-heading font-semibold text-[10px]">Escola</p>
          </Card>
        </Link>
        <Link to="/church/notebook">
          <Card className="p-3 rounded-2xl card-hover text-center space-y-1.5 h-full border-primary/15">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <BookOpen className="w-4.5 h-4.5 text-primary" />
            </div>
            <p className="font-heading font-semibold text-[10px]">Caderno</p>
          </Card>
        </Link>
        <Link to="/church/quiz">
          <Card className="p-3 rounded-2xl card-hover text-center space-y-1.5 h-full border-gold/15">
            <div className="w-9 h-9 rounded-xl bg-gold/10 flex items-center justify-center mx-auto">
              <Gamepad2 className="w-4.5 h-4.5 text-gold" />
            </div>
            <p className="font-heading font-semibold text-[10px]">Games</p>
          </Card>
        </Link>
        <Link to="/church/social-post">
          <Card className="p-3 rounded-2xl card-hover text-center space-y-1.5 h-full border-primary/15">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <Share2 className="w-4.5 h-4.5 text-primary" />
            </div>
            <p className="font-heading font-semibold text-[10px]">Post</p>
          </Card>
        </Link>
        <Link to="/church/worship">
          <Card className="p-3 rounded-2xl card-hover text-center space-y-1.5 h-full border-purple-500/15">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto">
              <Music className="w-4.5 h-4.5 text-purple-500" />
            </div>
            <p className="font-heading font-semibold text-[10px]">Louvor</p>
          </Card>
        </Link>
        <Link to="/church/agenda">
          <Card className="p-3 rounded-2xl card-hover text-center space-y-1.5 h-full border-green-500/15">
            <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto">
              <Calendar className="w-4.5 h-4.5 text-green-500" />
            </div>
            <p className="font-heading font-semibold text-[10px]">Agenda</p>
          </Card>
        </Link>
        <Link to="/church/reading-plan">
          <Card className="p-3 rounded-2xl card-hover text-center space-y-1.5 h-full border-primary/15">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <BookHeart className="w-4.5 h-4.5 text-primary" />
            </div>
            <p className="font-heading font-semibold text-[10px]">Leitura</p>
          </Card>
        </Link>
        {(() => {
          const gs = churchInfo?.settings?.groups_shortcut;
          const iconMap: Record<string, LucideIcon> = {
            Users, UsersRound, Home, HandHeart, Landmark, Cross, Heart, Church, Globe, Star, Baby, Mic2, BookHeart, PersonStanding,
          };
          const IconComp = iconMap[gs?.icon || ''] || Users;
          const color = gs?.color || 'purple-500';
          const label = gs?.label || 'Grupos';
          return (
            <Link to="/church/explore-groups">
              <Card className="p-3 rounded-2xl card-hover text-center space-y-1.5 h-full" style={{ borderColor: `color-mix(in srgb, ${color.startsWith('#') ? color : 'var(--primary)'} 15%, transparent)` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto" style={{ backgroundColor: `color-mix(in srgb, ${color.startsWith('#') ? color : 'var(--primary)'} 10%, transparent)` }}>
                  <IconComp className="w-4.5 h-4.5" style={{ color: color.startsWith('#') ? color : undefined }} />
                </div>
                <p className="font-heading font-semibold text-[10px]">{label}</p>
              </Card>
            </Link>
          );
        })()}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-lg font-semibold">Escola Bíblica</h2>
          <Link to="/church/school" className="text-xs text-primary font-medium flex items-center gap-1">
            Ver turmas <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {schoolClasses.length === 0 ? (
          <Card className="p-5 rounded-2xl border-dashed">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Nenhuma turma aberta no momento</p>
                <p className="text-xs text-muted-foreground">
                  Quando sua igreja publicar uma turma da EBD, ela aparecerá aqui para solicitação de matrícula.
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {schoolClasses.slice(0, 2).map(cls => (
              <Card key={cls.id} className="p-4 rounded-2xl space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm text-foreground">{cls.title}</h3>
                      {cls.is_enrolled ? (
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Matriculado</span>
                      ) : cls.is_pending ? (
                        <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">Aguardando aprovação</span>
                      ) : (
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Inscrições abertas</span>
                      )}
                    </div>
                    {cls.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{cls.description}</p>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {cls.teacher_name && <span>Prof. {cls.teacher_name}</span>}
                  <span>{cls.lesson_count} aulas</span>
                  <span>{cls.student_count} alunos</span>
                  {cls.schedule && <span>{cls.schedule}</span>}
                </div>
                <Link to={`/church/school/${cls.id}`}>
                  <Button size="sm" variant={cls.is_enrolled ? 'default' : 'outline'} className="w-full rounded-xl">
                    {cls.is_enrolled ? 'Abrir classe' : cls.is_pending ? 'Ver solicitação' : 'Solicitar matrícula'}
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Próximos Eventos
            </h2>
            <Link to="/church/agenda" className="text-xs text-primary font-medium flex items-center gap-1">
              Ver agenda <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingEvents.map(ev => (
              <Link key={ev.id} to="/church/agenda">
                <Card className="p-3 rounded-xl flex items-center gap-3 card-hover">
                  <div className="text-center shrink-0 w-12 py-1">
                    <p className="text-[10px] text-muted-foreground uppercase">
                      {new Date(ev.starts_at).toLocaleDateString('pt-BR', { month: 'short' })}
                    </p>
                    <p className="text-lg font-bold leading-tight">{new Date(ev.starts_at).getDate()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ev.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                        {eventTypeLabels[ev.event_type] || ev.event_type}
                      </span>
                      {!ev.all_day && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {new Date(ev.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {ev.location && (
                        <span className="flex items-center gap-0.5 truncate">
                          <MapPin className="w-3 h-3" />{ev.location}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recados */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" /> Recados
          </h2>
          <Link to="/church/announcements" className="text-xs text-primary font-medium flex items-center gap-1">
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {announcements.length === 0 ? (
          <Card className="p-5 rounded-2xl border-dashed">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                <Megaphone className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Nenhum recado no momento</p>
                <p className="text-xs text-muted-foreground">Quando houver um novo recado da igreja, ele aparecerá aqui.</p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {announcements.map(ann => (
              <Link key={ann.id} to="/church/announcements">
                <Card className={`p-3 rounded-xl card-hover ${ann.is_pinned ? 'border-primary/30 bg-primary/5' : ''}`}>
                  <div className="flex items-start gap-3">
                    {ann.image_url && (
                      <img src={ann.image_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <h3 className="text-sm font-medium truncate">{ann.title}</h3>
                      {ann.body && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{ann.body}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(ann.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-lg font-semibold">Últimos Cultos</h2>
          <Link to="/church/services" className="text-xs text-primary font-medium flex items-center gap-1">
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {services.length === 0 ? (
          <Card className="p-8 rounded-2xl text-center">
            <Video className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum culto disponível ainda</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {services.slice(0, 4).map(svc => {
              const ytId = getYouTubeId(svc.youtube_url);
              return (
                <Link key={svc.id} to={`/church/services/${svc.id}`}>
                  <Card className="rounded-2xl overflow-hidden card-hover">
                    <div className="flex gap-3 p-3">
                      <div className="relative w-28 h-20 rounded-xl overflow-hidden bg-muted shrink-0">
                        {ytId ? (
                          <img
                            src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                            alt={svc.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
                          <Play className="w-6 h-6 text-white fill-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <h3 className="font-medium text-sm truncate">{svc.title}</h3>
                        {svc.preacher && (
                          <p className="text-xs text-muted-foreground">{svc.preacher}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(svc.service_date || svc.created_at).toLocaleDateString('pt-BR')}
                          </p>
                          {svc.ai_status === 'completed' && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                              IA
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberHome;