import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookHeart, Check, Flame, ArrowLeft, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'arkhe_reading_plan';

const bibleBooks = [
  { name: 'Gênesis', chapters: 50, testament: 'old' },
  { name: 'Êxodo', chapters: 40, testament: 'old' },
  { name: 'Levítico', chapters: 27, testament: 'old' },
  { name: 'Números', chapters: 36, testament: 'old' },
  { name: 'Deuteronômio', chapters: 34, testament: 'old' },
  { name: 'Josué', chapters: 24, testament: 'old' },
  { name: 'Juízes', chapters: 21, testament: 'old' },
  { name: 'Rute', chapters: 4, testament: 'old' },
  { name: '1 Samuel', chapters: 31, testament: 'old' },
  { name: '2 Samuel', chapters: 24, testament: 'old' },
  { name: '1 Reis', chapters: 22, testament: 'old' },
  { name: '2 Reis', chapters: 25, testament: 'old' },
  { name: '1 Crônicas', chapters: 29, testament: 'old' },
  { name: '2 Crônicas', chapters: 36, testament: 'old' },
  { name: 'Esdras', chapters: 10, testament: 'old' },
  { name: 'Neemias', chapters: 13, testament: 'old' },
  { name: 'Ester', chapters: 10, testament: 'old' },
  { name: 'Jó', chapters: 42, testament: 'old' },
  { name: 'Salmos', chapters: 150, testament: 'old' },
  { name: 'Provérbios', chapters: 31, testament: 'old' },
  { name: 'Eclesiastes', chapters: 12, testament: 'old' },
  { name: 'Cantares', chapters: 8, testament: 'old' },
  { name: 'Isaías', chapters: 66, testament: 'old' },
  { name: 'Jeremias', chapters: 52, testament: 'old' },
  { name: 'Lamentações', chapters: 5, testament: 'old' },
  { name: 'Ezequiel', chapters: 48, testament: 'old' },
  { name: 'Daniel', chapters: 12, testament: 'old' },
  { name: 'Oséias', chapters: 14, testament: 'old' },
  { name: 'Joel', chapters: 3, testament: 'old' },
  { name: 'Amós', chapters: 9, testament: 'old' },
  { name: 'Obadias', chapters: 1, testament: 'old' },
  { name: 'Jonas', chapters: 4, testament: 'old' },
  { name: 'Miquéias', chapters: 7, testament: 'old' },
  { name: 'Naum', chapters: 3, testament: 'old' },
  { name: 'Habacuque', chapters: 3, testament: 'old' },
  { name: 'Sofonias', chapters: 3, testament: 'old' },
  { name: 'Ageu', chapters: 2, testament: 'old' },
  { name: 'Zacarias', chapters: 14, testament: 'old' },
  { name: 'Malaquias', chapters: 4, testament: 'old' },
  { name: 'Mateus', chapters: 28, testament: 'new' },
  { name: 'Marcos', chapters: 16, testament: 'new' },
  { name: 'Lucas', chapters: 24, testament: 'new' },
  { name: 'João', chapters: 21, testament: 'new' },
  { name: 'Atos', chapters: 28, testament: 'new' },
  { name: 'Romanos', chapters: 16, testament: 'new' },
  { name: '1 Coríntios', chapters: 16, testament: 'new' },
  { name: '2 Coríntios', chapters: 13, testament: 'new' },
  { name: 'Gálatas', chapters: 6, testament: 'new' },
  { name: 'Efésios', chapters: 6, testament: 'new' },
  { name: 'Filipenses', chapters: 4, testament: 'new' },
  { name: 'Colossenses', chapters: 4, testament: 'new' },
  { name: '1 Tessalonicenses', chapters: 5, testament: 'new' },
  { name: '2 Tessalonicenses', chapters: 3, testament: 'new' },
  { name: '1 Timóteo', chapters: 6, testament: 'new' },
  { name: '2 Timóteo', chapters: 4, testament: 'new' },
  { name: 'Tito', chapters: 3, testament: 'new' },
  { name: 'Filemom', chapters: 1, testament: 'new' },
  { name: 'Hebreus', chapters: 13, testament: 'new' },
  { name: 'Tiago', chapters: 5, testament: 'new' },
  { name: '1 Pedro', chapters: 5, testament: 'new' },
  { name: '2 Pedro', chapters: 3, testament: 'new' },
  { name: '1 João', chapters: 5, testament: 'new' },
  { name: '2 João', chapters: 1, testament: 'new' },
  { name: '3 João', chapters: 1, testament: 'new' },
  { name: 'Judas', chapters: 1, testament: 'new' },
  { name: 'Apocalipse', chapters: 22, testament: 'new' },
];

