import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BookOpen, Calendar, CheckCircle2, Circle, Trophy, RotateCcw, ChevronDown, ChevronUp,
  Flame, Target, Clock, ArrowLeft, Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface BibleBook {
  name: string;
  chapters: number;
  testament: 'AT' | 'NT';
}

const BIBLE_BOOKS: BibleBook[] = [
  { name: 'Gênesis', chapters: 50, testament: 'AT' },
  { name: 'Êxodo', chapters: 40, testament: 'AT' },
  { name: 'Levítico', chapters: 27, testament: 'AT' },
  { name: 'Números', chapters: 36, testament: 'AT' },
  { name: 'Deuteronômio', chapters: 34, testament: 'AT' },
  { name: 'Josué', chapters: 24, testament: 'AT' },
  { name: 'Juízes', chapters: 21, testament: 'AT' },
  { name: 'Rute', chapters: 4, testament: 'AT' },
  { name: '1 Samuel', chapters: 31, testament: 'AT' },
  { name: '2 Samuel', chapters: 24, testament: 'AT' },
  { name: '1 Reis', chapters: 22, testament: 'AT' },
  { name: '2 Reis', chapters: 25, testament: 'AT' },
  { name: '1 Crônicas', chapters: 29, testament: 'AT' },
  { name: '2 Crônicas', chapters: 36, testament: 'AT' },
  { name: 'Esdras', chapters: 10, testament: 'AT' },
  { name: 'Neemias', chapters: 13, testament: 'AT' },
  { name: 'Ester', chapters: 10, testament: 'AT' },
  { name: 'Jó', chapters: 42, testament: 'AT' },
  { name: 'Salmos', chapters: 150, testament: 'AT' },
  { name: 'Provérbios', chapters: 31, testament: 'AT' },
  { name: 'Eclesiastes', chapters: 12, testament: 'AT' },
  { name: 'Cânticos', chapters: 8, testament: 'AT' },
  { name: 'Isaías', chapters: 66, testament: 'AT' },
  { name: 'Jeremias', chapters: 52, testament: 'AT' },
  { name: 'Lamentações', chapters: 5, testament: 'AT' },
  { name: 'Ezequiel', chapters: 48, testament: 'AT' },
  { name: 'Daniel', chapters: 12, testament: 'AT' },
  { name: 'Oséias', chapters: 14, testament: 'AT' },
  { name: 'Joel', chapters: 3, testament: 'AT' },
  { name: 'Amós', chapters: 9, testament: 'AT' },
  { name: 'Obadias', chapters: 1, testament: 'AT' },
  { name: 'Jonas', chapters: 4, testament: 'AT' },
  { name: 'Miqueias', chapters: 7, testament: 'AT' },
  { name: 'Naum', chapters: 3, testament: 'AT' },
  { name: 'Habacuque', chapters: 3, testament: 'AT' },
  { name: 'Sofonias', chapters: 3, testament: 'AT' },
  { name: 'Ageu', chapters: 2, testament: 'AT' },
  { name: 'Zacarias', chapters: 14, testament: 'AT' },
  { name: 'Malaquias', chapters: 4, testament: 'AT' },
  { name: 'Mateus', chapters: 28, testament: 'NT' },
  { name: 'Marcos', chapters: 16, testament: 'NT' },
  { name: 'Lucas', chapters: 24, testament: 'NT' },
  { name: 'João', chapters: 21, testament: 'NT' },
  { name: 'Atos', chapters: 28, testament: 'NT' },
  { name: 'Romanos', chapters: 16, testament: 'NT' },
  { name: '1 Coríntios', chapters: 16, testament: 'NT' },
  { name: '2 Coríntios', chapters: 13, testament: 'NT' },
  { name: 'Gálatas', chapters: 6, testament: 'NT' },
  { name: 'Efésios', chapters: 6, testament: 'NT' },
  { name: 'Filipenses', chapters: 4, testament: 'NT' },
  { name: 'Colossenses', chapters: 4, testament: 'NT' },
  { name: '1 Tessalonicenses', chapters: 5, testament: 'NT' },
  { name: '2 Tessalonicenses', chapters: 3, testament: 'NT' },
  { name: '1 Timóteo', chapters: 6, testament: 'NT' },
  { name: '2 Timóteo', chapters: 4, testament: 'NT' },
  { name: 'Tito', chapters: 3, testament: 'NT' },
  { name: 'Filemom', chapters: 1, testament: 'NT' },
  { name: 'Hebreus', chapters: 13, testament: 'NT' },
  { name: 'Tiago', chapters: 5, testament: 'NT' },
  { name: '1 Pedro', chapters: 5, testament: 'NT' },
  { name: '2 Pedro', chapters: 3, testament: 'NT' },
  { name: '1 João', chapters: 5, testament: 'NT' },
  { name: '2 João', chapters: 1, testament: 'NT' },
  { name: '3 João', chapters: 1, testament: 'NT' },
  { name: 'Judas', chapters: 1, testament: 'NT' },
  { name: 'Apocalipse', chapters: 22, testament: 'NT' },
];

