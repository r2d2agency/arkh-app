import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Users, BookOpen, Calendar, Loader2, ArrowRight, CheckCircle, Clock, UserCheck, UserX } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface SchoolClass {
  id: string; title: string; description: string; teacher_name: string;
  category: string; schedule: string; max_students: number | null;
  student_count: number; pending_count: number; lesson_count: number;
  is_enrolled: boolean; is_pending: boolean; enrollment_status: string | null;
  is_active: boolean; starts_at: string; ends_at: string;
}

interface PendingEnrollment {
  enrollment_id: string; user_name: string; user_email: string;
  avatar_url: string; class_title: string; class_id: string; requested_at: string;
}

const categoryLabels: Record<string, string> = {
  children: 'Crianças', youth: 'Jovens', adults: 'Adultos',
  new_members: 'Novos Membros', leaders: 'Líderes',
};
const categoryColors: Record<string, string> = {
  children: 'bg-amber-500/20 text-amber-400', youth: 'bg-emerald-500/20 text-emerald-400',
  adults: 'bg-primary/20 text-primary', new_members: 'bg-violet-500/20 text-violet-400',
  leaders: 'bg-rose-500/20 text-rose-400',
};

const SchoolPage = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [pending, setPending] = useState<PendingEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin_church' || user?.role === 'leader';

  const loadData = () => {
    const promises: Promise<any>[] = [
      api.get<SchoolClass[]>('/api/church/school/classes').then(setClasses).catch(() => {}),
    ];
    if (isAdmin) {
      promises.push(
        api.get<PendingEnrollment[]>('/api/church/school/pending').then(setPending).catch(() => {})
      );
    }
    Promise.all(promises).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleEnroll = async (classId: string) => {
    setEnrolling(classId);
    try {
      const result = await api.post<{ message?: string }>(`/api/church/school/classes/${classId}/enroll`, {});
      toast.success(result.message || 'Solicitação enviada! Aguarde aprovação.');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao solicitar matrícula');
    }
    setEnrolling(null);
  };

  const handleCancelRequest = async (classId: string) => {
    try {
      await api.delete(`/api/church/school/classes/${classId}/enroll`);
      toast.success('Solicitação cancelada');
      loadData();
    } catch {}
  };

  const handleApprove = async (enrollmentId: string) => {
    setProcessingId(enrollmentId);
    try {
      await api.put(`/api/church/school/enrollments/${enrollmentId}/approve`, {});
      toast.success('Matrícula aprovada!');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro');
    }
    setProcessingId(null);
  };

  const handleReject = async (enrollmentId: string) => {
    setProcessingId(enrollmentId);
    try {
      await api.put(`/api/church/school/enrollments/${enrollmentId}/reject`, {});
      toast.success('Matrícula recusada');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro');
    }
    setProcessingId(null);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">Escola Bíblica</h1>
          <p className="text-sm text-muted-foreground">Classes e cursos disponíveis</p>
        </div>
      </div>

      {/* PENDING APPROVALS SECTION */}
      {isAdmin && pending.length > 0 && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <h2 className="text-sm font-semibold text-amber-400 flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4" />
            Solicitações pendentes ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map(p => (
              <div key={p.enrollment_id} className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/50">
                <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
                  {p.user_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.user_name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{p.class_title}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-emerald-400 hover:bg-emerald-500/20"
                    onClick={() => handleApprove(p.enrollment_id)}
                    disabled={processingId === p.enrollment_id}
                  >
                    {processingId === p.enrollment_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserCheck className="w-5 h-5" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-destructive hover:bg-destructive/20"
                    onClick={() => handleReject(p.enrollment_id)}
                    disabled={processingId === p.enrollment_id}
                  >
                    <UserX className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {classes.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <GraduationCap className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Nenhuma classe disponível no momento</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {classes.map(cls => (
            <Card key={cls.id} className="p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-heading font-semibold text-foreground">{cls.title}</h3>
                    {cls.is_enrolled && (
                      <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                        <CheckCircle className="w-3 h-3 mr-1" /> Matriculado
                      </Badge>
                    )}
                    {cls.is_pending && (
                      <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                        <Clock className="w-3 h-3 mr-1" /> Aguardando
                      </Badge>
                    )}
                    {isAdmin && cls.pending_count > 0 && (
                      <Badge className="bg-amber-500/20 text-amber-400 text-[10px]">
                        {cls.pending_count} pendente{cls.pending_count > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  {cls.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{cls.description}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                {cls.category && (
                  <Badge className={`text-[10px] ${categoryColors[cls.category] || 'bg-muted text-muted-foreground'}`}>
                    {categoryLabels[cls.category] || cls.category}
                  </Badge>
                )}
                {cls.teacher_name && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> Prof. {cls.teacher_name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> {cls.lesson_count} aulas
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {cls.student_count}{cls.max_students ? `/${cls.max_students}` : ''} alunos
                </span>
                {cls.schedule && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {cls.schedule}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {cls.is_enrolled ? (
                  <Link to={`/church/school/${cls.id}`} className="flex-1">
                    <Button size="sm" className="w-full rounded-xl">
                      Acessar Classe <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                ) : cls.is_pending ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 rounded-xl border-amber-500/30 text-amber-400"
                    onClick={() => handleCancelRequest(cls.id)}
                  >
                    <Clock className="w-4 h-4 mr-1" /> Cancelar Solicitação
                  </Button>
                ) : isAdmin ? (
                  <Link to={`/church/school/${cls.id}`} className="flex-1">
                    <Button size="sm" variant="outline" className="w-full rounded-xl">
                      Gerenciar Classe <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={() => handleEnroll(cls.id)}
                    disabled={enrolling === cls.id || (cls.max_students !== null && cls.student_count >= cls.max_students)}
                  >
                    {enrolling === cls.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    {cls.max_students !== null && cls.student_count >= cls.max_students ? 'Turma Lotada' : 'Solicitar Matrícula'}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SchoolPage;
