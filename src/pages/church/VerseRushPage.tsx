import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';
import {
  Zap, Trophy, Flame, Timer, Sparkles, ArrowLeft, Users, Bot,
  Crown, Copy, Loader2, CheckCircle2, XCircle, Star, Medal, History,
} from 'lucide-react';

// ============== TIPOS ==============
type Screen = 'lobby' | 'online-create' | 'online-join' | 'online-waiting' | 'playing' | 'result';
type Mode = 'solo' | 'online';

interface Verse {
  id: string;
  reference: string;
  text: string;
  word_count: number;
  difficulty: string;
  explanation: string | null;
}

interface RushPlayer {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  score: number;
  combo: number;
  max_combo: number;
  correct_taps: number;
  wrong_taps: number;
  rounds_completed: number;
  placement: number | null;
  xp_earned: number;
  points_earned: number;
}

interface Room {
  id: string;
  mode: Mode;
  status: string;
  rounds: number;
  invite_code: string | null;
  created_by: string;
}

interface HistoryRow {
  id: string;
  mode: string;
  rounds: number;
  score: number;
  placement: number;
  xp_earned: number;
  points_earned: number;
  max_combo: number;
  correct_taps: number;
  wrong_taps: number;
}

// ============== UTIL ==============
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const clean = (w: string) => w.replace(/[.,;:!?"'()]/g, '').toLowerCase();

// ============== SOM (WebAudio leve) ==============
let audioCtx: AudioContext | null = null;
function beep(freq: number, dur = 0.08, type: OscillatorType = 'sine', vol = 0.08) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.stop(ctx.currentTime + dur);
  } catch {}
}
const sndCorrect = () => beep(880, 0.09, 'triangle', 0.1);
const sndWrong = () => beep(180, 0.18, 'sawtooth', 0.07);
const sndCombo = (n: number) => beep(660 + n * 90, 0.12, 'square', 0.08);
const sndWin = () => { beep(660, 0.1, 'triangle'); setTimeout(() => beep(880, 0.1, 'triangle'), 90); setTimeout(() => beep(1175, 0.18, 'triangle'), 180); };
const sndUrgent = () => beep(440, 0.06, 'square', 0.05);

