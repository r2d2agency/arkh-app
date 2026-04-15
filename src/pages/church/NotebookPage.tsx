import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen, Plus, Save, BookMarked, Search, Trash2, Edit3, X, Clock, Loader2, Video, Link2,
  Star, Tag, Copy, Check, MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  tags: string[];
  created_at: string;
}

interface ServiceOption {
  id: string;
  title: string;
}

const NOTE_CATEGORIES = [
  { value: 'note', label: 'Anotação', emoji: '📝' },
  { value: 'sermon', label: 'Sermão', emoji: '🎤' },
  { value: 'prayer', label: 'Oração', emoji: '🙏' },
  { value: 'insight', label: 'Insight', emoji: '💡' },
  { value: 'testimony', label: 'Testemunho', emoji: '✨' },
];

const NotebookPage = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formType, setFormType] = useState('note');
  const [formVerse, setFormVerse] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkingNote, setLinkingNote] = useState<Note | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingNote, setDeletingNote] = useState<Note | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Note[]>('/api/church/notes'),
      api.get<ServiceOption[]>('/api/church/services'),
    ])
      .then(([n, s]) => { setNotes(n); setServices(s); })
      .catch(() => toast.error('Erro ao carregar caderno'))
      .finally(() => setLoading(false));
  }, []);

  const openNewForm = () => {
    setEditingNote(null);
    setFormTitle('');
    setFormContent('');
    setFormType('note');
    setFormVerse('');
    setFormOpen(true);
  };

  const openEditForm = (note: Note) => {
    setEditingNote(note);
    setFormTitle(note.title || '');
    setFormContent(note.content || '');
    setFormType(note.note_type || 'note');
    setFormVerse(note.verse_reference || '');
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim() && !formContent.trim()) return;
    setSaving(true);
    try {
      if (editingNote) {
        const updated = await api.put<Note>(`/api/church/notes/${editingNote.id}`, {
          title: formTitle || 'Sem título',
          content: formContent,
          note_type: formType,
          verse_reference: formVerse || null,
        });
        setNotes(prev => prev.map(n => n.id === editingNote.id ? { ...n, ...updated } : n));
        toast.success('Anotação atualizada!');
      } else {
        const note = await api.post<Note>('/api/church/notes', {
          title: formTitle || 'Sem título',
          content: formContent,
          note_type: formType,
          verse_reference: formVerse || null,
        });
        setNotes(prev => [note, ...prev]);
        toast.success('Anotação salva!');
      }
      setFormOpen(false);
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (note: Note) => {
    setDeletingNote(note);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingNote) return;
    try {
      await api.delete(`/api/church/notes/${deletingNote.id}`);
      setNotes(prev => prev.filter(n => n.id !== deletingNote.id));
      setDeleteDialogOpen(false);
      toast.success('Removido');
    } catch {
      toast.error('Erro ao remover');
    }
  };

  const handleCopy = (note: Note) => {
    const text = `${note.title || ''}\n\n${note.content || ''}${note.verse_reference ? `\n\n📖 ${note.verse_reference}` : ''}`;
    navigator.clipboard.writeText(text.trim());
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Copiado!');
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

  const generalNotes = notes.filter(n => n.note_type !== 'verse');
  const verseNotes = notes.filter(n => n.note_type === 'verse');

  const filteredNotes = generalNotes.filter(n => {
    const matchSearch = !search || 
      n.title?.toLowerCase().includes(search.toLowerCase()) ||
      n.content?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || n.note_type === filterType;
    return matchSearch && matchType;
  });

  const getCategoryInfo = (type: string) => NOTE_CATEGORIES.find(c => c.value === type) || NOTE_CATEGORIES[0];

  return (
    <div className="space-y-5 animate-fade-in p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Meu Caderno</h1>
          <p className="text-sm text-muted-foreground">Anotações, versículos e estudos pessoais</p>
        </div>
        <Button size="sm" className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground" onClick={openNewForm}>
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
          {/* Search + Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar anotações..." className="pl-9 rounded-xl bg-muted/50 border-0" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[130px] rounded-xl bg-muted/50 border-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {NOTE_CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : filteredNotes.length === 0 ? (
            <Card className="p-8 rounded-2xl text-center space-y-3">
              <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <h3 className="font-heading font-semibold">
                {search || filterType !== 'all' ? 'Nenhum resultado encontrado' : 'Seu caderno está vazio'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {search || filterType !== 'all' ? 'Tente alterar os filtros.' : 'Comece escrevendo suas reflexões ou salve versículos dos cultos.'}
              </p>
              {!search && filterType === 'all' && (
                <Button size="sm" variant="outline" className="rounded-xl" onClick={openNewForm}>
                  <Plus className="w-4 h-4 mr-1" /> Criar primeira anotação
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotes.map(note => {
                const cat = getCategoryInfo(note.note_type);
                return (
                  <Card key={note.id} className="p-4 rounded-2xl space-y-2 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-base">{cat.emoji}</span>
                        <h3 className="font-heading text-sm font-semibold truncate">{note.title || 'Sem título'}</h3>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/50">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem onClick={() => openEditForm(note)} className="gap-2">
                            <Edit3 className="w-3.5 h-3.5" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopy(note)} className="gap-2">
                            {copiedId === note.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedId === note.id ? 'Copiado!' : 'Copiar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openLinkDialog(note)} className="gap-2">
                            <Link2 className="w-3.5 h-3.5" /> Vincular culto
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => confirmDelete(note)} className="gap-2 text-destructive focus:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {note.verse_reference && (
                      <Badge variant="secondary" className="text-[10px] rounded-full gap-1">
                        <BookMarked className="w-3 h-3" /> {note.verse_reference}
                      </Badge>
                    )}

                    <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-line">{note.content}</p>

                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(note.created_at).toLocaleDateString('pt-BR')}
                      <Badge variant="outline" className="text-[9px] rounded-full px-1.5 py-0">{cat.label}</Badge>
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
                );
              })}
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
                <Card key={verse.id} className="p-4 rounded-2xl bg-primary/5 border-primary/10 space-y-2">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-bold text-primary">{verse.title}</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-muted-foreground hover:text-foreground p-1">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem onClick={() => openEditForm(verse)} className="gap-2">
                          <Edit3 className="w-3.5 h-3.5" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopy(verse)} className="gap-2">
                          <Copy className="w-3.5 h-3.5" /> Copiar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => confirmDelete(verse)} className="gap-2 text-destructive focus:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {verse.content && (
                    <blockquote className="text-sm italic text-muted-foreground border-l-2 border-primary/30 pl-3">
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

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="rounded-xl max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingNote ? 'Editar anotação' : 'Nova anotação'}</DialogTitle>
            <DialogDescription>
              {editingNote ? 'Atualize os campos desejados' : 'Crie uma nova anotação no seu caderno'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Título (opcional)"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              className="rounded-xl bg-muted/30 border-0"
            />
            <Select value={formType} onValueChange={setFormType}>
              <SelectTrigger className="rounded-xl bg-muted/30 border-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTE_CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Escreva seus pensamentos, reflexões, estudos..."
              value={formContent}
              onChange={e => setFormContent(e.target.value)}
              className="rounded-xl min-h-[150px] bg-muted/30 border-0 resize-none"
            />
            <Input
              placeholder="📖 Referência bíblica (ex: João 3:16)"
              value={formVerse}
              onChange={e => setFormVerse(e.target.value)}
              className="rounded-xl bg-muted/30 border-0"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground">
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
              {editingNote ? 'Atualizar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir anotação?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. A anotação "{deletingNote?.title || 'Sem título'}" será removida permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} className="rounded-xl">Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
