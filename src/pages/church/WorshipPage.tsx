import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Music, Plus, Search, Play, ExternalLink, Sparkles, Loader2,
  Edit2, Trash2, Guitar, BookOpen, User, Heart, List,
  GripVertical, SkipForward, Clock
} from 'lucide-react';

interface Song {
  id: string;
  title: string;
  artist: string | null;
  composer: string | null;
  category: string;
  youtube_url: string | null;
  lyrics: string | null;
  chords: string | null;
  bpm: number | null;
  tone: string | null;
  tags: string[] | null;
  ai_identified: boolean;
  start_time: number;
  end_time: number | null;
  created_at: string;
}

interface FavoriteSong {
  id: string;
  song_id: string;
  position: number;
  title: string;
  artist: string | null;
  category: string;
  youtube_url: string | null;
  tone: string | null;
  bpm: number | null;
  start_time: number;
  end_time: number | null;
}

const CATEGORIES = ['Todos', 'Adoração', 'Louvor', 'Congregacional', 'Infantil', 'Instrumental', 'Outro'];

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const parseTime = (str: string): number | null => {
  if (!str) return null;
  const parts = str.split(':');
  if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  return parseInt(str) || null;
};

const WorshipPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin_church' || user?.role === 'leader';
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailSong, setDetailSong] = useState<Song | null>(null);
  const [detailTab, setDetailTab] = useState('lyrics');
  const [editSong, setEditSong] = useState<Partial<Song> | null>(null);
  const [saving, setSaving] = useState(false);
  const [identifying, setIdentifying] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'favorites'>('all');
  const [favorites, setFavorites] = useState<FavoriteSong[]>([]);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const playerRef = useRef<HTMLIFrameElement>(null);

  const fetchSongs = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (categoryFilter !== 'Todos') params.set('category', categoryFilter);
    if (search) params.set('search', search);
    api.get<Song[]>(`/api/church/worship?${params}`)
      .then(setSongs)
      .catch(() => toast.error('Erro ao carregar louvores'))
      .finally(() => setLoading(false));
  };

  const fetchFavorites = () => {
    api.get<FavoriteSong[]>('/api/church/worship/favorites')
      .then(favs => {
        setFavorites(favs);
        setFavIds(new Set(favs.map(f => f.song_id)));
      })
      .catch(() => {});
  };

  useEffect(() => { fetchSongs(); fetchFavorites(); }, [categoryFilter]);

  const handleSearch = () => fetchSongs();

  const toggleFavorite = async (songId: string) => {
    try {
      const result = await api.post<any>('/api/church/worship/favorites', { song_id: songId });
      if (result.removed) {
        setFavIds(prev => { const n = new Set(prev); n.delete(songId); return n; });
        setFavorites(prev => prev.filter(f => f.song_id !== songId));
        toast.success('Removido dos favoritos');
      } else {
        fetchFavorites();
        toast.success('Adicionado aos favoritos');
      }
    } catch {
      toast.error('Erro ao favoritar');
    }
  };

  const moveFav = async (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= favorites.length) return;
    const newFavs = [...favorites];
    [newFavs[index], newFavs[newIndex]] = [newFavs[newIndex], newFavs[index]];
    const order = newFavs.map((f, i) => ({ id: f.id, position: i }));
    setFavorites(newFavs);
    try {
      await api.put('/api/church/worship/favorites/reorder', { order });
    } catch {}
  };

  const openNew = () => {
    setEditSong({ title: '', artist: '', category: 'Adoração', youtube_url: '', lyrics: '', chords: '', composer: '', tone: '', start_time: 0, end_time: null });
    setEditStartTime('0:00');
    setEditEndTime('');
    setDialogOpen(true);
  };

  const openEdit = (song: Song) => {
    setEditSong({ ...song });
    setEditStartTime(formatTime(song.start_time || 0));
    setEditEndTime(song.end_time ? formatTime(song.end_time) : '');
    setDialogOpen(true);
  };

  const handleAIIdentify = async () => {
    if (!editSong?.title) return toast.error('Preencha o título primeiro');
    setIdentifying(true);
    try {
      const result = await api.post<any>('/api/church/worship/ai-identify', {
        title: editSong.title,
        artist: editSong.artist,
        youtube_url: editSong.youtube_url,
      });
      setEditSong(prev => ({
        ...prev,
        title: result.title || prev?.title,
        artist: result.artist || prev?.artist,
        composer: result.composer || prev?.composer,
        category: result.category || prev?.category,
        tone: result.tone || prev?.tone,
        bpm: result.bpm || prev?.bpm,
        lyrics: result.lyrics || prev?.lyrics,
        chords: result.chords || prev?.chords,
      }));
      toast.success('IA identificou o louvor!');
    } catch {
      toast.error('Não foi possível identificar o louvor');
    } finally {
      setIdentifying(false);
    }
  };

  const handleSave = async () => {
    if (!editSong?.title) return toast.error('Título é obrigatório');
    const startSec = parseTime(editStartTime) || 0;
    const endSec = parseTime(editEndTime);
    const payload = { ...editSong, start_time: startSec, end_time: endSec };
    setSaving(true);
    try {
      if (editSong.id) {
        await api.put(`/api/church/worship/${editSong.id}`, payload);
        toast.success('Louvor atualizado!');
      } else {
        await api.post('/api/church/worship', payload);
        toast.success('Louvor adicionado!');
      }
      setDialogOpen(false);
      setEditSong(null);
      fetchSongs();
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este louvor?')) return;
    try {
      await api.delete(`/api/church/worship/${id}`);
      toast.success('Removido');
      fetchSongs();
      if (detailSong?.id === id) setDetailSong(null);
    } catch {
      toast.error('Erro ao remover');
    }
  };

  const getYoutubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|v=|\/embed\/)([^&?#]+)/);
    return match ? match[1] : null;
  };

  const getEmbedUrl = (song: Song) => {
    const ytId = song.youtube_url ? getYoutubeId(song.youtube_url) : null;
    if (!ytId) return null;
    const params = new URLSearchParams({ autoplay: '1', enablejsapi: '1', origin: window.location.origin });
    if (song.start_time) params.set('start', String(song.start_time));
    // Don't rely on YouTube's 'end' param — we enforce it via the IFrame API below
    return `https://www.youtube.com/embed/${ytId}?${params}`;
  };

  // Play next song in current list
  const playNext = useCallback(() => {
    if (!detailSong) return;
    const list = viewMode === 'favorites'
      ? favorites.map(f => songs.find(s => s.id === f.song_id)).filter(Boolean) as Song[]
      : songs;
    const idx = list.findIndex(s => s.id === detailSong.id);
    if (idx >= 0 && idx < list.length - 1) {
      setDetailSong(list[idx + 1]);
      setDetailTab('lyrics');
    }
  }, [detailSong, songs, favorites, viewMode]);

  const currentList = viewMode === 'favorites'
    ? favorites.map(f => songs.find(s => s.id === f.song_id)).filter(Boolean) as Song[]
    : songs;
  const currentIdx = detailSong ? currentList.findIndex(s => s.id === detailSong.id) : -1;
  const hasNext = currentIdx >= 0 && currentIdx < currentList.length - 1;

  // Use YouTube IFrame API to enforce end_time
  useEffect(() => {
    if (!detailSong?.end_time || !detailSong.youtube_url) return;
    const ytId = getYoutubeId(detailSong.youtube_url);
    if (!ytId) return;

    const endTime = detailSong.end_time;
    let intervalId: ReturnType<typeof setInterval>;

    const checkTime = () => {
      const iframe = playerRef.current;
      if (!iframe?.contentWindow) return;
      iframe.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: 'getCurrentTime',
        args: [],
      }), '*');
    };

    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data?.event === 'infoDelivery' && data?.info?.currentTime != null) {
          const currentTime = data.info.currentTime;
          if (currentTime >= endTime) {
            const iframe = playerRef.current;
            if (iframe?.contentWindow) {
              iframe.contentWindow.postMessage(JSON.stringify({
                event: 'command',
                func: 'pauseVideo',
                args: [],
              }), '*');
            }
            clearInterval(intervalId);
            if (autoPlayNext && hasNext) {
              setTimeout(() => playNext(), 1000);
            }
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    const startTimeout = setTimeout(() => {
      const iframe = playerRef.current;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({
          event: 'listening',
        }), '*');
      }
      intervalId = setInterval(checkTime, 500);
    }, 2000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(startTimeout);
      clearInterval(intervalId);
    };
  }, [detailSong?.id, detailSong?.end_time, autoPlayNext, hasNext, playNext]);

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" /> Louvores
          </h1>
          <p className="text-xs text-muted-foreground">{songs.length} louvores cadastrados</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={viewMode === 'favorites' ? 'default' : 'outline'} className="rounded-xl gap-1"
            onClick={() => setViewMode(viewMode === 'favorites' ? 'all' : 'favorites')}>
            <Heart className={`w-4 h-4 ${viewMode === 'favorites' ? 'fill-current' : ''}`} />
            {viewMode === 'favorites' ? 'Favoritos' : ''}
          </Button>
          {isAdmin && (
            <Button size="sm" className="rounded-xl gap-1" onClick={openNew}>
              <Plus className="w-4 h-4" /> Adicionar
            </Button>
          )}
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar louvor..."
            className="pl-9 rounded-xl"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
        </div>
      </div>

      {/* Category chips */}
      {viewMode === 'all' && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                categoryFilter === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Song list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : viewMode === 'favorites' ? (
        favorites.length === 0 ? (
          <Card className="p-8 rounded-xl text-center">
            <Heart className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum louvor favoritado</p>
            <p className="text-xs text-muted-foreground mt-1">Toque no ❤️ nos louvores para salvar aqui</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {favorites.map((fav, idx) => {
              const song = songs.find(s => s.id === fav.song_id);
              if (!song) return null;
              const ytId = song.youtube_url ? getYoutubeId(song.youtube_url) : null;
              return (
                <Card key={fav.id} className="rounded-xl overflow-hidden card-hover">
                  <div className="flex gap-2 p-3 items-center">
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button className="p-0.5 hover:bg-muted rounded text-muted-foreground disabled:opacity-30"
                        disabled={idx === 0} onClick={() => moveFav(idx, -1)}>
                        <GripVertical className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono w-5 text-center shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setDetailSong(song); setDetailTab('lyrics'); }}>
                      <h3 className="font-medium text-sm truncate">{song.title}</h3>
                      {song.artist && <p className="text-xs text-muted-foreground truncate">{song.artist}</p>}
                      {(song.start_time > 0 || song.end_time) && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {formatTime(song.start_time)} — {song.end_time ? formatTime(song.end_time) : 'fim'}
                        </p>
                      )}
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-400"
                      onClick={() => toggleFavorite(song.id)}>
                      <Heart className="w-4 h-4 fill-current" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      ) : songs.length === 0 ? (
        <Card className="p-8 rounded-xl text-center">
          <Music className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum louvor encontrado</p>
          {isAdmin && (
            <Button size="sm" variant="outline" className="mt-3 rounded-xl" onClick={openNew}>
              Adicionar primeiro louvor
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {songs.map(song => {
            const ytId = song.youtube_url ? getYoutubeId(song.youtube_url) : null;
            return (
              <Card
                key={song.id}
                className="rounded-xl overflow-hidden card-hover cursor-pointer"
                onClick={() => { setDetailSong(song); setDetailTab('lyrics'); }}
              >
                <div className="flex gap-3 p-3 items-center">
                  {ytId ? (
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0 relative">
                      <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="w-5 h-5 text-white fill-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Music className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{song.title}</h3>
                    {song.artist && <p className="text-xs text-muted-foreground truncate">{song.artist}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{song.category}</Badge>
                      {song.tone && <span className="text-[10px] text-muted-foreground">Tom: {song.tone}</span>}
                      {(song.start_time > 0 || song.end_time) && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {formatTime(song.start_time)}-{song.end_time ? formatTime(song.end_time) : 'fim'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <button className="p-1.5 rounded-lg hover:bg-muted" onClick={() => toggleFavorite(song.id)}>
                      <Heart className={`w-3.5 h-3.5 ${favIds.has(song.id) ? 'text-rose-400 fill-rose-400' : 'text-muted-foreground'}`} />
                    </button>
                    {isAdmin && (
                      <>
                        <button className="p-1.5 rounded-lg hover:bg-muted" onClick={() => openEdit(song)}>
                          <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-destructive/10" onClick={() => handleDelete(song.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailSong} onOpenChange={() => setDetailSong(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl">
          {detailSong && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-left">
                  <Music className="w-5 h-5 text-primary shrink-0" />
                  <span className="truncate">{detailSong.title}</span>
                </DialogTitle>
              </DialogHeader>
              {detailSong.artist && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 -mt-2">
                  <User className="w-3.5 h-3.5" /> {detailSong.artist}
                </p>
              )}
              {detailSong.composer && (
                <p className="text-xs text-muted-foreground">Compositor: {detailSong.composer}</p>
              )}
              <div className="flex gap-2 flex-wrap">
                <Badge>{detailSong.category}</Badge>
                {detailSong.tone && <Badge variant="outline">Tom: {detailSong.tone}</Badge>}
                {detailSong.bpm && <Badge variant="outline">{detailSong.bpm} BPM</Badge>}
                {(detailSong.start_time > 0 || detailSong.end_time) && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(detailSong.start_time)} — {detailSong.end_time ? formatTime(detailSong.end_time) : 'fim'}
                  </Badge>
                )}
              </div>

              {detailSong.youtube_url && (
                <div className="space-y-2">
                  <div className="aspect-video rounded-xl overflow-hidden bg-muted">
                    {getYoutubeId(detailSong.youtube_url) ? (
                      <iframe
                        ref={playerRef}
                        src={getEmbedUrl(detailSong) || ''}
                        className="w-full h-full"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                      />
                    ) : (
                      <a href={detailSong.youtube_url} target="_blank" rel="noreferrer"
                         className="flex items-center justify-center h-full gap-2 text-primary">
                        <ExternalLink className="w-5 h-5" /> Abrir no YouTube
                      </a>
                    )}
                  </div>
                  {hasNext && (
                    <Button variant="outline" size="sm" className="w-full rounded-xl gap-2" onClick={playNext}>
                      <SkipForward className="w-4 h-4" /> Próximo louvor
                    </Button>
                  )}
                </div>
              )}

              <Tabs value={detailTab} onValueChange={setDetailTab}>
                <TabsList className="w-full rounded-xl">
                  <TabsTrigger value="lyrics" className="flex-1 rounded-xl gap-1">
                    <BookOpen className="w-3.5 h-3.5" /> Letra
                  </TabsTrigger>
                  <TabsTrigger value="chords" className="flex-1 rounded-xl gap-1">
                    <Guitar className="w-3.5 h-3.5" /> Cifra
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="lyrics" className="mt-3">
                  {detailSong.lyrics ? (
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{detailSong.lyrics}</pre>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">Letra não disponível</p>
                  )}
                </TabsContent>
                <TabsContent value="chords" className="mt-3">
                  {detailSong.chords ? (
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono">{detailSong.chords}</pre>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">Cifra não disponível</p>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 pt-2" onClick={e => e.stopPropagation()}>
                <Button variant="outline" size="sm" className="rounded-xl gap-1 flex-1"
                  onClick={() => toggleFavorite(detailSong.id)}>
                  <Heart className={`w-4 h-4 ${favIds.has(detailSong.id) ? 'fill-rose-400 text-rose-400' : ''}`} />
                  {favIds.has(detailSong.id) ? 'Favoritado' : 'Favoritar'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) { setDialogOpen(false); setEditSong(null); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editSong?.id ? 'Editar Louvor' : 'Novo Louvor'}</DialogTitle>
          </DialogHeader>
          {editSong && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="Título *" className="rounded-xl flex-1" value={editSong.title || ''}
                  onChange={e => setEditSong(p => ({ ...p, title: e.target.value }))} />
                <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1 shrink-0"
                  onClick={handleAIIdentify} disabled={identifying}>
                  {identifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-gold" />}
                  IA
                </Button>
              </div>
              <Input placeholder="Artista / Banda" className="rounded-xl" value={editSong.artist || ''}
                onChange={e => setEditSong(p => ({ ...p, artist: e.target.value }))} />
              <Input placeholder="Compositor(es)" className="rounded-xl" value={editSong.composer || ''}
                onChange={e => setEditSong(p => ({ ...p, composer: e.target.value }))} />
              <Input placeholder="Link do YouTube" className="rounded-xl" value={editSong.youtube_url || ''}
                onChange={e => setEditSong(p => ({ ...p, youtube_url: e.target.value }))} />

              {/* Time markers */}
              <div className="bg-muted/50 rounded-xl p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Trecho do vídeo (opcional)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">Início (mm:ss)</label>
                    <Input placeholder="0:00" className="rounded-xl" value={editStartTime}
                      onChange={e => setEditStartTime(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Fim (mm:ss)</label>
                    <Input placeholder="Ex: 10:30" className="rounded-xl" value={editEndTime}
                      onChange={e => setEditEndTime(e.target.value)} />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Use para recortar um trecho específico do vídeo. O player vai iniciar e parar nos tempos informados.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Select value={editSong.category || 'Adoração'}
                  onValueChange={v => setEditSong(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Adoração', 'Louvor', 'Congregacional', 'Infantil', 'Instrumental', 'Outro'].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="Tom (ex: G)" className="rounded-xl" value={editSong.tone || ''}
                  onChange={e => setEditSong(p => ({ ...p, tone: e.target.value }))} />
                <Input placeholder="BPM" type="number" className="rounded-xl" value={editSong.bpm || ''}
                  onChange={e => setEditSong(p => ({ ...p, bpm: e.target.value ? Number(e.target.value) : null }))} />
              </div>
              <Textarea placeholder="Letra do louvor" rows={6} className="rounded-xl font-mono text-sm"
                value={editSong.lyrics || ''} onChange={e => setEditSong(p => ({ ...p, lyrics: e.target.value }))} />
              <Textarea placeholder="Cifra / Acordes" rows={6} className="rounded-xl font-mono text-sm"
                value={editSong.chords || ''} onChange={e => setEditSong(p => ({ ...p, chords: e.target.value }))} />
              <Button className="w-full rounded-xl" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editSong.id ? 'Salvar Alterações' : 'Adicionar Louvor'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorshipPage;
