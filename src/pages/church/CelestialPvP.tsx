import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Shield, Cloud, Wind, Star, RotateCcw, Target, Users, Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================
// BATALHA CELESTIAL — PvP assíncrono via banco (poll 2s)
// ============================================================

const BOARD = 10;
const POLL_MS = 2000;

const UNIT_META: Record<string, { name: string; emoji: string; size: number }> = {
  arca:       { name: 'Arca da Aliança',        emoji: '📜', size: 5 },
  salomao:    { name: 'Navio de Salomão',       emoji: '⛵', size: 4 },
  discipulos: { name: 'Barco dos Discípulos',   emoji: '🚣', size: 3 },
  carruagem:  { name: 'Carruagem de Fogo',      emoji: '🔥', size: 3 },
  torre:      { name: 'Torre de Vigia',         emoji: '🗼', size: 2 },
  muralha:    { name: 'Muralha de Jericó',      emoji: '🧱', size: 2 },
  tribos:     { name: 'Acampamento das Tribos', emoji: '⛺', size: 1 },
};

const CARD_META: Record<string, { name: string; desc: string; icon: typeof Sparkles; needsTarget: boolean }> = {
  mar:     { name: 'Abertura do Mar Vermelho', desc: 'Revela uma linha inteira',          icon: Wind,     needsTarget: true },
  estrela: { name: 'Estrela Guia',              desc: 'Revela área 3×3',                    icon: Star,     needsTarget: true },
  salmo:   { name: 'Proteção do Salmo 91',     desc: 'Bloqueia próximo ataque inimigo',    icon: Shield,   needsTarget: false },
  mana:    { name: 'Chuva de Maná',             desc: 'Próximo tiro vira tiro em cruz',     icon: Cloud,    needsTarget: false },
};

// --- Backend types ---
interface BackendUnit { key: string; size: number; cells: number[]; hits: number[]; hp: number; sunk: boolean; dodged?: boolean; }
interface BackendShot { idx: number; state: 'miss' | 'hit' | 'sunk' | 'revealed'; unit_key?: string; }
interface BackendReveal { idx: number; unit_key?: string; }
interface BackendCard { key: string; uses: number; }

interface RoomView {
  room: { id: string; invite_code: string; status: 'waiting' | 'playing' | 'finished'; turn_user_id: string | null; winner_user_id: string | null; created_by: string; };
  me: { user_id: string; display_name: string; avatar_url: string | null; units: BackendUnit[]; shots: BackendShot[]; reveals: BackendReveal[]; cards: BackendCard[]; psalm_shield: boolean; mana_boost: boolean; score: number; };
  opponent: { user_id: string; display_name: string; avatar_url: string | null; sunk_units: { key: string; cells: number[] }[]; shots: BackendShot[]; score: number; remaining: number; } | null;
}

// ============================================================
// LOBBY
// ============================================================

