import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search, Sparkles, Heart, Users, DollarSign, Brain,
  BookOpen, Flame, Shield, Loader2, ArrowRight,
} from 'lucide-react';

const categories = [
  { key: 'faith', label: 'Fé', icon: Flame, color: 'bg-orange-500/10 text-orange-500' },
  { key: 'family', label: 'Família', icon: Users, color: 'bg-pink-500/10 text-pink-500' },
  { key: 'purpose', label: 'Propósito', icon: Brain, color: 'bg-purple-500/10 text-purple-500' },
  { key: 'finance', label: 'Finanças', icon: DollarSign, color: 'bg-green-500/10 text-green-500' },
  { key: 'healing', label: 'Cura emocional', icon: Heart, color: 'bg-red-500/10 text-red-500' },
  { key: 'wisdom', label: 'Sabedoria', icon: BookOpen, color: 'bg-blue-500/10 text-blue-500' },
  { key: 'courage', label: 'Coragem', icon: Shield, color: 'bg-gold/10 text-gold' },
  { key: 'joy', label: 'Alegria', icon: Sparkles, color: 'bg-yellow-500/10 text-yellow-500' },
];

const suggestedSearches = [
  'Quero estudar ansiedade',
  'Versículos sobre fé',
  'Pregações sobre família',
  'Como orar melhor',
  'Propósito de vida',
  'Versículos de encorajamento',
];

const ExplorePage = () => {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<null | any[]>(null);

  const handleSearch = async (searchQuery: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;
    setSearching(true);
    setQuery(q);
    // Simulating search - in production this would call the AI search API
    setTimeout(() => {
      setResults([]);
      setSearching(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-fade-in p-4">
      <div>
        <h1 className="font-heading text-2xl font-bold">Explorar</h1>
        <p className="text-sm text-muted-foreground">Busque em todos os cultos, estudos e versículos</p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="O que você quer estudar hoje?"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch(query)}
          className="pl-12 pr-12 py-6 rounded-2xl bg-muted/50 border-0 text-base"
        />
        {query && (
          <Button
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => handleSearch(query)}
            disabled={searching}
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          </Button>
        )}
      </div>

      {/* Quick searches */}
      {!results && (
        <>
          <div className="space-y-3">
            <h3 className="font-heading text-sm font-semibold text-muted-foreground">Sugestões de busca</h3>
            <div className="flex flex-wrap gap-2">
              {suggestedSearches.map(s => (
                <button
                  key={s}
                  onClick={() => handleSearch(s)}
                  className="px-3 py-1.5 rounded-full bg-muted/50 text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-3">
            <h3 className="font-heading text-sm font-semibold text-muted-foreground">Categorias</h3>
            <div className="grid grid-cols-2 gap-3">
              {categories.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => handleSearch(cat.label)}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all text-left"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.color}`}>
                    <cat.icon className="w-5 h-5" />
                  </div>
                  <span className="font-heading text-sm font-semibold">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Search results */}
      {searching && (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Buscando nos cultos e estudos...</p>
        </div>
      )}

      {results && !searching && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-sm font-semibold">
              Resultados para "{query}"
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => { setResults(null); setQuery(''); }}
            >
              Limpar
            </Button>
          </div>
          {results.length === 0 ? (
            <Card className="p-8 rounded-2xl text-center space-y-3">
              <Search className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <h3 className="font-heading font-semibold">Nenhum resultado encontrado</h3>
              <p className="text-sm text-muted-foreground">
                A busca inteligente funcionará quando cultos forem processados pela IA.
              </p>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default ExplorePage;
