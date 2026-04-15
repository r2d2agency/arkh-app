import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import {
  Swords, Zap, Shield, SkipForward, Sparkles, Trophy, Star,
  Timer, Crown, ChevronRight, ArrowLeft, Flame, Target, Users, Bot,
  XCircle, CheckCircle2, Clock, Medal, Gamepad2, History, BarChart3,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type GameScreen = 'lobby' | 'loading' | 'playing' | 'result';
type Difficulty = 'easy' | 'medium' | 'hard';

interface BattleQuestion {
  id: string;
  question_text: string;
  bible_reference: string;
  explanation: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  question_order: number;
}

interface Player {
  id: string;
  display_name: string;
  is_ai: boolean;
  score: number;
  combo: number;
  correct_answers: number;
  total_answers: number;
}

interface Power {
  type: 'skip' | 'freeze' | 'double' | 'eliminate';
  label: string;
  icon: any;
  description: string;
  available: boolean;
  cooldown: number;
}

interface BattleHistory {
  id: string;
  mode: string;
  difficulty: string;
  score: number;
  placement: number;
  xp_earned: number;
  points_earned: number;
  correct_answers: number;
  total_answers: number;
  finished_at: string;
}

const difficultyConfig: Record<Difficulty, { label: string; color: string; glow: string; emoji: string; desc: string }> = {
  easy: { label: 'Fácil', color: 'from-emerald-500 to-green-600', glow: 'shadow-emerald-500/30', emoji: '🌱', desc: 'Perguntas básicas' },
  medium: { label: 'Médio', color: 'from-amber-500 to-orange-600', glow: 'shadow-amber-500/30', emoji: '⚡', desc: 'Nível intermediário' },
  hard: { label: 'Difícil', color: 'from-red-500 to-rose-600', glow: 'shadow-red-500/30', emoji: '🔥', desc: 'Desafio avançado' },
};

const BibleBattlePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<GameScreen>('lobby');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<BattleHistory[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);

  // Game state
  const [roomId, setRoomId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<BattleQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]);
  const [humanPlayerId, setHumanPlayerId] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(10);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<any>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [combo, setCombo] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const [isDoubleActive, setIsDoubleActive] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<any>(null);

  // Powers
  const [powers, setPowers] = useState<Power[]>([
    { type: 'skip', label: 'Pular', icon: SkipForward, description: 'Pular pergunta', available: true, cooldown: 0 },
    { type: 'freeze', label: 'Congelar', icon: Shield, description: 'Congela o adversário', available: true, cooldown: 0 },
    { type: 'double', label: 'Dobrar', icon: Sparkles, description: 'Dobra pontuação', available: true, cooldown: 0 },
    { type: 'eliminate', label: 'Eliminar', icon: XCircle, description: 'Remove 2 opções', available: true, cooldown: 0 },
  ]);

  // Final results
  const [finalResult, setFinalResult] = useState<any>(null);

  // Timer
  useEffect(() => {
    if (screen !== 'playing' || showExplanation || selectedOption) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [screen, currentQ, showExplanation, selectedOption]);

  const handleTimeUp = useCallback(() => {
    if (selectedOption || showExplanation) return;
    submitAnswer(null);
  }, [selectedOption, showExplanation, roomId, questions, currentQ]);

  const startSoloGame = async () => {
    setScreen('loading');
    try {
      const data: any = await api.post('/api/church/battles/start-solo', { difficulty });
      setRoomId(data.room.id);
      setQuestions(data.questions);
      setHumanPlayerId(data.human_player.id);
      setPlayers([
        { id: data.human_player.id, display_name: data.human_player.display_name, is_ai: false, score: 0, combo: 0, correct_answers: 0, total_answers: 0 },
        { id: data.ai_player.id, display_name: data.ai_player.display_name, is_ai: true, score: 0, combo: 0, correct_answers: 0, total_answers: 0 },
      ]);
      setCurrentQ(0);
      setTotalScore(0);
      setCombo(0);
      setTimeLeft(10);
      setSelectedOption(null);
      setAnswerResult(null);
      setShowExplanation(false);
      setEliminatedOptions([]);
      setIsDoubleActive(false);
      setPowers(p => p.map(pw => ({ ...pw, available: true, cooldown: 0 })));
      startTimeRef.current = Date.now();
      setScreen('playing');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar batalha');
      setScreen('lobby');
    }
  };

  const submitAnswer = async (option: string | null) => {
    if (!roomId || !questions[currentQ]) return;
    clearInterval(timerRef.current);
    setSelectedOption(option);

    const timeMs = Date.now() - startTimeRef.current;
    try {
      const data: any = await api.post(`/api/church/battles/${roomId}/answer`, {
        question_id: questions[currentQ].id,
        selected_option: option,
        time_ms: timeMs,
        power_used: isDoubleActive ? 'double' : undefined,
      });
      setAnswerResult(data);
      setPlayers(data.players);
      if (data.is_correct) {
        setCombo(prev => prev + 1);
        setTotalScore(prev => prev + data.points_awarded);
      } else {
        setCombo(0);
      }
      setIsDoubleActive(false);
      setShowExplanation(true);
    } catch (err: any) {
      toast.error('Erro ao enviar resposta');
      setShowExplanation(true);
    }
  };

  const nextQuestion = () => {
    if (currentQ >= questions.length - 1) {
      finishGame();
      return;
    }
    setCurrentQ(prev => prev + 1);
    setTimeLeft(10);
    setSelectedOption(null);
    setAnswerResult(null);
    setShowExplanation(false);
    setEliminatedOptions([]);
    startTimeRef.current = Date.now();
    // Decrease cooldowns
    setPowers(p => p.map(pw => ({ ...pw, cooldown: Math.max(0, pw.cooldown - 1) })));
  };

  const finishGame = async () => {
    if (!roomId) return;
    try {
      const data = await api.post(`/api/church/battles/${roomId}/finish`, {});
      setFinalResult(data);
      setScreen('result');
    } catch (err) {
      toast.error('Erro ao finalizar batalha');
      setScreen('result');
    }
  };

  const usePower = (powerType: string) => {
    const power = powers.find(p => p.type === powerType);
    if (!power || !power.available || power.cooldown > 0) return;

    setPowers(p => p.map(pw =>
      pw.type === powerType ? { ...pw, available: false, cooldown: 3 } : pw
    ));

    switch (powerType) {
      case 'skip':
        nextQuestion();
        break;
      case 'freeze':
        // Freeze AI (visual only in solo)
        toast('❄️ Adversário congelado!');
        break;
      case 'double':
        setIsDoubleActive(true);
        toast('✨ Pontuação dobrada nesta pergunta!');
        break;
      case 'eliminate': {
        const q = questions[currentQ];
        if (!q || !answerResult) {
          // Eliminate 2 wrong options randomly (we don't know correct yet, so pick 2 random)
          const options = ['a', 'b', 'c', 'd'];
          const shuffled = options.sort(() => Math.random() - 0.5);
          setEliminatedOptions(shuffled.slice(0, 2));
        }
        break;
      }
    }
  };

  const loadHistory = async () => {
    try {
      const [hist, rank] = await Promise.all([
        api.get<BattleHistory[]>('/api/church/battles/history'),
        api.get<any[]>('/api/church/battles/ranking'),
      ]);
      setHistory((hist as BattleHistory[]) || []);
      setRanking((rank as any[]) || []);
      setShowHistory(true);
    } catch { /* ignore */ }
  };

  const humanPlayer = players.find(p => !p.is_ai);
  const aiPlayer = players.find(p => p.is_ai);

  // =================== LOBBY ===================
  if (screen === 'lobby') {
    return (
      <div className="min-h-screen p-4 space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/church')} className="p-2 rounded-xl hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
              <Swords className="w-7 h-7 text-purple-400" />
              Batalha Bíblica
            </h1>
            <p className="text-sm text-muted-foreground">Teste seu conhecimento!</p>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">Modo de Jogo</h2>
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 rounded-2xl border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-blue-500/10 cursor-pointer hover:border-purple-500/50 transition-all"
              onClick={() => {}}>
              <div className="text-center space-y-2">
                <Bot className="w-8 h-8 text-purple-400 mx-auto" />
                <h3 className="font-bold text-sm">Solo vs IA</h3>
                <p className="text-xs text-muted-foreground">Enfrente a IA</p>
              </div>
            </Card>
            <Card className="p-4 rounded-2xl border-muted opacity-50 cursor-not-allowed">
              <div className="text-center space-y-2">
                <Users className="w-8 h-8 text-muted-foreground mx-auto" />
                <h3 className="font-bold text-sm">PvP Online</h3>
                <p className="text-xs text-muted-foreground">Em breve</p>
              </div>
            </Card>
          </div>
        </div>

        {/* Difficulty */}
        <div className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">Dificuldade</h2>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(difficultyConfig) as [Difficulty, typeof difficultyConfig.easy][]).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setDifficulty(key)}
                className={`p-3 rounded-2xl border-2 transition-all text-center space-y-1 ${
                  difficulty === key
                    ? `border-purple-500 bg-gradient-to-br ${cfg.color} text-white shadow-lg ${cfg.glow}`
                    : 'border-muted bg-muted/30 hover:border-muted-foreground/30'
                }`}
              >
                <span className="text-xl">{cfg.emoji}</span>
                <p className="font-bold text-xs">{cfg.label}</p>
                <p className={`text-[10px] ${difficulty === key ? 'text-white/80' : 'text-muted-foreground'}`}>{cfg.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Powers Preview */}
        <Card className="p-4 rounded-2xl border-blue-500/20 space-y-3">
          <h3 className="font-heading text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-400" /> Poderes Disponíveis
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: SkipForward, label: 'Pular', color: 'text-yellow-400' },
              { icon: Shield, label: 'Congelar', color: 'text-cyan-400' },
              { icon: Sparkles, label: 'Dobrar', color: 'text-purple-400' },
              { icon: XCircle, label: 'Eliminar', color: 'text-red-400' },
            ].map((p, i) => (
              <div key={i} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-muted/30">
                <p.icon className={`w-5 h-5 ${p.color}`} />
                <span className="text-[10px] font-medium">{p.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Start Button */}
        <Button
          onClick={startSoloGame}
          className="w-full h-14 rounded-2xl text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/20"
        >
          <Swords className="w-5 h-5 mr-2" />
          Iniciar Batalha
        </Button>

        {/* History & Ranking */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={loadHistory}>
            <History className="w-4 h-4 mr-1" /> Histórico
          </Button>
          <Button variant="outline" className="flex-1 rounded-xl" onClick={loadHistory}>
            <BarChart3 className="w-4 h-4 mr-1" /> Ranking
          </Button>
        </div>

        {/* History/Ranking Sheet */}
        {showHistory && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowHistory(false)} />
            <div className="relative bg-background rounded-t-2xl w-full max-w-md max-h-[80vh] overflow-y-auto p-6 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg font-bold">🏆 Ranking & Histórico</h2>
                <button onClick={() => setShowHistory(false)} className="p-1 rounded-lg hover:bg-muted">✕</button>
              </div>

              {ranking.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Top Jogadores</h3>
                  {ranking.map((r: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-muted/30">
                      <span className="font-bold text-lg w-6">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.wins} vitórias · {r.battles_played} batalhas</p>
                      </div>
                      <span className="font-bold text-sm text-purple-400">{r.total_score}pts</span>
                    </div>
                  ))}
                </div>
              )}

              {history.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Suas Batalhas</h3>
                  {history.map((h) => (
                    <div key={h.id} className="flex items-center gap-3 p-2 rounded-xl bg-muted/30">
                      <span className="text-lg">{h.placement === 1 ? '🏆' : '⚔️'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs">{difficultyConfig[h.difficulty as Difficulty]?.label || h.difficulty}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {h.correct_answers}/{h.total_answers} acertos · +{h.xp_earned}XP
                        </p>
                      </div>
                      <span className="font-bold text-sm">{h.score}pts</span>
                    </div>
                  ))}
                </div>
              )}

              {!ranking.length && !history.length && (
                <p className="text-center text-muted-foreground text-sm py-8">Nenhuma batalha ainda. Comece agora!</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // =================== LOADING ===================
  if (screen === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 animate-pulse">
          <Swords className="w-16 h-16 text-purple-400 mx-auto animate-bounce" />
          <h2 className="font-heading text-xl font-bold">Preparando Batalha...</h2>
          <p className="text-sm text-muted-foreground">Gerando perguntas com IA</p>
          <div className="flex justify-center gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-3 h-3 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =================== PLAYING ===================
  if (screen === 'playing' && questions[currentQ]) {
    const q = questions[currentQ];
    const options = [
      { key: 'a', text: q.option_a },
      { key: 'b', text: q.option_b },
      { key: 'c', text: q.option_c },
      { key: 'd', text: q.option_d },
    ].filter(o => !eliminatedOptions.includes(o.key));

    const getOptionStyle = (key: string) => {
      if (!answerResult) {
        if (selectedOption === key) return 'border-purple-500 bg-purple-500/20';
        return 'border-muted hover:border-purple-500/50 hover:bg-purple-500/5';
      }
      if (key === answerResult.correct_option) return 'border-emerald-500 bg-emerald-500/20 shadow-emerald-500/20 shadow-lg';
      if (selectedOption === key && !answerResult.is_correct) return 'border-red-500 bg-red-500/20 shadow-red-500/20 shadow-lg';
      return 'border-muted/50 opacity-50';
    };

    return (
      <div className="min-h-screen p-4 space-y-4 animate-fade-in">
        {/* Header: scores */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold">
              {user?.name?.[0]}
            </div>
            <div>
              <p className="text-xs font-semibold">{user?.name?.split(' ')[0]}</p>
              <p className="text-lg font-bold text-purple-400">{humanPlayer?.score || 0}</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Pergunta</p>
            <p className="font-bold">{currentQ + 1}/{questions.length}</p>
          </div>
          <div className="text-right flex items-center gap-2">
            <div>
              <p className="text-xs font-semibold">{aiPlayer?.display_name?.replace(/🤖 /, '')}</p>
              <p className="text-lg font-bold text-red-400">{aiPlayer?.score || 0}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-sm">🤖</div>
          </div>
        </div>

        {/* Timer */}
        <div className="relative">
          <Progress
            value={(timeLeft / 10) * 100}
            className={`h-2 ${timeLeft <= 3 ? '[&>div]:bg-red-500' : '[&>div]:bg-purple-500'}`}
          />
          <div className={`absolute -top-1 right-0 flex items-center gap-1 text-xs font-bold ${timeLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`}>
            <Timer className="w-3 h-3" /> {timeLeft}s
          </div>
        </div>

        {/* Combo */}
        {combo > 1 && (
          <div className="flex items-center justify-center gap-1 text-amber-400 animate-bounce">
            <Flame className="w-4 h-4" />
            <span className="text-sm font-bold">Combo x{combo}!</span>
          </div>
        )}

        {/* Double active */}
        {isDoubleActive && !showExplanation && (
          <div className="flex items-center justify-center gap-1 text-purple-400 animate-pulse">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-bold">Pontuação dobrada!</span>
          </div>
        )}

        {/* Question Card */}
        <Card className="p-5 rounded-2xl border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-blue-500/5 shadow-lg shadow-purple-500/5">
          <p className="font-heading text-base font-semibold leading-relaxed">{q.question_text}</p>
          {q.bible_reference && (
            <p className="text-xs text-purple-400 mt-2">📖 {q.bible_reference}</p>
          )}
        </Card>

        {/* Options */}
        <div className="space-y-2">
          {options.map((opt) => (
            <button
              key={opt.key}
              disabled={!!selectedOption || !!answerResult}
              onClick={() => submitAnswer(opt.key)}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${getOptionStyle(opt.key)}`}
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center text-xs font-bold uppercase">
                  {opt.key}
                </span>
                <span className="text-sm font-medium flex-1">{opt.text}</span>
                {answerResult && opt.key === answerResult.correct_option && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                )}
                {answerResult && selectedOption === opt.key && !answerResult.is_correct && (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Explanation */}
        {showExplanation && answerResult && (
          <div className="space-y-3 animate-fade-in">
            <Card className={`p-4 rounded-2xl ${answerResult.is_correct ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
              <div className="flex items-center gap-2 mb-2">
                {answerResult.is_correct ? (
                  <><CheckCircle2 className="w-5 h-5 text-emerald-500" /><span className="font-bold text-emerald-500">Correto! +{answerResult.points_awarded}pts</span></>
                ) : (
                  <><XCircle className="w-5 h-5 text-red-500" /><span className="font-bold text-red-500">Incorreto</span></>
                )}
              </div>
              {questions[currentQ]?.explanation && (
                <p className="text-xs text-muted-foreground leading-relaxed">{questions[currentQ].explanation}</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-2">
                {answerResult.ai_correct ? '🤖 IA acertou' : '🤖 IA errou'} ({answerResult.ai_points}pts)
              </p>
            </Card>
            <Button onClick={nextQuestion} className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600">
              {currentQ >= questions.length - 1 ? 'Ver Resultado' : 'Próxima Pergunta'}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Powers */}
        {!showExplanation && !selectedOption && (
          <div className="flex justify-center gap-2">
            {powers.map(p => (
              <button
                key={p.type}
                disabled={!p.available || p.cooldown > 0}
                onClick={() => usePower(p.type)}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all min-w-[60px] ${
                  p.available && p.cooldown === 0
                    ? 'bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30'
                    : 'bg-muted/20 opacity-40 cursor-not-allowed'
                }`}
              >
                <p.icon className="w-4 h-4 text-purple-400" />
                <span className="text-[9px] font-medium">{p.label}</span>
                {p.cooldown > 0 && <span className="text-[8px] text-red-400">{p.cooldown}🔄</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // =================== RESULT ===================
  if (screen === 'result') {
    const won = finalResult?.human_won;
    const humanFinal = finalResult?.players?.find((p: any) => !p.is_ai);
    const aiFinal = finalResult?.players?.find((p: any) => p.is_ai);

    return (
      <div className="min-h-screen p-4 flex flex-col items-center justify-center space-y-6 animate-fade-in">
        {/* Winner announcement */}
        <div className="text-center space-y-3">
          {won ? (
            <>
              <div className="text-6xl animate-bounce">🏆</div>
              <h1 className="font-heading text-3xl font-bold bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
                Vitória!
              </h1>
            </>
          ) : (
            <>
              <div className="text-6xl">⚔️</div>
              <h1 className="font-heading text-3xl font-bold text-muted-foreground">Derrota</h1>
            </>
          )}
          <p className="text-sm text-muted-foreground">
            {won ? 'Parabéns, guerreiro(a) da fé!' : 'Continue praticando!'}
          </p>
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          <Card className={`p-4 rounded-2xl text-center ${won ? 'border-amber-500/30 bg-amber-500/5' : 'border-muted'}`}>
            <p className="text-xs text-muted-foreground">Você</p>
            <p className="font-bold text-2xl text-purple-400">{humanFinal?.score || 0}</p>
            <p className="text-[10px] text-muted-foreground">{humanFinal?.correct_answers || 0}/{humanFinal?.total_answers || 0} acertos</p>
          </Card>
          <Card className={`p-4 rounded-2xl text-center ${!won ? 'border-red-500/30 bg-red-500/5' : 'border-muted'}`}>
            <p className="text-xs text-muted-foreground">IA</p>
            <p className="font-bold text-2xl text-red-400">{aiFinal?.score || 0}</p>
            <p className="text-[10px] text-muted-foreground">{aiFinal?.correct_answers || 0}/{aiFinal?.total_answers || 0} acertos</p>
          </Card>
        </div>

        {/* Rewards */}
        <Card className="p-4 rounded-2xl border-purple-500/20 bg-purple-500/5 w-full max-w-sm space-y-3">
          <h3 className="font-heading text-sm font-semibold flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" /> Recompensas
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
              <Zap className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-xs font-bold">+{finalResult?.xp_earned || 0} XP</p>
                <p className="text-[9px] text-muted-foreground">Experiência</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
              <Trophy className="w-4 h-4 text-amber-400" />
              <div>
                <p className="text-xs font-bold">+{finalResult?.points_earned || 0} pts</p>
                <p className="text-[9px] text-muted-foreground">Pontos</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
              <Flame className="w-4 h-4 text-orange-400" />
              <div>
                <p className="text-xs font-bold">x{humanFinal?.max_combo || 0}</p>
                <p className="text-[9px] text-muted-foreground">Maior combo</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
              <Target className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-xs font-bold">{humanFinal?.total_answers ? Math.round((humanFinal.correct_answers / humanFinal.total_answers) * 100) : 0}%</p>
                <p className="text-[9px] text-muted-foreground">Precisão</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="w-full max-w-sm space-y-2">
          <Button onClick={() => { setScreen('lobby'); }} className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600">
            <Swords className="w-4 h-4 mr-2" /> Jogar Novamente
          </Button>
          <Button variant="outline" onClick={() => navigate('/church')} className="w-full rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default BibleBattlePage;
