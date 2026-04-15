import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Trophy, Clock, RotateCcw, Check, Sparkles, Star, ArrowLeft, Gamepad2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

type Difficulty = 'easy' | 'medium' | 'hard';
type Category = 'kids' | 'youth' | 'adults';

interface WordSearchPuzzle {
  title: string;
  words: string[];
  grid: string[][];
  size: number;
}

interface CellPos {
  row: number;
  col: number;
}

const WORD_LISTS: Record<Category, Record<Difficulty, { title: string; words: string[] }[]>> = {
  kids: {
    easy: [
      { title: 'Animais da Bíblia', words: ['LEAO', 'POMBA', 'OVELHA', 'PEIXE', 'BURRO', 'COBRA'] },
      { title: 'Nomes Bíblicos', words: ['JESUS', 'MARIA', 'JOSE', 'DAVI', 'MOISES', 'NOE'] },
      { title: 'Criação de Deus', words: ['SOL', 'LUA', 'MAR', 'TERRA', 'FLOR', 'ARVORE'] },
    ],
    medium: [
      { title: 'Heróis da Fé', words: ['ABRAAO', 'DANIEL', 'ESTER', 'JONAS', 'SAMUEL', 'ELIAS', 'RUTE'] },
      { title: 'Frutos do Espírito', words: ['AMOR', 'GOZO', 'PAZ', 'BONDADE', 'FE', 'MANSIDAO'] },
    ],
    hard: [
      { title: 'Parábolas de Jesus', words: ['SEMEADOR', 'TALENTOS', 'OVELHA', 'FILHO', 'SAMARITANO', 'JOIO', 'TRIGO'] },
      { title: 'Milagres', words: ['LAZARO', 'TEMPESTADE', 'CEGO', 'PARALÍTICO', 'LEPROSO', 'AGUA', 'VINHO'] },
    ],
  },
  youth: {
    easy: [
      { title: 'Livros do NT', words: ['MATEUS', 'MARCOS', 'LUCAS', 'JOAO', 'ATOS', 'ROMANOS'] },
      { title: 'Discípulos', words: ['PEDRO', 'ANDRE', 'TIAGO', 'JOAO', 'FELIPE', 'MATEUS'] },
    ],
    medium: [
      { title: 'Reis de Israel', words: ['SALOMAO', 'DAVI', 'SAUL', 'JOSIAS', 'EZEQUIAS', 'JEROBOAO', 'ACABE'] },
      { title: 'Profetas', words: ['ISAIAS', 'JEREMIAS', 'EZEQUIEL', 'DANIEL', 'OSEIAS', 'AMÓS', 'JONAS'] },
    ],
    hard: [
      { title: 'Armadura de Deus', words: ['VERDADE', 'JUSTICA', 'EVANGELHO', 'SALVACAO', 'ESPÍRITO', 'ORACAO', 'ESCUDO'] },
      { title: 'Frutos e Dons', words: ['PROFECIA', 'SABEDORIA', 'DISCERNIMENTO', 'PACIENCIA', 'BENIGNIDADE', 'DOMÍNIO'] },
    ],
  },
  adults: {
    easy: [
      { title: 'Livros do AT', words: ['GENESIS', 'EXODO', 'SALMOS', 'ISAIAS', 'DANIEL', 'RUTE'] },
      { title: 'Lugares Bíblicos', words: ['JERUSALEM', 'BELEM', 'NAZARE', 'EGITO', 'SINAI', 'JORDAO'] },
    ],
    medium: [
      { title: 'Doutrinas', words: ['GRACA', 'REDENCAO', 'JUSTIFICACAO', 'SANTIFICACAO', 'SALVACAO', 'EXPIACAO'] },
      { title: 'Tabernáculo', words: ['ALTAR', 'CANDELABRO', 'PROPICIATORIO', 'CORTINA', 'INCENSO', 'MESA'] },
    ],
    hard: [
      { title: 'Apocalipse', words: ['CORDEIRO', 'SELOS', 'TROMBETAS', 'ARMAGEDDOM', 'BABILONIA', 'TRONO', 'JUÍZO'] },
      { title: 'Genealogia', words: ['ABRAAO', 'ISAQUE', 'JACO', 'JUDA', 'BOAZ', 'DAVI', 'SALOMAO', 'JOSE'] },
    ],
  },
};

const DIRECTIONS = [
  [0, 1],   // right
  [1, 0],   // down
  [1, 1],   // diagonal down-right
  [-1, 1],  // diagonal up-right
  [0, -1],  // left
  [-1, 0],  // up
  [-1, -1], // diagonal up-left
  [1, -1],  // diagonal down-left
];

