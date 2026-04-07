import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Video, Users, BookOpen, Palette, ArrowRight, Sparkles, Play, Clock } from 'lucide-react';
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
  created_at: string;
}

interface ChurchInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

const adminQuickActions = [
  { title: 'Adicionar Culto', description: 'Cole um link do YouTube e deixe a IA transcrever', icon: Video, path: '/church/services', color: 'bg-primary/10 text-primary' },
  { title: 'Gerenciar Membros', description: 'Convide membros e organize grupos', icon: Users, path: '/church/members', color: 'bg-success/10 text-success' },
  { title: 'Estudos Bíblicos', description: 'Veja estudos gerados pela IA', icon: BookOpen, path: '/church/studies', color: 'bg-accent/10 text-accent' },
  { title: 'Personalizar', description: 'Configure cores e identidade visual', icon: Palette, path: '/church/customize', color: 'bg-purple-500/10 text-purple-500' },
];

const ChurchDashboard = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin_church' || user?.role === 'leader';
  const [services, setServices] = useState<Service[]>([]);
  const [churchInfo, setChurchInfo] = useState<ChurchInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Service[]>('/api/church/services').catch(() => []),
      api.get<ChurchInfo>('/api/church/info').catch(() => null),
    ]).then(([svc, info]) => {
      setServices(svc || []);
      setChurchInfo(info);
    }).finally(() => setLoading(false));
  }, []);

  // ===== MEMBER VIEW =====
  if (!isAdmin) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Church Header */}
        <div className="text-center space-y-2 py-4">
          {churchInfo?.logo_url && (
            <img src={churchInfo.logo_url} alt={churchInfo.name} className="w-16 h-16 rounded-2xl mx-auto object-contain" />
          )}
          <h1 className="font-heading text-2xl font-bold">{churchInfo?.name || 'Minha Igreja'}</h1>
          <p className="text-sm text-muted-foreground">Olá, {user?.name?.split(' ')[0]}! 👋</p>
        </div>

        {/* Quick Access */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/church/services">
            <Card className="p-5 rounded-xl card-hover text-center space-y-2 h-full">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                <Video className="w-6 h-6 text-primary" />
              </div>
              <p className="font-heading font-semibold text-sm">Cultos</p>
              <p className="text-xs text-muted-foreground">{services.length} disponíveis</p>
            </Card>
          </Link>
          <Link to="/church/studies">
            <Card className="p-5 rounded-xl card-hover text-center space-y-2 h-full">
              <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6 text-gold" />
              </div>
              <p className="font-heading font-semibold text-sm">Estudos</p>
              <p className="text-xs text-muted-foreground">Gerados por IA</p>
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
  }

  // ===== ADMIN VIEW =====
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl lg:text-3xl font-bold">
          Bem-vindo, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-muted-foreground">
          Configure sua igreja e comece a transformar a experiência dos seus membros.
        </p>
      </div>

      <Card className="p-6 rounded-2xl border-primary/20 bg-primary/5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="font-heading font-semibold">Primeiros passos</h3>
            <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Personalize a identidade visual da sua igreja</li>
              <li>Adicione seu primeiro culto colando o link do YouTube</li>
              <li>Convide os membros da sua igreja</li>
              <li>Explore os estudos gerados pela IA</li>
            </ol>
          </div>
        </div>
      </Card>

      <div>
        <h2 className="font-heading text-lg font-semibold mb-4">Ações rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {adminQuickActions.map(action => (
            <Link key={action.path} to={action.path}>
              <Card className="p-5 rounded-xl card-hover group cursor-pointer h-full">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${action.color}`}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="font-heading font-medium text-sm flex items-center gap-2">
                      {action.title}
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </h3>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-heading text-lg font-semibold mb-4">Resumo</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Membros', value: '0', icon: Users },
            { label: 'Cultos', value: String(services.length), icon: Video },
            { label: 'Estudos', value: '0', icon: BookOpen },
            { label: 'Plano', value: 'Gratuito', icon: Sparkles },
          ].map((stat, i) => (
            <Card key={i} className="p-4 rounded-xl text-center space-y-2">
              <stat.icon className="w-5 h-5 mx-auto text-muted-foreground" />
              <p className="font-heading text-xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChurchDashboard;
