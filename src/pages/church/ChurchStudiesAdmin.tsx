import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { BookOpen, Plus, Trash2, Pencil, Loader2, Search, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface Study {
  id: string;
  title: string;
  description: string;
  objective: string;
  key_verse: string;
  base_reading: string;
  introduction: string;
  topics: string[];
  application: string;
  questions: string[];
  conclusion: string;
  category: string;
  is_published: boolean;
  completions: number;
  author_name: string;
  created_at: string;
}

const defaultForm = {
  title: '', description: '', objective: '', key_verse: '', base_reading: '',
  introduction: '', topics: [] as string[], application: '',
  questions: [] as string[], conclusion: '', category: '', is_published: false,
};

const ChurchStudiesAdmin = () => {
  const { toast } = useToast();
  const [studies, setStudies] = useState<Study[]>([]);
  const [fetching, setFetching] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Study | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ ...defaultForm });
  const [newTopic, setNewTopic] = useState('');
  const [newQuestion, setNewQuestion] = useState('');

  useEffect(() => {
    api.get<Study[]>('/api/church/studies')
      .then(setStudies)
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const handleOpen = (study?: Study) => {
    if (study) {
      setEditing(study);
      const topics = typeof study.topics === 'string' ? JSON.parse(study.topics) : (study.topics || []);
      const questions = typeof study.questions === 'string' ? JSON.parse(study.questions) : (study.questions || []);
      setForm({
        title: study.title || '', description: study.description || '',
        objective: study.objective || '', key_verse: study.key_verse || '',
        base_reading: study.base_reading || '', introduction: study.introduction || '',
        topics, application: study.application || '', questions,
        conclusion: study.conclusion || '', category: study.category || '',
        is_published: study.is_published,
      });
    } else {
      setEditing(null);
      setForm({ ...defaultForm });
    }
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) {
      toast({ title: 'Título obrigatório', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      if (editing) {
        const updated = await api.put<Study>(`/api/church/studies/${editing.id}`, form);
        setStudies(prev => prev.map(s => s.id === editing.id ? { ...s, ...updated } : s));
        toast({ title: 'Estudo atualizado!' });
      } else {
        const created = await api.post<Study>('/api/church/studies', form);
        setStudies(prev => [created, ...prev]);
        toast({ title: 'Estudo criado!' });
      }
      setOpen(false);
    } catch (err: any) {
      toast({ title: err.message || 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/church/studies/${id}`);
      setStudies(prev => prev.filter(s => s.id !== id));
      toast({ title: 'Estudo removido' });
    } catch {
      toast({ title: 'Erro ao remover', variant: 'destructive' });
    }
  };

  const addTopic = () => {
    if (!newTopic.trim()) return;
    setForm(f => ({ ...f, topics: [...f.topics, newTopic.trim()] }));
    setNewTopic('');
  };

  const removeTopic = (i: number) => {
    setForm(f => ({ ...f, topics: f.topics.filter((_, idx) => idx !== i) }));
  };

  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    setForm(f => ({ ...f, questions: [...f.questions, newQuestion.trim()] }));
    setNewQuestion('');
  };

  const removeQuestion = (i: number) => {
    setForm(f => ({ ...f, questions: f.questions.filter((_, idx) => idx !== i) }));
  };

  const filtered = studies.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Estudos Bíblicos</h1>
          <p className="text-sm text-muted-foreground">Crie estudos estruturados para sua igreja</p>
        </div>
        <Button className="rounded-xl bg-primary hover:bg-primary/90 border-0 text-primary-foreground" onClick={() => handleOpen()}>
          <Plus className="w-4 h-4 mr-2" /> Novo estudo
        </Button>
      </div>

      {studies.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar estudos..." className="pl-9 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {fetching ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 rounded-xl text-center space-y-4">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <h3 className="font-heading font-semibold text-lg">Nenhum estudo criado</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">Crie estudos bíblicos estruturados para os membros da sua igreja.</p>
          <Button className="rounded-xl bg-primary hover:bg-primary/90 border-0 text-primary-foreground" onClick={() => handleOpen()}>
            <Plus className="w-4 h-4 mr-2" /> Criar primeiro estudo
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(study => (
            <Card key={study.id} className="p-5 rounded-xl border-border/60 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-semibold truncate">{study.title}</h3>
                  {study.category && <Badge variant="secondary" className="rounded-full text-[10px] mt-1">{study.category}</Badge>}
                </div>
                <Badge variant={study.is_published ? 'default' : 'outline'} className="text-[10px] shrink-0">
                  {study.is_published ? <><Eye className="w-3 h-3 mr-0.5" /> Publicado</> : <><EyeOff className="w-3 h-3 mr-0.5" /> Rascunho</>}
                </Badge>
              </div>
              {study.description && <p className="text-xs text-muted-foreground line-clamp-2">{study.description}</p>}
              {study.key_verse && <p className="text-xs text-gold italic">📖 {study.key_verse}</p>}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle className="w-3 h-3" />
                <span>{study.completions || 0} completaram</span>
                <span>•</span>
                <span>{study.author_name}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="rounded-lg flex-1" onClick={() => handleOpen(study)}>
                  <Pencil className="w-3 h-3 mr-1" /> Editar
                </Button>
                <Button size="sm" variant="ghost" className="rounded-lg text-destructive" onClick={() => handleDelete(study.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-xl max-w-2xl max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Estudo' : 'Novo Estudo Bíblico'}</DialogTitle>
            <DialogDescription>Preencha os campos para criar um estudo completo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Título *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="rounded-xl" placeholder="Ex: A oração que transforma" />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="rounded-xl" placeholder="Ex: Fé, Família, Oração" />
              </div>
              <div className="space-y-2">
                <Label>Versículo-chave</Label>
                <Input value={form.key_verse} onChange={e => setForm(f => ({ ...f, key_verse: e.target.value }))} className="rounded-xl" placeholder="Ex: Filipenses 4:6" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="rounded-xl" placeholder="Breve descrição do estudo" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Objetivo</Label>
              <Input value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))} className="rounded-xl" placeholder="O que o membro vai aprender" />
            </div>
            <div className="space-y-2">
              <Label>Leitura base</Label>
              <Input value={form.base_reading} onChange={e => setForm(f => ({ ...f, base_reading: e.target.value }))} className="rounded-xl" placeholder="Ex: Mateus 6:5-15" />
            </div>
            <div className="space-y-2">
              <Label>Introdução</Label>
              <Textarea value={form.introduction} onChange={e => setForm(f => ({ ...f, introduction: e.target.value }))} className="rounded-xl" placeholder="Texto introdutório do estudo" rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Tópicos</Label>
              <div className="flex gap-2">
                <Input value={newTopic} onChange={e => setNewTopic(e.target.value)} className="rounded-xl" placeholder="Adicionar tópico" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTopic())} />
                <Button type="button" variant="outline" className="rounded-xl shrink-0" onClick={addTopic}>+</Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.topics.map((t, i) => (
                  <Badge key={i} variant="secondary" className="rounded-full gap-1 cursor-pointer" onClick={() => removeTopic(i)}>
                    {t} ✕
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Aplicação prática</Label>
              <Textarea value={form.application} onChange={e => setForm(f => ({ ...f, application: e.target.value }))} className="rounded-xl" placeholder="Como aplicar no dia a dia" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Perguntas para reflexão</Label>
              <div className="flex gap-2">
                <Input value={newQuestion} onChange={e => setNewQuestion(e.target.value)} className="rounded-xl" placeholder="Adicionar pergunta" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addQuestion())} />
                <Button type="button" variant="outline" className="rounded-xl shrink-0" onClick={addQuestion}>+</Button>
              </div>
              <div className="space-y-1">
                {form.questions.map((q, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 px-3 py-2 rounded-lg">
                    <span className="flex-1">{q}</span>
                    <button onClick={() => removeQuestion(i)} className="text-destructive text-xs">✕</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Conclusão</Label>
              <Textarea value={form.conclusion} onChange={e => setForm(f => ({ ...f, conclusion: e.target.value }))} className="rounded-xl" placeholder="Encerramento do estudo" rows={2} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_published} onCheckedChange={v => setForm(f => ({ ...f, is_published: v }))} />
              <Label>Publicar (visível para membros)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleSave} disabled={loading} className="rounded-xl bg-primary hover:bg-primary/90 border-0 text-primary-foreground">
              {loading ? 'Salvando...' : editing ? 'Salvar' : 'Criar estudo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChurchStudiesAdmin;