function generateGrid(words: string[], difficulty: Difficulty): { grid: string[][]; size: number } {
  const sizes: Record<Difficulty, number> = { easy: 10, medium: 13, hard: 16 };
  const size = sizes[difficulty];
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(''));

  const cleanWords = words.map(w => w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, ''));
  const dirs = difficulty === 'easy' ? DIRECTIONS.slice(0, 2) : difficulty === 'medium' ? DIRECTIONS.slice(0, 4) : DIRECTIONS;

  for (const word of cleanWords) {
    let placed = false;
    for (let attempt = 0; attempt < 200 && !placed; attempt++) {
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      const startRow = Math.floor(Math.random() * size);
      const startCol = Math.floor(Math.random() * size);
      
      const endRow = startRow + dir[0] * (word.length - 1);
      const endCol = startCol + dir[1] * (word.length - 1);
      
      if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue;
      
      let canPlace = true;
      for (let i = 0; i < word.length; i++) {
        const r = startRow + dir[0] * i;
        const c = startCol + dir[1] * i;
        if (grid[r][c] !== '' && grid[r][c] !== word[i]) {
          canPlace = false;
          break;
        }
      }
      
      if (canPlace) {
        for (let i = 0; i < word.length; i++) {
          grid[startRow + dir[0] * i][startCol + dir[1] * i] = word[i];
        }
        placed = true;
      }
    }
  }

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = letters[Math.floor(Math.random() * 26)];
      }
    }
  }

  return { grid, size };
}

function getCellsBetween(start: CellPos, end: CellPos): CellPos[] {
  const cells: CellPos[] = [];
  const dr = Math.sign(end.row - start.row);
  const dc = Math.sign(end.col - start.col);
  const len = Math.max(Math.abs(end.row - start.row), Math.abs(end.col - start.col));
  
  for (let i = 0; i <= len; i++) {
    cells.push({ row: start.row + dr * i, col: start.col + dc * i });
  }
  return cells;
}

function isValidLine(start: CellPos, end: CellPos): boolean {
  const dr = end.row - start.row;
  const dc = end.col - start.col;
  return dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc);
}

const categoryConfig: Record<Category, { label: string; emoji: string }> = {
  kids: { label: 'Crianças', emoji: '🧒' },
  youth: { label: 'Jovens', emoji: '🧑' },
  adults: { label: 'Adultos', emoji: '👤' },
};

