import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  BookOpen, Plus, Save, BookMarked, Search, Trash2, Edit3, X, Clock, Loader2, Video, Link2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface Note {
  id: string;
  title: string;
  content: string;
  note_type: string;
  verse_reference: string | null;
  service_id: string | null;
  service_title: string | null;
  created_at: string;
}

interface ServiceOption {
  id: string;
  title: string;
}

const NotebookPage = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkingNote, setLinkingNote] = useState<Note | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');

  useEffect(() => {
    Promise.all([
      api.get<Note[]>('/api/church/notes'),
      api.get<ServiceOption[]>('/api/church/services'),
    ])
      .then(([n, s]) => { setNotes(n); setServices(s); })
      .catch(() => toast.error('Erro ao carregar caderno'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim() && !newContent.trim()) return;
    setSaving(true);
    try {
      const note = await api.post<Note>('/api/church/notes', {
        title: newTitle || 'Sem título',
        content: newContent,
        note_type: 'note',
      });
      setNotes(prev => [note, ...prev]);
      setNewTitle('');
      setNewContent('');
      setCreating(false);
      toast.success('Anotação salva!');
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/church/notes/${id}`);
      setNotes(prev => prev.filter(n => n.id !== id));
      toast.success('Removido');
    } catch {
      toast.error('Erro ao remover');
    }
  };

  const openLinkDialog = (note: Note) => {
    setLinkingNote(note);
    setSelectedServiceId(note.service_id || '');
    setLinkDialogOpen(true);
  };

  const handleLinkService = async () => {
    if (!linkingNote) return;
    try {
      const updated = await api.put<Note>(`/api/church/notes/${linkingNote.id}`, {
        service_id: selectedServiceId || null,
      });
      setNotes(prev => prev.map(n => n.id === linkingNote.id ? { ...n, service_id: updated.service_id, service_title: updated.service_title } : n));
      setLinkDialogOpen(false);
      toast.success(selectedServiceId ? 'Culto vinculado!' : 'Vínculo removido');
    } catch {
      toast.error('Erro ao vincular');
    }
  };

  const generalNotes = notes.filter(n => n.note_type === 'note' || !n.note_type);
  const verseNotes = notes.filter(n => n.note_type === 'verse');

  const filteredNotes = generalNotes.filter(n =>
    n.title?.toLowerCase().includes(search.toLowerCase()) ||
    n.content?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 animate-fade-in p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Meu Caderno</h1>
          <p className="text-sm text-muted-foreground">Anotações, versículos e estudos pessoais</p>
        </div>
        <Button size="sm" className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nova
        </Button>
      </div>

      <Tabs defaultValue="notes" className="w-full">
        <TabsList className="w-full rounded-xl bg-muted/50 p-1 h-auto">
          <TabsTrigger value="notes" className="rounded-lg text-xs flex-1 data-[state=active]:bg-card">
            <Edit3 className="w-3.5 h-3.5 mr-1" /> Anotações ({generalNotes.length})
          </TabsTrigger>
          <TabsTrigger value="verses" className="rounded-lg text-xs flex-1 data-[state=active]:bg-card">
            <BookMarked className="w-3.5 h-3.5 mr-1" /> Versículos ({verseNotes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="mt-4 space-y-4">
          {creating && (
            <Card className="p-4 rounded-2xl space-y-3 border-primary/20">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-sm font-semibold">Nova anotação</h3>
                <button onClick={() => setCreating(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              <Input placeholder="Título (opcional)" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="rounded-xl bg-muted/30 border-0" />
              <Textarea placeholder="Escreva seus pensamentos, reflexões, estudos..." value={newContent} onChange={e => setNewContent(e.target.value)} className="rounded-xl min-h-[120px] bg-muted/30 border-0 resize-none" />
              <Button size="sm" className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                Salvar
              </Button>
            </Card>
          )}

          {generalNotes.length > 3 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar anotações..." className="pl-9 rounded-xl bg-muted/50 border-0" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : filteredNotes.length === 0 && !creating ? (
            <Card className="p-8 rounded-2xl text-center space-y-3">
              <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <h3 className="font-heading font-semibold">Seu caderno está vazio</h3>
              <p className="text-sm text-muted-foreground">Comece escrevendo suas reflexões ou salve versículos dos cultos.</p>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setCreating(true)}>
                <Plus className="w-4 h-4 mr-1" /> Criar primeira anotação
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotes.map(note => (
                <Card key={note.id} className="p-4 rounded-2xl space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-heading text-sm font-semibold flex-1">{note.title || 'Sem título'}</h3>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openLinkDialog(note)} className="text-muted-foreground hover:text-primary p-1" title="Vincular culto">
                        <Link2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(note.id)} className="text-muted-foreground hover:text-destructive p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">{note.content}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(note.created_at).toLocaleDateString('pt-BR')}
                    {note.service_title && (
                      <>
                        <span>•</span>
                        <Link to={`/church/services/${note.service_id}`} className="text-primary hover:underline flex items-center gap-0.5">
                          <Video className="w-3 h-3" /> {note.service_title}
                        </Link>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="verses" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : verseNotes.length === 0 ? (
            <Card className="p-8 rounded-2xl text-center space-y-3">
              <BookMarked className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <h3 className="font-heading font-semibold">Nenhum versículo salvo</h3>
              <p className="text-sm text-muted-foreground">Salve versículos dos cultos processados pela IA para encontrá-los aqui.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {verseNotes.map(verse => (
                <Card key={verse.id} className="p-4 rounded-2xl bg-gold/5 border-gold/10 space-y-2">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-bold text-gold">{verse.title}</p>
                    <button onClick={() => handleDelete(verse.id)} className="text-muted-foreground hover:text-destructive p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {verse.content && (
                    <blockquote className="text-sm italic text-muted-foreground border-l-2 border-gold/30 pl-3">
                      "{verse.content}"
                    </blockquote>
                  )}
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(verse.created_at).toLocaleDateString('pt-BR')}
                    {verse.service_title && (
                      <>
                        <span>•</span>
                        <Link to={`/church/services/${verse.service_id}`} className="text-primary hover:underline">{verse.service_title}</Link>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Link Service Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="rounded-xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Vincular a um Culto</DialogTitle>
            <DialogDescription>Selecione o culto para vincular esta anotação</DialogDescription>
          </DialogHeader>
          <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione um culto..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum (remover vínculo)</SelectItem>
              {services.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleLinkService} className="rounded-xl">Vincular</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotebookPage;
