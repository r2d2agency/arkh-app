import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Gamepad2, Plus, Pencil, Trash2, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface QuizOption {
  id?: string;
  option_text: string;
  is_correct: boolean;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  bible_reference: string | null;
  options: QuizOption[];
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  cover_emoji: string;
  time_limit_seconds: number;
  is_active: boolean;
  question_count: number;
  attempt_count: number;
}

const emptyQuiz = { title: '', description: '', category: 'general', difficulty: 'easy', cover_emoji: '📖', time_limit_seconds: 30, is_active: false };

const QuizAdminPage = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<any>(null);
  const [form, setForm] = useState(emptyQuiz);
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [questionDialog, setQuestionDialog] = useState(false);
  const [qForm, setQForm] = useState({ question_text: '', bible_reference: '', options: [{ option_text: '', is_correct: true }, { option_text: '', is_correct: false }, { option_text: '', is_correct: false }, { option_text: '', is_correct: false }] as QuizOption[] });

  const fetchQuizzes = () => {
    api.get<Quiz[]>('/api/church/quizzes')
      .then(setQuizzes)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchQuizzes(); }, []);

  const handleSave = async () => {
    try {
      if (editingQuiz) {
        await api.put(`/api/church/quizzes/${editingQuiz.id}`, form);
        toast.success('Quiz atualizado');
      } else {
        await api.post('/api/church/quizzes', form);
        toast.success('Quiz criado');
      }
      setDialogOpen(false);
      fetchQuizzes();
    } catch { toast.error('Erro ao salvar'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este quiz e todas as perguntas?')) return;
    try {
      await api.delete(`/api/church/quizzes/${id}`);
      toast.success('Quiz excluído');
      fetchQuizzes();
    } catch { toast.error('Erro ao excluir'); }
  };

  const openEdit = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setForm({ title: quiz.title, description: quiz.description, category: quiz.category, difficulty: quiz.difficulty, cover_emoji: quiz.cover_emoji, time_limit_seconds: quiz.time_limit_seconds, is_active: quiz.is_active });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingQuiz(null);
    setForm(emptyQuiz);
    setDialogOpen(true);
  };

  const toggleExpand = async (quizId: string) => {
    if (expandedQuiz === quizId) {
      setExpandedQuiz(null);
      return;
    }
    setExpandedQuiz(quizId);
    try {
      const data = await api.get<any>(`/api/church/quizzes/${quizId}`);
      setQuestions(data.questions || []);
    } catch { setQuestions([]); }
  };

  const addQuestion = async () => {
    if (!expandedQuiz) return;
    const validOptions = qForm.options.filter(o => o.option_text.trim());
    if (!qForm.question_text.trim() || validOptions.length < 2) {
      toast.error('Preencha a pergunta e pelo menos 2 opções');
      return;
    }
    try {
      const q = await api.post<QuizQuestion>(`/api/church/quizzes/${expandedQuiz}/questions`, {
        question_text: qForm.question_text,
        bible_reference: qForm.bible_reference || null,
        options: validOptions,
      });
      setQuestions(prev => [...prev, q]);
      setQForm({ question_text: '', bible_reference: '', options: [{ option_text: '', is_correct: true }, { option_text: '', is_correct: false }, { option_text: '', is_correct: false }, { option_text: '', is_correct: false }] });
      setQuestionDialog(false);
      toast.success('Pergunta adicionada');
      fetchQuizzes();
    } catch { toast.error('Erro ao adicionar'); }
  };

  const deleteQuestion = async (questionId: string) => {
    try {
      await api.delete(`/api/church/quizzes/questions/${questionId}`);
      setQuestions(prev => prev.filter(q => q.id !== questionId));
      fetchQuizzes();
      toast.success('Pergunta removida');
    } catch { toast.error('Erro'); }
  };

  const emojiOptions = ['📖', '✝️', '⛪', '🙏', '🕊️', '🌟', '👶', '🎯', '🧠', '💡'];

  return (
    <div className="p-4 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-primary" />
          <h1 className="font-heading text-lg font-bold">Gerenciar Quizzes</h1>
        </div>
        <Button size="sm" onClick={openNew} className="rounded-xl">
          <Plus className="w-4 h-4 mr-1" /> Novo Quiz
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <Card key={i} className="h-20 animate-pulse bg-muted/50 rounded-2xl" />)}
        </div>
      ) : quizzes.length === 0 ? (
        <Card className="p-8 rounded-2xl text-center">
          <Gamepad2 className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum quiz criado ainda</p>
          <Button size="sm" className="mt-3 rounded-xl" onClick={openNew}>Criar primeiro quiz</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {quizzes.map(quiz => (
            <Card key={quiz.id} className="rounded-2xl overflow-hidden">
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{quiz.cover_emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm truncate">{quiz.title}</h3>
                      {quiz.is_active ? (
                        <Badge variant="default" className="text-[10px]">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Inativo</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{quiz.question_count} perguntas · {quiz.attempt_count} tentativas</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(quiz)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(quiz.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleExpand(quiz.id)}>
                      {expandedQuiz === quiz.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {expandedQuiz === quiz.id && (
                <div className="border-t border-border p-4 space-y-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Perguntas</h4>
                    <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={() => setQuestionDialog(true)}>
                      <Plus className="w-3 h-3 mr-1" /> Pergunta
                    </Button>
                  </div>
                  {questions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">Nenhuma pergunta ainda</p>
                  ) : (
                    questions.map((q, i) => (
                      <Card key={q.id} className="p-3 rounded-xl space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium">{i + 1}. {q.question_text}</p>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive shrink-0" onClick={() => deleteQuestion(q.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        {q.bible_reference && <p className="text-[10px] text-muted-foreground">📖 {q.bible_reference}</p>}
                        <div className="flex flex-wrap gap-1.5">
                          {q.options.map(opt => (
                            <span key={opt.id || opt.option_text} className={`text-[10px] px-2 py-0.5 rounded-full ${opt.is_correct ? 'bg-green-500/10 text-green-600 font-medium' : 'bg-muted text-muted-foreground'}`}>
                              {opt.is_correct ? '✓ ' : ''}{opt.option_text}
                            </span>
                          ))}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Quiz Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingQuiz ? 'Editar Quiz' : 'Novo Quiz'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Heróis da Bíblia" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Opcional" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Geral</SelectItem>
                    <SelectItem value="kids">Crianças</SelectItem>
                    <SelectItem value="youth">Jovens</SelectItem>
                    <SelectItem value="adults">Adultos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dificuldade</Label>
                <Select value={form.difficulty} onValueChange={v => setForm(f => ({ ...f, difficulty: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Fácil</SelectItem>
                    <SelectItem value="medium">Médio</SelectItem>
                    <SelectItem value="hard">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Tempo por pergunta (segundos)</Label>
              <Input type="number" value={form.time_limit_seconds} onChange={e => setForm(f => ({ ...f, time_limit_seconds: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Emoji</Label>
              <div className="flex gap-2 flex-wrap mt-1">
                {emojiOptions.map(e => (
                  <button key={e} onClick={() => setForm(f => ({ ...f, cover_emoji: e }))} className={`text-xl p-1.5 rounded-lg transition-all ${form.cover_emoji === e ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-muted'}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Ativo (visível para membros)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.title.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Dialog */}
      <Dialog open={questionDialog} onOpenChange={setQuestionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Pergunta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Pergunta</Label>
              <Textarea value={qForm.question_text} onChange={e => setQForm(f => ({ ...f, question_text: e.target.value }))} placeholder="Ex: Quem construiu a arca?" rows={2} />
            </div>
            <div>
              <Label>Referência bíblica (opcional)</Label>
              <Input value={qForm.bible_reference} onChange={e => setQForm(f => ({ ...f, bible_reference: e.target.value }))} placeholder="Ex: Gênesis 6:14" />
            </div>
            <div className="space-y-2">
              <Label>Opções (marque a correta)</Label>
              {qForm.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    onClick={() => setQForm(f => ({ ...f, options: f.options.map((o, j) => ({ ...o, is_correct: j === i })) }))}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${opt.is_correct ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                  >
                    {['A', 'B', 'C', 'D'][i]}
                  </button>
                  <Input
                    value={opt.option_text}
                    onChange={e => setQForm(f => ({ ...f, options: f.options.map((o, j) => j === i ? { ...o, option_text: e.target.value } : o) }))}
                    placeholder={`Opção ${['A', 'B', 'C', 'D'][i]}`}
                    className="flex-1"
                  />
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground">Clique na letra para marcar a resposta correta</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionDialog(false)}>Cancelar</Button>
            <Button onClick={addQuestion}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuizAdminPage;