const TOTAL_CHAPTERS = bibleBooks.reduce((s, b) => s + b.chapters, 0); // 1189

const planOptions = [
  { key: '3m', label: '3 meses', days: 90 },
  { key: '6m', label: '6 meses', days: 180 },
  { key: '1y', label: '1 ano', days: 365 },
];

interface PlanData {
  planKey: string;
  startDate: string;
  completed: Record<string, boolean>; // "bookIndex-chapter" => true
}

function buildDailySchedule(days: number) {
  const allChapters: { book: string; bookIdx: number; chapter: number }[] = [];
  bibleBooks.forEach((b, idx) => {
    for (let c = 1; c <= b.chapters; c++) {
      allChapters.push({ book: b.name, bookIdx: idx, chapter: c });
    }
  });
  const perDay = Math.ceil(allChapters.length / days);
  const schedule: typeof allChapters[] = [];
  for (let i = 0; i < allChapters.length; i += perDay) {
    schedule.push(allChapters.slice(i, i + perDay));
  }
  return schedule;
}

const ReadingPlanPage = () => {
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [filter, setFilter] = useState<'all' | 'old' | 'new'>('all');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setPlan(JSON.parse(saved));
  }, []);

  const savePlan = (p: PlanData) => {
    setPlan(p);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  };

  const startPlan = (key: string) => {
    savePlan({ planKey: key, startDate: new Date().toISOString().slice(0, 10), completed: {} });
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

  // Streak calculation
  const getStreak = () => {
    if (!plan || completedCount === 0) return 0;
    const today = new Date();
    let streak = 0;
    for (let d = 0; d < 365; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      // Simple streak: if any chapter was completed, count the day
      // For simplicity, just count consecutive days from plan start
      if (d === 0 && completedCount > 0) streak++;
      else if (completedCount > d) streak++;
      else break;
    }
    return Math.min(streak, completedCount);
  };

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
            Escolha um plano e acompanhe seu progresso diário de leitura. São {TOTAL_CHAPTERS} capítulos no total.
          </p>
        </Card>

        <div className="space-y-3">
          {planOptions.map(opt => {
            const perDay = Math.ceil(TOTAL_CHAPTERS / opt.days);
            return (
              <Card key={opt.key} className="p-4 rounded-2xl space-y-2">
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
    );
  }

  const currentPlan = planOptions.find(p => p.key === plan.planKey);
  const schedule = buildDailySchedule(currentPlan?.days || 365);
  const daysSinceStart = Math.floor((Date.now() - new Date(plan.startDate).getTime()) / 86400000);
  const currentDay = Math.min(daysSinceStart, schedule.length - 1);

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

      <Card className="p-4 rounded-2xl space-y-3 border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{currentPlan?.label} • Dia {daysSinceStart + 1}</p>
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
        <Card className="p-4 rounded-2xl space-y-2 border-gold/20 bg-gold/5">
          <h3 className="font-heading text-sm font-bold flex items-center gap-2">
            <BookHeart className="w-4 h-4 text-gold" />
            Leitura de hoje
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {schedule[currentDay].map(ch => {
              const key = `${ch.bookIdx}-${ch.chapter}`;
              const done = plan.completed[key];
              return (
                <button
                  key={key}
                  onClick={() => toggleChapter(ch.bookIdx, ch.chapter)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg transition-all ${
                    done
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-foreground'
                  }`}
                >
                  {done && <Check className="w-3 h-3 inline mr-0.5" />}
                  {ch.book} {ch.chapter}
                </button>
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
              <div className="flex flex-wrap gap-1.5 p-3 pt-2">
                {Array.from({ length: book.chapters }, (_, i) => {
                  const ch = i + 1;
                  const key = `${book.idx}-${ch}`;
                  const done = plan.completed[key];
                  return (
                    <button
                      key={ch}
                      onClick={() => toggleChapter(book.idx, ch)}
                      className={`w-9 h-9 rounded-lg text-xs font-medium transition-all ${
                        done
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/70 text-foreground'
                      }`}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
};

export default ReadingPlanPage;