const TOTAL_CHAPTERS = BIBLE_BOOKS.reduce((sum, book) => sum + book.chapters, 0);

type PlanDuration = 3 | 6 | 12;

interface PlanConfig {
  months: PlanDuration;
  label: string;
  description: string;
  chaptersPerDay: number;
  emoji: string;
}

const PLAN_OPTIONS: PlanConfig[] = [
  { months: 3, label: '3 meses', description: 'Intensivo — ~13 capítulos/dia', chaptersPerDay: 13, emoji: '🔥' },
  { months: 6, label: '6 meses', description: 'Equilibrado — ~7 capítulos/dia', chaptersPerDay: 7, emoji: '⚡' },
  { months: 12, label: '1 ano', description: 'Tranquilo — ~4 capítulos/dia', chaptersPerDay: 4, emoji: '🌿' },
];

interface ReadingDay {
  day: number;
  readings: { book: string; chapter: number }[];
}

interface SavedPlan {
  duration: PlanDuration;
  startDate: string;
  completedChapters: string[];
}

const STORAGE_KEY = 'arkhe_reading_plan';

function buildPlan(duration: PlanDuration): ReadingDay[] {
  const chaptersPerDay = PLAN_OPTIONS.find((p) => p.months === duration)!.chaptersPerDay;
  const allChapters: { book: string; chapter: number }[] = [];

  for (const book of BIBLE_BOOKS) {
    for (let ch = 1; ch <= book.chapters; ch++) {
      allChapters.push({ book: book.name, chapter: ch });
    }
  }

  const days: ReadingDay[] = [];
  let dayNum = 1;

  for (let i = 0; i < allChapters.length; i += chaptersPerDay) {
    days.push({
      day: dayNum,
      readings: allChapters.slice(i, i + chaptersPerDay),
    });
    dayNum++;
  }

  return days;
}

function chapterKey(book: string, chapter: number) {
  return `${book}:${chapter}`;
}

function loadPlan(): SavedPlan | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function savePlan(plan: SavedPlan) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
}

