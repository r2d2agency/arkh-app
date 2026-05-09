import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Shield, Eye, Cloud, Wind, Crown, RotateCcw, Sword, Target, Star, Users, HelpCircle, RotateCw, Shuffle, Play, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CelestialLobby, CelestialPvPGame } from './CelestialPvP';

// ============================================================
// BATALHA CELESTIAL — MVP
// Tabuleiro 10x10, PvE vs IA, unidades bíblicas, cartas de milagre
// ============================================================

const BOARD_SIZE = 10;

type Orientation = 'h' | 'v';

interface UnitDef {
  key: string;
  name: string;
  size: number;
  emoji: string;
  passive: string;
}

const UNITS: UnitDef[] = [
  { key: 'arca',       name: 'Arca da Aliança',          size: 5, emoji: '📜', passive: 'Sagrada — sobrevive ao 1º acerto' },
  { key: 'salomao',    name: 'Navio de Salomão',         size: 4, emoji: '⛵', passive: 'Comércio — revela 1 célula ao redor ao ser acertado' },
  { key: 'discipulos', name: 'Barco dos Discípulos',     size: 3, emoji: '🚣', passive: 'Fé — esquiva a 1 ataque (25%)' },
  { key: 'carruagem',  name: 'Carruagem de Fogo',        size: 3, emoji: '🔥', passive: 'Veloz — pequena chance de contra-revelar' },
  { key: 'torre',      name: 'Torre de Vigia',           size: 2, emoji: '🗼', passive: 'Vigília — revela uma pista ao morrer' },
  { key: 'muralha',    name: 'Muralha de Jericó',        size: 2, emoji: '🧱', passive: 'Resistente — exige 3 acertos' },
  { key: 'tribos',     name: 'Acampamento das Tribos',   size: 1, emoji: '⛺', passive: 'Disperso — difícil de localizar' },
];

interface PlacedUnit {
  unit: UnitDef;
  cells: number[]; // indices on board (r*10+c)
  hits: Set<number>;
  hp: number;
  dodged?: boolean;
  sunk: boolean;
}

interface Cell {
  state: 'unknown' | 'miss' | 'hit' | 'sunk' | 'revealed';
  unitKey?: string;
}

interface MiracleCard {
  key: string;
  name: string;
  icon: typeof Sparkles;
  desc: string;
  uses: number;
}

const INITIAL_CARDS = (): MiracleCard[] => [
  { key: 'mar',    name: 'Abertura do Mar Vermelho', icon: Wind,     desc: 'Revela uma linha inteira',      uses: 1 },
  { key: 'estrela',name: 'Estrela Guia',              icon: Star,     desc: 'Revela área 3×3',                uses: 2 },
  { key: 'salmo',  name: 'Proteção do Salmo 91',     icon: Shield,   desc: 'Bloqueia o próximo ataque do inimigo', uses: 1 },
  { key: 'mana',   name: 'Chuva de Maná',             icon: Cloud,    desc: 'Próximo acerto vira tiro triplo (cruz)', uses: 1 },
];

// ----------- Board helpers -----------
function emptyBoard(): Cell[] {
  return Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => ({ state: 'unknown' as const }));
}

function tryPlace(units: UnitDef[]): PlacedUnit[] {
  const occ = new Set<number>();
  const placed: PlacedUnit[] = [];
  for (const u of units) {
    let attempts = 0;
    while (attempts++ < 500) {
      const orientation: Orientation = Math.random() < 0.5 ? 'h' : 'v';
      const maxR = orientation === 'v' ? BOARD_SIZE - u.size : BOARD_SIZE - 1;
      const maxC = orientation === 'h' ? BOARD_SIZE - u.size : BOARD_SIZE - 1;
      const r = Math.floor(Math.random() * (maxR + 1));
      const c = Math.floor(Math.random() * (maxC + 1));
      const cells: number[] = [];
      let ok = true;
      for (let i = 0; i < u.size; i++) {
        const rr = r + (orientation === 'v' ? i : 0);
        const cc = c + (orientation === 'h' ? i : 0);
        const idx = rr * BOARD_SIZE + cc;
        if (occ.has(idx)) { ok = false; break; }
        cells.push(idx);
      }
      if (!ok) continue;
      cells.forEach(i => occ.add(i));
      const hp = u.key === 'muralha' ? 3 : u.size;
      placed.push({ unit: u, cells, hits: new Set(), hp, sunk: false });
      break;
    }
  }
  return placed;
}

// ============================================================
type Phase = 'menu' | 'placing' | 'playing' | 'gameover' | 'pvp_lobby' | 'pvp_game';
type Turn = 'player' | 'enemy';

