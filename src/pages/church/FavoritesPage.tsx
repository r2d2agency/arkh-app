import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Video, BookOpen, Loader2, Trash2, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface Favorite {
  id: string; content_type: string; content_id: string;
  content_title: string; thumbnail_url: string; created_at: string;
}

const FavoritesPage = () => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get<Favorite[]>('/api/church/media/favorites')
      .then(setFavorites)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRemove = async (f: Favorite) => {
    try {
      await api.delete(`/api/church/media/favorites/${f.content_type}/${f.content_id}`);
      setFavorites(prev => prev.filter(x => x.id !== f.id));
      toast.success('Removido dos favoritos');
    } catch {}
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const services = favorites.filter(f => f.content_type === 'service');
  const studies = favorites.filter(f => f.content_type === 'study');

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
          <Heart className="w-5 h-5 text-rose-400" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">Favoritos</h1>
          <p className="text-sm text-muted-foreground">{favorites.length} itens salvos</p>
        </div>
      </div>

      {favorites.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <Heart className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Nenhum favorito ainda</p>
          <p className="text-xs text-muted-foreground mt-1">Toque no ❤️ nos cultos e estudos para salvar aqui</p>
        </Card>
      ) : (
        <Tabs defaultValue="services">
          <TabsList className="w-full">
            <TabsTrigger value="services" className="flex-1">
              <Video className="w-4 h-4 mr-1" /> Cultos ({services.length})
            </TabsTrigger>
            <TabsTrigger value="studies" className="flex-1">
              <BookOpen className="w-4 h-4 mr-1" /> Estudos ({studies.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="space-y-2 mt-4">
            {services.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">Nenhum culto favoritado</p>
            ) : services.map(f => (
              <Card key={f.id} className="p-3 flex items-center gap-3">
                {f.thumbnail_url && (
                  <img src={f.thumbnail_url} alt="" className="w-16 h-10 rounded object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{f.content_title || 'Sem título'}</p>
                </div>
                <div className="flex gap-1">
                  <Link to={`/church/services/${f.content_id}`}>
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button size="icon" variant="ghost" onClick={() => handleRemove(f)} className="h-8 w-8 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="studies" className="space-y-2 mt-4">
            {studies.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">Nenhum estudo favoritado</p>
            ) : studies.map(f => (
              <Card key={f.id} className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{f.content_title || 'Sem título'}</p>
                </div>
                <div className="flex gap-1">
                  <Link to={`/church/studies/${f.content_id}`}>
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button size="icon" variant="ghost" onClick={() => handleRemove(f)} className="h-8 w-8 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default FavoritesPage;
