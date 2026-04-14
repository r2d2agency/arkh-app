import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gamepad2, Trophy, Star, Clock, Users, ArrowRight, Medal, Zap } from 'lucide-react';
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

const difficultyConfig: Record<string, { label: string; color: string }> = {
  easy: { label: 'Fácil', color: 'bg-green-500/10 text-green-600' },
  medium: { label: 'Médio', color: 'bg-yellow-500/10 text-yellow-600' },
  hard: { label: 'Difícil', color: 'bg-red-500/10 text-red-600' },
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
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-6 h-6 text-primary" />
          <h1 className="font-heading text-xl font-bold">Quiz Bíblico</h1>
        </div>
        <p className="text-sm text-muted-foreground">Teste seus conhecimentos de forma divertida!</p>
      </div>

      {/* Word Search Banner */}
      <Link to="/church/word-search">
        <Card className="p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-accent/10 border-primary/20 card-hover flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center text-xl shrink-0">🔍</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-semibold text-sm">Caça-Palavras Bíblico</h3>
            <p className="text-[11px] text-muted-foreground">Encontre palavras escondidas na grade!</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </Card>
      </Link>

      {/* Score Card */}
      {scores && scores.quizzes_played > 0 && (
        <Card className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
              <Trophy className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Sua pontuação total</p>
              <p className="text-2xl font-bold text-foreground">{scores.total_points} <span className="text-sm font-normal text-muted-foreground">pts</span></p>
              <p className="text-[11px] text-muted-foreground">{scores.quizzes_played} quiz{Number(scores.quizzes_played) > 1 ? 'zes' : ''} · {pct}% de acerto</p>
            </div>
            <div className="text-center">
              <Zap className="w-5 h-5 text-primary mx-auto" />
              <p className="text-xs text-muted-foreground mt-0.5">{pct}%</p>
            </div>
          </div>
        </Card>
      )}

      {/* Leaderboard mini */}
      {scores && scores.leaderboard && scores.leaderboard.length > 1 && (
        <Card className="p-4 rounded-2xl space-y-3">
          <h3 className="font-heading text-sm font-semibold flex items-center gap-1.5">
            <Medal className="w-4 h-4 text-gold" /> Ranking Geral
          </h3>
          <div className="space-y-2">
            {scores.leaderboard.slice(0, 5).map((r, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  i === 0 ? 'bg-gold/20 text-gold' : i === 1 ? 'bg-gray-300/20 text-gray-400' : i === 2 ? 'bg-amber-700/20 text-amber-600' : 'bg-muted text-muted-foreground'
                }`}>
                  {i + 1}
                </span>
                <span className="text-sm flex-1 truncate">{r.name}</span>
                <span className="text-xs font-semibold text-primary">{r.total_points} pts</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-4 h-9">
          <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
          <TabsTrigger value="kids" className="text-xs">🧒 Crianças</TabsTrigger>
          <TabsTrigger value="youth" className="text-xs">🧑 Jovens</TabsTrigger>
          <TabsTrigger value="adults" className="text-xs">👤 Adultos</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-32 rounded-2xl animate-pulse bg-muted/50" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 rounded-2xl text-center">
          <Gamepad2 className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum quiz disponível nesta categoria</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(quiz => {
            const diff = difficultyConfig[quiz.difficulty] || difficultyConfig.easy;
            const hasPlayed = quiz.best_score !== null;
            return (
              <Link key={quiz.id} to={`/church/quiz/${quiz.id}`}>
                <Card className="p-4 rounded-2xl card-hover space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0">
                      {quiz.cover_emoji}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-heading font-semibold text-sm">{quiz.title}</h3>
                        {quiz.is_auto_generated && (
                          <Badge variant="secondary" className="text-[9px] px-1">IA</Badge>
                        )}
                      </div>
                      {quiz.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{quiz.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${diff.color}`}>
                          {diff.label}
                        </span>
                        <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                          {categoryLabels[quiz.category] || quiz.category}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="w-3 h-3" /> {quiz.time_limit_seconds}s
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {quiz.question_count} perguntas
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                  {hasPlayed && (
                    <div className="flex items-center gap-2 pt-1 border-t border-border">
                      <Trophy className="w-3.5 h-3.5 text-gold" />
                      <span className="text-xs text-muted-foreground">
                        Melhor: <strong className="text-foreground">{quiz.best_score}/{quiz.best_total}</strong>
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                        <Users className="w-3 h-3" /> {quiz.attempt_count} tentativas
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
