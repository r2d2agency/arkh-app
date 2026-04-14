import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gamepad2, Trophy, Star, Clock, Users, ArrowRight, Medal, Zap, Flame, Sparkles, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';

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
}

interface MyScores {
  total_points: number;
  quizzes_played: number;
  total_possible: number;
  leaderboard: { name: string; avatar_url: string; total_points: number; quizzes_played: number }[];
}

const categoryLabels: Record<string, string> = {
  general: 'Geral', kids: 'Crianças', youth: 'Jovens', adults: 'Adultos',
};

const difficultyConfig: Record<string, { label: string; color: string; emoji: string }> = {
  easy: { label: 'Fácil', color: 'bg-green-500/15 text-green-600 border-green-500/30', emoji: '🌱' },
  medium: { label: 'Médio', color: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30', emoji: '⚡' },
  hard: { label: 'Difícil', color: 'bg-red-500/15 text-red-600 border-red-500/30', emoji: '🔥' },
};

const QuizListPage = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [scores, setScores] = useState<MyScores | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    Promise.all([
      api.get<Quiz[]>('/api/church/quizzes').then(setQuizzes).catch(() => {}),
      api.get<MyScores>('/api/church/quizzes/my-scores').then(setScores).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const filtered = tab === 'all' ? quizzes : quizzes.filter(q => q.category === tab);
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
            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/15 flex items-center justify-center text-2xl animate-float">
              🧠
            </div>
            <h3 className="font-heading font-bold text-sm">Quiz Bíblico</h3>
            <p className="text-[10px] text-muted-foreground">Teste seus conhecimentos</p>
          </Card>
        </Link>
        <Link to="/church/word-search" className="block">
          <Card className="p-4 rounded-2xl game-card-gradient border-accent/20 card-hover text-center space-y-2 h-full">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-accent/15 flex items-center justify-center text-2xl animate-float" style={{ animationDelay: '0.5s' }}>
              🔍
            </div>
            <h3 className="font-heading font-bold text-sm">Caça-Palavras</h3>
            <p className="text-[10px] text-muted-foreground">Encontre palavras bíblicas</p>
          </Card>
        </Link>
      </div>

      {/* Score Card */}
      {scores && scores.quizzes_played > 0 && (
        <Card className="p-4 rounded-2xl overflow-hidden relative">
          <div className="animate-shimmer absolute inset-0 rounded-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-medium">🏅 Sua pontuação</p>
              <p className="text-3xl font-heading font-bold text-foreground">{scores.total_points} <span className="text-sm font-normal text-muted-foreground">pts</span></p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Target className="w-3 h-3" /> {scores.quizzes_played} jogos
                </span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Flame className="w-3 h-3 text-accent" /> {pct}% acerto
                </span>
              </div>
            </div>
            <div className="text-center">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-4 border-primary/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{pct}%</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Leaderboard */}
      {scores && scores.leaderboard && scores.leaderboard.length > 1 && (
        <Card className="p-4 rounded-2xl space-y-3 border-accent/20">
          <h3 className="font-heading text-sm font-bold flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-accent/15 flex items-center justify-center text-xs">🏆</span>
            Ranking Geral
          </h3>
          <div className="space-y-2">
            {scores.leaderboard.slice(0, 5).map((r, i) => {
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <div key={i} className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${i < 3 ? 'bg-accent/5' : ''}`}>
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

      {/* Category Filter */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-4 h-10 rounded-xl">
          <TabsTrigger value="all" className="text-xs rounded-lg gap-1">🎯 Todos</TabsTrigger>
          <TabsTrigger value="kids" className="text-xs rounded-lg gap-1">🧒 Kids</TabsTrigger>
          <TabsTrigger value="youth" className="text-xs rounded-lg gap-1">🧑 Jovens</TabsTrigger>
          <TabsTrigger value="adults" className="text-xs rounded-lg gap-1">👤 Adultos</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Quiz List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-32 rounded-2xl animate-pulse bg-muted/50" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 rounded-2xl text-center space-y-3">
          <div className="text-5xl animate-float">🎮</div>
          <p className="text-sm text-muted-foreground font-medium">Nenhum quiz disponível nesta categoria</p>
          <p className="text-xs text-muted-foreground">Novos desafios em breve!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((quiz, idx) => {
            const diff = difficultyConfig[quiz.difficulty] || difficultyConfig.easy;
            const hasPlayed = quiz.best_score !== null;
            const bestPct = hasPlayed && quiz.best_total ? Math.round(((quiz.best_score ?? 0) / quiz.best_total) * 100) : 0;
            return (
              <Link key={quiz.id} to={`/church/quiz/${quiz.id}`}>
                <Card 
                  className="p-4 rounded-2xl card-hover space-y-3 animate-fade-in relative overflow-hidden"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  {hasPlayed && bestPct === 100 && (
                    <div className="absolute top-2 right-2">
                      <span className="text-lg">⭐</span>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center text-3xl shrink-0 shadow-sm">
                      {quiz.cover_emoji}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-heading font-bold text-sm">{quiz.title}</h3>
                        {quiz.is_auto_generated && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 bg-primary/10 text-primary border-0">✨ IA</Badge>
                        )}
                      </div>
                      {quiz.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{quiz.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${diff.color}`}>
                          {diff.emoji} {diff.label}
                        </span>
                        <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                          {categoryLabels[quiz.category] || quiz.category}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="w-3 h-3" /> {quiz.time_limit_seconds}s
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          📝 {quiz.question_count}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2" />
                  </div>
                  {hasPlayed && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all bg-primary"
                          style={{ width: `${bestPct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-primary">{quiz.best_score}/{quiz.best_total}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                        <Users className="w-3 h-3" /> {quiz.attempt_count}x
                      </span>
                    </div>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default QuizListPage;