const ReadingPlanPage = () => {
  const [savedPlan, setSavedPlan] = useState<SavedPlan | null>(loadPlan);
  const [selectedDuration, setSelectedDuration] = useState<PlanDuration>(12);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [filterTestament, setFilterTestament] = useState<'all' | 'AT' | 'NT'>('all');

  const plan = useMemo(() => (savedPlan ? buildPlan(savedPlan.duration) : []), [savedPlan?.duration]);

  const completedSet = useMemo(
    () => new Set(savedPlan?.completedChapters || []),
    [savedPlan?.completedChapters]
  );

  const totalCompleted = completedSet.size;
  const progressPct = TOTAL_CHAPTERS > 0 ? Math.round((totalCompleted / TOTAL_CHAPTERS) * 100) : 0;

  const currentDayIndex = useMemo(() => {
    if (!savedPlan) return 0;
    const start = new Date(savedPlan.startDate);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(Math.max(0, diffDays), plan.length - 1);
  }, [savedPlan, plan.length]);

  const streak = useMemo(() => {
    if (!plan.length) return 0;
    let count = 0;
    for (let i = currentDayIndex; i >= 0; i--) {
      const day = plan[i];
      const allDone = day.readings.every((r) => completedSet.has(chapterKey(r.book, r.chapter)));
      if (allDone) count++;
      else break;
    }
    return count;
  }, [plan, currentDayIndex, completedSet]);

  useEffect(() => {
    if (savedPlan && plan.length > 0 && expandedDay === null) {
      setExpandedDay(currentDayIndex + 1);
    }
  }, [savedPlan, plan.length]);

  const startPlan = () => {
    const newPlan: SavedPlan = {
      duration: selectedDuration,
      startDate: new Date().toISOString().split('T')[0],
      completedChapters: [],
    };
    savePlan(newPlan);
    setSavedPlan(newPlan);
  };

  const resetPlan = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSavedPlan(null);
    setExpandedDay(null);
  };

  const toggleChapter = (book: string, chapter: number) => {
    if (!savedPlan) return;
    const key = chapterKey(book, chapter);
    const updated = new Set(savedPlan.completedChapters);
    if (updated.has(key)) {
      updated.delete(key);
    } else {
      updated.add(key);
    }
    const newPlan = { ...savedPlan, completedChapters: Array.from(updated) };
    savePlan(newPlan);
    setSavedPlan(newPlan);
  };

  const markDayComplete = (day: ReadingDay) => {
    if (!savedPlan) return;
    const updated = new Set(savedPlan.completedChapters);
    const allDone = day.readings.every((r) => updated.has(chapterKey(r.book, r.chapter)));
    for (const r of day.readings) {
      const key = chapterKey(r.book, r.chapter);
      if (allDone) updated.delete(key);
      else updated.add(key);
    }
    const newPlan = { ...savedPlan, completedChapters: Array.from(updated) };
    savePlan(newPlan);
    setSavedPlan(newPlan);
  };

  const filteredPlan = useMemo(() => {
    if (filterTestament === 'all') return plan;
    return plan
      .map((day) => ({
        ...day,
        readings: day.readings.filter((r) => {
          const book = BIBLE_BOOKS.find((b) => b.name === r.book);
          return book?.testament === filterTestament;
        }),
      }))
      .filter((day) => day.readings.length > 0);
  }, [plan, filterTestament]);

  // Selection screen
  if (!savedPlan) {
    return (
      <div className="p-4 space-y-5 animate-fade-in">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            <h1 className="font-heading text-xl font-bold">Plano de Leitura Bíblica</h1>
          </div>
          <p className="text-sm text-muted-foreground">Escolha seu ritmo e leia a Bíblia inteira!</p>
        </div>

        <Card className="p-5 rounded-2xl text-center space-y-3 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/15 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-heading text-lg font-bold">Leia a Bíblia toda</h2>
          <p className="text-sm text-muted-foreground">
            São <strong className="text-foreground">{TOTAL_CHAPTERS} capítulos</strong> em 66 livros. Escolha em quanto tempo quer completar:
          </p>
        </Card>

        <div className="space-y-3">
          {PLAN_OPTIONS.map((option) => {
            const isSelected = selectedDuration === option.months;
            return (
              <Card
                key={option.months}
                onClick={() => setSelectedDuration(option.months)}
                className={`p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-4 ${
                  isSelected ? 'ring-2 ring-primary border-primary shadow-md' : 'hover:border-primary/40'
                }`}
              >
                <span className="text-3xl">{option.emoji}</span>
                <div className="flex-1">
                  <h3 className="font-heading font-bold text-base">{option.label}</h3>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                </div>
              </Card>
            );
          })}
        </div>

        <Button onClick={startPlan} className="w-full h-12 rounded-xl text-base font-semibold gap-2">
          <Sparkles className="w-5 h-5" /> Começar Plano de {PLAN_OPTIONS.find((p) => p.months === selectedDuration)?.label}
        </Button>
      </div>
    );
  }

  // Active plan
  const planConfig = PLAN_OPTIONS.find((p) => p.months === savedPlan.duration)!;
  const isComplete = totalCompleted >= TOTAL_CHAPTERS;

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="font-heading text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> Plano de Leitura
          </h1>
          <p className="text-xs text-muted-foreground">
            {planConfig.emoji} {planConfig.label} · Iniciado em {new Date(savedPlan.startDate).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={resetPlan} className="text-xs text-destructive hover:text-destructive rounded-xl">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reiniciar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 rounded-2xl text-center space-y-1">
          <Target className="w-5 h-5 mx-auto text-primary" />
          <p className="text-lg font-bold">{progressPct}%</p>
          <p className="text-[10px] text-muted-foreground">Progresso</p>
        </Card>
        <Card className="p-3 rounded-2xl text-center space-y-1">
          <Flame className="w-5 h-5 mx-auto text-accent" />
          <p className="text-lg font-bold">{streak}</p>
          <p className="text-[10px] text-muted-foreground">Dias seguidos</p>
        </Card>
        <Card className="p-3 rounded-2xl text-center space-y-1">
          <CheckCircle2 className="w-5 h-5 mx-auto text-green-500" />
          <p className="text-lg font-bold">{totalCompleted}</p>
          <p className="text-[10px] text-muted-foreground">de {TOTAL_CHAPTERS} cap.</p>
        </Card>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <Progress value={progressPct} className="h-3" />
        <p className="text-[11px] text-muted-foreground text-center">
          {totalCompleted} de {TOTAL_CHAPTERS} capítulos lidos
        </p>
      </div>

      {isComplete && (
        <Card className="p-6 rounded-2xl text-center space-y-3 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <Trophy className="w-12 h-12 text-primary mx-auto" />
          <h2 className="font-heading text-xl font-bold">Parabéns! 🎉</h2>
          <p className="text-sm text-muted-foreground">Você leu a Bíblia inteira!</p>
        </Card>
      )}

      {/* Filter */}
      <Tabs value={filterTestament} onValueChange={(v) => setFilterTestament(v as any)}>
        <TabsList className="w-full grid grid-cols-3 h-9">
          <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
          <TabsTrigger value="AT" className="text-xs">Antigo T.</TabsTrigger>
          <TabsTrigger value="NT" className="text-xs">Novo T.</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Day list */}
      <div className="space-y-2">
        {filteredPlan.map((day) => {
          const isExpanded = expandedDay === day.day;
          const dayCompleted = day.readings.every((r) => completedSet.has(chapterKey(r.book, r.chapter)));
          const dayProgress = day.readings.filter((r) => completedSet.has(chapterKey(r.book, r.chapter))).length;
          const isToday = day.day === currentDayIndex + 1;

          return (
            <Card
              key={day.day}
              className={`rounded-2xl overflow-hidden transition-all ${isToday ? 'border-primary/40 shadow-sm' : ''} ${dayCompleted ? 'border-green-500/20 bg-green-500/5' : ''}`}
            >
              <button
                onClick={() => setExpandedDay(isExpanded ? null : day.day)}
                className="w-full flex items-center gap-3 p-3.5 text-left"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  dayCompleted ? 'bg-green-500 text-white' : isToday ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {dayCompleted ? <CheckCircle2 className="w-4 h-4" /> : day.day}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">
                      Dia {day.day}
                      {isToday && <Badge variant="outline" className="ml-2 text-[9px] border-primary/30 text-primary py-0">Hoje</Badge>}
                    </p>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {day.readings.length} capítulos · {dayProgress}/{day.readings.length} lidos
                  </p>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>

              {isExpanded && (
                <div className="px-3.5 pb-3.5 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground font-medium">Leituras do dia:</span>
                    <Button
                      size="sm"
                      variant={dayCompleted ? 'outline' : 'default'}
                      className="h-7 text-[11px] rounded-lg"
                      onClick={(e) => { e.stopPropagation(); markDayComplete(day); }}
                    >
                      {dayCompleted ? 'Desmarcar tudo' : 'Marcar dia completo'}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {day.readings.map((reading) => {
                      const key = chapterKey(reading.book, reading.chapter);
                      const done = completedSet.has(key);
                      return (
                        <button
                          key={key}
                          onClick={(e) => { e.stopPropagation(); toggleChapter(reading.book, reading.chapter); }}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all ${
                            done ? 'bg-green-500/10 border border-green-500/20' : 'bg-muted/50 border border-transparent hover:border-primary/20'
                          }`}
                        >
                          {done ? (
                            <CheckCircle2 className="w-4.5 h-4.5 text-green-500 shrink-0" />
                          ) : (
                            <Circle className="w-4.5 h-4.5 text-muted-foreground/40 shrink-0" />
                          )}
                          <span className={`text-sm ${done ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                            {reading.book} {reading.chapter}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ReadingPlanPage;