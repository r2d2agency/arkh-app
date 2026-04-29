import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen, Plus, Save, BookMarked, Search, Trash2, Edit3, X, Clock, Loader2, Video, Link2,
  Copy, Check, MoreVertical, Camera, Wand2, Sparkles, BookHeart, Share2, Filter, 
  Maximize2, List, FileText, Quote,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import Tesseract from 'tesseract.js';

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

const NOTE_CATEGORIES = [
  { value: 'note', label: 'Anotação', emoji: '📝', color: 'bg-blue-100 text-blue-700' },
  { value: 'sermon', label: 'Sermão', emoji: '🎤', color: 'bg-purple-100 text-purple-700' },
  { value: 'prayer', label: 'Oração', emoji: '🙏', color: 'bg-pink-100 text-pink-700' },
  { value: 'insight', label: 'Insight', emoji: '💡', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'study', label: 'Estudo', emoji: '📖', color: 'bg-emerald-100 text-emerald-700' },
];

const NotebookPage = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formType, setFormType] = useState('note');
  const [formVerse, setFormVerse] = useState('');
  const [saving, setSaving] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [studyMode, setStudyMode] = useState<Note | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const data = await api.get<Note[]>('/api/church/notes');
      setNotes(data);
    } catch {
      toast.error('Erro ao carregar caderno');
    } finally {
      setLoading(false);
    }
  };

  const handleOcr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    toast.info('IA Transcrevendo sua foto... Aguarde.');
    try {
      const { data: { text } } = await Tesseract.recognize(file, 'por');
      setFormContent(prev => prev + (prev ? '\n\n' : '') + text);
      toast.success('Texto extraído com sucesso!');
    } catch {
      toast.error('Erro ao ler a imagem');
    } finally {
      setOcrLoading(false);
    }
  };

  const enhanceWithAI = async (task: 'format' | 'summarize' | 'verses') => {
    if (!formContent.trim()) return;
    setSaving(true);
    try {
      const data = await api.post<{ enhanced: string }>('/api/church/notebook-ai/enhance', { content: formContent, task });
      setFormContent(data.enhanced);
      toast.success('Melhorado com IA!');
    } catch {
      toast.error('Erro ao usar IA');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!formTitle.trim() && !formContent.trim()) return;
    setSaving(true);
    try {
      const payload = { 
        title: formTitle || 'Sem título', 
        content: formContent, 
        note_type: formType,
        verse_reference: formVerse || null
      };
      if (editingNote) {
        const updated = await api.put<Note>(`/api/church/notes/${editingNote.id}`, payload);
        setNotes(prev => prev.map(n => n.id === editingNote.id ? { ...n, ...updated } : n));
        toast.success('Anotação atualizada!');
      } else {
        const note = await api.post<Note>('/api/church/notes', payload);
        setNotes(prev => [note, ...prev]);
        toast.success('Nova anotação salva!');
      }
      setFormOpen(false);
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta anotação permanentemente?')) return;
    try {
      await api.delete(`/api/church/notes/${id}`);
      setNotes(prev => prev.filter(n => n.id !== id));
      toast.success('Removido');
    } catch {
      toast.error('Erro ao excluir');
    }
  };

  const openForm = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      setFormTitle(note.title);
      setFormContent(note.content);
      setFormType(note.note_type);
      setFormVerse(note.verse_reference || '');
    } else {
      setEditingNote(null);
      setFormTitle('');
      setFormContent('');
      setFormType('note');
      setFormVerse('');
    }
    setFormOpen(true);
  };

  const filteredNotes = notes.filter(n => {
    const matchSearch = n.title.toLowerCase().includes(search.toLowerCase()) || 
                       n.content.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || n.note_type === filterType;
    return matchSearch && matchType;
  });

  const getCategory = (type: string) => NOTE_CATEGORIES.find(c => c.value === type) || NOTE_CATEGORIES[0];

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 pb-24">
      <div className="max-w-4xl mx-auto p-4 space-y-6 animate-fade-in">
        <header className="flex items-center justify-between pt-4">
          <div>
            <h1 className="text-3xl font-extrabold font-heading tracking-tight flex items-center gap-2">
              <BookHeart className="w-8 h-8 text-primary" /> Meu Caderno
            </h1>
            <p className="text-muted-foreground text-sm">Seu espaço sagrado para estudos e reflexões</p>
          </div>
          <Button onClick={() => openForm()} className="rounded-full shadow-lg shadow-primary/20 gap-2">
            <Plus className="w-5 h-5" /> Nova Nota
          </Button>
        </header>

        {/* Tools bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Pesquisar em suas notas..." 
              className="pl-10 rounded-2xl bg-white dark:bg-slate-900 border-slate-200"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px] rounded-2xl bg-white dark:bg-slate-900 border-slate-200">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {NOTE_CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
            <p className="text-muted-foreground animate-pulse">Sincronizando seu caderno...</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <Card className="p-12 text-center space-y-4 rounded-3xl border-dashed border-2 bg-transparent">
            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto">
              <BookOpen className="w-10 h-10 text-primary/30" />
            </div>
            <h3 className="text-xl font-bold font-heading">Nenhuma nota encontrada</h3>
            <p className="text-muted-foreground max-w-xs mx-auto">
              {search ? 'Tente mudar sua pesquisa ou filtros.' : 'Comece sua jornada espiritual anotando seus primeiros insights.'}
            </p>
            {!search && (
              <Button onClick={() => openForm()} variant="outline" className="rounded-full">
                Criar primeira anotação
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNotes.map(note => {
              const cat = getCategory(note.note_type);
              return (
                <Card 
                  key={note.id} 
                  className="group relative overflow-hidden rounded-3xl border-slate-200/60 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
                >
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{cat.emoji}</span>
                        <Badge variant="secondary" className={`${cat.color} border-none font-medium px-2 py-0.5 rounded-full text-[10px]`}>
                          {cat.label}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl border-slate-200">
                          <DropdownMenuItem onClick={() => openForm(note)} className="gap-2 rounded-lg m-1">
                            <Edit3 className="w-4 h-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setStudyMode(note)} className="gap-2 rounded-lg m-1">
                            <Maximize2 className="w-4 h-4" /> Modo Estudo
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 rounded-lg m-1">
                            <Share2 className="w-4 h-4" /> Compartilhar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(note.id)} className="gap-2 rounded-lg m-1 text-red-600 focus:text-red-600">
                            <Trash2 className="w-4 h-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div>
                      <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{note.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(note.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 whitespace-pre-line min-h-[4.5em]">
                      {note.content}
                    </p>

                    {note.verse_reference && (
                      <div className="flex items-center gap-2 pt-2">
                        <Badge variant="outline" className="rounded-full bg-primary/5 border-primary/20 text-primary text-[10px] gap-1">
                          <BookMarked className="w-3 h-3" /> {note.verse_reference}
                        </Badge>
                      </div>
                    )}

                    {note.service_title && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <Link to={`/church/services/${note.service_id}`} className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1">
                          <Video className="w-3 h-3" /> Vinculado a: {note.service_title}
                        </Link>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modern Editor Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-3xl h-[90vh] md:h-auto overflow-hidden flex flex-col p-0 gap-0 rounded-3xl border-none shadow-2xl">
          <div className="p-6 pb-2 flex items-center justify-between bg-white dark:bg-slate-900 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Edit3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold font-heading">
                  {editingNote ? 'Refinando sua anotação' : 'Novo registro sagrado'}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Anotações, estudos e insights para sua jornada.
                </DialogDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setFormOpen(false)} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white dark:bg-slate-900">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1 mb-1 block">Título da Anotação</label>
                <Input 
                  value={formTitle} 
                  onChange={e => setFormTitle(e.target.value)} 
                  placeholder="Ex: Reflexões sobre o Salmo 23..." 
                  className="rounded-2xl border-slate-200 text-lg font-bold p-6 bg-slate-50 focus:bg-white transition-all"
                />
              </div>
              <div className="w-full md:w-48">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1 mb-1 block">Categoria</label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="rounded-2xl border-slate-200 p-6 bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {NOTE_CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value} className="rounded-xl m-1">{c.emoji} {c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Conteúdo do Estudo</label>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-[10px] rounded-full gap-1.5 text-primary bg-primary/5 hover:bg-primary/10"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={ocrLoading}
                  >
                    {ocrLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                    Transcrever Foto
                  </Button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleOcr} />
                </div>
              </div>
              
              <div className="relative group">
                <div className="absolute -top-3 right-4 flex gap-2 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg gap-2 border-none">
                        <Wand2 className="w-3.5 h-3.5" /> IA Assistente
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="rounded-2xl p-2 w-56">
                      <DropdownMenuItem onClick={() => enhanceWithAI('format')} className="rounded-xl gap-3 p-3">
                        <List className="w-4 h-4 text-blue-500" />
                        <div className="flex flex-col">
                          <span className="font-bold text-xs">Formatar Nota</span>
                          <span className="text-[10px] text-muted-foreground">Adiciona tópicos e estrutura</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => enhanceWithAI('summarize')} className="rounded-xl gap-3 p-3">
                        <FileText className="w-4 h-4 text-purple-500" />
                        <div className="flex flex-col">
                          <span className="font-bold text-xs">Resumir</span>
                          <span className="text-[10px] text-muted-foreground">Cria um resumo executivo</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => enhanceWithAI('verses')} className="rounded-xl gap-3 p-3">
                        <Quote className="w-4 h-4 text-emerald-500" />
                        <div className="flex flex-col">
                          <span className="font-bold text-xs">Sugerir Versículos</span>
                          <span className="text-[10px] text-muted-foreground">Links bíblicos inteligentes</span>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <Textarea 
                  value={formContent} 
                  onChange={e => setFormContent(e.target.value)} 
                  className="min-h-[300px] rounded-3xl border-slate-200 bg-slate-50 p-6 focus:bg-white transition-all text-base leading-relaxed resize-none"
                  placeholder="Comece a escrever aqui... você também pode tirar uma foto de um caderno físico para transcrever."
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1 mb-1 block">Referência Bíblica Principal</label>
              <Input 
                value={formVerse} 
                onChange={e => setFormVerse(e.target.value)} 
                placeholder="Ex: João 3:16" 
                className="rounded-2xl border-slate-200 bg-slate-50"
              />
            </div>
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
            <Button 
              onClick={handleSave} 
              className="w-full h-12 rounded-2xl text-base font-bold shadow-lg shadow-primary/25 gap-2"
              disabled={saving}
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {editingNote ? 'Salvar Alterações' : 'Criar Anotação'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Study Mode Full Screen */}
      <Dialog open={!!studyMode} onOpenChange={() => setStudyMode(null)}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] rounded-3xl p-0 flex flex-col md:flex-row overflow-hidden border-none">
          {/* Note Content Side */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-950">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setStudyMode(null)} className="rounded-full h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
                <h2 className="text-xl font-bold">{studyMode?.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-full gap-2 h-8 text-xs" onClick={() => { setFormOpen(true); setEditingNote(studyMode); }}>
                  <Edit3 className="w-3.5 h-3.5" /> Editar
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 prose dark:prose-invert max-w-none">
              <div className="flex items-center gap-2 mb-6">
                <Badge className="rounded-full">{studyMode ? getCategory(studyMode.note_type).label : ''}</Badge>
                {studyMode?.verse_reference && (
                  <Badge variant="outline" className="rounded-full gap-1">
                    <BookMarked className="w-3.5 h-3.5" /> {studyMode.verse_reference}
                  </Badge>
                )}
              </div>
              <div className="text-lg leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300">
                {studyMode?.content}
              </div>
            </div>
          </div>

          {/* Bible Side (Placeholder for integration) */}
          <div className="hidden lg:flex w-96 flex-col border-l border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <BookOpen className="w-4 h-4 text-primary" /> Referência Bíblica
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl shadow-sm border border-slate-200">
                <p className="text-xs font-bold text-primary mb-2 uppercase tracking-widest">{studyMode?.verse_reference || 'Selecione um versículo'}</p>
                <p className="text-sm italic text-slate-600">
                  {studyMode?.verse_reference 
                    ? "Carregando texto bíblico em tempo real..." 
                    : "As referências citadas em sua nota aparecerão aqui para estudo rápido."}
                </p>
              </div>
              
              <Card className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent border-primary/10">
                <p className="text-[10px] font-bold text-primary uppercase mb-2">Insight da IA</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Este estudo parece focado em **{studyMode?.note_type === 'prayer' ? 'intercessão e fé' : 'crescimento espiritual'}**. 
                  Considere ler também o contexto histórico deste capítulo para uma compreensão mais profunda.
                </p>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotebookPage;
