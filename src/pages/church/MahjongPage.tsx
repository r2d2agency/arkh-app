import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { ArrowLeft, Loader2, Sparkles, Zap, BookOpen, Timer, Trophy, RotateCcw, Layers, X, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type Mode = 'relax' | 'study' | 'challenge';

type Tile = {
  id: string;
  kind: 'original' | 'translation' | 'symbol' | 'verse' | 'category';
  text: string;
  transliteration?: string;
  translation?: string;
  icon?: string;
  context?: string;
  reference?: string;
};

type Piece = {
  piece_id: string;
  x: number;
  y: number;
  z: number;
  tile: Tile;
  removed?: boolean;
};

type LevelSummary = {
  id: string;
  name: string;
  shape: string;
  difficulty: number;
  description?: string;
  best?: { best_score?: number; best_time?: number } | null;
};

type LevelDetail = {
  id: string;
  name: string;
  shape: string;
  difficulty: number;
  description?: string;
  pieces: Piece[];
};

const MODE_META: Record<Mode, { label: string; icon: any; tint: string; desc: string }> = {
  relax: { label: 'Relax', icon: Sparkles, tint: 'bg-primary/10 text-primary', desc: 'Sem pressão. Aprenda no seu ritmo.' },
  study: { label: 'Estudo', icon: BookOpen, tint: 'bg-accent/20 text-accent-foreground', desc: 'Cada par revela contexto bíblico.' },
  challenge: { label: 'Desafio', icon: Timer, tint: 'bg-destructive/10 text-destructive', desc: 'Tempo e pontuação. Vai fundo!' },
};

const TILE_W = 60; // Base width for 3D skin
const TILE_H = 76; // Base height for 3D skin
const TILE_DEPTH = 12; // 3D depth effect

/**
 * Logica Mahjong Solitaire Profissional:
 * Uma peça está livre se:
 * 1. Não houver NENHUMA peça acima (z > p.z) que toque nela.
 * 2. Tiver o lado ESQUERDO ou o lado DIREITO livre (sem peças adjacentes no mesmo Z).
 * 
 * Usamos coordenadas de "meia-unidade" (grid 0.5) para layouts complexos.
 * Uma peça (largura 2, altura 2) em (x,y) cobre o retângulo [x, x+2] e [y, y+2].
 */
function isPieceFree(p: Piece, all: Piece[]): boolean {
  if (p.removed) return false;

  // 1. Checar se há algo em cima (z superior)
  const isCovered = all.some(o => 
    !o.removed && o.piece_id !== p.piece_id && o.z > p.z &&
    o.x > p.x - 2 && o.x < p.x + 2 &&
    o.y > p.y - 2 && o.y < p.y + 2
  );
  if (isCovered) return false;

  // 2. Checar se está travada lateralmente (mesmo Z)
  const leftBlocked = all.some(o => 
    !o.removed && o.piece_id !== p.piece_id && o.z === p.z &&
    o.x === p.x - 2 &&
    o.y > p.y - 2 && o.y < p.y + 2
  );
  const rightBlocked = all.some(o => 
    !o.removed && o.piece_id !== p.piece_id && o.z === p.z &&
    o.x === p.x + 2 &&
    o.y > p.y - 2 && o.y < p.y + 2
  );

  return !leftBlocked || !rightBlocked;
}

function TileCard({ piece, free, selected, onClick, matchEffect }: { piece: Piece; free: boolean; selected: boolean; onClick: () => void; matchEffect?: boolean }) {
  const t = piece.tile;
  const isHebrew = t.kind === 'original';
  
  return (
    <div
      className={cn(
        "absolute transition-all duration-300 transform-gpu preserve-3d",
        piece.removed ? "opacity-0 scale-50 pointer-events-none" : "opacity-100",
        matchEffect && "animate-ping opacity-0"
      )}
      style={{
        left: piece.x * (TILE_W / 2),
        top: piece.y * (TILE_H / 2),
        width: TILE_W,
        height: TILE_H,
        zIndex: 10 + piece.z * 10,
        transform: `translate3d(${-piece.z * 2}px, ${-piece.z * 3}px, 0)`,
      }}
    >
      {/* 3D Sides */}
      <div 
        className="absolute inset-0 bg-slate-300 dark:bg-slate-700 rounded-lg shadow-lg"
        style={{ transform: `translate3d(4px, 6px, -1px)` }}
      />
      
      {/* Main Face */}
      <button
        onClick={free ? onClick : undefined}
        disabled={!free}
        className={cn(
          "absolute inset-0 rounded-lg border-b-4 border-r-2 flex flex-col items-center justify-center p-1 text-center transition-all",
          "shadow-[4px_4px_0px_rgba(0,0,0,0.1)]",
          free ? "cursor-pointer active:translate-y-1 active:shadow-none" : "cursor-not-allowed grayscale-[0.5]",
          selected 
            ? "bg-amber-100 dark:bg-amber-900 border-amber-500 ring-2 ring-amber-400 -translate-y-1" 
            : free 
              ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700" 
              : "bg-slate-100 dark:bg-slate-900 border-slate-200/50 opacity-80"
        )}
      >
        <div className="flex-1 flex flex-col items-center justify-center overflow-hidden w-full">
          {t.icon && <span className="text-xl mb-0.5 filter drop-shadow-sm">{t.icon}</span>}
          <span className={cn(
            "leading-tight w-full break-words px-0.5",
            isHebrew ? "font-scripture text-lg" : "font-bold text-[10px]"
          )}>
            {t.text}
          </span>
          {t.transliteration && (
            <span className="text-[8px] opacity-60 italic mt-0.5 line-clamp-1">{t.transliteration}</span>
          )}
        </div>
        
        {/* Indicators */}
        <div className="absolute top-1 right-1 opacity-20">
          {!free && piece.z > 0 && <Layers className="w-2 h-2" />}
        </div>
      </button>
    </div>
  );
}


function MahjongPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [screen, setScreen] = useState<'lobby' | 'play'>('lobby');
  const [mode, setMode] = useState<Mode>('relax');
  const [levels, setLevels] = useState<LevelSummary[]>([]);
  const [loadingLevels, setLoadingLevels] = useState(true);
  const [level, setLevel] = useState<LevelDetail | null>(null);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [selected, setSelected] = useState<Piece | null>(null);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [feedback, setFeedback] = useState<{ ok: boolean; level?: number; explanation?: string } | null>(null);
  const [validating, setValidating] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [matchingIds, setMatchingIds] = useState<string[]>([]);
  const timerRef = useRef<number | null>(null);

  // Lobby load
  useEffect(() => {
    if (screen !== 'lobby') return;
    setLoadingLevels(true);
    api.get<LevelSummary[]>('/api/church/mahjong/levels')
      .then(setLevels)
      .catch(err => toast({ title: 'Erro ao carregar níveis', description: err.message, variant: 'destructive' }))
      .finally(() => setLoadingLevels(false));
  }, [screen, toast]);

  // Timer
  useEffect(() => {
    if (screen !== 'play' || completed) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    timerRef.current = window.setInterval(() => setSeconds(s => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [screen, completed]);

  // Verifica vitória
  useEffect(() => {
    if (screen !== 'play' || pieces.length === 0 || completed) return;
    const remaining = pieces.filter(p => !p.removed).length;
    if (remaining === 0) {
      setCompleted(true);
      api.post('/api/church/mahjong/complete', {
        level_id: level?.id,
        score, time_seconds: seconds, mode,
        matches_correct: correct, matches_wrong: wrong,
        status: 'completed',
      }).catch(() => {});
    }
  }, [pieces, screen, completed, level?.id, score, seconds, mode, correct, wrong]);

  async function startLevel(lvl: LevelSummary) {
    try {
      setLoadingLevels(true);
      const detail = await api.get<LevelDetail>(`/api/church/mahjong/levels/${lvl.id}`);
      setLevel(detail);
      setPieces(detail.pieces.map(p => ({ ...p, removed: false })));
      setSelected(null);
      setScore(0); setCorrect(0); setWrong(0); setSeconds(0);
      setFeedback(null); setCompleted(false);
      setMatchingIds([]);
      setScreen('play');
    } catch (err: any) {
      toast({ title: 'Erro ao iniciar', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingLevels(false);
    }
  }

  const handlePieceClick = useCallback(async (p: Piece) => {
    if (validating || completed || feedback || matchingIds.length > 0) return;
    if (selected?.piece_id === p.piece_id) { setSelected(null); return; }
    if (!selected) { setSelected(p); return; }

    setValidating(true);
    try {
      const result = await api.post<{ match: boolean; level?: number; explanation?: string }>(
        '/api/church/mahjong/match',
        { tile_a_id: selected.tile.id, tile_b_id: p.tile.id }
      );
      if (result.match) {
        // Efeito visual antes de remover
        setMatchingIds([selected.piece_id, p.piece_id]);
        setCorrect(c => c + 1);
        const pts = (result.level || 1) * 10 + (mode === 'challenge' ? 5 : 0);
        setScore(s => s + pts);
        setFeedback({ ok: true, level: result.level, explanation: result.explanation });

        // Espera animação
        setTimeout(() => {
          setPieces(prev => prev.map(x =>
            x.piece_id === selected.piece_id || x.piece_id === p.piece_id
              ? { ...x, removed: true } : x
          ));
          setMatchingIds([]);
          if (mode !== 'study') {
            setTimeout(() => setFeedback(null), 1000);
          }
        }, 600);

      } else {
        setWrong(w => w + 1);
        if (mode === 'challenge') setScore(s => Math.max(0, s - 2));
        setFeedback({ ok: false, explanation: 'Esses não combinam. Tente outra ligação.' });
        setTimeout(() => setFeedback(null), 1300);
      }
    } catch (err: any) {
      toast({ title: 'Erro na validação', description: err.message, variant: 'destructive' });
    } finally {
      setSelected(null);
      setValidating(false);
    }
  }, [validating, completed, feedback, matchingIds, selected, mode, toast]);

  function restart() {
    if (!level) return;
    setPieces(level.pieces.map(p => ({ ...p, removed: false })));
    setSelected(null);
    setScore(0); setCorrect(0); setWrong(0); setSeconds(0);
    setFeedback(null); setCompleted(false);
    setMatchingIds([]);
  }

  function backToLobby() {
    setScreen('lobby');
    setLevel(null);
  }

  // Bounding box do tabuleiro com padding para o efeito 3D
  const board = useMemo(() => {
    if (!pieces.length) return { w: 0, h: 0 };
    const maxX = Math.max(...pieces.map(p => p.x));
    const maxY = Math.max(...pieces.map(p => p.y));
    return {
      w: (maxX * (TILE_W / 2)) + TILE_W + 20,
      h: (maxY * (TILE_H / 2)) + TILE_H + 20,
    };
  }, [pieces]);


  const remaining = pieces.filter(p => !p.removed).length;

  // ============ LOBBY ============
  if (screen === 'lobby') {
    return (
      <div className="space-y-6 animate-fade-in pb-8">
        <header className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-2xl bg-card border border-border flex items-center justify-center"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight">Mahjong Bíblico</h1>
            <p className="text-xs text-muted-foreground">Combine palavras, símbolos e versículos</p>
          </div>
        </header>

        {/* Hero */}
        <Card className="p-5 rounded-3xl border-0 bg-devotional-gradient text-primary-foreground shadow-soft relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-accent/30 blur-3xl" />
          <div className="absolute -left-6 -bottom-10 w-32 h-32 rounded-full bg-primary-glow/40 blur-3xl" />
          <div className="relative">
            <Badge className="bg-accent text-accent-foreground border-0 mb-3">
              <Sparkles className="w-3 h-3 mr-1" /> Aprendizado gamificado
            </Badge>
            <h2 className="font-scripture text-2xl leading-tight mb-2">
              שָׁלוֹם · אַהֲבָה · אֱמוּנָה
            </h2>
            <p className="text-sm opacity-90 leading-relaxed">
              Encontre pares por <b>significado, símbolo e versículo</b>. Cada combinação
              ensina uma palavra do hebraico ou aramaico bíblico.
            </p>
          </div>
        </Card>

        {/* Modos */}
        <section className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Escolha o modo</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(MODE_META) as Mode[]).map(m => {
              const meta = MODE_META[m];
              const Icon = meta.icon;
              const active = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={[
                    'p-3 rounded-2xl border-2 text-left transition-all',
                    active
                      ? 'border-primary bg-primary/5 shadow-soft -translate-y-0.5'
                      : 'border-border bg-card hover:border-primary/40',
                  ].join(' ')}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 ${meta.tint}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="font-bold text-sm">{meta.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{meta.desc}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Níveis */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Níveis</p>
            <Layers className="w-4 h-4 text-muted-foreground" />
          </div>
          {loadingLevels ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando…
            </div>
          ) : levels.length === 0 ? (
            <Card className="p-6 rounded-2xl text-center text-sm text-muted-foreground">
              Nenhum nível disponível ainda.
            </Card>
          ) : (
            <div className="space-y-3">
              {levels.map(lvl => (
                <button
                  key={lvl.id}
                  onClick={() => startLevel(lvl)}
                  className="w-full text-left"
                >
                  <Card className="p-4 rounded-2xl border-border hover:border-primary/50 hover:shadow-soft transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-bold text-sm truncate">{lvl.name}</p>
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5">{lvl.shape}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{lvl.description}</p>
                        {lvl.best?.best_score ? (
                          <div className="flex items-center gap-1 mt-1 text-[11px] text-accent-foreground">
                            <Trophy className="w-3 h-3 text-accent" />
                            <span className="font-medium">{lvl.best.best_score} pts</span>
                            {lvl.best.best_time ? <span className="text-muted-foreground">· {lvl.best.best_time}s</span> : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={`w-1 h-4 rounded-full ${i < (lvl.difficulty || 1) ? 'bg-primary' : 'bg-muted'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // ============ PLAY ============
  return (
    <div className="space-y-4 animate-fade-in pb-8">
      <header className="flex items-center gap-2">
        <button
          onClick={backToLobby}
          className="w-10 h-10 rounded-2xl bg-card border border-border flex items-center justify-center"
          aria-label="Sair"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-heading font-bold text-base truncate">{level?.name}</p>
          <p className="text-[11px] text-muted-foreground">{MODE_META[mode].label} · {remaining} peças</p>
        </div>
        <button
          onClick={restart}
          className="w-10 h-10 rounded-2xl bg-card border border-border flex items-center justify-center"
          aria-label="Reiniciar"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </header>

      {/* HUD */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 rounded-2xl text-center">
          <Trophy className="w-4 h-4 text-accent mx-auto mb-1" />
          <p className="font-heading font-bold text-lg leading-none">{score}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Pontos</p>
        </Card>
        <Card className="p-3 rounded-2xl text-center">
          <Sparkles className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="font-heading font-bold text-lg leading-none">{correct}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Acertos</p>
        </Card>
        <Card className="p-3 rounded-2xl text-center">
          <Timer className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
          <p className="font-heading font-bold text-lg leading-none">{seconds}s</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Tempo</p>
        </Card>
      </div>

      {/* Tabuleiro */}
      <Card className="p-4 rounded-3xl bg-gradient-to-br from-secondary to-muted/40 border-border overflow-auto">
        <div
          className="relative mx-auto"
          style={{ width: board.w, height: board.h, minWidth: board.w }}
        >
          {pieces.map(p => (
            <TileCard
              key={p.piece_id}
              piece={p}
              free={isPieceFree(p, pieces)}
              selected={selected?.piece_id === p.piece_id}
              onClick={() => handlePieceClick(p)}
              matchEffect={matchingIds.includes(p.piece_id)}
            />
          ))}
        </div>
      </Card>

      {/* Feedback */}
      {feedback && (
        <Card
          className={[
            'p-4 rounded-2xl border-2 animate-bounce-in',
            feedback.ok
              ? 'border-success bg-success/10'
              : 'border-destructive bg-destructive/10',
          ].join(' ')}
        >
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              feedback.ok ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'
            }`}>
              {feedback.ok ? <Sparkles className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              {feedback.ok && feedback.level && (
                <Badge className="mb-1.5 bg-accent text-accent-foreground border-0">
                  Nível {feedback.level} · combinação {feedback.level === 1 ? 'idêntica' : feedback.level === 2 ? 'tradução' : 'simbólica'}
                </Badge>
              )}
              <p className="text-sm leading-snug">{feedback.explanation}</p>
              {mode === 'study' && feedback.ok && (
                <Button
                  size="sm"
                  className="mt-2 rounded-xl"
                  onClick={() => setFeedback(null)}
                >
                  Continuar
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Vitória */}
      {completed && (
        <Card className="p-6 rounded-3xl border-0 bg-devotional-gradient text-primary-foreground shadow-soft text-center space-y-3">
          <Trophy className="w-12 h-12 text-accent mx-auto" />
          <h3 className="font-heading text-xl font-bold">Tabuleiro completo!</h3>
          <p className="text-sm opacity-90">
            {score} pts · {correct} acertos · {seconds}s
          </p>
          <div className="flex gap-2 justify-center pt-2">
            <Button onClick={restart} variant="secondary" className="rounded-xl">
              <RotateCcw className="w-4 h-4 mr-2" /> Jogar novamente
            </Button>
            <Button onClick={backToLobby} className="rounded-xl bg-accent text-accent-foreground hover:bg-accent/90">
              Outros níveis
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

export default MahjongPage;
