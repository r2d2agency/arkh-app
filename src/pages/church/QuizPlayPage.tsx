import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trophy, Clock, ArrowRight, CheckCircle2, XCircle, ArrowLeft, Star, Sparkles, Flame, Zap, ArrowUp, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Option { id: string; option_text: string; option_order: number; }
interface Question { id: string; question_text: string; bible_reference: string | null; options: Option[]; }
interface Quiz {
  id: string; title: string; description: string; cover_emoji: string; difficulty: string;
  time_limit_seconds: number; questions: Question[];
  best_score?: number | null; best_total?: number | null;
  is_challenge?: boolean; challenge_level?: number;
}
interface SubmitResult {
  score: number; total: number;
  results: { question_id: string; correct_option_id: string; selected: string; is_correct: boolean }[];
  total_points: number; new_level: number; leveled_up: boolean;
}
interface RankingEntry { user_id: string; name: string; best_score: number; total_questions: number; best_time: number; }

type Phase = 'intro' | 'playing' | 'result';

const QuizPlayPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [generatingNext, setGeneratingNext] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get<Quiz>(`/api/church/quizzes/${id}`)
      .then(setQuiz)
      .catch(() => navigate('/church/quiz'))
      .finally(() => setLoading(false));
  }, [id]);

  const startQuiz = () => {
    if (!quiz) return;
    setPhase('playing');
    setCurrentQ(0);
    setAnswers({});
    setSelectedOption(null);
    setTotalTime(0);
    setTimeLeft(quiz.time_limit_seconds);
    setStreak(0);
  };

  useEffect(() => {
    if (phase !== 'playing' || !quiz) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { handleNext(); return quiz.time_limit_seconds; }
        return prev - 1;
      });
      setTotalTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, currentQ, quiz]);

  const handleSelectOption = (optionId: string) => setSelectedOption(optionId);

  const handleNext = useCallback(() => {
    if (!quiz) return;
    const question = quiz.questions[currentQ];
    if (selectedOption) setAnswers(prev => ({ ...prev, [question.id]: selectedOption }));

    if (currentQ < quiz.questions.length - 1) {
      setCurrentQ(prev => prev + 1);
      setSelectedOption(null);
      setTimeLeft(quiz.time_limit_seconds);
    } else {
      const finalAnswers = { ...answers };
      if (selectedOption) finalAnswers[question.id] = selectedOption;
      api.post<SubmitResult>(`/api/church/quizzes/${quiz.id}/submit`, {
        answers: finalAnswers, time_spent_seconds: totalTime,
      }).then(r => {
        setResult(r);
        setPhase('result');
        let s = 0;
        for (const res of r.results) { if (res.is_correct) s++; else s = 0; }
        setStreak(s);
        if (r.leveled_up) {
          setTimeout(() => setShowLevelUp(true), 1500);
        }
      }).catch(err => {
        toast({ title: 'Erro', description: err?.message || 'Erro ao enviar respostas', variant: 'destructive' });
        navigate('/church/quiz');
      });
      api.get<RankingEntry[]>(`/api/church/quizzes/${quiz.id}/ranking`).then(setRanking).catch(() => {});
    }
  }, [quiz, currentQ, selectedOption, answers, totalTime]);

  const handleGenerateNext = async () => {
    if (!quiz) return;
    const level = quiz.challenge_level || 1;
    setGeneratingNext(true);
    try {
      const newQuiz = await api.post<Quiz>('/api/church/quizzes/generate-challenge', { level });
      navigate(`/church/quiz/${newQuiz.id}`);
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Não foi possível gerar novo desafio', variant: 'destructive' });
    } finally {
      setGeneratingNext(false);
    }
  };

  const handleNextLevel = async () => {
    if (!quiz || !result) return;
    const nextLevel = (quiz.challenge_level || 1) + 1;
    if (nextLevel > 6) return;
    setGeneratingNext(true);
    try {
      const newQuiz = await api.post<Quiz>('/api/church/quizzes/generate-challenge', { level: nextLevel });
      navigate(`/church/quiz/${newQuiz.id}`);
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Fase não desbloqueada ainda', variant: 'destructive' });
    } finally {
      setGeneratingNext(false);
    }
  };

  if (loading || !quiz) {
    return (
      <div className="p-4">
        <Card className="h-64 animate-pulse bg-muted/50 rounded-2xl flex items-center justify-center">
          <div className="text-4xl animate-float">🧠</div>
        </Card>
      </div>
    );
  }

  // INTRO
  if (phase === 'intro') {
    const diffEmoji = quiz.difficulty === 'hard' ? '🔥' : quiz.difficulty === 'medium' ? '⚡' : '🌱';
    return (
      <div className="p-4 space-y-5 animate-fade-in">
        <button onClick={() => navigate('/church/quiz')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <Card className="rounded-2xl overflow-hidden">
          <div className="game-hero-gradient p-8 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              {['✝️', '📖', '⭐', '🕊️', '💫'].map((e, i) => (
                <span key={i} className="absolute text-2xl animate-float"
                  style={{ left: `${15 + i * 18}%`, top: `${10 + (i % 3) * 25}%`, animationDelay: `${i * 0.5}s` }}>
                  {e}
                </span>
              ))}
            </div>
            <div className="relative z-10 space-y-3">
              <div className="text-6xl animate-bounce-in">{quiz.cover_emoji}</div>
              <h1 className="font-heading text-2xl font-bold">{quiz.title}</h1>
              {quiz.description && <p className="text-sm text-white/80 max-w-xs mx-auto">{quiz.description}</p>}
              {quiz.is_challenge && quiz.challenge_level && (
                <Badge className="bg-white/20 text-white border-white/30 text-xs">
                  ⚔️ Desafio Fase {quiz.challenge_level}
                </Badge>
              )}
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-muted/50">
                <div className="text-lg mb-0.5">📝</div>
                <p className="text-lg font-bold font-heading">{quiz.questions.length}</p>
                <p className="text-[10px] text-muted-foreground">perguntas</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50">
                <div className="text-lg mb-0.5">⏱️</div>
                <p className="text-lg font-bold font-heading">{quiz.time_limit_seconds}s</p>
                <p className="text-[10px] text-muted-foreground">por pergunta</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50">
                <div className="text-lg mb-0.5">{diffEmoji}</div>
                <p className="text-lg font-bold font-heading capitalize">
                  {quiz.difficulty === 'easy' ? 'Fácil' : quiz.difficulty === 'medium' ? 'Médio' : 'Difícil'}
                </p>
                <p className="text-[10px] text-muted-foreground">dificuldade</p>
              </div>
            </div>

            {quiz.best_score != null ? (
              <div className="text-center space-y-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <div className="text-3xl">✅</div>
                <p className="font-bold text-sm">Você já jogou este desafio!</p>
                <p className="text-xs text-muted-foreground">Pontuação: {quiz.best_score}/{quiz.best_total}</p>
                <div className="flex gap-2">
                  <Button onClick={() => navigate('/church/quiz')} variant="outline" className="flex-1 rounded-xl text-xs">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Games
                  </Button>
                  <Button onClick={handleGenerateNext} className="flex-1 rounded-xl text-xs gap-1" disabled={generatingNext}>
                    {generatingNext ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    Novo Desafio
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={startQuiz} size="lg" className="w-full h-14 rounded-xl text-base font-bold gap-2 shadow-lg" disabled={quiz.questions.length === 0}>
                {quiz.questions.length === 0 ? 'Sem perguntas' : (
                  <><Sparkles className="w-5 h-5" /> Começar Desafio!</>
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // PLAYING
  if (phase === 'playing') {
    const question = quiz.questions[currentQ];
    const isLast = currentQ === quiz.questions.length - 1;
    const timePercent = (timeLeft / quiz.time_limit_seconds) * 100;
    const isUrgent = timeLeft <= 5;

    return (
      <div className="p-4 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-bold px-3 py-1 rounded-lg">
              {currentQ + 1}/{quiz.questions.length}
            </Badge>
            {quiz.is_challenge && (
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-accent/10 text-accent border-0">
                Fase {quiz.challenge_level}
              </Badge>
            )}
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-sm font-bold transition-all ${
            isUrgent ? 'bg-destructive/15 text-destructive animate-pulse' : 'bg-muted'
          }`}>
            <Clock className={`w-4 h-4 ${isUrgent ? 'animate-wiggle' : ''}`} />
            {timeLeft}s
          </div>
        </div>

        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-1000 ${
            isUrgent ? 'bg-destructive' : timePercent > 50 ? 'bg-primary' : 'bg-accent'
          }`} style={{ width: `${timePercent}%` }} />
        </div>

        <div className="flex gap-1 justify-center">
          {quiz.questions.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${
              i === currentQ ? 'w-6 bg-primary' : i < currentQ ? 'w-1.5 bg-primary/40' : 'w-1.5 bg-muted'
            }`} />
          ))}
        </div>

        <Card className="p-5 rounded-2xl space-y-4 shadow-md">
          <div className="space-y-2">
            <h2 className="font-heading font-bold text-base leading-snug">{question.question_text}</h2>
            {question.bible_reference && (
              <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0 gap-1">
                📖 {question.bible_reference}
              </Badge>
            )}
          </div>
          <div className="space-y-2.5">
            {question.options.map((opt, i) => {
              const letters = ['A', 'B', 'C', 'D'];
              const colors = [
                'from-blue-500/10 to-blue-600/5 border-blue-500/30 hover:border-blue-500/60',
                'from-green-500/10 to-green-600/5 border-green-500/30 hover:border-green-500/60',
                'from-yellow-500/10 to-yellow-600/5 border-yellow-500/30 hover:border-yellow-500/60',
                'from-red-500/10 to-red-600/5 border-red-500/30 hover:border-red-500/60',
              ];
              const selectedColors = [
                'border-blue-500 bg-blue-500/15 shadow-md',
                'border-green-500 bg-green-500/15 shadow-md',
                'border-yellow-500 bg-yellow-500/15 shadow-md',
                'border-red-500 bg-red-500/15 shadow-md',
              ];
              const letterBg = ['bg-blue-500 text-white', 'bg-green-500 text-white', 'bg-yellow-500 text-white', 'bg-red-500 text-white'];
              const isSelected = selectedOption === opt.id;
              return (
                <button key={opt.id} onClick={() => handleSelectOption(opt.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                    isSelected ? selectedColors[i] : `bg-gradient-to-r ${colors[i]}`
                  }`}>
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                    isSelected ? letterBg[i] : 'bg-muted text-muted-foreground'
                  }`}>{letters[i] || i + 1}</span>
                  <span className="text-sm font-medium">{opt.option_text}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Button onClick={handleNext} className="w-full h-12 rounded-xl font-bold text-sm gap-2 shadow-md" disabled={!selectedOption}>
          {isLast ? <><Zap className="w-4 h-4" /> Finalizar</> : <><ArrowRight className="w-4 h-4" /> Próxima</>}
        </Button>
      </div>
    );
  }

  // RESULT
  if (phase === 'result' && result) {
    const pct = Math.round((result.score / result.total) * 100);
    const emoji = pct === 100 ? '👑' : pct >= 80 ? '🏆' : pct >= 50 ? '🎉' : pct >= 30 ? '👏' : '💪';
    const message = pct === 100 ? 'Perfeito!' : pct >= 80 ? 'Excelente!' : pct >= 50 ? 'Muito bem!' : pct >= 30 ? 'Bom trabalho!' : 'Continue praticando!';
    const subMessage = pct === 100 ? 'Você acertou todas!' : pct >= 80 ? 'Quase perfeito!' : pct >= 50 ? 'Mandou bem!' : 'Não desista!';

    return (
      <div className="p-4 space-y-5 animate-fade-in">
        {/* Level Up Dialog */}
        <Dialog open={showLevelUp} onOpenChange={setShowLevelUp}>
          <DialogContent className="rounded-2xl max-w-sm text-center">
            <DialogHeader>
              <DialogTitle className="text-center">
                <div className="text-5xl mb-2 animate-bounce-in">🎉</div>
                <span className="text-xl">Level Up!</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">Você subiu para o nível</p>
              <p className="text-4xl font-heading font-bold text-primary">{result.new_level}</p>
              <p className="text-sm text-muted-foreground">Novas fases foram desbloqueadas!</p>
            </div>
            <Button className="w-full rounded-xl" onClick={() => setShowLevelUp(false)}>
              <Sparkles className="w-4 h-4 mr-2" /> Continuar
            </Button>
          </DialogContent>
        </Dialog>

        <Card className="rounded-2xl overflow-hidden">
          <div className={`p-8 text-center text-white relative overflow-hidden ${
            pct >= 80 ? 'game-hero-gradient' : pct >= 50 ? 'bg-primary' : 'bg-muted-foreground'
          }`}>
            {pct >= 80 && (
              <div className="absolute inset-0">
                {['⭐', '✨', '🌟', '💫', '⭐', '✨'].map((e, i) => (
                  <span key={i} className="absolute text-xl opacity-30 animate-float"
                    style={{ left: `${5 + i * 17}%`, top: `${10 + (i % 3) * 25}%`, animationDelay: `${i * 0.4}s` }}>
                    {e}
                  </span>
                ))}
              </div>
            )}
            <div className="relative z-10 space-y-2">
              <div className="text-6xl animate-bounce-in">{emoji}</div>
              <h1 className="font-heading text-2xl font-bold">{message}</h1>
              <p className="text-sm text-white/80">{subMessage}</p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <p className="text-xl font-heading font-bold text-primary">{result.score}</p>
                <p className="text-[10px] text-muted-foreground">acertos</p>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/50">
                <p className="text-xl font-heading font-bold">{result.total}</p>
                <p className="text-[10px] text-muted-foreground">total</p>
              </div>
              <div className="p-2.5 rounded-xl bg-accent/10">
                <p className="text-xl font-heading font-bold text-accent">{pct}%</p>
                <p className="text-[10px] text-muted-foreground">score</p>
              </div>
              <div className="p-2.5 rounded-xl bg-green-500/10">
                <p className="text-xl font-heading font-bold text-green-600">{result.total_points}</p>
                <p className="text-[10px] text-muted-foreground">total pts</p>
              </div>
            </div>

            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={`w-7 h-7 transition-all ${
                  pct >= s * 20 ? 'fill-accent text-accent animate-bounce-in' : 'text-muted'
                }`} style={{ animationDelay: `${s * 0.1}s` }} />
              ))}
            </div>

            {/* Points earned */}
            <div className="text-center p-3 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-xs text-muted-foreground">Pontos ganhos neste desafio</p>
              <p className="text-2xl font-heading font-bold text-primary">+{result.score}</p>
              {result.leveled_up && (
                <Badge className="mt-1 bg-green-500/15 text-green-600 border-green-500/30 text-xs animate-bounce-in">
                  <ArrowUp className="w-3 h-3 mr-1" /> Subiu de nível!
                </Badge>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleGenerateNext} variant="outline" className="h-11 rounded-xl font-semibold gap-1 text-xs" disabled={generatingNext}>
                {generatingNext ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Mesmo Nível
              </Button>
              {quiz.is_challenge && (quiz.challenge_level || 1) < 6 && (
                <Button onClick={handleNextLevel} className="h-11 rounded-xl font-semibold gap-1 text-xs" disabled={generatingNext}>
                  {generatingNext ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
                  Subir Fase
                </Button>
              )}
              {(!quiz.is_challenge || (quiz.challenge_level || 1) >= 6) && (
                <Button onClick={() => navigate('/church/quiz')} className="h-11 rounded-xl font-semibold gap-1 text-xs">
                  <Sparkles className="w-4 h-4" /> Mais Games
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Answers review */}
        <div className="space-y-2">
          <h3 className="font-heading font-bold text-sm flex items-center gap-2">📋 Revisão</h3>
          {quiz.questions.map((q, i) => {
            const r = result.results.find(r => r.question_id === q.id);
            return (
              <Card key={q.id} className={`p-3 rounded-xl space-y-1 border-l-4 ${r?.is_correct ? 'border-l-green-500' : 'border-l-destructive'}`}>
                <div className="flex items-start gap-2">
                  {r?.is_correct ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{i + 1}. {q.question_text}</p>
                    {q.bible_reference && <p className="text-[10px] text-muted-foreground">📖 {q.bible_reference}</p>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {ranking.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-heading font-bold text-sm flex items-center gap-2">🏆 Ranking</h3>
            {ranking.map((r, i) => {
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <Card key={r.user_id} className={`p-3 rounded-xl flex items-center gap-3 ${i < 3 ? 'bg-accent/5' : ''}`}>
                  <span className="text-base w-6 text-center">
                    {i < 3 ? medals[i] : <span className="text-xs font-bold text-muted-foreground">{i + 1}</span>}
                  </span>
                  <span className="text-sm font-medium flex-1 truncate">{r.name}</span>
                  <span className="text-xs font-bold text-primary">{r.best_score}/{r.total_questions}</span>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default QuizPlayPage;