export function CelestialLobby({ onEnter }: { onEnter: (roomId: string) => void }) {
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const create = async () => {
    try {
      setCreating(true);
      const r = await api.post<{ room_id: string; invite_code: string }>('/api/church/celestial/create', {});
      toast.success(`Sala criada — código ${r.invite_code}`);
      onEnter(r.room_id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar sala');
    } finally { setCreating(false); }
  };

  const join = async () => {
    if (!joinCode.trim()) return;
    try {
      setJoining(true);
      const r = await api.post<{ room_id: string }>('/api/church/celestial/join', { invite_code: joinCode.trim() });
      onEnter(r.room_id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao entrar na sala');
    } finally { setJoining(false); }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={create}
        disabled={creating}
        className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-bold shadow-lg hover:scale-[1.02] transition"
      >
        {creating ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Users className="w-5 h-5 mr-2" />}
        Criar sala (vs amigo)
      </Button>
      <div className="rounded-2xl bg-white/5 border border-white/10 p-3 space-y-2">
        <div className="text-[10px] uppercase tracking-widest font-bold text-white/60">Entrar com código</div>
        <div className="flex gap-2">
          <Input
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 uppercase tracking-widest font-mono"
            maxLength={8}
          />
          <Button
            onClick={join}
            disabled={joining || !joinCode.trim()}
            className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold"
          >
            {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PvP GAME (polling)
// ============================================================

export function CelestialPvPGame({ roomId, onExit }: { roomId: string; onExit: () => void }) {
  const { user } = useAuth();
  const [view, setView] = useState<RoomView | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [copied, setCopied] = useState(false);
  const lastTurnRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const v = await api.get<RoomView>(`/api/church/celestial/room/${roomId}`);
      setView(v);
      // Toast on turn change
      if (lastTurnRef.current && lastTurnRef.current !== v.room.turn_user_id && v.room.status === 'playing') {
        if (v.room.turn_user_id === v.me.user_id) toast.success('⚔️ Sua vez!');
      }
      lastTurnRef.current = v.room.turn_user_id;
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }, [roomId]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // ----- Build cell grids -----
  const enemyCells = useMemo(() => {
    if (!view) return Array(100).fill({ state: 'unknown' as const });
    const g = Array.from({ length: 100 }, () => ({ state: 'unknown' as const, unitKey: undefined as string | undefined }));
    // reveals
    view.me.reveals.forEach(r => {
      g[r.idx] = r.unit_key
        ? { state: 'revealed' as any, unitKey: r.unit_key }
        : { state: 'revealed' as any, unitKey: undefined };
    });
    // sunk units (full visibility once down)
    view.opponent?.sunk_units.forEach(u => {
      u.cells.forEach(c => { g[c] = { state: 'sunk' as any, unitKey: u.key }; });
    });
    // my shots
    view.me.shots.forEach(s => {
      g[s.idx] = { state: s.state as any, unitKey: s.unit_key };
    });
    return g;
  }, [view]);

  const myCells = useMemo(() => {
    if (!view) return [];
    const g = Array.from({ length: 100 }, () => ({ state: 'unknown' as const, unitKey: undefined as string | undefined }));
    // My units
    view.me.units.forEach(u => {
      u.cells.forEach(c => {
        const wasHit = u.hits.includes(c);
        if (u.sunk) g[c] = { state: 'sunk' as any, unitKey: u.key };
        else if (wasHit) g[c] = { state: 'hit' as any, unitKey: u.key };
        else g[c] = { state: 'own' as any, unitKey: u.key };
      });
    });
    // Opponent shots
    view.opponent?.shots.forEach(s => {
      // Don't override hit/sunk on units; only mark misses on empty water
      if (g[s.idx].state === 'unknown' && s.state === 'miss') g[s.idx] = { state: 'miss' as any, unitKey: undefined };
    });
    return g;
  }, [view]);

  // ----- Actions -----
  const isMyTurn = view?.room.status === 'playing' && view?.room.turn_user_id === view?.me.user_id;

  const shoot = async (idx: number) => {
    if (!view || !isMyTurn || acting) return;
    if (activeCard) return; // prevent shooting while a targeting card is selected
    const existing = view.me.shots.find(s => s.idx === idx);
    if (existing && existing.state !== 'revealed') return;
    setActing(true);
    try {
      const v = await api.post<RoomView>(`/api/church/celestial/room/${roomId}/shoot`, { cells: [idx] });
      setView(v);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro');
    } finally { setActing(false); }
  };

  const playCard = async (key: string, targetIdx?: number) => {
    if (!view || !isMyTurn || acting) return;
    setActing(true);
    try {
      const v = await api.post<RoomView>(`/api/church/celestial/room/${roomId}/card`, { key, target_idx: targetIdx });
      setView(v);
      setActiveCard(null);
      toast.success('Milagre invocado!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro');
    } finally { setActing(false); }
  };

  const handleCardClick = (key: string) => {
    if (!isMyTurn) return;
    const meta = CARD_META[key];
    if (!meta) return;
    if (meta.needsTarget) {
      setActiveCard(activeCard === key ? null : key);
    } else {
      playCard(key);
    }
  };

  const handleEnemyCellClick = (idx: number) => {
    if (activeCard) {
      playCard(activeCard, idx);
      return;
    }
    shoot(idx);
  };

  const forfeit = async () => {
    if (!confirm('Desistir da partida?')) return;
    try {
      await api.post(`/api/church/celestial/room/${roomId}/forfeit`, {});
      onExit();
    } catch {}
  };

  const copyCode = () => {
    if (!view) return;
    navigator.clipboard.writeText(view.room.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading || !view) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(220_45%_8%)] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  // ----- WAITING ROOM -----
  if (view.room.status === 'waiting') {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,hsl(var(--accent)/0.2),transparent_60%),hsl(220_45%_8%)] text-white">
        <div className="max-w-md mx-auto px-6 py-6">
          <button onClick={onExit} className="flex items-center gap-2 text-white/70 text-sm hover:text-white mb-6">
            <ArrowLeft className="w-4 h-4" /> Sair da sala
          </button>
          <div className="text-center mt-12">
            <div className="text-6xl mb-4 animate-pulse">🕊️</div>
            <h2 className="text-2xl font-black mb-2">Aguardando oponente</h2>
            <p className="text-sm text-white/60 mb-8">Compartilhe o código abaixo com outro membro da igreja:</p>

            <button
              onClick={copyCode}
              className="w-full rounded-2xl bg-gradient-to-br from-accent/30 to-accent/10 border-2 border-accent/50 p-6 hover:border-accent transition group"
            >
              <div className="text-[10px] uppercase tracking-[0.4em] text-accent/80 mb-2">Código da sala</div>
              <div className="text-5xl font-black tracking-[0.3em] text-accent font-mono">{view.room.invite_code}</div>
              <div className="text-xs text-white/50 mt-3 flex items-center justify-center gap-1.5">
                {copied ? <><Check className="w-3.5 h-3.5" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Toque para copiar</>}
              </div>
            </button>

            <div className="mt-6 text-xs text-white/50">
              Sua frota já está posicionada. A batalha começa quando o oponente entrar.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----- GAME / GAMEOVER -----
  const won = view.room.status === 'finished' && view.room.winner_user_id === view.me.user_id;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.18),transparent_60%),radial-gradient(ellipse_at_bottom,hsl(var(--accent)/0.12),transparent_55%),hsl(220_45%_8%)] text-white">
      <div className="sticky top-0 z-20 backdrop-blur-md bg-black/30 border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <button onClick={onExit} className="flex items-center gap-2 text-white/80 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-semibold">Sair</span>
          </button>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-[0.25em] text-accent/90 font-bold">PvP • {view.room.invite_code}</div>
            <div className="text-xs text-white/60 mt-0.5">
              {view.room.status === 'finished'
                ? (won ? '🏆 Vitória!' : '🕊️ Derrota')
                : isMyTurn ? '⚔️ Sua vez' : `⏳ Vez de ${view.opponent?.display_name || 'oponente'}`}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-white/50">Pontos</div>
            <div className="text-base font-black text-accent">{view.me.score}</div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3 pb-24 pt-4 space-y-5">
        {/* Players header */}
        <div className="grid grid-cols-2 gap-3">
          <PlayerChip name={view.me.display_name} score={view.me.score} active={isMyTurn} self />
          {view.opponent && <PlayerChip name={view.opponent.display_name} score={view.opponent.score} active={view.room.turn_user_id === view.opponent.user_id} />}
        </div>

        {/* ENEMY BOARD */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Target className="w-4 h-4 text-accent" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-white/80">Mar Inimigo</h2>
            <div className="text-[10px] text-white/50 ml-auto">
              Restantes: {view.opponent?.remaining ?? '—'}
            </div>
          </div>
          <Board cells={enemyCells} onCellClick={handleEnemyCellClick} interactive={isMyTurn && view.room.status === 'playing'} highlight={!!activeCard} />
        </div>

        {/* CARDS */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Sparkles className="w-4 h-4 text-accent" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-white/80">Cartas de Milagre</h2>
            {view.me.psalm_shield && <span className="text-[10px] text-accent">🛡️ Salmo ativo</span>}
            {view.me.mana_boost && <span className="text-[10px] text-accent">🍞 Maná pronto</span>}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {view.me.cards.map(c => {
              const meta = CARD_META[c.key];
              if (!meta) return null;
              const Icon = meta.icon;
              const active = activeCard === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => handleCardClick(c.key)}
                  disabled={!isMyTurn || acting}
                  className={cn(
                    'relative rounded-xl p-2.5 text-left transition-all border',
                    'bg-gradient-to-br from-white/[0.08] to-white/[0.02] border-white/10',
                    'hover:border-accent/60 hover:from-accent/20 active:scale-95',
                    active && 'border-accent ring-2 ring-accent/60 from-accent/30 to-accent/10',
                    !isMyTurn && 'opacity-40'
                  )}
                >
                  <Icon className="w-5 h-5 text-accent mb-1" />
                  <div className="text-[10px] font-bold leading-tight">{meta.name}</div>
                  <div className="text-[9px] text-white/50 mt-1 leading-tight">{meta.desc}</div>
                  <div className="absolute top-1 right-1.5 text-[9px] font-black text-accent">×{c.uses}</div>
                </button>
              );
            })}
            {view.me.cards.length === 0 && (
              <div className="col-span-4 text-center text-[11px] text-white/40 py-4">Sem cartas restantes</div>
            )}
          </div>
        </div>

        {/* MY BOARD */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Shield className="w-4 h-4 text-primary-glow" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-white/80">Sua Frota</h2>
            <div className="text-[10px] text-white/50 ml-auto">
              Vivos: {view.me.units.filter(u => !u.sunk).length}/{view.me.units.length}
            </div>
          </div>
          <Board cells={myCells} interactive={false} />
        </div>

        {view.room.status === 'playing' && (
          <button onClick={forfeit} className="w-full text-xs text-white/40 hover:text-red-400 py-2">
            Desistir da partida
          </button>
        )}

        {view.room.status === 'finished' && (
          <div className="rounded-3xl bg-gradient-to-br from-accent/20 to-primary/20 border border-accent/40 p-6 text-center">
            <div className="text-5xl mb-2">{won ? '👑' : '🕊️'}</div>
            <div className="text-[10px] uppercase tracking-[0.4em] text-accent font-bold mb-1">
              {won ? 'Vitória Celestial' : 'Fim da Batalha'}
            </div>
            <h3 className="text-xl font-black mb-1">{won ? 'A glória é sua!' : `${view.opponent?.display_name} venceu`}</h3>
            <p className="text-xs text-white/60 italic mb-4">
              "Tudo posso naquele que me fortalece." — Filipenses 4:13
            </p>
            <Button onClick={onExit} className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold">
              <RotateCcw className="w-4 h-4 mr-2" /> Voltar ao menu
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Shared Board (mirror of solo version, self-contained)
// ============================================================

function PlayerChip({ name, score, active, self }: { name: string; score: number; active: boolean; self?: boolean }) {
  return (
    <div className={cn(
      'rounded-2xl p-3 border flex items-center gap-3',
      active ? 'bg-gradient-to-r from-accent/30 to-accent/5 border-accent ring-2 ring-accent/40' : 'bg-white/5 border-white/10'
    )}>
      <div className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black',
        self ? 'bg-primary text-primary-foreground' : 'bg-white/10'
      )}>
        {name.slice(0,1).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold truncate">{name}</div>
        <div className="text-[10px] text-white/50">{score} pts {self && '(você)'}</div>
      </div>
    </div>
  );
}

interface CellState { state: 'unknown' | 'miss' | 'hit' | 'sunk' | 'revealed' | 'own'; unitKey?: string }

function Board({ cells, onCellClick, interactive, highlight }: {
  cells: CellState[]; onCellClick?: (idx: number) => void; interactive: boolean; highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl p-2 bg-gradient-to-br from-[hsl(220_50%_15%)] to-[hsl(220_60%_8%)] border border-accent/20 shadow-[0_10px_40px_-10px_hsl(var(--accent)/0.3)]">
      <div className="grid gap-[2px] mb-1" style={{ gridTemplateColumns: 'auto repeat(10, minmax(0,1fr))' }}>
        <div />
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="text-[8px] text-center text-accent/60 font-bold">{String.fromCharCode(65 + i)}</div>
        ))}
      </div>
      {Array.from({ length: 10 }, (_, r) => (
        <div key={r} className="grid gap-[2px] mb-[2px]" style={{ gridTemplateColumns: 'auto repeat(10, minmax(0,1fr))' }}>
          <div className="text-[8px] text-accent/60 font-bold flex items-center justify-center">{r + 1}</div>
          {Array.from({ length: 10 }, (_, c) => {
            const idx = r * 10 + c;
            const cell = cells[idx];
            return <CellBtn key={idx} cell={cell} interactive={interactive} highlight={!!highlight} onClick={() => interactive && onCellClick?.(idx)} />;
          })}
        </div>
      ))}
    </div>
  );
}