export default function CelestialBattlePage() {
  const [phase, setPhase] = useState<Phase>('menu');
  const [turn, setTurn] = useState<Turn>('player');
  const [winner, setWinner] = useState<'player' | 'enemy' | null>(null);
  const [pvpRoomId, setPvpRoomId] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  // Player owns these (visible to player)
  const [playerUnits, setPlayerUnits] = useState<PlacedUnit[]>([]);
  const [playerBoard, setPlayerBoard] = useState<Cell[]>(emptyBoard());

  // Enemy owns these (hidden — playerView shows attacks made)
  const [enemyUnits, setEnemyUnits] = useState<PlacedUnit[]>([]);
  const [enemyView, setEnemyView] = useState<Cell[]>(emptyBoard()); // what player sees of enemy

  // Cards
  const [cards, setCards] = useState<MiracleCard[]>(INITIAL_CARDS());
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [psalmShield, setPsalmShield] = useState(false);
  const [manaBoost, setManaBoost] = useState(false);

  // AI memory
  const [aiHuntStack, setAiHuntStack] = useState<number[]>([]);
  const [aiTried, setAiTried] = useState<Set<number>>(new Set());

  // Score
  const [score, setScore] = useState(0);
  const [shotCount, setShotCount] = useState(0);
  const [hitCount, setHitCount] = useState(0);

  // Placement state
  const [placeOrientation, setPlaceOrientation] = useState<Orientation>('h');
  const [placeHover, setPlaceHover] = useState<number | null>(null);

  const nextUnitToPlace = useMemo(() => {
    const placedKeys = new Set(playerUnits.map(p => p.unit.key));
    return UNITS.find(u => !placedKeys.has(u.key)) || null;
  }, [playerUnits]);

  // ---------- enter placement phase ----------
  const enterPlacement = useCallback(() => {
    setPlayerUnits([]);
    setEnemyUnits(tryPlace(UNITS));
    setPlayerBoard(emptyBoard());
    setEnemyView(emptyBoard());
    setCards(INITIAL_CARDS());
    setActiveCard(null);
    setPsalmShield(false);
    setManaBoost(false);
    setAiHuntStack([]);
    setAiTried(new Set());
    setScore(0);
    setShotCount(0);
    setHitCount(0);
    setWinner(null);
    setTurn('player');
    setPlaceOrientation('h');
    setPlaceHover(null);
    setPhase('placing');
  }, []);

  // ---------- begin battle (after placement) ----------
  const beginBattle = useCallback((units: PlacedUnit[]) => {
    setPlayerUnits(units);
    setPhase('playing');
    setTurn('player');
    toast.success('Que a sabedoria de Moisés te guie!', { description: 'Encontre e neutralize as unidades inimigas.' });
  }, []);

  // ---------- restart (used by Game Over) ----------
  const startBattle = useCallback(() => {
    enterPlacement();
  }, [enterPlacement]);

  // ---------- placement helpers ----------
  const previewCells = useMemo(() => {
    if (placeHover === null || !nextUnitToPlace) return { cells: [] as number[], valid: false };
    const r = Math.floor(placeHover / 10), c = placeHover % 10;
    const cells: number[] = [];
    const occ = new Set(playerUnits.flatMap(u => u.cells));
    let valid = true;
    for (let i = 0; i < nextUnitToPlace.size; i++) {
      const rr = r + (placeOrientation === 'v' ? i : 0);
      const cc = c + (placeOrientation === 'h' ? i : 0);
      if (rr >= 10 || cc >= 10) { valid = false; break; }
      const idx = rr * 10 + cc;
      if (occ.has(idx)) valid = false;
      cells.push(idx);
    }
    return { cells, valid };
  }, [placeHover, placeOrientation, nextUnitToPlace, playerUnits]);

  const handlePlaceCellClick = useCallback((idx: number) => {
    if (!nextUnitToPlace) return;
    const r = Math.floor(idx / 10), c = idx % 10;
    const cells: number[] = [];
    const occ = new Set(playerUnits.flatMap(u => u.cells));
    for (let i = 0; i < nextUnitToPlace.size; i++) {
      const rr = r + (placeOrientation === 'v' ? i : 0);
      const cc = c + (placeOrientation === 'h' ? i : 0);
      if (rr >= 10 || cc >= 10) { toast.error('Não cabe aqui — gire ou escolha outra posição.'); return; }
      const idx2 = rr * 10 + cc;
      if (occ.has(idx2)) { toast.error('Tem outra unidade nesse caminho.'); return; }
      cells.push(idx2);
    }
    const u = nextUnitToPlace;
    const hp = u.key === 'muralha' ? 3 : u.size;
    setPlayerUnits(prev => [...prev, { unit: u, cells, hits: new Set(), hp, sunk: false }]);
  }, [nextUnitToPlace, placeOrientation, playerUnits]);

  const removeLastUnit = useCallback(() => {
    setPlayerUnits(prev => prev.slice(0, -1));
  }, []);

  const autoPlaceRest = useCallback(() => {
    // place remaining units randomly without conflict with already placed ones
    const placed = [...playerUnits];
    const occ = new Set(placed.flatMap(u => u.cells));
    const remaining = UNITS.filter(u => !placed.some(p => p.unit.key === u.key));
    for (const u of remaining) {
      let ok = false;
      for (let attempts = 0; attempts < 500 && !ok; attempts++) {
        const orient: Orientation = Math.random() < 0.5 ? 'h' : 'v';
        const maxR = orient === 'v' ? 10 - u.size : 9;
        const maxC = orient === 'h' ? 10 - u.size : 9;
        const r = Math.floor(Math.random() * (maxR + 1));
        const c = Math.floor(Math.random() * (maxC + 1));
        const cells: number[] = [];
        let conflict = false;
        for (let i = 0; i < u.size; i++) {
          const idx = (r + (orient === 'v' ? i : 0)) * 10 + (c + (orient === 'h' ? i : 0));
          if (occ.has(idx)) { conflict = true; break; }
          cells.push(idx);
        }
        if (conflict) continue;
        cells.forEach(i => occ.add(i));
        placed.push({ unit: u, cells, hits: new Set(), hp: u.key === 'muralha' ? 3 : u.size, sunk: false });
        ok = true;
      }
    }
    setPlayerUnits(placed);
  }, [playerUnits]);


  // ---------- attack logic ----------
  const applyShot = useCallback((idx: number, isPlayer: boolean): { hit: boolean; sunk?: PlacedUnit; dodged?: boolean } => {
    const units = isPlayer ? enemyUnits : playerUnits;
    const setUnits = isPlayer ? setEnemyUnits : setPlayerUnits;
    const view = isPlayer ? enemyView : playerBoard;
    const setView = isPlayer ? setEnemyView : setPlayerBoard;

    // already shot?
    if (view[idx].state !== 'unknown' && view[idx].state !== 'revealed') return { hit: false };

    const target = units.find(u => u.cells.includes(idx) && !u.sunk);
    let hit = false;
    let sunk: PlacedUnit | undefined;
    let dodged = false;

    if (target) {
      // Discípulos esquiva
      if (target.unit.key === 'discipulos' && !target.dodged && Math.random() < 0.25) {
        target.dodged = true;
        dodged = true;
        const next = [...view];
        next[idx] = { state: 'miss' };
        setView(next);
        return { hit: false, dodged: true };
      }
      // Arca sagrada — primeiro tiro não conta
      if (target.unit.key === 'arca' && target.hits.size === 0) {
        target.hits.add(idx);
        const next = [...view];
        next[idx] = { state: 'revealed', unitKey: target.unit.key };
        setView(next);
        setUnits([...units]);
        return { hit: false };
      }
      target.hits.add(idx);
      hit = true;

      const requiredHits = target.unit.key === 'muralha' ? 3 : target.cells.length;
      // Muralha needs 3 distinct hits but only has size 2 → counts repeated impacts on adjacency? Use cells hit + virtual durability:
      // Simpler: muralha sinks when hits.size >= min(target.cells.length, 1) AND a counter reaches 3.
      // We'll store overcount via target.hp:
      target.hp -= 1;

      const allCellsHit = target.cells.every(c => target.hits.has(c));
      const sunkNow = target.unit.key === 'muralha' ? target.hp <= 0 : allCellsHit;

      const next = [...view];
      next[idx] = { state: sunkNow ? 'sunk' : 'hit', unitKey: target.unit.key };

      if (sunkNow) {
        target.sunk = true;
        sunk = target;
        target.cells.forEach(c => { next[c] = { state: 'sunk', unitKey: target.unit.key }; });

        // Salomão revela 1 vizinho ao morrer (somente para player view do enemy)
        if (target.unit.key === 'salomao' && isPlayer) {
          const last = idx;
          const r = Math.floor(last / 10), c = last % 10;
          for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr < 0 || nc < 0 || nr >= 10 || nc >= 10) continue;
            const ni = nr * 10 + nc;
            if (next[ni].state === 'unknown') next[ni] = { state: 'revealed' };
          }
        }
        // Torre dá pista
        if (target.unit.key === 'torre' && isPlayer) {
          const remaining = enemyUnits.filter(u => !u.sunk && u.unit.key !== 'torre');
          if (remaining.length) {
            const pick = remaining[Math.floor(Math.random() * remaining.length)];
            const cell = pick.cells[Math.floor(Math.random() * pick.cells.length)];
            if (next[cell].state === 'unknown') next[cell] = { state: 'revealed' };
          }
        }
      }
      setView(next);
      setUnits([...units]);
    } else {
      const next = [...view];
      next[idx] = { state: 'miss' };
      setView(next);
    }
    return { hit, sunk, dodged };
  }, [enemyUnits, playerUnits, enemyView, playerBoard]);

  const checkWin = useCallback((units: PlacedUnit[], who: 'player' | 'enemy') => {
    if (units.every(u => u.sunk)) {
      setWinner(who === 'player' ? 'enemy' : 'player'); // who has lost
      setPhase('gameover');
    }
  }, []);

  // ---------- PLAYER attacks enemy ----------
  const playerShootCells = useCallback((indices: number[]) => {
    let anyHit = false;
    let kills = 0;
    indices.forEach(idx => {
      const r = applyShot(idx, true);
      if (r.hit) { anyHit = true; setHitCount(h => h + 1); }
      if (r.sunk) { kills++; toast.success(`💥 ${r.sunk.unit.name} neutralizada!`); }
      if (r.dodged) toast('Os discípulos esquivaram pela fé!', { icon: '🕊️' });
      setShotCount(s => s + 1);
    });
    setScore(s => s + kills * 100 + (anyHit ? 25 : 0));
    return anyHit;
  }, [applyShot]);

  const handlePlayerCellClick = useCallback((idx: number) => {
    if (phase !== 'playing' || turn !== 'player') return;
    const cell = enemyView[idx];

    // miracle cards
    if (activeCard === 'estrela') {
      const r = Math.floor(idx / 10), c = idx % 10;
      const next = [...enemyView];
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= 10 || nc >= 10) continue;
        const ni = nr * 10 + nc;
        if (next[ni].state === 'unknown') {
          const has = enemyUnits.find(u => u.cells.includes(ni) && !u.sunk);
          next[ni] = has ? { state: 'revealed', unitKey: has.unit.key } : { state: 'revealed' };
        }
      }
      setEnemyView(next);
      consumeCard('estrela');
      toast.success('✨ A Estrela Guia ilumina o caminho!');
      return;
    }
    if (activeCard === 'mar') {
      const r = Math.floor(idx / 10);
      const next = [...enemyView];
      for (let c = 0; c < 10; c++) {
        const ni = r * 10 + c;
        if (next[ni].state === 'unknown') {
          const has = enemyUnits.find(u => u.cells.includes(ni) && !u.sunk);
          next[ni] = has ? { state: 'revealed', unitKey: has.unit.key } : { state: 'revealed' };
        }
      }
      setEnemyView(next);
      consumeCard('mar');
      toast.success('🌊 As águas se abrem!');
      return;
    }

    if (cell.state === 'hit' || cell.state === 'sunk' || cell.state === 'miss') return;

    let cells = [idx];
    if (manaBoost) {
      const r = Math.floor(idx / 10), c = idx % 10;
      cells = [idx];
      [[ -1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc]) => {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nc >= 0 && nr < 10 && nc < 10) cells.push(nr*10 + nc);
      });
      setManaBoost(false);
      toast('🍞 Chuva de Maná — tiro em cruz!');
    }

    const hit = playerShootCells(cells);

    setTimeout(() => {
      // Check enemy lost
      const stillAlive = enemyUnits.some(u => !u.sunk);
      if (!stillAlive) {
        setWinner('player');
        setPhase('gameover');
        return;
      }
      if (!hit) {
        setTurn('enemy');
        setTimeout(enemyTurn, 700);
      }
    }, 100);
  }, [phase, turn, enemyView, activeCard, manaBoost, enemyUnits, playerShootCells]);

  const consumeCard = (key: string) => {
    setCards(cs => cs.map(c => c.key === key ? { ...c, uses: c.uses - 1 } : c).filter(c => c.uses > 0));
    setActiveCard(null);
  };

  const handleCardClick = (key: string) => {
    if (turn !== 'player' || phase !== 'playing') return;
    if (key === 'salmo') {
      setPsalmShield(true);
      consumeCard('salmo');
      toast.success('🛡️ Salmo 91 te protege!');
      return;
    }
    if (key === 'mana') {
      setManaBoost(true);
      consumeCard('mana');
      toast.success('🍞 Próximo tiro será em cruz!');
      return;
    }
    setActiveCard(activeCard === key ? null : key);
  };

  // ---------- ENEMY AI ----------
  const enemyTurn = useCallback(() => {
    let target: number | null = null;
    const stack = [...aiHuntStack];
    const tried = new Set(aiTried);

    while (stack.length) {
      const candidate = stack.pop()!;
      if (!tried.has(candidate) && playerBoard[candidate].state === 'unknown') {
        target = candidate;
        break;
      }
    }
    if (target === null) {
      // random with parity (like real battleship)
      let attempts = 0;
      while (attempts++ < 200) {
        const r = Math.floor(Math.random() * 10);
        const c = Math.floor(Math.random() * 10);
        if ((r + c) % 2 !== 0) continue;
        const i = r * 10 + c;
        if (!tried.has(i) && playerBoard[i].state === 'unknown') { target = i; break; }
      }
      if (target === null) {
        for (let i = 0; i < 100; i++) {
          if (!tried.has(i) && playerBoard[i].state === 'unknown') { target = i; break; }
        }
      }
    }
    if (target === null) { setTurn('player'); return; }

    // Salmo 91 shield
    if (psalmShield) {
      setPsalmShield(false);
      toast('🛡️ Salmo 91 bloqueou o ataque inimigo!');
      tried.add(target);
      setAiTried(tried);
      setAiHuntStack(stack);
      setTurn('player');
      return;
    }

    tried.add(target);
    const result = applyShot(target, false);

    if (result.hit) {
      const r = Math.floor(target / 10), c = target % 10;
      [[ -1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc]) => {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= 10 || nc >= 10) return;
        const ni = nr * 10 + nc;
        if (!tried.has(ni)) stack.push(ni);
      });
    }

    setAiTried(tried);
    setAiHuntStack(stack);

    setTimeout(() => {
      if (playerUnits.every(u => u.sunk)) {
        setWinner('enemy');
        setPhase('gameover');
        return;
      }
      if (result.hit) {
        setTimeout(enemyTurn, 700);
      } else {
        setTurn('player');
      }
    }, 200);
  }, [aiHuntStack, aiTried, playerBoard, psalmShield, applyShot, playerUnits]);

  // ============================================================
  // UI
  // ============================================================

  if (phase === 'menu') {
    return <MenuScreen
      onStart={enterPlacement}
      onPvP={() => setPhase('pvp_lobby')}
      onTutorial={() => setShowTutorial(true)}
    />;
  }
  if (phase === 'pvp_lobby') {
    return <PvPLobbyScreen
      onBack={() => setPhase('menu')}
      onEnter={(roomId) => { setPvpRoomId(roomId); setPhase('pvp_game'); }}
    />;
  }
  if (phase === 'pvp_game' && pvpRoomId) {
    return <CelestialPvPGame roomId={pvpRoomId} onExit={() => { setPvpRoomId(null); setPhase('menu'); }} />;
  }
  if (phase === 'placing') {
    return (
      <>
        <PlacementScreen
          playerUnits={playerUnits}
          nextUnit={nextUnitToPlace}
          orientation={placeOrientation}
          previewCells={previewCells}
          onHover={setPlaceHover}
          onCellClick={handlePlaceCellClick}
          onRotate={() => setPlaceOrientation(o => o === 'h' ? 'v' : 'h')}
          onAuto={autoPlaceRest}
          onUndo={removeLastUnit}
          onClear={() => setPlayerUnits([])}
          onStart={() => beginBattle(playerUnits)}
          onBack={() => setPhase('menu')}
          onHelp={() => setShowTutorial(true)}
        />
        {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.18),transparent_60%),radial-gradient(ellipse_at_bottom,hsl(var(--accent)/0.12),transparent_55%),hsl(220_45%_8%)] text-white">
      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-[hsl(220_55%_10%)]/95 border-b border-accent/20 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <button onClick={() => setPhase('menu')} className="flex items-center gap-1.5 text-white hover:text-accent transition">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-bold">Sair</span>
          </button>
          <div className="text-center flex-1 px-2">
            <div className="text-[10px] uppercase tracking-[0.25em] text-accent font-black">Batalha Celestial</div>
            <div className="text-xs text-white font-semibold mt-0.5">
              {turn === 'player' ? '⚔️ Sua vez de atacar' : '🌀 Vez do inimigo...'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowTutorial(true)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white" title="Como jogar">
              <HelpCircle className="w-4 h-4" />
            </button>
            <div className="text-right">
              <div className="text-[9px] uppercase tracking-wider text-white/70 font-bold">Pontos</div>
              <div className="text-base font-black text-accent leading-none">{score}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3 pb-24 pt-4 space-y-5">
        {/* Commander Moisés */}
        <div className="rounded-2xl bg-gradient-to-r from-accent/20 via-accent/10 to-transparent border border-accent/30 p-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center text-2xl shadow-lg">
            👴
          </div>
          <div className="flex-1">
            <div className="text-xs text-accent font-bold uppercase tracking-wider">Comandante</div>
            <div className="text-sm font-bold">Moisés — O Libertador</div>
            <div className="text-[11px] text-white/85 italic">"Não temas, o Senhor pelejará por ti."</div>
          </div>
        </div>

        {/* ENEMY BOARD (target) */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Target className="w-4 h-4 text-accent" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-white">Mar Inimigo</h2>
            <div className="text-[10px] text-white/75 ml-auto">
              Restantes: {enemyUnits.filter(u => !u.sunk).length}/{enemyUnits.length}
            </div>
          </div>
          <Board
            cells={enemyView}
            onCellClick={handlePlayerCellClick}
            interactive={turn === 'player' && phase === 'playing'}
            isEnemy
            highlightMode={activeCard}
          />
        </div>

        {/* MIRACLE CARDS */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Sparkles className="w-4 h-4 text-accent" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-white">Cartas de Milagre</h2>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {cards.map(c => {
              const Icon = c.icon;
              const active = activeCard === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => handleCardClick(c.key)}
                  disabled={turn !== 'player'}
                  className={cn(
                    'relative rounded-xl p-2.5 text-left transition-all border',
                    'bg-gradient-to-br from-white/[0.08] to-white/[0.02] border-white/10',
                    'hover:border-accent/60 hover:from-accent/20 active:scale-95',
                    active && 'border-accent ring-2 ring-accent/60 from-accent/30 to-accent/10',
                    turn !== 'player' && 'opacity-40'
                  )}
                >
                  <Icon className="w-5 h-5 text-accent mb-1" />
                  <div className="text-[10px] font-bold leading-tight">{c.name}</div>
                  <div className="text-[9px] text-white/75 mt-1 leading-tight">{c.desc}</div>
                  <div className="absolute top-1 right-1.5 text-[9px] font-black text-accent">×{c.uses}</div>
                </button>
              );
            })}
            {cards.length === 0 && (
              <div className="col-span-4 text-center text-[11px] text-white/65 py-4">Sem cartas restantes</div>
            )}
          </div>
        </div>

        {/* PLAYER BOARD (frota) */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Shield className="w-4 h-4 text-primary-glow" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-white">Sua Frota</h2>
            <div className="text-[10px] text-white/75 ml-auto">
              Restantes: {playerUnits.filter(u => !u.sunk).length}/{playerUnits.length}
            </div>
          </div>
          <Board
            cells={playerBoard}
            ownUnits={playerUnits}
            interactive={false}
          />
        </div>

        {/* UNITS LEGEND */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
          <div className="text-[10px] uppercase tracking-widest font-bold text-white/85 mb-2">Unidades em campo</div>
          <div className="grid grid-cols-1 gap-1.5">
            {UNITS.map(u => {
              const enemy = enemyUnits.find(e => e.unit.key === u.key);
              const mine = playerUnits.find(p => p.unit.key === u.key);
              return (
                <div key={u.key} className="flex items-center gap-2 text-[11px]">
                  <span className="text-base">{u.emoji}</span>
                  <span className={cn('flex-1 font-semibold', enemy?.sunk && 'line-through text-red-400')}>{u.name}</span>
                  <span className="text-white/65">{u.size}⌗</span>
                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full', mine?.sunk ? 'bg-red-500/30 text-red-200' : 'bg-emerald-500/20 text-emerald-200')}>
                    {mine?.sunk ? 'caída' : 'viva'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {phase === 'gameover' && (
        <GameOver winner={winner!} score={score} shots={shotCount} hits={hitCount} onRestart={startBattle} onMenu={() => setPhase('menu')} />
      )}
    </div>
  );
}

// ============================================================
// Components
// ============================================================

function Board({
  cells, onCellClick, interactive, isEnemy, ownUnits, highlightMode,
}: {
  cells: Cell[];
  onCellClick?: (idx: number) => void;
  interactive: boolean;
  isEnemy?: boolean;
  ownUnits?: PlacedUnit[];
  highlightMode?: string | null;
}) {
  // Map ownUnits to cell→unitKey for rendering own ships
  const ownMap = useMemo(() => {
    const m = new Map<number, { key: string; emoji: string; sunk: boolean; hit: boolean }>();
    ownUnits?.forEach(u => u.cells.forEach(c => m.set(c, {
      key: u.unit.key, emoji: u.unit.emoji, sunk: u.sunk, hit: u.hits.has(c),
    })));
    return m;
  }, [ownUnits]);

  return (
    <div className="rounded-2xl p-2 bg-gradient-to-br from-[hsl(220_50%_15%)] to-[hsl(220_60%_8%)] border border-accent/20 shadow-[0_10px_40px_-10px_hsl(var(--accent)/0.3)]">
      {/* Column labels */}
      <div className="grid gap-[2px] mb-1" style={{ gridTemplateColumns: 'auto repeat(10, minmax(0,1fr))' }}>
        <div />
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="text-[8px] text-center text-accent/90 font-bold">{String.fromCharCode(65 + i)}</div>
        ))}
      </div>
      {Array.from({ length: 10 }, (_, r) => (
        <div key={r} className="grid gap-[2px] mb-[2px]" style={{ gridTemplateColumns: 'auto repeat(10, minmax(0,1fr))' }}>
          <div className="text-[8px] text-accent/90 font-bold flex items-center justify-center">{r + 1}</div>
          {Array.from({ length: 10 }, (_, c) => {
            const idx = r * 10 + c;
            const cell = cells[idx];
            const own = ownMap.get(idx);
            return (
              <CellBtn
                key={idx}
                cell={cell}
                own={own}
                interactive={interactive}
                isEnemy={!!isEnemy}
                highlight={!!highlightMode}
                onClick={() => interactive && onCellClick?.(idx)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function CellBtn({
  cell, own, interactive, isEnemy, highlight, onClick,
}: {
  cell: Cell;
  own?: { key: string; emoji: string; sunk: boolean; hit: boolean };
  interactive: boolean;
  isEnemy: boolean;
  highlight: boolean;
  onClick: () => void;
}) {
  let content: React.ReactNode = null;
  let bg = 'bg-[hsl(220_50%_22%)]/70';
  let extra = '';

  if (cell.state === 'miss') {
    content = <span className="text-white/75 text-[10px]">·</span>;
    bg = 'bg-[hsl(220_40%_18%)]';
  } else if (cell.state === 'hit') {
    content = <span className="text-base">💥</span>;
    bg = 'bg-gradient-to-br from-orange-500 to-red-600';
    extra = 'animate-pulse';
  } else if (cell.state === 'sunk') {
    const u = UNITS.find(u => u.key === cell.unitKey);
    content = <span className="text-sm">{u?.emoji ?? '✖'}</span>;
    bg = 'bg-gradient-to-br from-red-700 to-red-900';
  } else if (cell.state === 'revealed') {
    if (cell.unitKey) {
      const u = UNITS.find(u => u.key === cell.unitKey);
      content = <span className="text-sm opacity-70">{u?.emoji}</span>;
      bg = 'bg-gradient-to-br from-accent/40 to-accent/10 ring-1 ring-accent/50';
    } else {
      content = <span className="text-accent/70 text-[10px]">✦</span>;
      bg = 'bg-accent/10 ring-1 ring-accent/30';
    }
  } else if (own) {
    content = <span className={cn('text-sm', own.sunk && 'opacity-40')}>{own.emoji}</span>;
    bg = own.hit
      ? 'bg-gradient-to-br from-red-600/70 to-red-900/70'
      : 'bg-gradient-to-br from-primary/60 to-primary-glow/40 ring-1 ring-primary/50';
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
    />
  );
}

function MenuScreen({ onStart, onPvP }: { onStart: () => void; onPvP: () => void }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,hsl(var(--accent)/0.25),transparent_60%),radial-gradient(ellipse_at_bottom,hsl(var(--primary)/0.2),transparent_55%),hsl(220_45%_8%)] text-white flex flex-col">
      <div className="px-4 pt-3">
        <Link to="/church" className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-md mx-auto text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-accent/30 blur-3xl rounded-full" />
          <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-accent via-accent/80 to-primary flex items-center justify-center text-6xl shadow-[0_20px_60px_-10px_hsl(var(--accent)/0.6)]">
            ⚔️
          </div>
        </div>

        <div className="text-[10px] uppercase tracking-[0.4em] text-accent font-bold mb-2">Estratégia Bíblica</div>
        <h1 className="text-4xl font-black mb-3 bg-gradient-to-r from-accent via-accent/80 to-primary-glow bg-clip-text text-transparent">
          Batalha Celestial
        </h1>
        <p className="text-sm text-white/70 leading-relaxed mb-8 max-w-xs">
          Posicione suas unidades sagradas, invoque milagres e neutralize a frota inimiga em uma jornada épica de fé e estratégia.
        </p>

        <Button
          size="lg"
          onClick={onStart}
          className="w-full max-w-xs bg-gradient-to-r from-accent to-accent/80 hover:from-accent hover:to-accent text-accent-foreground font-bold text-base h-14 rounded-2xl shadow-[0_15px_40px_-10px_hsl(var(--accent)/0.6)] hover:scale-[1.02] transition"
        >
          <Sword className="w-5 h-5 mr-2" />
          Batalha vs IA
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={onPvP}
          className="w-full max-w-xs mt-3 bg-white/5 hover:bg-white/10 border-white/20 text-white font-bold text-base h-14 rounded-2xl hover:scale-[1.02] transition"
        >
          <Users className="w-5 h-5 mr-2" />
          Jogar com Amigo (PvP)
        </Button>

        <div className="mt-10 grid grid-cols-3 gap-3 w-full">
          {[
            { icon: Crown, label: 'Comandante', sub: 'Moisés' },
            { icon: Sparkles, label: 'Cartas', sub: '4 milagres' },
            { icon: Eye, label: 'Tabuleiro', sub: '10×10' },
          ].map((it, i) => (
            <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-3">
              <it.icon className="w-5 h-5 text-accent mx-auto mb-1.5" />
              <div className="text-[9px] uppercase tracking-wider text-white/75">{it.label}</div>
              <div className="text-xs font-bold mt-0.5">{it.sub}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-[10px] text-white/65 italic max-w-xs">
          "O Senhor é a minha luz e a minha salvação; a quem temerei?" — Salmos 27:1
        </div>
      </div>
    </div>
  );
}

function GameOver({ winner, score, shots, hits, onRestart, onMenu }: {
  winner: 'player' | 'enemy';
  score: number;
  shots: number;
  hits: number;
  onRestart: () => void;
  onMenu: () => void;
}) {
  const won = winner === 'player';
  const accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0;
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
      <div className="max-w-sm w-full rounded-3xl bg-gradient-to-br from-[hsl(220_50%_18%)] to-[hsl(220_60%_8%)] border border-accent/40 p-6 text-center text-white shadow-2xl animate-scale-in">
        <div className="text-6xl mb-3">{won ? '👑' : '🕊️'}</div>
        <div className="text-[10px] uppercase tracking-[0.4em] text-accent font-bold mb-1">
          {won ? 'Vitória Celestial' : 'Derrota Honrosa'}
        </div>
        <h2 className="text-2xl font-black mb-2">
          {won ? 'A glória é sua!' : 'A jornada continua'}
        </h2>
        <p className="text-xs text-white/85 italic mb-5">
          {won
            ? '"Tudo posso naquele que me fortalece." — Filipenses 4:13'
            : '"Confia no Senhor de todo o teu coração." — Provérbios 3:5'}
        </p>

        <div className="grid grid-cols-3 gap-2 mb-5">
          <Stat label="Pontos" value={score} />
          <Stat label="Acertos" value={`${hits}/${shots}`} />
          <Stat label="Precisão" value={`${accuracy}%`} />
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1 text-white/70 hover:bg-white/10" onClick={onMenu}>Menu</Button>
          <Button className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 font-bold" onClick={onRestart}>
            <RotateCcw className="w-4 h-4 mr-2" /> Revanche
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-2">
      <div className="text-[9px] uppercase tracking-wider text-white/75">{label}</div>
      <div className="text-base font-black text-accent mt-0.5">{value}</div>
    </div>
  );
}

function PvPLobbyScreen({ onBack, onEnter }: { onBack: () => void; onEnter: (roomId: string) => void }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.25),transparent_60%),hsl(220_45%_8%)] text-white">
      <div className="max-w-md mx-auto px-6 py-6">
        <button onClick={onBack} className="flex items-center gap-2 text-white/70 text-sm hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4" /> Voltar ao menu
        </button>
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚔️</div>
          <div className="text-[10px] uppercase tracking-[0.4em] text-accent font-bold mb-2">PvP Online</div>
          <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-accent to-primary-glow bg-clip-text text-transparent">
            Jogue com um amigo
          </h2>
          <p className="text-sm text-white/85">Crie uma sala e compartilhe o código, ou entre em uma sala existente.</p>
        </div>
        <CelestialLobby onEnter={onEnter} />
      </div>
    </div>
  );
}
