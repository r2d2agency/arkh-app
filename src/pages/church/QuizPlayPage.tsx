import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock, ArrowRight, CheckCircle2, XCircle, RotateCcw, ArrowLeft, Star, Medal } from 'lucide-react';
import { api } from '@/lib/api';

interface Option {
  id: string;
  option_text: string;
  option_order: number;
}

interface Question {
  id: string;
  question_text: string;
  bible_reference: string | null;
  options: Option[];
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  cover_emoji: string;
  difficulty: string;
  time_limit_seconds: number;
  questions: Question[];
}

interface SubmitResult {
  score: number;
  total: number;
  results: { question_id: string; correct_option_id: string; selected: string; is_correct: boolean }[];
}

interface RankingEntry {
  user_id: string;
  name: string;
  best_score: number;
  total_questions: number;
  best_time: number;
}

type Phase = 'intro' | 'playing' | 'result';

const QuizPlayPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
  };

  // Timer
  useEffect(() => {
    if (phase !== 'playing' || !quiz) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up — auto advance
          handleNext();
          return quiz.time_limit_seconds;
        }
        return prev - 1;
      });
      setTotalTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, currentQ, quiz]);

  const handleSelectOption = (optionId: string) => {
    setSelectedOption(optionId);
  };

  const handleNext = useCallback(() => {
    if (!quiz) return;
    const question = quiz.questions[currentQ];
    if (selectedOption) {
      setAnswers(prev => ({ ...prev, [question.id]: selectedOption }));
    }

    if (currentQ < quiz.questions.length - 1) {
      setCurrentQ(prev => prev + 1);
      setSelectedOption(null);
      setTimeLeft(quiz.time_limit_seconds);
    } else {
      // Submit
      const finalAnswers = { ...answers };
      if (selectedOption) finalAnswers[question.id] = selectedOption;
      api.post<SubmitResult>(`/api/church/quizzes/${quiz.id}/submit`, {
        answers: finalAnswers,
        time_spent_seconds: totalTime,
      }).then(r => {
        setResult(r);
        setPhase('result');
      });
      api.get<RankingEntry[]>(`/api/church/quizzes/${quiz.id}/ranking`)
        .then(setRanking)
        .catch(() => {});
    }
  }, [quiz, currentQ, selectedOption, answers, totalTime]);

  if (loading || !quiz) {
    return <div className="p-4"><Card className="h-64 animate-pulse bg-muted/50 rounded-2xl" /></div>;
  }

  // INTRO
  if (phase === 'intro') {
    return (
      <div className="p-4 space-y-5 animate-fade-in">
        <button onClick={() => navigate('/church/quiz')} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <Card className="p-6 rounded-2xl text-center space-y-4">
          <div className="text-5xl">{quiz.cover_emoji}</div>
          <h1 className="font-heading text-xl font-bold">{quiz.title}</h1>
          {quiz.description && <p className="text-sm text-muted-foreground">{quiz.description}</p>}
          <div className="flex justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {quiz.time_limit_seconds}s por pergunta</span>
            <span>{quiz.questions.length} perguntas</span>
          </div>
          <Button onClick={startQuiz} size="lg" className="w-full rounded-xl" disabled={quiz.questions.length === 0}>
            {quiz.questions.length === 0 ? 'Sem perguntas' : '🎮 Começar Quiz'}
          </Button>
        </Card>
      </div>
    );
  }

  // PLAYING
  if (phase === 'playing') {
    const question = quiz.questions[currentQ];
    const progress = ((currentQ + 1) / quiz.questions.length) * 100;
    const isLast = currentQ === quiz.questions.length - 1;

    return (
      <div className="p-4 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">
            {currentQ + 1}/{quiz.questions.length}
          </span>
          <div className="flex items-center gap-1.5 text-sm font-mono">
            <Clock className={`w-4 h-4 ${timeLeft <= 5 ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
            <span className={timeLeft <= 5 ? 'text-destructive font-bold' : ''}>{timeLeft}s</span>
          </div>
        </div>
        <Progress value={progress} className="h-1.5" />

        <Card className="p-5 rounded-2xl space-y-4">
          <h2 className="font-heading font-semibold text-base leading-snug">{question.question_text}</h2>
          {question.bible_reference && (
            <Badge variant="secondary" className="text-[10px]">📖 {question.bible_reference}</Badge>
          )}
          <div className="space-y-2.5">
            {question.options.map((opt, i) => {
              const letters = ['A', 'B', 'C', 'D'];
              const isSelected = selectedOption === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelectOption(opt.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/30 hover:bg-muted/50'
                  }`}
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {letters[i] || i + 1}
                  </span>
                  <span className="text-sm font-medium">{opt.option_text}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Button onClick={handleNext} className="w-full rounded-xl" disabled={!selectedOption}>
          {isLast ? 'Finalizar' : 'Próxima'} <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    );
  }

  // RESULT
  if (phase === 'result' && result) {
    const pct = Math.round((result.score / result.total) * 100);
    const emoji = pct >= 80 ? '🏆' : pct >= 50 ? '👏' : '💪';
    const message = pct >= 80 ? 'Excelente!' : pct >= 50 ? 'Muito bem!' : 'Continue praticando!';

    return (
      <div className="p-4 space-y-5 animate-fade-in">
        <Card className="p-6 rounded-2xl text-center space-y-4">
          <div className="text-5xl">{emoji}</div>
          <h1 className="font-heading text-2xl font-bold">{message}</h1>
          <div className="flex justify-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{result.score}</p>
              <p className="text-xs text-muted-foreground">acertos</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{result.total}</p>
              <p className="text-xs text-muted-foreground">total</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gold">{pct}%</p>
              <p className="text-xs text-muted-foreground">score</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={startQuiz} variant="outline" className="flex-1 rounded-xl">
              <RotateCcw className="w-4 h-4 mr-1" /> Jogar novamente
            </Button>
            <Button onClick={() => navigate('/church/quiz')} className="flex-1 rounded-xl">
              Ver mais quizzes
            </Button>
          </div>
        </Card>

        {/* Answers review */}
        <div className="space-y-2">
          <h3 className="font-heading font-semibold text-sm">Revisão das respostas</h3>
          {quiz.questions.map((q, i) => {
            const r = result.results.find(r => r.question_id === q.id);
            return (
              <Card key={q.id} className="p-3 rounded-xl space-y-1">
                <div className="flex items-start gap-2">
                  {r?.is_correct ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{i + 1}. {q.question_text}</p>
                    {q.bible_reference && <p className="text-[10px] text-muted-foreground">📖 {q.bible_reference}</p>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Ranking */}
        {ranking.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-1.5">
              <Medal className="w-4 h-4 text-gold" /> Ranking
            </h3>
            {ranking.map((r, i) => (
              <Card key={r.user_id} className="p-3 rounded-xl flex items-center gap-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === 0 ? 'bg-gold/20 text-gold' : i === 1 ? 'bg-muted text-muted-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {i + 1}
                </span>
                <span className="text-sm font-medium flex-1 truncate">{r.name}</span>
                <span className="text-xs text-muted-foreground">{r.best_score}/{r.total_questions}</span>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default QuizPlayPage;