function CellBtn({ cell, interactive, highlight, onClick }: { cell: CellState; interactive: boolean; highlight: boolean; onClick: () => void }) {
  let content: React.ReactNode = null;
  let bg = 'bg-[hsl(220_50%_22%)]/70';
  let extra = '';

  if (cell.state === 'miss') {
    content = <span className="text-white/50 text-[10px]">·</span>;
    bg = 'bg-[hsl(220_40%_18%)]';
  } else if (cell.state === 'hit') {
    content = <span className="text-base">💥</span>;
    bg = 'bg-gradient-to-br from-orange-500 to-red-600';
    extra = 'animate-pulse';
  } else if (cell.state === 'sunk') {
    const u = cell.unitKey ? UNIT_META[cell.unitKey] : undefined;
    content = <span className="text-sm">{u?.emoji ?? '✖'}</span>;
    bg = 'bg-gradient-to-br from-red-700 to-red-900';
  } else if (cell.state === 'revealed') {
    if (cell.unitKey) {
      const u = UNIT_META[cell.unitKey];
      content = <span className="text-sm opacity-70">{u?.emoji}</span>;
      bg = 'bg-gradient-to-br from-accent/40 to-accent/10 ring-1 ring-accent/50';
    } else {
      content = <span className="text-accent/70 text-[10px]">✦</span>;
      bg = 'bg-accent/10 ring-1 ring-accent/30';
    }
  } else if (cell.state === 'own') {
    const u = cell.unitKey ? UNIT_META[cell.unitKey] : undefined;
    content = <span className="text-sm">{u?.emoji}</span>;
    bg = 'bg-gradient-to-br from-primary/60 to-primary-glow/40 ring-1 ring-primary/50';
  } else if (highlight && interactive) {
    bg = 'bg-accent/20 hover:bg-accent/40';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={cn(
        'aspect-square rounded-[6px] flex items-center justify-center transition-all',
        bg, extra,
        interactive && 'hover:ring-2 hover:ring-accent hover:scale-110 cursor-crosshair active:scale-95',
        !interactive && 'cursor-default',
      )}
    >
      {content}
    </button>
  );
}