const difficultyConfig: Record<Difficulty, { label: string; color: string; stars: number }> = {
  easy: { label: 'Fácil', color: 'bg-green-500/10 text-green-600 border-green-500/20', stars: 1 },
  medium: { label: 'Médio', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', stars: 2 },
  hard: { label: 'Difícil', color: 'bg-red-500/10 text-red-600 border-red-500/20', stars: 3 },
};

const WordSearchPage = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category>('youth');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [puzzle, setPuzzle] = useState<WordSearchPuzzle | null>(null);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState(false);
  const [startCell, setStartCell] = useState<CellPos | null>(null);
  const [currentCell, setCurrentCell] = useState<CellPos | null>(null);
  const [highlightedCells, setHighlightedCells] = useState<Set<string>>(new Set());
  const [timer, setTimer] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completed, setCompleted] = useState(false);

  const generatePuzzle = useCallback(() => {
    const puzzles = WORD_LISTS[category][difficulty];
    const chosen = puzzles[Math.floor(Math.random() * puzzles.length)];
    const { grid, size } = generateGrid(chosen.words, difficulty);
    setPuzzle({ title: chosen.title, words: chosen.words.map(w => w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '')), grid, size });
    setFoundWords(new Set());
    setHighlightedCells(new Set());
    setTimer(0);
    setIsPlaying(true);
    setCompleted(false);
  }, [category, difficulty]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const selectedCells = useMemo(() => {
    if (!startCell || !currentCell) return [];
    if (!isValidLine(startCell, currentCell)) return [startCell];
    return getCellsBetween(startCell, currentCell);
  }, [startCell, currentCell]);

  const handleCellDown = (row: number, col: number) => {
    if (!puzzle || completed) return;
    setSelecting(true);
    setStartCell({ row, col });
    setCurrentCell({ row, col });
  };

  const handleCellMove = (row: number, col: number) => {
    if (!selecting) return;
    setCurrentCell({ row, col });
  };

  const handleCellUp = () => {
    if (!selecting || !startCell || !currentCell || !puzzle) {
      setSelecting(false);
      return;
    }
    setSelecting(false);

    if (!isValidLine(startCell, currentCell)) return;
    
    const cells = getCellsBetween(startCell, currentCell);
    const selectedWord = cells.map(c => puzzle.grid[c.row][c.col]).join('');
    const reversedWord = [...selectedWord].reverse().join('');
    
    const matchedWord = puzzle.words.find(w => w === selectedWord || w === reversedWord);
    
    if (matchedWord && !foundWords.has(matchedWord)) {
      const newFound = new Set(foundWords);
      newFound.add(matchedWord);
      setFoundWords(newFound);
      
      const newHighlighted = new Set(highlightedCells);
      cells.forEach(c => newHighlighted.add(`${c.row}-${c.col}`));
      setHighlightedCells(newHighlighted);
      
      if (newFound.size === puzzle.words.length) {
        setCompleted(true);
        setIsPlaying(false);
        toast.success('🎉 Parabéns! Você encontrou todas as palavras!');
      }
    }
    
    setStartCell(null);
    setCurrentCell(null);
  };

  const isCellSelected = (row: number, col: number) => {
    return selectedCells.some(c => c.row === row && c.col === col);
  };

  const isCellHighlighted = (row: number, col: number) => {
    return highlightedCells.has(`${row}-${col}`);
  };

  return (
    <div className="p-4 space-y-5 animate-fade-in">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Search className="w-6 h-6 text-primary" />
          <h1 className="font-heading text-xl font-bold">Caça-Palavras Bíblico</h1>
        </div>
        <p className="text-sm text-muted-foreground">Encontre as palavras escondidas na grade!</p>
      </div>

      {!puzzle ? (
        <div className="space-y-5">
          {/* Category */}
          <div className="space-y-2">
            <h2 className="font-heading text-sm font-semibold text-muted-foreground">Categoria</h2>
            <Tabs value={category} onValueChange={v => setCategory(v as Category)}>
              <TabsList className="w-full grid grid-cols-3 h-10">
                {(Object.keys(categoryConfig) as Category[]).map(cat => (
                  <TabsTrigger key={cat} value={cat} className="text-xs gap-1">
                    {categoryConfig[cat].emoji} {categoryConfig[cat].label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Difficulty */}
          <div className="space-y-3">
            <h2 className="font-heading text-sm font-semibold text-muted-foreground">Nível de Dificuldade</h2>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(difficultyConfig) as Difficulty[]).map(diff => {
                const cfg = difficultyConfig[diff];
                const isSelected = difficulty === diff;
                return (
                  <Card
                    key={diff}
                    onClick={() => setDifficulty(diff)}
                    className={`p-4 rounded-2xl cursor-pointer text-center transition-all ${
                      isSelected ? 'ring-2 ring-primary border-primary shadow-md' : 'hover:border-primary/40'
                    }`}
                  >
                    <div className="flex justify-center gap-0.5 mb-2">
                      {Array.from({ length: cfg.stars }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-sm font-semibold">{cfg.label}</p>
                    <Badge variant="outline" className={`mt-2 text-[10px] ${cfg.color}`}>
                      {diff === 'easy' ? '10×10' : diff === 'medium' ? '13×13' : '16×16'}
                    </Badge>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Puzzle preview list */}
          <div className="space-y-3">
            <h2 className="font-heading text-sm font-semibold text-muted-foreground">Temas Disponíveis</h2>
            {WORD_LISTS[category][difficulty].map((p, idx) => (
              <Card key={idx} className="p-4 rounded-2xl space-y-2">
                <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  {p.title}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {p.words.map((w, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">{w}</Badge>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          <Button onClick={generatePuzzle} className="w-full h-12 rounded-xl text-base font-semibold gap-2">
            <Sparkles className="w-5 h-5" /> Iniciar Jogo
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Game header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading font-semibold text-base">{puzzle.title}</h2>
              <p className="text-xs text-muted-foreground">
                {categoryConfig[category].emoji} {categoryConfig[category].label} · {difficultyConfig[difficulty].label}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm font-mono font-semibold">
                <Clock className="w-4 h-4 text-primary" />
                {formatTime(timer)}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setPuzzle(null)} className="h-8 w-8">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${(foundWords.size / puzzle.words.length) * 100}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {foundWords.size}/{puzzle.words.length}
            </span>
          </div>

          {/* Grid */}
          <Card className="p-2 rounded-2xl overflow-x-auto">
            <div
              className="grid select-none mx-auto"
              style={{
                gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))`,
                maxWidth: puzzle.size <= 10 ? '360px' : puzzle.size <= 13 ? '420px' : '480px',
                touchAction: 'none',
              }}
              onMouseLeave={handleCellUp}
              onTouchEnd={handleCellUp}
            >
              {puzzle.grid.map((row, ri) =>
                row.map((letter, ci) => {
                  const highlighted = isCellHighlighted(ri, ci);
                  const selected = isCellSelected(ri, ci);
                  const cellSize = puzzle.size <= 10 ? 'text-base w-9 h-9' : puzzle.size <= 13 ? 'text-sm w-8 h-8' : 'text-xs w-6 h-6';
                  
                  return (
                    <div
                      key={`${ri}-${ci}`}
                      className={`
                        flex items-center justify-center font-mono font-bold cursor-pointer rounded-md transition-colors
                        ${cellSize}
                        ${highlighted ? 'bg-primary text-primary-foreground' : ''}
                        ${selected && !highlighted ? 'bg-primary/30 text-foreground' : ''}
                        ${!highlighted && !selected ? 'hover:bg-muted text-foreground' : ''}
                      `}
                      onMouseDown={() => handleCellDown(ri, ci)}
                      onMouseEnter={() => handleCellMove(ri, ci)}
                      onMouseUp={handleCellUp}
                      onTouchStart={(e) => { e.preventDefault(); handleCellDown(ri, ci); }}
                      onTouchMove={(e) => {
                        e.preventDefault();
                        const touch = e.touches[0];
                        const el = document.elementFromPoint(touch.clientX, touch.clientY);
                        if (el) {
                          const cellKey = el.getAttribute('data-cell');
                          if (cellKey) {
                            const [r, c] = cellKey.split('-').map(Number);
                            handleCellMove(r, c);
                          }
                        }
                      }}
                      data-cell={`${ri}-${ci}`}
                    >
                      {letter}
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Word list */}
          <Card className="p-4 rounded-2xl">
            <h3 className="text-xs font-semibold text-muted-foreground mb-3">Palavras para encontrar:</h3>
            <div className="flex flex-wrap gap-2">
              {puzzle.words.map((word, i) => {
                const found = foundWords.has(word);
                return (
                  <Badge
                    key={i}
                    variant={found ? 'default' : 'outline'}
                    className={`text-xs transition-all ${found ? 'bg-primary/90 line-through opacity-70' : ''}`}
                  >
                    {found && <Check className="w-3 h-3 mr-1" />}
                    {word}
                  </Badge>
                );
              })}
            </div>
          </Card>

        </div>
      )}

      {/* Victory overlay */}
      {completed && puzzle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
          {/* Confetti pieces */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {Array.from({ length: 60 }).map((_, i) => {
              const colors = ['#f43f5e', '#3b82f6', '#facc15', '#22c55e', '#a855f7', '#f97316', '#06b6d4'];
              const color = colors[i % colors.length];
              const left = `${Math.random() * 100}%`;
              const delay = `${Math.random() * 2}s`;
              const duration = `${2.5 + Math.random() * 2}s`;
              const size = `${6 + Math.random() * 8}px`;
              const rotation = `${Math.random() * 360}deg`;
              return (
                <span
                  key={i}
                  className="absolute top-0 block rounded-sm"
                  style={{
                    left,
                    width: size,
                    height: size,
                    backgroundColor: color,
                    transform: `rotate(${rotation})`,
                    animation: `confettiFall ${duration} ${delay} ease-in forwards`,
                    opacity: 0,
                  }}
                />
              );
            })}
          </div>

          <Card className="relative z-10 p-8 rounded-3xl text-center space-y-5 max-w-sm mx-4 border-primary/30 shadow-2xl animate-scale-in bg-card">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="font-heading text-2xl font-bold">Parabéns! 🎉</h2>
              <p className="text-muted-foreground text-sm">
                Você encontrou todas as <strong className="text-foreground">{puzzle.words.length} palavras</strong> em <strong className="text-foreground">{formatTime(timer)}</strong>!
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex flex-col items-center gap-1">
                <span className="text-lg font-bold text-foreground">{puzzle.words.length}</span>
                <span>Palavras</span>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="flex flex-col items-center gap-1">
                <span className="text-lg font-bold text-foreground">{formatTime(timer)}</span>
                <span>Tempo</span>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="flex flex-col items-center gap-1">
                <span className="text-lg font-bold text-foreground">{difficultyConfig[difficulty].label}</span>
                <span>Nível</span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <Button onClick={generatePuzzle} className="w-full h-11 rounded-xl font-semibold gap-2">
                <RotateCcw className="w-4 h-4" /> Jogar Novamente
              </Button>
              <Button onClick={() => navigate('/church/quiz')} variant="outline" className="w-full h-11 rounded-xl font-semibold gap-2">
                <Gamepad2 className="w-4 h-4" /> Voltar para Jogos
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default WordSearchPage;
