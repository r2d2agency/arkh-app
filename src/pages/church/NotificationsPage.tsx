import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, GraduationCap, Users, Calendar, CheckCircle, Loader2, UserCheck, UserX } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  data: { class_id?: string; enrollment_id?: string } | null;
  created_at: string;
}

const typeIcons: Record<string, any> = {
  enrollment_request: GraduationCap,
  info: Bell,
};

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = () => {
    api.get<Notification[]>('/api/church/notifications')
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    await api.put(`/api/church/notifications/${id}/read`, {}).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    await api.put('/api/church/notifications/read-all', {}).catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success('Todas marcadas como lidas');
  };

  const handleApprove = async (enrollmentId: string, notifId: string) => {
    setProcessingId(enrollmentId);
    try {
      await api.put(`/api/church/school/enrollments/${enrollmentId}/approve`, {});
      toast.success('Matrícula aprovada!');
      markRead(notifId);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Erro');
    }
    setProcessingId(null);
  };

  const handleReject = async (enrollmentId: string, notifId: string) => {
    setProcessingId(enrollmentId);
    try {
      await api.put(`/api/church/school/enrollments/${enrollmentId}/reject`, {});
      toast.success('Matrícula recusada');
      markRead(notifId);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Erro');
    }
    setProcessingId(null);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Notificações</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo em dia'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs">
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card className="p-8 rounded-2xl text-center space-y-3">
          <Bell className="w-10 h-10 mx-auto text-muted-foreground/40" />
          <h3 className="font-heading font-semibold">Nenhuma notificação</h3>
          <p className="text-sm text-muted-foreground">
            Você será notificado sobre novos cultos, estudos e eventos da igreja.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => {
            const Icon = typeIcons[notif.type] || Bell;
            const isEnrollment = notif.type === 'enrollment_request' && notif.data?.enrollment_id;

            return (
              <Card
                key={notif.id}
                className={`p-4 transition-colors cursor-pointer ${
                  !notif.is_read ? 'border-primary/30 bg-primary/5' : ''
                }`}
                onClick={() => {
                  if (!notif.is_read) markRead(notif.id);
                  if (notif.data?.class_id) navigate(`/church/school/${notif.data.class_id}`);
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    !notif.is_read ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{notif.title}</p>
                      {!notif.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{notif.body}</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ptBR })}
                    </p>

                    {/* Inline approve/reject for enrollment requests */}
                    {isEnrollment && (
                      <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                        <Button
                          size="sm"
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                          onClick={() => handleApprove(notif.data!.enrollment_id!, notif.id)}
                          disabled={processingId === notif.data!.enrollment_id}
                        >
                          {processingId === notif.data!.enrollment_id ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <UserCheck className="w-3 h-3 mr-1" />
                          )}
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl border-destructive/30 text-destructive h-8 text-xs"
                          onClick={() => handleReject(notif.data!.enrollment_id!, notif.id)}
                          disabled={processingId === notif.data!.enrollment_id}
                        >
                          <UserX className="w-3 h-3 mr-1" /> Recusar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
