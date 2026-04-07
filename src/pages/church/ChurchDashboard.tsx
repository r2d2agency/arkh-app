import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Video, Users, BookOpen, Palette, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const quickActions = [
  {
    title: 'Adicionar Culto',
    description: 'Cole um link do YouTube e deixe a IA transcrever e gerar estudos',
    icon: Video,
    path: '/church/services',
    color: 'bg-primary/10 text-primary',
  },
  {
    title: 'Gerenciar Membros',
    description: 'Convide membros e organize grupos e células',
    icon: Users,
    path: '/church/members',
    color: 'bg-success/10 text-success',
  },
  {
    title: 'Estudos Bíblicos',
    description: 'Veja estudos gerados pela IA a partir dos cultos',
    icon: BookOpen,
    path: '/church/studies',
    color: 'bg-accent/10 text-accent',
  },
  {
    title: 'Personalizar',
    description: 'Configure cores, logo e identidade visual da sua igreja',
    icon: Palette,
    path: '/church/customize',
    color: 'bg-purple-500/10 text-purple-500',
  },
];

const ChurchDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome */}
      <div className="space-y-1">
        <h1 className="font-heading text-2xl lg:text-3xl font-bold">
          Bem-vindo, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-muted-foreground">
          Configure sua igreja e comece a transformar a experiência dos seus membros.
        </p>
      </div>

      {/* Getting started */}
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

      {/* Quick actions */}
      <div>
        <h2 className="font-heading text-lg font-semibold mb-4">Ações rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map(action => (
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

      {/* Stats placeholder */}
      <div>
        <h2 className="font-heading text-lg font-semibold mb-4">Resumo</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Membros', value: '0', icon: Users },
            { label: 'Cultos', value: '0', icon: Video },
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
