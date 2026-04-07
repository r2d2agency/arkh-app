import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BookOpen, Search, Loader2, BookMarked, CheckCircle, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';

interface Study {
  id: string;
  title: string;
  description: string;
  key_verse: string;
  category: string;
  author_name: string;
  completions: number;
}

const MemberStudies = () => {
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<Study[]>('/api/church/studies')
      .then(setStudies)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = studies.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 animate-fade-in p-4">
      <div>
        <h1 className="font-heading text-2xl font-bold">Estudar</h1>
        <p className="text-sm text-muted-foreground">Estudos bíblicos da sua igreja</p>
      </div>

      {studies.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar estudos..." className="pl-9 rounded-2xl bg-muted/50 border-0" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 rounded-2xl text-center space-y-3">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <h3 className="font-heading font-semibold text-lg">Nenhum estudo disponível</h3>
          <p className="text-sm text-muted-foreground">Os estudos criados pela liderança aparecerão aqui.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(study => (
            <Link key={study.id} to={`/church/studies/${study.id}`}>
              <Card className="p-4 rounded-2xl card-hover space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-semibold text-sm">{study.title}</h3>
                    {study.category && (
                      <Badge variant="secondary" className="rounded-full text-[10px] mt-1">{study.category}</Badge>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                </div>
                {study.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{study.description}</p>
                )}
                {study.key_verse && (
                  <p className="text-xs text-gold italic flex items-center gap-1">
                    <BookMarked className="w-3 h-3" /> {study.key_verse}
                  </p>
                )}
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {study.completions || 0} completaram</span>
                  {study.author_name && <span>• {study.author_name}</span>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default MemberStudies;