// ============== PÁGINA ==============
export default function VerseRushPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>('lobby');
  const [mode, setMode] = useState<Mode>('solo');
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RushPlayer[]>([]);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [rounds] = useState(5);
  const [inviteInput, setInviteInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // gameplay state
  const [roundIdx, setRoundIdx] = useState(0);
  const [targetWords, setTargetWords] = useState<string[]>([]);
  const [poolWords, setPoolWords] = useState<{ id: number; word: string; used: boolean }[]>([]);
  const [assembled, setAssembled] = useState<{ id: number; word: string }[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correctTaps, setCorrectTaps] = useState(0);
  const [wrongTaps, setWrongTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [roundDuration, setRoundDuration] = useState(20);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);
  const [showVerseDone, setShowVerseDone] = useState(false);

  const startMs = useRef(0);
  const totalMsRef = useRef(0);
  const tickRef = useRef<number | null>(null);
  const pollRef = useRef<number | null>(null);

  // ========== LOBBY ==========
  const loadHistory = useCallback(async () => {
    try {
      const h = await api.get<HistoryRow[]>('/api/church/verse-rush/history');
      setHistory(h);
    } catch {}
  }, []);

  useEffect(() => { if (screen === 'lobby') loadHistory(); }, [screen, loadHistory]);

  // ========== INICIAR PARTIDA (carrega versos para os state) ==========
  const initGame = useCallback((vs: Verse[], r: Room) => {
    setVerses(vs);
    setRoom(r);
    setRoundIdx(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setCorrectTaps(0);
    setWrongTaps(0);
    totalMsRef.current = 0;
    setScreen('playing');
    loadVerse(vs[0]);
  }, []);

  const loadVerse = (v: Verse) => {
    const words = v.text.split(/\s+/).filter(Boolean);
    const dur = words.length <= 8 ? 18 : words.length <= 14 ? 22 : 28;
    setRoundDuration(dur);
    setTimeLeft(dur);
    setTargetWords(words);
    setAssembled([]);
    setCurrentIdx(0);
    setShowVerseDone(false);
    const pool = shuffle(words.map((w, i) => ({ id: i, word: w, used: false })));
    setPoolWords(pool);
    startMs.current = performance.now();
  };

  // ========== TIMER ==========
  useEffect(() => {
    if (screen !== 'playing') return;
    if (showVerseDone) return;
    if (tickRef.current) cancelAnimationFrame(tickRef.current);
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTimeLeft(t => {
        const nt = Math.max(0, t - dt);
        if (nt <= 5 && Math.floor(nt) !== Math.floor(t)) sndUrgent();
        if (nt === 0 && t > 0) {
          // tempo acabou
          handleRoundEnd(false);
        }
        return nt;
      });
      tickRef.current = requestAnimationFrame(loop);
    };
    tickRef.current = requestAnimationFrame(loop);
    return () => { if (tickRef.current) cancelAnimationFrame(tickRef.current); };
    // eslint-disable-next-line
  }, [screen, roundIdx, showVerseDone]);

  // ========== POLL DE ADVERSÁRIOS (online) ==========
  useEffect(() => {
    if (screen !== 'playing' || mode !== 'online' || !room) return;
    const sync = async () => {
      try {
        await api.post(`/api/church/verse-rush/online/${room.id}/progress`, {
          score, combo, max_combo: maxCombo, correct_taps: correctTaps, wrong_taps: wrongTaps,
          rounds_completed: roundIdx,
        });
        const r = await api.get<{ players: RushPlayer[] }>(`/api/church/verse-rush/online/${room.id}`);
        setPlayers(r.players);
      } catch {}
    };
    pollRef.current = window.setInterval(sync, 1500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [screen, mode, room, score, combo, maxCombo, correctTaps, wrongTaps, roundIdx]);

  // ========== TAP NA PALAVRA ==========
  const tapWord = (id: number) => {
    if (showVerseDone) return;
    const item = poolWords.find(p => p.id === id);
    if (!item || item.used) return;
    const expected = targetWords[currentIdx];
    if (clean(item.word) === clean(expected)) {
      // ACERTO
      sndCorrect();
      setCorrectTaps(n => n + 1);
      setCombo(c => {
        const nc = c + 1;
        setMaxCombo(m => Math.max(m, nc));
        if (nc >= 3) sndCombo(nc);
        return nc;
      });
      const mult = combo + 1 >= 3 ? 3 : combo + 1 >= 2 ? 2 : 1;
      const gain = Math.round(20 * mult);
      setScore(s => s + gain);
      setAssembled(a => [...a, item]);
      setPoolWords(arr => arr.map(p => p.id === id ? { ...p, used: true } : p));
      setFlash('correct');
      setTimeout(() => setFlash(null), 180);
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      if (nextIdx >= targetWords.length) {
        // versículo concluído
        const elapsed = performance.now() - startMs.current;
        totalMsRef.current += elapsed;
        const speedBonus = Math.max(0, Math.round((timeLeft / roundDuration) * 80));
        setScore(s => s + speedBonus);
        setShowVerseDone(true);
      }
    } else {
      // ERRO
      sndWrong();
      setWrongTaps(n => n + 1);
      setCombo(0);
      setScore(s => Math.max(0, s - 5));
      setFlash('wrong');
      setShake(true);
      if (navigator.vibrate) navigator.vibrate(60);
      setTimeout(() => setFlash(null), 180);
      setTimeout(() => setShake(false), 250);
    }
  };

  // ========== FIM DE RODADA ==========
  const handleRoundEnd = (success: boolean) => {
    if (!success) totalMsRef.current += roundDuration * 1000;
    const next = roundIdx + 1;
    if (next >= verses.length) {
      finishGame();
    } else {
      setRoundIdx(next);
      loadVerse(verses[next]);
    }
  };

  const nextRound = () => handleRoundEnd(true);

  // ========== FINALIZAR ==========
  const finishGame = async () => {
    if (!room) return;
    sndWin();
    try {
      const res = await api.post<{ players: RushPlayer[]; xp_earned: number; points_earned: number; placement: number }>(
        `/api/church/verse-rush/${room.id}/finish`,
        {
          score, max_combo: maxCombo, correct_taps: correctTaps, wrong_taps: wrongTaps,
          rounds_completed: roundIdx + 1, total_time_ms: Math.round(totalMsRef.current),
        }
      );
      setPlayers(res.players);
      setScreen('result');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao finalizar');
    }
  };

  // ========== HANDLERS LOBBY ==========
  const startSolo = async () => {
    setCreating(true);
    try {
      const res = await api.post<{ room: Room; player: RushPlayer; verses: Verse[] }>(
        '/api/church/verse-rush/solo/start', { rounds }
      );
      setMode('solo');
      setPlayers([res.player]);
      initGame(res.verses, res.room);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar');
    } finally { setCreating(false); }
  };

  const createOnline = async () => {
    setCreating(true);
    try {
      const res = await api.post<{ room: Room }>('/api/church/verse-rush/online/create', { rounds });
      setMode('online');
      setRoom(res.room);
      setScreen('online-waiting');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar sala');
    } finally { setCreating(false); }
  };

  const joinOnline = async () => {
    if (!inviteInput.trim()) return;
    setCreating(true);
    try {
      const res = await api.post<{ room: Room }>('/api/church/verse-rush/online/join', { invite_code: inviteInput.trim() });
      setMode('online');
      setRoom(res.room);
      setScreen('online-waiting');
    } catch (err: any) {
      toast.error(err.message || 'Sala não encontrada');
    } finally { setCreating(false); }
  };

  // poll waiting room
  useEffect(() => {
    if (screen !== 'online-waiting' || !room) return;
    const tick = async () => {
      try {
        const r = await api.get<{ room: Room; players: RushPlayer[] }>(`/api/church/verse-rush/online/${room.id}`);
        setPlayers(r.players);
        if (r.room.status === 'playing' && verses.length === 0) {
          // outro jogador iniciou? só host inicia, então isto basicamente não roda. Mantém defensivo.
        }
      } catch {}
    };
    tick();
    const id = window.setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [screen, room, verses.length]);

  const startOnlineMatch = async () => {
    if (!room) return;
    setCreating(true);
    try {
      const res = await api.post<{ verses: Verse[] }>(`/api/church/verse-rush/online/${room.id}/start`, {});
      initGame(res.verses, room);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar partida');
    } finally { setCreating(false); }
  };

  const copyInvite = () => {
    if (room?.invite_code) {
      navigator.clipboard.writeText(room.invite_code);
      toast.success('Código copiado!');
    }
  };

  const exitGame = () => {
    if (tickRef.current) cancelAnimationFrame(tickRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
    setScreen('lobby');
    setRoom(null);
    setPlayers([]);
    setVerses([]);
  };

  // ============== RENDER ==============

  const comboMultiplier = combo >= 3 ? 3 : combo >= 2 ? 2 : 1;
  const focusMode = combo >= 3;
  const urgent = timeLeft <= 5;

  // ===== TELA LOBBY =====
  if (screen === 'lobby') {
    return (
      <div className="min-h-full" style={{
        background: 'linear-gradient(135deg, hsl(265 85% 12%) 0%, hsl(225 80% 14%) 50%, hsl(330 70% 16%) 100%)',
      }}>
        <div className="px-4 pt-6 pb-24 max-w-lg mx-auto text-white">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white/10 backdrop-blur">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight" style={{
                backgroundImage: 'linear-gradient(90deg, #fbbf24, #ec4899, #8b5cf6)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>Versículo Rush</h1>
              <p className="text-xs text-white/60">Monte versículos no toque · rápido e viciante</p>
            </div>
          </div>

          {/* Hero */}
          <Card className="p-5 rounded-3xl border-0 mb-5 relative overflow-hidden" style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.35), rgba(236,72,153,0.25), rgba(251,191,36,0.2))',
            boxShadow: '0 20px 60px -20px rgba(139,92,246,0.6)',
          }}>
            <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-yellow-400/20 blur-3xl" />
            <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full bg-pink-500/20 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-yellow-300" />
                <span className="text-xs font-bold uppercase tracking-wider text-yellow-200">Modo Rush</span>
              </div>
              <p className="text-sm text-white/90 leading-relaxed">
                Toque nas palavras embaralhadas <b>na ordem certa</b>. Combo aumenta a pontuação.
                Sobreviva ao tempo!
              </p>
            </div>
          </Card>

          {/* Modos */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <button onClick={startSolo} disabled={creating} className="text-left">
              <Card className="p-4 rounded-2xl border-0 h-full" style={{
                background: 'linear-gradient(135deg, #1e3a8a, #06b6d4)',
                boxShadow: '0 12px 30px -10px rgba(6,182,212,0.6)',
              }}>
                <Bot className="w-6 h-6 text-cyan-200 mb-2" />
                <p className="font-heading font-bold text-white text-base">Solo</p>
                <p className="text-[11px] text-white/70 mt-0.5">Treino infinito</p>
                {creating && <Loader2 className="w-4 h-4 animate-spin mt-2 text-white" />}
              </Card>
            </button>
            <button onClick={() => setScreen('online-create')} className="text-left">
              <Card className="p-4 rounded-2xl border-0 h-full" style={{
                background: 'linear-gradient(135deg, #831843, #db2777)',
                boxShadow: '0 12px 30px -10px rgba(219,39,119,0.6)',
              }}>
                <Users className="w-6 h-6 text-pink-200 mb-2" />
                <p className="font-heading font-bold text-white text-base">Desafio Online</p>
                <p className="text-[11px] text-white/70 mt-0.5">Desafie um oponente</p>
              </Card>
            </button>
          </div>

          {/* Como joga */}
          <Card className="p-4 rounded-2xl border-0 mb-5 bg-white/5 backdrop-blur">
            <h3 className="font-heading font-bold text-sm mb-2 text-yellow-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Como funciona
            </h3>
            <ul className="text-xs text-white/80 space-y-1.5">
              <li>👆 Toque nas palavras na ordem correta do versículo</li>
              <li>🔥 Combo x2 e x3 multiplicam pontos (modo foco)</li>
              <li>⚡ Tempo apertado: respostas rápidas valem mais</li>
              <li>🏆 Pontos e XP entram no seu ranking da igreja</li>
            </ul>
          </Card>

          {/* Histórico */}
          <button
            onClick={() => setShowHistory(s => !s)}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/5 backdrop-blur text-white/80 hover:bg-white/10 transition mb-3"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <History className="w-4 h-4" /> Suas últimas partidas
            </span>
            <span className="text-xs text-white/50">{history.length}</span>
          </button>
          {showHistory && history.length > 0 && (
            <div className="space-y-2">
              {history.slice(0, 8).map(h => (
                <Card key={h.id} className="p-3 rounded-xl border-0 bg-white/5 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold">
                        {h.mode === 'online' ? '⚔️ Desafio Online' : '🎯 Solo'} · {h.score} pts
                      </p>
                      <p className="text-[11px] text-white/50">
                        Combo máx x{h.max_combo} · {h.correct_taps} acertos · {h.wrong_taps} erros
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-yellow-300 font-bold">+{h.xp_earned} XP</p>
                      <p className="text-[10px] text-white/50">{h.points_earned} pts</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== TELA CRIAR/JOIN ONLINE =====
  if (screen === 'online-create') {
    return (
      <div className="min-h-full" style={{
        background: 'linear-gradient(135deg, hsl(265 85% 12%) 0%, hsl(225 80% 14%) 50%, hsl(330 70% 16%) 100%)',
      }}>
        <div className="px-4 pt-6 pb-24 max-w-lg mx-auto text-white">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setScreen('lobby')} className="p-2 rounded-xl bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-heading text-xl font-bold">Desafio Online</h1>
          </div>

          <Card className="p-5 rounded-2xl border-0 mb-4" style={{
            background: 'linear-gradient(135deg, #831843, #db2777)',
          }}>
            <Users className="w-7 h-7 text-pink-100 mb-2" />
            <p className="font-heading font-bold text-lg mb-1">Criar nova sala</p>
            <p className="text-xs text-white/80 mb-4">Convide amigos com um código</p>
            <Button onClick={createOnline} disabled={creating} className="w-full rounded-xl bg-white text-pink-700 hover:bg-white/90 font-bold">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar sala'}
            </Button>
          </Card>

          <Card className="p-5 rounded-2xl border-0" style={{
            background: 'linear-gradient(135deg, #1e3a8a, #6366f1)',
          }}>
            <p className="font-heading font-bold text-lg mb-1">Entrar com código</p>
            <p className="text-xs text-white/80 mb-3">Use o convite recebido</p>
            <div className="flex gap-2">
              <Input
                value={inviteInput}
                onChange={e => setInviteInput(e.target.value.toUpperCase())}
                placeholder="CÓDIGO"
                maxLength={8}
                className="rounded-xl bg-white/20 border-white/30 text-white placeholder:text-white/50 font-mono text-center font-bold tracking-wider"
              />
              <Button onClick={joinOnline} disabled={creating || !inviteInput.trim()} className="rounded-xl bg-white text-indigo-700 hover:bg-white/90 font-bold">
                Entrar
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ===== TELA ESPERA ONLINE =====
  if (screen === 'online-waiting' && room) {
    const isHost = room.created_by === user?.id;
    return (
      <div className="min-h-full" style={{
        background: 'linear-gradient(135deg, hsl(265 85% 12%) 0%, hsl(225 80% 14%) 50%, hsl(330 70% 16%) 100%)',
      }}>
        <div className="px-4 pt-6 pb-24 max-w-lg mx-auto text-white">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={exitGame} className="p-2 rounded-xl bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-heading text-xl font-bold">Sala de Desafio</h1>
          </div>

          <Card className="p-5 rounded-3xl border-0 mb-4 text-center" style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.3))',
          }}>
            <p className="text-xs text-white/70 mb-1">Código de convite</p>
            <div className="flex items-center justify-center gap-2">
              <p className="font-heading text-4xl font-black tracking-widest text-yellow-300">{room.invite_code}</p>
              <button onClick={copyInvite} className="p-2 rounded-lg bg-white/10 hover:bg-white/20">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </Card>

          <p className="text-sm text-white/70 mb-2">Jogadores ({players.length})</p>
          <div className="space-y-2 mb-6">
            {players.map(p => (
              <Card key={p.id} className="p-3 rounded-xl border-0 bg-white/5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white font-bold">
                  {p.display_name[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-white">{p.display_name}</p>
                  {p.user_id === room.created_by && <p className="text-[10px] text-yellow-300">⭐ Anfitrião</p>}
                </div>
              </Card>
            ))}
          </div>

          {isHost ? (
            <Button onClick={startOnlineMatch} disabled={creating || players.length < 2} className="w-full rounded-2xl h-12 font-bold text-base" style={{
              background: 'linear-gradient(90deg, #f59e0b, #ec4899, #8b5cf6)', color: 'white',
            }}>
              {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : players.length < 2 ? 'Aguardando jogadores...' : '🚀 Iniciar partida'}
            </Button>
          ) : (
            <p className="text-center text-sm text-white/60 animate-pulse">Aguardando o anfitrião iniciar...</p>
          )}
        </div>
      </div>
    );
  }

  // ===== TELA JOGO =====
  if (screen === 'playing' && verses[roundIdx]) {
    const v = verses[roundIdx];
    const progressPct = (timeLeft / roundDuration) * 100;
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const myRank = sortedPlayers.findIndex(p => p.user_id === user?.id) + 1;

    return (
      <div className={`min-h-full transition-colors ${shake ? 'animate-pulse' : ''}`} style={{
        background: focusMode
          ? 'linear-gradient(135deg, hsl(45 95% 15%) 0%, hsl(330 80% 18%) 50%, hsl(265 85% 18%) 100%)'
          : urgent
          ? 'linear-gradient(135deg, hsl(0 70% 14%) 0%, hsl(20 70% 16%) 100%)'
          : 'linear-gradient(135deg, hsl(265 85% 12%) 0%, hsl(225 80% 14%) 50%, hsl(330 70% 16%) 100%)',
      }}>
        {/* flash overlay */}
        {flash && (
          <div className={`fixed inset-0 pointer-events-none z-40 ${flash === 'correct' ? 'bg-green-400/15' : 'bg-red-500/25'}`} />
        )}
        {focusMode && (
          <div className="fixed inset-0 pointer-events-none z-30" style={{
            boxShadow: 'inset 0 0 120px 40px rgba(251,191,36,0.35)',
          }} />
        )}

        <div className="px-4 pt-4 pb-6 max-w-lg mx-auto text-white relative z-10">
          {/* HUD topo */}
          <div className="flex items-center gap-2 mb-3">
            <button onClick={exitGame} className="p-1.5 rounded-lg bg-white/10">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 flex items-center gap-2">
              <Timer className={`w-4 h-4 ${urgent ? 'text-red-300 animate-pulse' : 'text-cyan-300'}`} />
              <div className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden">
                <div className={`h-full transition-all ${urgent ? 'bg-gradient-to-r from-red-500 to-orange-500 animate-pulse' : 'bg-gradient-to-r from-cyan-400 to-violet-400'}`}
                     style={{ width: `${progressPct}%` }} />
              </div>
              <span className={`text-xs font-mono font-bold ${urgent ? 'text-red-300' : 'text-white/80'}`}>{Math.ceil(timeLeft)}s</span>
            </div>
          </div>

          {/* Combo + Score + Rank */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="p-2.5 rounded-xl text-center" style={{
              background: combo >= 3 ? 'linear-gradient(135deg, #f59e0b, #ec4899)' : 'rgba(255,255,255,0.08)',
            }}>
              <div className="flex items-center justify-center gap-1">
                <Flame className={`w-3.5 h-3.5 ${combo >= 2 ? 'text-yellow-300' : 'text-white/50'}`} />
                <p className="text-xs font-bold">x{comboMultiplier}</p>
              </div>
              <p className="text-[10px] text-white/70">Combo {combo}</p>
            </div>
            <div className="p-2.5 rounded-xl text-center bg-white/8" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <p className="font-mono text-base font-black text-yellow-300">{score}</p>
              <p className="text-[10px] text-white/70">Pontos</p>
            </div>
            <div className="p-2.5 rounded-xl text-center bg-white/8" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <p className="font-bold text-base">{mode === 'online' ? `${myRank || '-'}º` : `${roundIdx + 1}/${verses.length}`}</p>
              <p className="text-[10px] text-white/70">{mode === 'online' ? 'Posição' : 'Rodada'}</p>
            </div>
          </div>

          {/* Adversários (online) */}
          {mode === 'online' && players.length > 1 && (
            <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
              {sortedPlayers.map((p, i) => (
                <div key={p.id} className={`shrink-0 px-2.5 py-1.5 rounded-full text-[11px] font-medium flex items-center gap-1.5 ${
                  p.user_id === user?.id ? 'bg-yellow-300 text-violet-900' : 'bg-white/10 text-white/80'
                }`}>
                  {i === 0 && <Crown className="w-3 h-3" />}
                  <span>{p.display_name.split(' ')[0]}</span>
                  <span className="font-mono font-bold">{p.score}</span>
                </div>
              ))}
            </div>
          )}

          {/* Referência */}
          <p className="text-center text-xs text-white/60 mb-2 font-medium">{v.reference}</p>

          {/* Área de montagem */}
          <Card className="p-4 min-h-[100px] rounded-2xl border-0 mb-5 backdrop-blur" style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)',
          }}>
            {showVerseDone ? (
              <div className="text-center py-2 animate-in fade-in zoom-in duration-300">
                <Sparkles className="w-8 h-8 text-yellow-300 mx-auto mb-2" />
                <p className="text-base font-heading font-bold text-yellow-200 mb-1">Versículo completo! 🎉</p>
                <p className="text-xs text-white/80 leading-relaxed mb-3">{v.text}</p>
                {v.explanation && <p className="text-[11px] italic text-white/60 mb-3">{v.explanation}</p>}
                <Button onClick={nextRound} className="rounded-xl font-bold" style={{
                  background: 'linear-gradient(90deg, #f59e0b, #ec4899)', color: 'white',
                }}>
                  {roundIdx + 1 >= verses.length ? 'Ver resultado' : 'Próximo versículo'} →
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 items-center justify-center">
                {targetWords.map((_, i) => {
                  const a = assembled[i];
                  return a ? (
                    <span key={i} className="px-2.5 py-1.5 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 text-violet-950 text-sm font-bold shadow-lg animate-in zoom-in duration-200">
                      {a.word}
                    </span>
                  ) : (
                    <span key={i} className={`px-2 py-1.5 rounded-lg border border-dashed ${i === currentIdx ? 'border-yellow-300 bg-yellow-300/10 animate-pulse' : 'border-white/20'}`}>
                      <span className="text-xs text-white/30">···</span>
                    </span>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Pool de palavras (TAP) */}
          {!showVerseDone && (
            <div className="flex flex-wrap gap-2 justify-center">
              {poolWords.map(p => (
                <button
                  key={p.id}
                  disabled={p.used}
                  onClick={() => tapWord(p.id)}
                  className={`px-4 py-3 rounded-xl font-bold text-sm transition-all active:scale-90 ${
                    p.used
                      ? 'opacity-20 bg-white/10 text-white/40'
                      : 'text-white shadow-lg hover:scale-105 active:shadow-sm'
                  }`}
                  style={!p.used ? {
                    background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                    boxShadow: '0 6px 20px -6px rgba(236,72,153,0.6)',
                  } : undefined}
                >
                  {p.word}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== TELA RESULTADO =====
  if (screen === 'result') {
    const me = players.find(p => p.user_id === user?.id);
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const won = sortedPlayers[0]?.user_id === user?.id;

    return (
      <div className="min-h-full" style={{
        background: 'linear-gradient(135deg, hsl(265 85% 12%) 0%, hsl(225 80% 14%) 50%, hsl(330 70% 16%) 100%)',
      }}>
        <div className="px-4 pt-8 pb-24 max-w-lg mx-auto text-white">
          <div className="text-center mb-6 animate-in fade-in zoom-in duration-500">
            {won ? (
              <>
                <Crown className="w-16 h-16 text-yellow-300 mx-auto mb-2 drop-shadow-lg" />
                <h1 className="font-heading text-3xl font-black mb-1" style={{
                  backgroundImage: 'linear-gradient(90deg, #fbbf24, #ec4899)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>VITÓRIA!</h1>
              </>
            ) : (
              <>
                <Medal className="w-16 h-16 text-cyan-300 mx-auto mb-2" />
                <h1 className="font-heading text-3xl font-black mb-1">Boa partida!</h1>
              </>
            )}
            <p className="text-sm text-white/70">Você ficou em <b className="text-yellow-300">{me?.placement}º lugar</b></p>
          </div>

          {/* Recompensas */}
          <Card className="p-5 rounded-3xl border-0 mb-5" style={{
            background: 'linear-gradient(135deg, rgba(251,191,36,0.25), rgba(236,72,153,0.2))',
          }}>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <Star className="w-6 h-6 text-yellow-300 mx-auto mb-1" />
                <p className="font-mono text-2xl font-black text-yellow-200">+{me?.xp_earned ?? 0}</p>
                <p className="text-xs text-white/70">XP ganho</p>
              </div>
              <div>
                <Trophy className="w-6 h-6 text-pink-300 mx-auto mb-1" />
                <p className="font-mono text-2xl font-black text-pink-200">+{me?.points_earned ?? 0}</p>
                <p className="text-xs text-white/70">Pontos</p>
              </div>
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="p-3 rounded-xl bg-white/5 text-center">
              <p className="font-mono text-lg font-bold">{me?.score ?? 0}</p>
              <p className="text-[10px] text-white/60">Pontuação</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 text-center">
              <p className="font-mono text-lg font-bold text-yellow-300">x{me?.max_combo ?? 0}</p>
              <p className="text-[10px] text-white/60">Combo máx</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 text-center">
              <p className="font-mono text-lg font-bold">
                {me ? `${me.correct_taps}/${me.correct_taps + me.wrong_taps}` : '0/0'}
              </p>
              <p className="text-[10px] text-white/60">Acertos</p>
            </div>
          </div>

          {/* Ranking final */}
          {sortedPlayers.length > 1 && (
            <>
              <p className="text-sm font-bold mb-2 text-white/80">Classificação</p>
              <div className="space-y-2 mb-6">
                {sortedPlayers.map((p, i) => (
                  <Card key={p.id} className={`p-3 rounded-xl border-0 flex items-center gap-3 ${
                    p.user_id === user?.id ? 'bg-yellow-300/15' : 'bg-white/5'
                  }`}>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                      i === 0 ? 'bg-yellow-300 text-violet-900' :
                      i === 1 ? 'bg-gray-300 text-gray-900' :
                      i === 2 ? 'bg-orange-400 text-white' : 'bg-white/10 text-white'
                    }`}>{i + 1}</span>
                    <span className="flex-1 text-sm text-white">{p.display_name}</span>
                    <span className="font-mono font-bold text-yellow-300">{p.score}</span>
                  </Card>
                ))}
              </div>
            </>
          )}

          <div className="flex gap-2">
            <Button onClick={exitGame} variant="outline" className="flex-1 rounded-xl border-white/30 bg-white/5 text-white hover:bg-white/10">
              Sair
            </Button>
            <Button onClick={() => { exitGame(); setTimeout(() => startSolo(), 100); }} className="flex-1 rounded-xl font-bold" style={{
              background: 'linear-gradient(90deg, #f59e0b, #ec4899, #8b5cf6)', color: 'white',
            }}>
              Jogar de novo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
