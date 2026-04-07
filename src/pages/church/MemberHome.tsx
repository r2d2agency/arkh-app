import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  Video, BookOpen, ArrowRight, Play, Clock, Heart, Sparkles,
  Sun, CloudRain, Smile, Frown, Flame, HelpCircle, ThumbsUp, Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

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

const MemberHome = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [churchInfo, setChurchInfo] = useState<ChurchInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Service[]>('/api/church/services').catch(() => []),
      api.get<ChurchInfo>('/api/church/info').catch(() => null),
    ]).then(([svc, info]) => {
      setServices(svc || []);
      setChurchInfo(info);
    }).finally(() => setLoading(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <div className="space-y-6 animate-fade-in p-4">
      {/* Greeting */}
      <div className="space-y-1 pt-1">
        <p className="text-sm text-muted-foreground">{churchInfo?.name || 'Minha Igreja'}</p>
        <h1 className="font-heading text-2xl font-bold">
          {greeting()}, {user?.name?.split(' ')[0]} 👋
        </h1>
      </div>

      {/* How are you today */}
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

      {/* Devotional */}
      <Card className="p-4 rounded-2xl border-gold/20 bg-gold/5 space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-gold" />
          <h2 className="font-heading text-sm font-semibold">Devocional do dia</h2>
        </div>
        <blockquote className="text-sm text-muted-foreground italic border-l-2 border-gold/40 pl-3">
          "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna."
        </blockquote>
        <p className="text-xs text-gold font-semibold">João 3:16</p>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2.5">
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
        <Link to="/church/explore">
          <Card className="p-3 rounded-2xl card-hover text-center space-y-1.5 h-full border-primary/15">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <Sparkles className="w-4.5 h-4.5 text-primary" />
            </div>
            <p className="font-heading font-semibold text-[10px]">Explorar</p>
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
      </div>

      {/* Recent Services */}
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
