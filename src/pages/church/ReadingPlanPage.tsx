import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookHeart, Check, Flame, ArrowLeft, RotateCcw, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  bibleBooks, TOTAL_CHAPTERS, planOptions, difficultyOptions,
  buildDailySchedule, type PlanData, type Difficulty,
} from '@/components/reading-plan/BibleData';
import ChapterStudyModal from '@/components/reading-plan/ChapterStudyModal';

const STORAGE_KEY = 'arkhe_reading_plan';

const ReadingPlanPage = () => {
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [filter, setFilter] = useState<'all' | 'old' | 'new'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('easy');
  const [studyModal, setStudyModal] = useState<{ bookIdx: number; chapter: number } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate old plans without difficulty
      if (!parsed.difficulty) parsed.difficulty = 'easy';
      setPlan(parsed);
      setSelectedDifficulty(parsed.difficulty);
    }
  }, []);

  const savePlan = (p: PlanData) => {
    setPlan(p);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  };

  const startPlan = (key: string) => {
    savePlan({
      planKey: key,
      difficulty: selectedDifficulty,
      startDate: new Date().toISOString().slice(0, 10),
      completed: {},
    });
  };

  const resetPlan = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPlan(null);
  };

  const toggleChapter = (bookIdx: number, chapter: number) => {
    if (!plan) return;
    const key = `${bookIdx}-${chapter}`;
    const next = { ...plan, completed: { ...plan.completed } };
    if (next.completed[key]) delete next.completed[key];
    else next.completed[key] = true;
    savePlan(next);
  };

  const completedCount = plan ? Object.keys(plan.completed).length : 0;
  const progress = plan ? Math.round((completedCount / TOTAL_CHAPTERS) * 100) : 0;

  const getStreak = () => {
    if (!plan || completedCount === 0) return 0;
    let streak = 0;
    for (let d = 0; d < 365; d++) {
      if (d === 0 && completedCount > 0) streak++;
      else if (completedCount > d) streak++;
      else break;
    }
    return Math.min(streak, completedCount);
  };

  // === PLAN SELECTION SCREEN ===
  if (!plan) {
    return (
      <div className="p-4 space-y-5">
        <div className="flex items-center gap-3">
          <Link to="/church" className="p-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-heading text-xl font-bold">Plano de Leitura Bíblica</h1>
        </div>

        <Card className="p-5 rounded-2xl text-center space-y-3 border-primary/20">
          <BookHeart className="w-12 h-12 text-primary mx-auto" />
          <h2 className="font-heading text-lg font-bold">Leia a Bíblia toda!</h2>
          <p className="text-sm text-muted-foreground">
            Escolha seu nível e plano. São {TOTAL_CHAPTERS} capítulos com estudo integrado.
          </p>
        </Card>

        {/* Difficulty selection */}
        <div className="space-y-2">
          <h3 className="font-heading text-sm font-bold text-muted-foreground">Seu nível de estudo</h3>
          <div className="space-y-2">
            {difficultyOptions.map(d => (
              <button
                key={d.key}
                onClick={() => setSelectedDifficulty(d.key)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                  selectedDifficulty === d.key
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{d.icon}</span>
                  <div className="flex-1">
                    <p className={`font-heading font-bold text-sm ${d.color}`}>{d.label}</p>
                    <p className="text-xs text-muted-foreground">{d.desc}</p>
                  </div>
                  {selectedDifficulty === d.key && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Plan duration */}
        <div className="space-y-2">
          <h3 className="font-heading text-sm font-bold text-muted-foreground">Duração do plano</h3>
          <div className="space-y-2">
            {planOptions.map(opt => {
              const perDay = Math.ceil(TOTAL_CHAPTERS / opt.days);
              return (
                <Card key={opt.key} className="p-4 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-heading font-bold text-base">{opt.label}</h3>
                      <p className="text-xs text-muted-foreground">~{perDay} capítulos por dia</p>
                    </div>
                    <Button onClick={() => startPlan(opt.key)} className="rounded-xl">
                      Começar
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // === ACTIVE PLAN SCREEN ===
  const currentPlan = planOptions.find(p => p.key === plan.planKey);
  const schedule = buildDailySchedule(currentPlan?.days || 365);
  const daysSinceStart = Math.floor((Date.now() - new Date(plan.startDate).getTime()) / 86400000);
  const currentDay = Math.min(daysSinceStart, schedule.length - 1);
  const diff = difficultyOptions.find(d => d.key === plan.difficulty);

  const filteredBooks = bibleBooks
    .map((b, idx) => ({ ...b, idx }))
    .filter(b => filter === 'all' || b.testament === filter);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/church" className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-heading text-lg font-bold flex-1">Plano de Leitura</h1>
        <Button variant="ghost" size="sm" onClick={resetPlan} className="text-destructive text-xs">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reiniciar
        </Button>
      </div>

      {/* Stats card */}
      <Card className="p-4 rounded-2xl space-y-3 border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">
              {currentPlan?.label} • Dia {daysSinceStart + 1} • {diff?.icon} {diff?.label}
            </p>
            <p className="font-heading font-bold text-2xl text-primary">{progress}%</p>
          </div>
          <div className="flex items-center gap-1.5 bg-orange-500/10 px-3 py-1.5 rounded-xl">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="font-bold text-sm text-orange-500">{getStreak()}</span>
          </div>
        </div>
        <Progress value={progress} className="h-2.5 rounded-full" />
        <p className="text-xs text-muted-foreground">{completedCount} de {TOTAL_CHAPTERS} capítulos lidos</p>
      </Card>

      {/* Today's reading */}
      {schedule[currentDay] && (
        <Card className="p-4 rounded-2xl space-y-2 border-primary/10 bg-primary/5">
          <h3 className="font-heading text-sm font-bold flex items-center gap-2">
            <BookHeart className="w-4 h-4 text-primary" />
            Leitura de hoje
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {schedule[currentDay].map(ch => {
              const key = `${ch.bookIdx}-${ch.chapter}`;
              const done = plan.completed[key];
              return (
                <div key={key} className="flex items-center gap-0.5">
                  <button
                    onClick={() => toggleChapter(ch.bookIdx, ch.chapter)}
                    className={`text-xs px-2.5 py-1.5 rounded-l-lg transition-all ${
                      done
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80 text-foreground'
                    }`}
                  >
                    {done && <Check className="w-3 h-3 inline mr-0.5" />}
                    {ch.book} {ch.chapter}
                  </button>
                  <button
                    onClick={() => setStudyModal({ bookIdx: ch.bookIdx, chapter: ch.chapter })}
                    className="text-xs px-1.5 py-1.5 rounded-r-lg bg-muted hover:bg-primary/20 text-primary transition-all"
                    title="Ver estudo"
                  >
                    <BookOpen className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {([['all', 'Todos'], ['old', 'Antigo T.'], ['new', 'Novo T.']] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`text-xs px-3 py-1.5 rounded-xl transition-colors ${
              filter === k ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* All books */}
      <div className="space-y-2">
        {filteredBooks.map(book => {
          const bookCompleted = Array.from({ length: book.chapters }, (_, i) =>
            plan.completed[`${book.idx}-${i + 1}`] ? 1 : 0
          ).reduce((a: number, b: number) => a + b, 0);
          const bookProgress = Math.round((bookCompleted / book.chapters) * 100);

          return (
            <details key={book.idx} className="group">
              <summary className="flex items-center justify-between p-3 bg-card rounded-xl cursor-pointer hover:bg-muted/50 transition-colors border border-border">
                <div className="flex items-center gap-2">
                  <span className="font-heading text-sm font-semibold">{book.name}</span>
                  <span className="text-[10px] text-muted-foreground">{bookCompleted}/{book.chapters}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${bookProgress}%` }} />
                  </div>
                  {bookProgress === 100 && <Check className="w-4 h-4 text-primary" />}
                </div>
              </summary>
              <div className="flex flex-wrap gap-1 p-3 pt-2">
                {Array.from({ length: book.chapters }, (_, i) => {
                  const ch = i + 1;
                  const key = `${book.idx}-${ch}`;
                  const done = plan.completed[key];
                  return (
                    <div key={ch} className="flex flex-col items-center">
                      <button
                        onClick={() => toggleChapter(book.idx, ch)}
                        className={`w-9 h-9 rounded-t-lg text-xs font-medium transition-all ${
                          done
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/70 text-foreground'
                        }`}
                      >
                        {ch}
                      </button>
                      <button
                        onClick={() => setStudyModal({ bookIdx: book.idx, chapter: ch })}
                        className="w-9 h-5 rounded-b-lg bg-muted/50 hover:bg-primary/20 text-primary transition-all flex items-center justify-center"
                        title="Estudo"
                      >
                        <BookOpen className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>

      {/* Study Modal */}
      {studyModal && (
        <ChapterStudyModal
          open={!!studyModal}
          onClose={() => setStudyModal(null)}
          bookIdx={studyModal.bookIdx}
          chapter={studyModal.chapter}
          difficulty={plan.difficulty}
        />
      )}
    </div>
  );
};

export default ReadingPlanPage;
