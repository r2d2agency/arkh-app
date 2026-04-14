import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gamepad2, Trophy, Star, Clock, Users, ArrowRight, Sparkles, Target, Flame, Lock, Unlock, Zap, Loader2, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  cover_emoji: string;
  time_limit_seconds: number;
  question_count: number;
  attempt_count: number;
  best_score: number | null;
  best_total: number | null;
  is_auto_generated: boolean;
  is_challenge: boolean;
  challenge_level: number;
}

interface MyScores {
  total_points: number;
  quizzes_played: number;
  total_possible: number;
  leaderboard: { name: string; avatar_url: string; total_points: number; quizzes_played: number }[];
}

interface Phase {
  level: number;
  name: string;
  difficulty: string;
  minPoints: number;
  emoji: string;
}

interface MyProgress {
  total_points: number;
  current_level: number;
  quizzes_completed: number;
  current_phase: Phase;
  next_phase: Phase | null;
  phases: Phase[];
  points_to_next: number;
}

const difficultyConfig: Record<string, { label: string; color: string; emoji: string }> = {
  easy: { label: 'Fácil', color: 'bg-green-500/15 text-green-600 border-green-500/30', emoji: '🌱' },
  medium: { label: 'Médio', color: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30', emoji: '⚡' },
  hard: { label: 'Difícil', color: 'bg-red-500/15 text-red-600 border-red-500/30', emoji: '🔥' },
};

const QuizListPage = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [scores, setScores] = useState<MyScores | null>(null);
  const [progress, setProgress] = useState<MyProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<number | null>(null);
  const [tab, setTab] = useState('phases');
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadData = () => {
    Promise.all([
      api.get<Quiz[]>('/api/church/quizzes').then(setQuizzes).catch(() => {}),
      api.get<MyScores>('/api/church/quizzes/my-scores').then(setScores).catch(() => {}),
      api.get<MyProgress>('/api/church/quizzes/my-progress').then(setProgress).catch(() => {}),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleGenerateChallenge = async (level: number) => {
    setGenerating(level);
    try {
      const quiz = await api.post<Quiz>('/api/church/quizzes/generate-challenge', { level });
      toast({ title: '🎮 Novo desafio gerado!', description: quiz.title });
      navigate(`/church/quiz/${quiz.id}`);
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Não foi possível gerar o desafio', variant: 'destructive' });
    } finally {
      setGenerating(null);
    }
  };

  const pct = scores && scores.total_possible > 0 ? Math.round((scores.total_points / scores.total_possible) * 100) : 0;

  return (
    <div className="p-4 space-y-5 animate-fade-in">
      {/* Hero Header */}
      <div className="game-hero-gradient rounded-2xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-2 right-3 text-4xl opacity-20 animate-float">🎮</div>
        <div className="absolute bottom-1 left-4 text-2xl opacity-10 animate-float" style={{ animationDelay: '1s' }}>✝️</div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-heading text-xl font-bold">Games Bíblicos</h1>
              <p className="text-xs text-white/70">Aprenda se divertindo!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Games Hub */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/church/quiz" className="block">
          <Card className="p-4 rounded-2xl game-card-gradient border-primary/20 card-hover text-center space-y-2 h-full">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/15 flex items-center justify-center text-2xl animate-float">🧠</div>
            <h3 className="font-heading font-bold text-sm">Quiz Bíblico</h3>
            <p className="text-[10px] text-muted-foreground">Teste seus conhecimentos</p>
          </Card>
        </Link>
        <Link to="/church/word-search" className="block">
          <Card className="p-4 rounded-2xl game-card-gradient border-accent/20 card-hover text-center space-y-2 h-full">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-accent/15 flex items-center justify-center text-2xl animate-float" style={{ animationDelay: '0.5s' }}>🔍</div>
            <h3 className="font-heading font-bold text-sm">Caça-Palavras</h3>
            <p className="text-[10px] text-muted-foreground">Encontre palavras bíblicas</p>
          </Card>
        </Link>
      </div>

      {/* Level Progress Card */}
      {progress && (
        <Card className="p-4 rounded-2xl overflow-hidden relative border-primary/20">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-3xl">
                  {progress.current_phase.emoji}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Seu nível</p>
                  <p className="font-heading font-bold text-lg">{progress.current_phase.name}</p>
                  <p className="text-xs text-muted-foreground">Fase {progress.current_level} de {progress.phases.length}</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-2xl font-heading font-bold text-primary">{progress.total_points}</p>
                <p className="text-[10px] text-muted-foreground">pontos</p>
              </div>
            </div>

            {progress.next_phase && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Próxima fase: <span className="font-semibold text-foreground">{progress.next_phase.emoji} {progress.next_phase.name}</span></span>
                  <span className="text-primary font-bold">{progress.points_to_next} pts restantes</span>
                </div>
                <Progress
                  value={progress.next_phase ? ((progress.total_points - (progress.phases[progress.current_level - 1]?.minPoints || 0)) / (progress.next_phase.minPoints - (progress.phases[progress.current_level - 1]?.minPoints || 0))) * 100 : 100}
                  className="h-2.5"
                />
              </div>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {progress.quizzes_completed} jogos</span>
              <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-accent" /> {pct}% acerto</span>
            </div>
          </div>
        </Card>
      )}

      {/* Tab Switch */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-3 h-10 rounded-xl">
          <TabsTrigger value="phases" className="text-xs rounded-lg gap-1">🏆 Fases</TabsTrigger>
          <TabsTrigger value="quizzes" className="text-xs rounded-lg gap-1">📋 Quizzes</TabsTrigger>
          <TabsTrigger value="ranking" className="text-xs rounded-lg gap-1">🥇 Ranking</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Phases Tab */}
      {tab === 'phases' && progress && (
        <div className="space-y-3">
          {progress.phases.map((phase, idx) => {
            const isUnlocked = progress.current_level >= phase.level;
            const isCurrent = progress.current_level === phase.level;
            const isGenerating = generating === phase.level;

            return (
              <Card
                key={phase.level}
                className={`p-4 rounded-2xl transition-all animate-fade-in relative overflow-hidden ${
                  isCurrent ? 'border-primary/40 shadow-lg shadow-primary/10' : isUnlocked ? 'border-green-500/20' : 'opacity-60'
                }`}
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                {isCurrent && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent" />
                )}
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 ${
                    isUnlocked
                      ? 'bg-gradient-to-br from-primary/15 to-accent/10'
                      : 'bg-muted/50'
                  }`}>
                    {isUnlocked ? phase.emoji : '🔒'}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-bold text-sm">Fase {phase.level}: {phase.name}</h3>
                      {isCurrent && (
                        <Badge className="text-[9px] px-1.5 bg-primary/15 text-primary border-0">Atual</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${difficultyConfig[phase.difficulty]?.color || ''}`}>
                        {difficultyConfig[phase.difficulty]?.emoji} {difficultyConfig[phase.difficulty]?.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {phase.minPoints} pts para desbloquear
                      </span>
                    </div>
                    {!isUnlocked && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Faltam {phase.minPoints - progress.total_points} pontos
                      </p>
                    )}
                  </div>
                  {isUnlocked && (
                    <Button
                      size="sm"
                      variant={isCurrent ? 'default' : 'outline'}
                      className="rounded-xl shrink-0 gap-1 text-xs"
                      disabled={isGenerating || generating !== null}
                      onClick={() => handleGenerateChallenge(phase.level)}
                    >
                      {isGenerating ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Gerando...</>
                      ) : (
                        <><Zap className="w-3 h-3" /> Jogar</>
                      )}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}

          {/* Future rewards teaser */}
          <Card className="p-4 rounded-2xl border-dashed border-2 border-accent/30 text-center space-y-2 bg-accent/5">
            <div className="text-3xl">🎁</div>
            <h3 className="font-heading font-bold text-sm">Recompensas em breve!</h3>
            <p className="text-[10px] text-muted-foreground max-w-xs mx-auto">
              Acumule pontos para desbloquear eBooks, conteúdos exclusivos e muito mais. Continue jogando!
            </p>
          </Card>
        </div>
      )}

      {/* Quizzes Tab */}
      {tab === 'quizzes' && (
        <div className="space-y-3">
          {loading ? (
            [1, 2, 3].map(i => (
              <Card key={i} className="h-28 rounded-2xl animate-pulse bg-muted/50" />
            ))
          ) : quizzes.length === 0 ? (
            <Card className="p-10 rounded-2xl text-center space-y-3">
              <div className="text-5xl animate-float">🎮</div>
              <p className="text-sm text-muted-foreground font-medium">Nenhum quiz disponível</p>
              <p className="text-xs text-muted-foreground">Gere um desafio na aba Fases!</p>
            </Card>
          ) : (
            quizzes.map((quiz, idx) => {
              const diff = difficultyConfig[quiz.difficulty] || difficultyConfig.easy;
              const hasPlayed = quiz.best_score !== null;
              const bestPct = hasPlayed && quiz.best_total ? Math.round(((quiz.best_score ?? 0) / quiz.best_total) * 100) : 0;
              return (
                <Link key={quiz.id} to={hasPlayed ? '#' : `/church/quiz/${quiz.id}`} onClick={hasPlayed ? (e) => e.preventDefault() : undefined}>
                  <Card
                    className={`p-4 rounded-2xl space-y-3 animate-fade-in relative overflow-hidden ${hasPlayed ? 'opacity-60' : 'card-hover'}`}
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    {hasPlayed && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="text-[9px] px-2 bg-green-500/15 text-green-600 border-green-500/30">
                          ✅ Concluído {bestPct === 100 ? '⭐' : ''}
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center text-2xl shrink-0">
                        {quiz.cover_emoji}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <h3 className="font-heading font-bold text-sm truncate">{quiz.title}</h3>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${diff.color}`}>
                            {diff.emoji} {diff.label}
                          </span>
                          {quiz.is_challenge && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 bg-accent/10 text-accent border-0">
                              ⚔️ Desafio Lv.{quiz.challenge_level}
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> {quiz.time_limit_seconds}s
                          </span>
                          <span className="text-[10px] text-muted-foreground">📝 {quiz.question_count}</span>
                        </div>
                      </div>
                      {!hasPlayed && <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2" />}
                    </div>
                    {hasPlayed && (
                      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${bestPct}%` }} />
                        </div>
                        <span className="text-[11px] font-bold text-primary">{quiz.best_score}/{quiz.best_total}</span>
                      </div>
                    )}
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      )}

      {/* Ranking Tab */}
      {tab === 'ranking' && scores && scores.leaderboard && scores.leaderboard.length > 0 && (
        <Card className="p-4 rounded-2xl space-y-3">
          <h3 className="font-heading text-sm font-bold flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-accent/15 flex items-center justify-center text-xs">🏆</span>
            Ranking Geral
          </h3>
          <div className="space-y-2">
            {scores.leaderboard.map((r, i) => {
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${i < 3 ? 'bg-accent/5' : ''}`}>
                  <span className="text-base w-6 text-center">
                    {i < 3 ? medals[i] : <span className="text-xs font-bold text-muted-foreground">{i + 1}</span>}
                  </span>
                  <span className="text-sm flex-1 truncate font-medium">{r.name}</span>
                  <span className="text-xs font-bold text-primary flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {r.total_points}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
      {tab === 'ranking' && (!scores || !scores.leaderboard || scores.leaderboard.length === 0) && (
        <Card className="p-10 rounded-2xl text-center space-y-3">
          <div className="text-4xl">🏆</div>
          <p className="text-sm text-muted-foreground">Nenhum jogador ainda. Seja o primeiro!</p>
        </Card>
      )}
    </div>
  );
};

export default QuizListPage;
