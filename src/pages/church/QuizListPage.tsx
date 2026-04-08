import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gamepad2, Trophy, Star, Clock, Users, ArrowRight } from 'lucide-react';
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
}

const categoryLabels: Record<string, string> = {
  general: 'Geral',
  kids: 'Crianças',
  youth: 'Jovens',
  adults: 'Adultos',
};

const difficultyConfig: Record<string, { label: string; color: string }> = {
  easy: { label: 'Fácil', color: 'bg-green-500/10 text-green-600' },
  medium: { label: 'Médio', color: 'bg-yellow-500/10 text-yellow-600' },
  hard: { label: 'Difícil', color: 'bg-red-500/10 text-red-600' },
};

const QuizListPage = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    api.get<Quiz[]>('/api/church/quizzes')
      .then(setQuizzes)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = tab === 'all' ? quizzes : quizzes.filter(q => q.category === tab);

  return (
    <div className="p-4 space-y-5 animate-fade-in">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-6 h-6 text-primary" />
          <h1 className="font-heading text-xl font-bold">Quiz Bíblico</h1>
        </div>
        <p className="text-sm text-muted-foreground">Teste seus conhecimentos de forma divertida!</p>
      </div>

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
                      <h3 className="font-heading font-semibold text-sm">{quiz.title}</h3>
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
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
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
