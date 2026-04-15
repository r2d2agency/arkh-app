import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search, Sparkles, Heart, Users, DollarSign, Brain,
  BookOpen, Flame, Shield, Loader2, Video, Calendar, User, Clock,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';

interface SearchResult {
  id: string;
  title: string;
  preacher: string;
  service_date: string;
  ai_status: string;
  ai_summary: string;
  youtube_url: string;
  created_at: string;
}

const categories = [
  { key: 'fé', label: 'Fé', icon: Flame, color: 'bg-orange-500/10 text-orange-500' },
  { key: 'família', label: 'Família', icon: Users, color: 'bg-pink-500/10 text-pink-500' },
  { key: 'propósito', label: 'Propósito', icon: Brain, color: 'bg-purple-500/10 text-purple-500' },
  { key: 'finanças', label: 'Finanças', icon: DollarSign, color: 'bg-green-500/10 text-green-500' },
  { key: 'cura', label: 'Cura emocional', icon: Heart, color: 'bg-red-500/10 text-red-500' },
  { key: 'sabedoria', label: 'Sabedoria', icon: BookOpen, color: 'bg-blue-500/10 text-blue-500' },
  { key: 'coragem', label: 'Coragem', icon: Shield, color: 'bg-gold/10 text-gold' },
  { key: 'alegria', label: 'Alegria', icon: Sparkles, color: 'bg-yellow-500/10 text-yellow-500' },
];

const suggestedSearches = [
  'Ansiedade', 'Versículos sobre fé', 'Família',
  'Oração', 'Propósito', 'Encorajamento',
];

const getYouTubeId = (url: string) => {
  const match = url?.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1];
};

const ExplorePage = () => {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);

  const handleSearch = async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;
    setSearching(true);
    setQuery(q);
    try {
      const data = await api.get<SearchResult[]>(`/api/church/search?q=${encodeURIComponent(q)}`);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-4">
      <div>
        <h1 className="font-heading text-2xl font-bold">Explorar</h1>
        <p className="text-sm text-muted-foreground">Busque em todos os cultos processados pela IA</p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="O que você quer estudar hoje?"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          className="pl-12 pr-12 py-6 rounded-2xl bg-muted/50 border-0 text-base"
        />
        {query && (
          <Button
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => handleSearch()}
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

          <div className="space-y-3">
            <h3 className="font-heading text-sm font-semibold text-muted-foreground">Categorias</h3>
            <div className="grid grid-cols-2 gap-3">
              {categories.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => handleSearch(cat.key)}
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

      {/* Loading */}
      {searching && (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Buscando nos cultos e estudos...</p>
        </div>
      )}

      {/* Results */}
      {results && !searching && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-sm font-semibold">
              {results.length} resultado{results.length !== 1 ? 's' : ''} para "{query}"
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
              <h3 className="font-heading font-semibold">Nenhum resultado</h3>
              <p className="text-sm text-muted-foreground">
                Tente buscar por outros termos. A busca funciona em cultos processados pela IA.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {results.map(r => {
                const ytId = getYouTubeId(r.youtube_url);
                return (
                  <Link key={r.id} to={`/church/services/${r.id}`}>
                    <Card className="rounded-2xl overflow-hidden card-hover">
                      <div className="flex gap-3 p-3">
                        <div className="relative w-24 h-16 rounded-xl overflow-hidden bg-muted shrink-0">
                          {ytId ? (
                            <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt={r.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Video className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <h3 className="font-medium text-sm truncate">{r.title}</h3>
                          {r.preacher && <p className="text-xs text-muted-foreground">{r.preacher}</p>}
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {(() => {
                              const s = (r.ai_summary || '').trim();
                              if (s.startsWith('{')) {
                                try { const p = JSON.parse(s); return (p.summary || p.resumo || p.text || s).slice(0, 120); } catch { return s.slice(0, 120); }
                              }
                              return s.slice(0, 120);
                            })()}...
                          </p>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExplorePage;
