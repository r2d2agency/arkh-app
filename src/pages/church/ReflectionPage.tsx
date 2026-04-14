import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Heart, Sun, Flame, Smile, Frown, CloudRain, HelpCircle, Zap,
  Sparkles, ArrowLeft, BookOpen, Send, Share2,
} from 'lucide-react';

const moodMap: Record<string, { label: string; icon: any; color: string; verse: string; reflection: string }> = {
  grateful: {
    label: 'Grato',
    icon: Heart,
    color: 'text-pink-500',
    verse: '"Deem graças ao Senhor, porque ele é bom; o seu amor dura para sempre." — Salmos 107:1',
    reflection: 'A gratidão é uma porta que abre bênçãos. Quando reconhecemos o que Deus fez, nos posicionamos para receber mais. O que você é grato hoje?',
  },
  peaceful: {
    label: 'Em paz',
    icon: Sun,
    color: 'text-gold',
    verse: '"Deixo-lhes a paz; a minha paz lhes dou. Não a dou como o mundo a dá." — João 14:27',
    reflection: 'A paz que vem de Deus não depende das circunstâncias. É um estado do coração que permanece mesmo em meio à tempestade.',
  },
  motivated: {
    label: 'Motivado',
    icon: Flame,
    color: 'text-orange-500',
    verse: '"Tudo posso naquele que me fortalece." — Filipenses 4:13',
    reflection: 'Use essa energia para avançar nos propósitos que Deus tem para você. Cada passo de obediência é um passo de fé.',
  },
  happy: {
    label: 'Feliz',
    icon: Smile,
    color: 'text-green-500',
    verse: '"Este é o dia que o Senhor fez; regozijemo-nos e alegremo-nos nele." — Salmos 118:24',
    reflection: 'A alegria do Senhor é a nossa força. Compartilhe essa alegria com alguém hoje!',
  },
  sad: {
    label: 'Desanimado',
    icon: Frown,
    color: 'text-blue-400',
    verse: '"Não temas, porque eu sou contigo; não te assombres, porque eu sou teu Deus." — Isaías 41:10',
    reflection: 'Nos momentos difíceis, Deus está mais perto do que você imagina. Ele promete que nunca nos abandonará.',
  },
  anxious: {
    label: 'Ansioso',
    icon: CloudRain,
    color: 'text-purple-500',
    verse: '"Lancem sobre ele toda a sua ansiedade, porque ele tem cuidado de vocês." — 1 Pedro 5:7',
    reflection: 'A ansiedade quer roubar seu presente. Entregue seus medos a Deus — Ele é fiel para cuidar de cada detalhe.',
  },
  confused: {
    label: 'Confuso',
    icon: HelpCircle,
    color: 'text-muted-foreground',
    verse: '"Confie no Senhor de todo o seu coração e não se apoie em seu próprio entendimento." — Provérbios 3:5',
    reflection: 'Quando não entendemos o caminho, podemos confiar em quem o traçou. Deus vê o que não vemos.',
  },
  tired: {
    label: 'Cansado',
    icon: Zap,
    color: 'text-yellow-600',
    verse: '"Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei." — Mateus 11:28',
    reflection: 'Descansar não é fraqueza, é sabedoria. Jesus convida você a pausar e encontrar nEle o verdadeiro descanso.',
  },
};

const ReflectionPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mood = searchParams.get('mood') || 'grateful';
  const moodData = moodMap[mood] || moodMap.grateful;
  const MoodIcon = moodData.icon;
  const [freeText, setFreeText] = useState('');

  const handleConvertToStory = () => {
    const verse = encodeURIComponent(moodData.verse);
    navigate(`/church/social-post?fromDevotional=1&verse=${verse}`);
  };

  return (
    <div className="space-y-5 animate-fade-in p-4">
      <Link to="/church" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar ao início
      </Link>

      <div className="text-center space-y-2 pt-2">
        <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-muted/50`}>
          <MoodIcon className={`w-8 h-8 ${moodData.color}`} />
        </div>
        <h1 className="font-heading text-xl font-bold">Você está {moodData.label.toLowerCase()}</h1>
        <p className="text-sm text-muted-foreground">Aqui está uma reflexão para você</p>
      </div>

      {/* Verse card */}
      <Card className="p-5 rounded-2xl border-gold/20 bg-gold/5 space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-gold" />
          <h3 className="font-heading text-sm font-semibold">Versículo para hoje</h3>
        </div>
        <blockquote className="text-sm italic border-l-2 border-gold/40 pl-3 text-muted-foreground">
          {moodData.verse}
        </blockquote>
      </Card>

      {/* Convert to Story */}
      <Button
        onClick={handleConvertToStory}
        className="w-full rounded-2xl h-12 gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg"
      >
        <Share2 className="w-4 h-4" />
        Converter em Story
      </Button>

      {/* Reflection */}
      <Card className="p-5 rounded-2xl space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-heading text-sm font-semibold">Reflexão</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {moodData.reflection}
        </p>
      </Card>

      {/* Free text */}
      <Card className="p-5 rounded-2xl space-y-3">
        <h3 className="font-heading text-sm font-semibold">O que está no seu coração?</h3>
        <Textarea
          placeholder="Escreva livremente o que está sentindo..."
          value={freeText}
          onChange={e => setFreeText(e.target.value)}
          className="rounded-xl min-h-[100px] bg-muted/30 border-0 resize-none"
        />
        {freeText.trim() && (
          <Button size="sm" className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Receber conselho personalizado
          </Button>
        )}
      </Card>
    </div>
  );
};

export default ReflectionPage;
