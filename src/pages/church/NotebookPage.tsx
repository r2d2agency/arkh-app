import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BookOpen, Plus, Save, Sparkles, BookMarked, MessageSquare,
  Search, Trash2, Edit3, X, Tag, Clock,
} from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
}

const NotebookPage = () => {
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('arkhe_notes');
    return saved ? JSON.parse(saved) : [];
  });
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [search, setSearch] = useState('');

  const savedVerses = JSON.parse(localStorage.getItem('arkhe_saved_verses') || '[]');

  const saveNotes = (updated: Note[]) => {
    setNotes(updated);
    localStorage.setItem('arkhe_notes', JSON.stringify(updated));
  };

  const handleCreate = () => {
    if (!newTitle.trim() && !newContent.trim()) return;
    const newNote: Note = {
      id: Date.now().toString(),
      title: newTitle || 'Sem título',
      content: newContent,
      tags: [],
      createdAt: new Date(),
    };
    saveNotes([newNote, ...notes]);
    setNewTitle('');
    setNewContent('');
    setCreating(false);
  };

  const handleDelete = (id: string) => {
    saveNotes(notes.filter(n => n.id !== id));
  };

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 animate-fade-in p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Meu Caderno</h1>
          <p className="text-sm text-muted-foreground">Anotações, versículos e estudos pessoais</p>
        </div>
        <Button
          size="sm"
          className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => setCreating(true)}
        >
          <Plus className="w-4 h-4 mr-1" /> Nova
        </Button>
      </div>

      <Tabs defaultValue="notes" className="w-full">
        <TabsList className="w-full rounded-xl bg-muted/50 p-1 h-auto">
          <TabsTrigger value="notes" className="rounded-lg text-xs flex-1 data-[state=active]:bg-card">
            <Edit3 className="w-3.5 h-3.5 mr-1" /> Anotações
          </TabsTrigger>
          <TabsTrigger value="verses" className="rounded-lg text-xs flex-1 data-[state=active]:bg-card">
            <BookMarked className="w-3.5 h-3.5 mr-1" /> Versículos
          </TabsTrigger>
          <TabsTrigger value="studies" className="rounded-lg text-xs flex-1 data-[state=active]:bg-card">
            <Sparkles className="w-3.5 h-3.5 mr-1" /> Estudos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="mt-4 space-y-4">
          {/* Create note */}
          {creating && (
            <Card className="p-4 rounded-2xl space-y-3 border-primary/20">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-sm font-semibold">Nova anotação</h3>
                <button onClick={() => setCreating(false)}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <Input
                placeholder="Título (opcional)"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="rounded-xl bg-muted/30 border-0"
              />
              <Textarea
                placeholder="Escreva seus pensamentos, reflexões, estudos..."
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                className="rounded-xl min-h-[120px] bg-muted/30 border-0 resize-none"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={handleCreate}
                >
                  <Save className="w-3.5 h-3.5 mr-1" /> Salvar
                </Button>
              </div>
            </Card>
          )}

          {notes.length > 3 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar anotações..."
                className="pl-9 rounded-xl bg-muted/50 border-0"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          )}

          {filtered.length === 0 && !creating ? (
            <Card className="p-8 rounded-2xl text-center space-y-3">
              <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <h3 className="font-heading font-semibold">Seu caderno está vazio</h3>
              <p className="text-sm text-muted-foreground">
                Comece escrevendo suas reflexões ou salve versículos dos cultos.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() => setCreating(true)}
              >
                <Plus className="w-4 h-4 mr-1" /> Criar primeira anotação
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map(note => (
                <Card key={note.id} className="p-4 rounded-2xl space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-heading text-sm font-semibold flex-1">{note.title}</h3>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="text-muted-foreground hover:text-destructive p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">{note.content}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(note.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="verses" className="mt-4">
          {savedVerses.length === 0 ? (
            <Card className="p-8 rounded-2xl text-center space-y-3">
              <BookMarked className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <h3 className="font-heading font-semibold">Nenhum versículo salvo</h3>
              <p className="text-sm text-muted-foreground">
                Salve versículos dos cultos processados pela IA para encontrá-los aqui.
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {savedVerses.map((verse: string, i: number) => (
                <Card key={i} className="p-4 rounded-2xl bg-gold/5 border-gold/10">
                  <p className="text-sm font-medium text-gold">{verse}</p>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="studies" className="mt-4">
          <Card className="p-8 rounded-2xl text-center space-y-3">
            <Sparkles className="w-10 h-10 mx-auto text-muted-foreground/40" />
            <h3 className="font-heading font-semibold">Estudos pessoais</h3>
            <p className="text-sm text-muted-foreground">
              Em breve: crie trilhas de estudo conectando cultos, versículos e anotações.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotebookPage;
