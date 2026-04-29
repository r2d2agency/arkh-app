import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import {
  Video, BookOpen, ArrowRight, Play, Clock, Heart, Sparkles,
  Sun, CloudRain, Smile, Frown, Flame, HelpCircle, Zap, GraduationCap, Gamepad2, Calendar, MapPin,
  Church, Navigation, CreditCard, Phone, Copy, Check, Users, ExternalLink, X, Megaphone, Share2, Music, Swords,
  Home, UsersRound, HandHeart, Landmark, Cross, PersonStanding, Baby, Mic2, BookHeart, Globe, Star,
  Headphones, Layers, type LucideIcon,
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

interface UpcomingEvent {
  id: string; title: string; event_type: string;
  starts_at: string; ends_at: string; location: string; all_day: boolean;
}

const eventTypeLabels: Record<string, string> = {
  service: 'Culto', communion: 'Santa Ceia', prayer: 'Oração',
  youth_service: 'Culto Jovem', worship: 'Louvor',
  meeting: 'Reunião', event: 'Evento', group: 'Grupo', general: 'Geral',
};

const moodOptions = [
  { key: 'grateful', label: 'Grato',     icon: Smile,    tint: 'bg-yellow-400/15 text-yellow-600 border-yellow-400/20' },
  { key: 'peaceful', label: 'Em paz',    icon: Sun,      tint: 'bg-sky-400/15 text-sky-600 border-sky-400/20' },
  { key: 'motivated',label: 'Motivado',  icon: Flame,    tint: 'bg-orange-400/15 text-orange-600 border-orange-400/20' },
  { key: 'happy',    label: 'Amado',     icon: Heart,    tint: 'bg-pink-400/15 text-pink-600 border-pink-400/20' },
  { key: 'sad',      label: 'Triste',    icon: Frown,    tint: 'bg-blue-400/15 text-blue-600 border-blue-400/20' },
  { key: 'anxious',  label: 'Ansioso',   icon: CloudRain,tint: 'bg-violet-400/15 text-violet-600 border-violet-400/20' },
  { key: 'confused', label: 'Confuso',   icon: HelpCircle,tint: 'bg-slate-400/15 text-slate-600 border-slate-400/20' },
  { key: 'tired',    label: 'Cansado',   icon: Zap,      tint: 'bg-indigo-400/15 text-indigo-600 border-indigo-400/20' },
];

type Feature = { to: string; label: string; icon: LucideIcon; tint: string };

const featureItems: Feature[] = [
  { to: '/church/services',     label: 'Cultos',    icon: Video,         tint: 'bg-primary/8 text-primary border-primary/10' },
  { to: '/church/bible',        label: 'Bíblia',    icon: BookMarked,    tint: 'bg-amber-400/12 text-amber-600 border-amber-400/15' },
  { to: '/church/studies',      label: 'Estudar',   icon: BookOpen,      tint: 'bg-emerald-400/12 text-emerald-600 border-emerald-400/15' },
  { to: '/church/school',       label: 'Escola',    icon: GraduationCap, tint: 'bg-blue-400/12 text-blue-600 border-blue-400/15' },
  { to: '/church/notebook',     label: 'Caderno',   icon: BookHeart,     tint: 'bg-rose-400/12 text-rose-600 border-rose-400/15' },
  { to: '/church/quiz',         label: 'Games',     icon: Gamepad2,      tint: 'bg-violet-400/12 text-violet-600 border-violet-400/15' },
  { to: '/church/worship',      label: 'Louvor',    icon: Music,         tint: 'bg-cyan-400/12 text-cyan-600 border-cyan-400/15' },
  { to: '/church/agenda',       label: 'Agenda',    icon: Calendar,      tint: 'bg-orange-400/12 text-orange-600 border-orange-400/15' },
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

const MemberHome = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [churchInfo, setChurchInfo] = useState<ChurchInfo | null>(null);
  const [devotional, setDevotional] = useState<Devotional | null>(null);
  const [continueWatching, setContinueWatching] = useState<ContinueWatching[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<SchoolClassPreview[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [, setLoading] = useState(true);
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

  const shareChurch = () => {
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
  };

  return (
    <div className="space-y-8 animate-fade-in px-5 pt-3 pb-2 max-w-2xl mx-auto">
      {/* Church Info Sheet */}
      {showChurchSheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowChurchSheet(false)} />
          <div className="relative bg-background rounded-t-[32px] sm:rounded-[32px] w-full max-w-md max-h-[85vh] overflow-y-auto p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold flex items-center gap-2">
                <Church className="w-5 h-5 text-primary" />
                {churchInfo?.name || 'Igreja'}
              </h2>
              <button onClick={() => setShowChurchSheet(false)} className="p-1 rounded-full hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            {(churchInfo?.address || (churchInfo?.lat && churchInfo?.lng)) && (
              <button onClick={openMaps} className="w-full flex items-center gap-3 p-4 rounded-2xl bg-primary/10 hover:bg-primary/15 transition-colors text-left">
                <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
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
                <h3 className="font-heading text-sm font-bold flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-accent" />
                  Oferta & Dízimo
                </h3>
                <div className="p-4 rounded-2xl border border-accent/30 bg-accent/8 space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Chave PIX ({pixTypeLabel[churchInfo.pix_key_type || ''] || churchInfo.pix_key_type})
                    </p>
                    <p className="font-mono text-sm font-medium break-all">{churchInfo.pix_key}</p>
                    {churchInfo.pix_beneficiary && (
                      <p className="text-xs text-muted-foreground">Favorecido: {churchInfo.pix_beneficiary}</p>
                    )}
                  </div>
                  <Button onClick={copyPix} variant="outline" className="w-full rounded-2xl border-accent/40 hover:bg-accent/15" size="sm">
                    {pixCopied ? <Check className="w-4 h-4 mr-2 text-success" /> : <Copy className="w-4 h-4 mr-2" />}
                    {pixCopied ? 'Copiada!' : 'Copiar chave PIX'}
                  </Button>
                </div>
              </div>
            )}

            {(churchInfo?.phone || churchInfo?.whatsapp) && (
              <div className="space-y-3">
                <h3 className="font-heading text-sm font-bold flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  Contatos
                </h3>
                <div className="space-y-2">
                  {churchInfo.phone && (
                    <a href={`tel:${churchInfo.phone}`} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/60 hover:bg-muted transition-colors">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{churchInfo.phone}</span>
                    </a>
                  )}
                  {churchInfo.whatsapp && (
                    <a href={`https://wa.me/${churchInfo.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors">
                      <span className="text-sm">WhatsApp</span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto" />
                    </a>
                  )}
                </div>
              </div>
            )}

            <Link to="/church/groups" onClick={() => setShowChurchSheet(false)}
              className="flex items-center gap-3 p-4 rounded-2xl bg-muted/60 hover:bg-muted transition-colors">
              <div className="w-10 h-10 rounded-2xl bg-violet-500/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-violet-500" />
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

      {/* Saudação personalizada */}
      <section className="flex items-start justify-between pt-1">
        <div className="space-y-1 min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            {churchInfo?.name || 'Minha Igreja'}
          </p>
          <h1 className="font-heading text-[26px] leading-tight font-extrabold text-primary tracking-tight">
            {greeting()}, {user?.name?.split(' ')[0]} <span className="inline-block">👋</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <button
            onClick={shareChurch}
            className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center hover:bg-emerald-500/20 transition-colors active:scale-95"
            aria-label="Compartilhar"
          >
            <Share2 className="w-[18px] h-[18px] text-emerald-600" />
          </button>
          <button
            onClick={() => setShowChurchSheet(true)}
            className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors active:scale-95"
            aria-label="Sobre a igreja"
          >
            <Church className="w-[18px] h-[18px] text-primary" />
          </button>
        </div>
      </section>

      {/* Mood Section */}
      <section className="space-y-3">
        <h2 className="font-heading text-base font-bold text-primary/90 px-1">Como você está hoje?</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 no-scrollbar">
          {moodOptions.map(mood => {
            const isSelected = selectedMood === mood.key;
            const Icon = mood.icon;
            return (
              <div key={mood.key} className="flex flex-col items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setSelectedMood(isSelected ? null : mood.key)}
                  className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all active:scale-95 border ${mood.tint} ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105' : 'shadow-sm'}`}
                >
                  <Icon className="w-7 h-7" strokeWidth={2} />
                </button>
                <span className="text-[11px] font-semibold text-muted-foreground">{mood.label}</span>
              </div>
            );
          })}
        </div>
        {selectedMood && (
          <Link to={`/church/reflection?mood=${selectedMood}`}>
            <Button size="sm" className="w-full rounded-2xl h-11 mt-1">
              <Sparkles className="w-4 h-4 mr-1.5" />
              Receber reflexão personalizada
            </Button>
          </Link>
        )}
      </section>

      {/* Devotional hero card */}
      <section className="relative rounded-[36px] overflow-hidden shadow-soft aspect-[16/11] bg-devotional-gradient p-7 text-white flex flex-col justify-between">
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative z-10">
          <span className="inline-block px-3.5 py-1.5 rounded-xl bg-white/20 backdrop-blur-md text-[10px] font-extrabold tracking-[0.18em] uppercase mb-4">
            Devocional do dia
            {devotional?.generated && <span className="ml-2 text-accent">★ IA</span>}
          </span>
          <div className="border-l-[3px] border-accent pl-4">
            <blockquote className="font-scripture italic text-white/95 mb-2 leading-snug text-[19px]">
              "{devotional?.verse || 'O Senhor é o meu pastor, nada me faltará.'}"
            </blockquote>
            <cite className="block not-italic uppercase tracking-[0.18em] text-[11px] font-extrabold text-accent">
              {devotional?.verse_reference || 'Salmos 23:1'}
            </cite>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <Link to="/church/reflection">
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-2xl h-12 px-6 font-bold shadow-lg active:scale-95">
              Ler agora
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
          <button
            onClick={() => {
              const text = `"${devotional?.verse}" — ${devotional?.verse_reference}`;
              if (navigator.share) navigator.share({ title: 'Devocional', text });
              else { navigator.clipboard.writeText(text); toast('Devocional copiado!'); }
            }}
            className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center hover:bg-white/25 transition-colors text-white"
            aria-label="Compartilhar"
          >
            <Share2 className="w-[18px] h-[18px]" />
          </button>
        </div>
      </section>

      {/* Continuar Assistindo */}
      {continueWatching.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-heading text-base font-bold text-primary/90 px-1">Continuar Assistindo</h2>
          <div className="space-y-2.5">
            {continueWatching.map(item => {
              const ytId = getYouTubeId(item.youtube_url);
              return (
                <Link key={item.id} to={`/church/services/${item.id}`}>
                  <Card className="rounded-3xl overflow-hidden card-hover border-primary/8">
                    <div className="flex gap-3 p-3">
                      <div className="relative w-28 h-20 rounded-2xl overflow-hidden bg-muted shrink-0">
                        {ytId && (
                          <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt={item.title} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="w-6 h-6 text-white fill-white" />
                        </div>
                        <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded-md">
                          {formatTime(item.progress_seconds)} / {formatTime(item.duration_seconds)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                        <Progress value={item.progress_pct || 0} className="h-1.5" />
                        <p className="text-[10px] text-muted-foreground">{item.progress_pct || 0}% assistido</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Feature Grid */}
      <section className="space-y-4">
        <div className="flex items-end justify-between px-1">
          <h2 className="font-heading text-base font-bold text-primary/90">Recursos</h2>
        </div>
        <div className="grid grid-cols-4 gap-y-6 gap-x-3">
          {featureItems.map(f => {
            const Icon = f.icon;
            return (
              <Link key={f.to} to={f.to} className="flex flex-col items-center gap-2 group">
                <div className={`w-[60px] h-[60px] rounded-3xl flex items-center justify-center transition-all group-hover:scale-105 group-active:scale-95 shadow-sm border ${f.tint}`}>
                  <Icon className="w-7 h-7" strokeWidth={2} />
                </div>
                <span className="text-[11px] font-bold text-center leading-tight text-foreground/80">{f.label}</span>
              </Link>
            );
          })}
          {/* Extras */}
          <Link to="/church/bible-battle" className="flex flex-col items-center gap-2 group">
            <div className="w-[60px] h-[60px] rounded-3xl flex items-center justify-center transition-all group-hover:scale-105 group-active:scale-95 shadow-sm border bg-violet-400/12 text-violet-600 border-violet-400/15">
              <Swords className="w-7 h-7" strokeWidth={2} />
            </div>
            <span className="text-[11px] font-bold text-center leading-tight text-foreground/80">Batalha</span>
          </Link>
          <Link to="/church/verse-rush" className="flex flex-col items-center gap-2 group">
            <div className="w-[60px] h-[60px] rounded-3xl flex items-center justify-center bg-gradient-to-br from-primary to-primary-glow text-primary-foreground transition-all group-hover:scale-105 group-active:scale-95 shadow-soft">
              <Zap className="w-7 h-7" strokeWidth={2.2} />
            </div>
            <span className="text-[11px] font-bold text-center leading-tight text-foreground/80">Rush</span>
          </Link>
          <Link to="/church/mahjong" className="flex flex-col items-center gap-2 group">
            <div className="w-[60px] h-[60px] rounded-3xl flex items-center justify-center bg-gradient-to-br from-accent to-accent/70 text-accent-foreground transition-all group-hover:scale-105 group-active:scale-95 shadow-soft">
              <Layers className="w-7 h-7" strokeWidth={2.2} />
            </div>
            <span className="text-[11px] font-bold text-center leading-tight text-foreground/80">Mahjong</span>
          </Link>
          <Link to="/church/social-post" className="flex flex-col items-center gap-2 group">
            <div className="w-[60px] h-[60px] rounded-3xl flex items-center justify-center transition-all group-hover:scale-105 group-active:scale-95 shadow-sm border bg-pink-400/12 text-pink-600 border-pink-400/15">
              <Share2 className="w-7 h-7" strokeWidth={2} />
            </div>
            <span className="text-[11px] font-bold text-center leading-tight text-foreground/80">Post</span>
          </Link>
          {(() => {
            const gs = churchInfo?.settings?.groups_shortcut;
            const iconMap: Record<string, LucideIcon> = {
              Users, UsersRound, Home, HandHeart, Landmark, Cross, Heart, Church, Globe, Star, Baby, Mic2, BookHeart, PersonStanding,
            };
            const IconComp = iconMap[gs?.icon || ''] || Users;
            const label = gs?.label || 'Grupos';
            return (
              <Link to="/church/explore-groups" className="flex flex-col items-center gap-2 group">
                <div className="w-[60px] h-[60px] rounded-3xl flex items-center justify-center transition-all group-hover:scale-105 group-active:scale-95 shadow-sm border bg-teal-400/12 text-teal-600 border-teal-400/15">
                  <IconComp className="w-7 h-7" strokeWidth={2} />
                </div>
                <span className="text-[11px] font-bold text-center leading-tight text-foreground/80 truncate max-w-full px-1">{label}</span>
              </Link>
            );
          })()}
        </div>
      </section>

      {/* AI Assistant Banner */}
      <section className="rounded-[28px] p-5 shadow-soft flex items-center justify-between border border-primary/10"
        style={{ background: 'linear-gradient(135deg, hsl(231 100% 60%) 0%, hsl(232 80% 35%) 100%)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-md shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-white text-sm">Dúvidas bíblicas?</h3>
            <p className="text-[12px] text-white/80 truncate">Fale com nosso Assistente</p>
          </div>
        </div>
        <Link to="/church/help">
          <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl font-bold px-4 h-10 shadow-md">
            Assistente
          </Button>
        </Link>
      </section>

      {/* Escola Bíblica */}
      {schoolClasses.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-heading text-base font-bold text-primary/90">Escola Bíblica</h2>
            <Link to="/church/school" className="text-xs text-primary font-bold flex items-center gap-1">
              Ver turmas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {schoolClasses.slice(0, 2).map(cls => (
              <Card key={cls.id} className="p-4 rounded-3xl space-y-3 border-primary/8">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-foreground">{cls.title}</h3>
                      {cls.is_enrolled ? (
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">Matriculado</span>
                      ) : cls.is_pending ? (
                        <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-bold">Aguardando</span>
                      ) : (
                        <span className="text-[10px] bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full font-bold">Inscrições abertas</span>
                      )}
                    </div>
                    {cls.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{cls.description}</p>
                    )}
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  {cls.teacher_name && <span>Prof. {cls.teacher_name}</span>}
                  <span>{cls.lesson_count} aulas</span>
                  <span>{cls.student_count} alunos</span>
                  {cls.schedule && <span>{cls.schedule}</span>}
                </div>
                <Link to={`/church/school/${cls.id}`}>
                  <Button size="sm" variant={cls.is_enrolled ? 'default' : 'outline'} className="w-full rounded-2xl">
                    {cls.is_enrolled ? 'Abrir classe' : cls.is_pending ? 'Ver solicitação' : 'Solicitar matrícula'}
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Próximos Eventos */}
      {upcomingEvents.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-heading text-base font-bold text-primary/90 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Próximos Eventos
            </h2>
            <Link to="/church/agenda" className="text-xs text-primary font-bold flex items-center gap-1">
              Ver agenda <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingEvents.map(ev => (
              <Link key={ev.id} to="/church/agenda">
                <Card className="p-3 rounded-2xl flex items-center gap-3 card-hover border-primary/8">
                  <div className="text-center shrink-0 w-12 py-1 rounded-xl bg-primary/8">
                    <p className="text-[9px] text-primary uppercase font-bold tracking-wider">
                      {new Date(ev.starts_at).toLocaleDateString('pt-BR', { month: 'short' })}
                    </p>
                    <p className="text-lg font-extrabold leading-tight text-primary">{new Date(ev.starts_at).getDate()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{ev.title}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-[10px] font-bold">
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
        </section>
      )}

      {/* Recados */}
      {announcements.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-heading text-base font-bold text-primary/90 flex items-center gap-2">
              <Megaphone className="w-4 h-4" /> Recados
            </h2>
            <Link to="/church/announcements" className="text-xs text-primary font-bold flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {announcements.map(ann => (
              <Link key={ann.id} to="/church/announcements">
                <Card className={`p-3 rounded-2xl card-hover border-primary/8 ${ann.is_pinned ? 'ring-1 ring-primary/30 bg-primary/5' : ''}`}>
                  <div className="flex items-start gap-3">
                    {ann.image_url && (
                      <img src={ann.image_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <h3 className="text-sm font-bold truncate">{ann.title}</h3>
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
        </section>
      )}

      {/* Últimos Cultos */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-heading text-base font-bold text-primary/90">Últimos Cultos</h2>
          <Link to="/church/services" className="text-xs text-primary font-bold flex items-center gap-1">
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {services.length === 0 ? (
          <Card className="p-8 rounded-3xl text-center border-dashed">
            <Video className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum culto disponível ainda</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {services.slice(0, 4).map(svc => {
              const ytId = getYouTubeId(svc.youtube_url);
              return (
                <Link key={svc.id} to={`/church/services/${svc.id}`}>
                  <Card className="rounded-3xl overflow-hidden card-hover border-primary/8">
                    <div className="flex gap-3 p-3">
                      <div className="relative w-28 h-20 rounded-2xl overflow-hidden bg-muted shrink-0">
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
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="w-6 h-6 text-white fill-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <h3 className="font-bold text-sm truncate">{svc.title}</h3>
                        {svc.preacher && (
                          <p className="text-xs text-muted-foreground">{svc.preacher}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(svc.service_date || svc.created_at).toLocaleDateString('pt-BR')}
                          </p>
                          {svc.ai_status === 'completed' && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">
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
      </section>
    </div>
  );
};

export default MemberHome;
