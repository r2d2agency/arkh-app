import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen, Plus, Save, BookMarked, Search, Trash2, Edit3, Clock, Loader2, Video, Link2,
  Copy, Check, MoreVertical, Camera, Wand2, Sparkles,
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
  { value: 'note', label: 'Anotação', emoji: '📝' },
  { value: 'sermon', label: 'Sermão', emoji: '🎤' },
  { value: 'prayer', label: 'Oração', emoji: '🙏' },
  { value: 'insight', label: 'Insight', emoji: '💡' },
  { value: 'testimony', label: 'Testemunho', emoji: '✨' },
];

const NotebookPage = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [services, setServices] = useState<{id: string, title: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formType, setFormType] = useState('note');
  const [saving, setSaving] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOcr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
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
      if (editingNote) {
        const updated = await api.put<Note>(`/api/church/notes/${editingNote.id}`, { title: formTitle, content: formContent, note_type: formType });
        setNotes(prev => prev.map(n => n.id === editingNote.id ? { ...n, ...updated } : n));
        toast.success('Atualizado!');
      } else {
        const note = await api.post<Note>('/api/church/notes', { title: formTitle, content: formContent, note_type: formType });
        setNotes(prev => [note, ...prev]);
        toast.success('Salvo!');
      }
      setFormOpen(false);
    } catch {
      toast.error('Erro');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-heading">Meu Caderno</h1>
        <Button size="sm" onClick={() => { setEditingNote(null); setFormTitle(''); setFormContent(''); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Nova
        </Button>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingNote ? 'Editar' : 'Nova Anotação'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Título" />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={ocrLoading}>
                <Camera className="w-4 h-4 mr-2" /> {ocrLoading ? 'Lendo...' : 'Foto'}
              </Button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleOcr} />
              <Button size="sm" variant="outline" onClick={() => enhanceWithAI('format')}>
                <Wand2 className="w-4 h-4 mr-2" /> Formatar
              </Button>
              <Button size="sm" variant="outline" onClick={() => enhanceWithAI('verses')}>
                <Sparkles className="w-4 h-4 mr-2" /> Versículos
              </Button>
            </div>
            <Textarea value={formContent} onChange={e => setFormContent(e.target.value)} className="min-h-[200px]" placeholder="Suas anotações..." />
            <Button onClick={handleSave} className="w-full" disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : 'Salvar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotebookPage;
