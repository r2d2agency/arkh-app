import { Card } from '@/components/ui/card';
import { Bell, Video, BookOpen, Users, Calendar } from 'lucide-react';

const NotificationsPage = () => {
  return (
    <div className="space-y-5 animate-fade-in p-4">
      <div>
        <h1 className="font-heading text-2xl font-bold">Notificações</h1>
        <p className="text-sm text-muted-foreground">Fique por dentro das novidades da sua igreja</p>
      </div>

      <Card className="p-8 rounded-2xl text-center space-y-3">
        <Bell className="w-10 h-10 mx-auto text-muted-foreground/40" />
        <h3 className="font-heading font-semibold">Nenhuma notificação</h3>
        <p className="text-sm text-muted-foreground">
          Você será notificado sobre novos cultos, estudos e eventos da igreja.
        </p>
      </Card>
    </div>
  );
};

export default NotificationsPage;
