import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, BookOpen, Users, Calendar, ChevronLeft, Loader2, CheckCircle, FileText, Clock, UserCheck, UserX } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Lesson {
  id: string; title: string; description: string; content: string;
  key_verse: string; lesson_date: string; sort_order: number; attendance_count: number;
}
interface Student {
  id: string; name: string; email: string; avatar_url: string;
  enrolled_at: string; status: string; enrollment_id: string; requested_at: string;
}
interface ClassDetail {
  id: string; title: string; description: string; teacher_name: string;
  category: string; schedule: string; is_enrolled: boolean; is_pending: boolean;
  enrollment_status: string | null; can_manage: boolean;
  lessons: Lesson[]; students: Student[]; user_attendance: string[];
}

const SchoolClassDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [cls, setCls] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [processingEnrollment, setProcessingEnrollment] = useState<string | null>(null);

  const load = () => {
    api.get<ClassDetail>(`/api/church/school/classes/${id}`)
      .then(setCls)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const result = await api.post<{ message?: string }>(`/api/church/school/classes/${id}/enroll`, {});
      toast.success(result.message || 'Solicitação enviada!');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Erro');
    }
    setEnrolling(false);
  };

  const handleApprove = async (enrollmentId: string) => {
    setProcessingEnrollment(enrollmentId);
    try {
      await api.put(`/api/church/school/enrollments/${enrollmentId}/approve`, {});
      toast.success('Matrícula aprovada!');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao aprovar');
    } finally {
      setProcessingEnrollment(null);
    }
  };

  const handleReject = async (enrollmentId: string) => {
    setProcessingEnrollment(enrollmentId);
    try {
      await api.put(`/api/church/school/enrollments/${enrollmentId}/reject`, {});
      toast.success('Matrícula recusada');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao recusar');
    } finally {
      setProcessingEnrollment(null);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!cls) return <div className="p-6 text-center text-muted-foreground">Classe não encontrada</div>;

  const enrolledStudents = cls.students?.filter(s => s.status === 'enrolled') || [];
  const pendingStudents = cls.students?.filter(s => s.status === 'pending') || [];
  const attendedCount = cls.user_attendance?.length || 0;
  const totalLessons = cls.lessons?.length || 0;
  const progressPct = totalLessons > 0 ? Math.round((attendedCount / totalLessons) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Link to="/church/school" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="w-4 h-4" /> Escola Bíblica
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">{cls.title}</h1>
          {cls.description && <p className="text-sm text-muted-foreground mt-1">{cls.description}</p>}
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
            {cls.teacher_name && <span>Prof. {cls.teacher_name}</span>}
            {cls.schedule && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{cls.schedule}</span>}
            <span>{enrolledStudents.length} alunos</span>
          </div>
        </div>
        {!cls.is_enrolled && !cls.is_pending && (
          <Button size="sm" onClick={handleEnroll} disabled={enrolling} className="rounded-xl">
            {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Solicitar Matrícula'}
          </Button>
        )}
        {cls.is_pending && (
          <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            <Clock className="w-3 h-3 mr-1" /> Aguardando aprovação
          </Badge>
        )}
      </div>

      {/* Block content for non-enrolled and pending users (admins can always see) */}
      {!cls.is_enrolled && !cls.can_manage ? (
        <Card className="p-8 text-center space-y-3">
          {cls.is_pending ? (
            <>
              <Clock className="w-10 h-10 mx-auto text-amber-400" />
              <h3 className="font-heading font-semibold text-foreground">Aguardando aprovação</h3>
              <p className="text-sm text-muted-foreground">Sua solicitação de matrícula está sendo analisada pela liderança. Você terá acesso ao conteúdo assim que for aprovado.</p>
            </>
          ) : (
            <>
              <GraduationCap className="w-10 h-10 mx-auto text-muted-foreground/50" />
              <h3 className="font-heading font-semibold text-foreground">Matrícula necessária</h3>
              <p className="text-sm text-muted-foreground">Solicite sua matrícula para acessar as aulas e conteúdos desta classe.</p>
              <Button size="sm" onClick={handleEnroll} disabled={enrolling} className="rounded-xl">
                {enrolling ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Solicitar Matrícula
              </Button>
            </>
          )}
        </Card>
      ) : (
      <>
      {cls.is_enrolled && totalLessons > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Seu progresso</span>
            <span className="text-sm text-muted-foreground">{attendedCount}/{totalLessons} aulas</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </Card>
      )}

      {selectedLesson ? (
        <Card className="p-6 space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedLesson(null)} className="rounded-xl -ml-2">
            <ChevronLeft className="w-4 h-4 mr-1" /> Voltar às aulas
          </Button>
          <h2 className="font-heading text-lg font-bold">{selectedLesson.title}</h2>
          {selectedLesson.key_verse && (
            <blockquote className="border-l-2 border-primary pl-4 italic text-sm text-muted-foreground">
              {selectedLesson.key_verse}
            </blockquote>
          )}
          {selectedLesson.description && <p className="text-sm text-muted-foreground">{selectedLesson.description}</p>}
          {selectedLesson.content && (
            <div className="prose prose-invert prose-sm max-w-none text-foreground/90 whitespace-pre-wrap">
              {selectedLesson.content}
            </div>
          )}
        </Card>
      ) : (
        <Tabs defaultValue="lessons">
          <TabsList className="w-full">
            <TabsTrigger value="lessons" className="flex-1">Aulas ({totalLessons})</TabsTrigger>
            <TabsTrigger value="students" className="flex-1">
              Alunos ({enrolledStudents.length})
              {pendingStudents.length > 0 && cls.can_manage && (
                <Badge className="ml-1 bg-amber-500/20 text-amber-400 text-[9px] px-1">{pendingStudents.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lessons" className="space-y-2 mt-4">
            {cls.lessons?.length === 0 ? (
              <Card className="p-6 text-center border-dashed">
                <BookOpen className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma aula cadastrada</p>
              </Card>
            ) : (
              cls.lessons.map((lesson, idx) => {
                const attended = cls.user_attendance?.includes(lesson.id);
                return (
                  <Card
                    key={lesson.id}
                    className="p-4 cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => setSelectedLesson(lesson)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        attended ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground'
                      }`}>
                        {attended ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-foreground">{lesson.title}</h4>
                        {lesson.lesson_date && (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(lesson.lesson_date), "dd 'de' MMM", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="students" className="space-y-4 mt-4">
            {/* Pending enrollments (admin/teacher only) */}
            {cls.can_manage && pendingStudents.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-1">
                  <Clock className="w-4 h-4" /> Solicitações pendentes ({pendingStudents.length})
                </h3>
                {pendingStudents.map(student => (
                  <Card key={student.id} className="p-3 border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-400">
                        {student.name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.email}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-emerald-400 hover:bg-emerald-500/20"
                          onClick={() => handleApprove(student.enrollment_id)}
                          disabled={processingEnrollment === student.enrollment_id}
                        >
                          {processingEnrollment === student.enrollment_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:bg-destructive/20"
                          onClick={() => handleReject(student.enrollment_id)}
                          disabled={processingEnrollment === student.enrollment_id}
                        >
                          <UserX className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Enrolled students */}
            <div className="space-y-2">
              {enrolledStudents.length === 0 && pendingStudents.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">Nenhum aluno matriculado</p>
              ) : (
                enrolledStudents.map(student => (
                  <Card key={student.id} className="p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {student.name?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{student.email}</p>
                    </div>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 text-[9px]">
                      <CheckCircle className="w-3 h-3 mr-1" /> Ativo
                    </Badge>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
      </>
      )}
    </div>
  );
};

export default SchoolClassDetail;