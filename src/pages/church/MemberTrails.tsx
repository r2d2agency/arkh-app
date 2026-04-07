import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Loader2, ArrowRight, CheckCircle, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';

interface Trail {
  id: string;
  title: string;
  description: string;
  objective: string;
  item_count: number;
  user_completed: number;
}

const MemberTrails = () => {
  const [trails, setTrails] = useState<Trail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Trail[]>('/api/church/studies/trails/list')
      .then(setTrails)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5 animate-fade-in p-4">
      <div>
        <h1 className="font-heading text-2xl font-bold">Trilhas de Estudo</h1>
        <p className="text-sm text-muted-foreground">Siga sequências organizadas de conteúdo</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : trails.length === 0 ? (
        <Card className="p-12 rounded-2xl text-center space-y-3">
          <MapPin className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <h3 className="font-heading font-semibold text-lg">Nenhuma trilha disponível</h3>
          <p className="text-sm text-muted-foreground">As trilhas de estudo aparecerão aqui.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {trails.map(trail => {
            const progress = trail.item_count > 0 ? Math.round((trail.user_completed / trail.item_count) * 100) : 0;
            const isComplete = progress === 100;
            return (
              <Link key={trail.id} to={`/church/trails/${trail.id}`}>
                <Card className="p-4 rounded-2xl card-hover space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-semibold text-sm">{trail.title}</h3>
                      {trail.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{trail.description}</p>}
                    </div>
                    {isComplete ? (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20 shrink-0">
                        <CheckCircle className="w-3 h-3 mr-0.5" /> Completa
                      </Badge>
                    ) : (
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{trail.user_completed}/{trail.item_count} etapas</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MemberTrails;
