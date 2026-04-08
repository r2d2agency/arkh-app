import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { GraduationCap, Plus, Trash2, Pencil, Loader2, Users, BookOpen, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface SchoolClass {
  id: string; title: string; description: string; teacher_id: string | null;
  teacher_name: string; category: string; schedule: string; max_students: number | null;
  student_count: number; pending_count: number; lesson_count: number; is_active: boolean;
}
interface Member { id: string; name: string; email: string; role: string; }

const categories = [
  { value: 'children', label: 'Crianças' },
  { value: 'youth', label: 'Jovens' },
  { value: 'adults', label: 'Adultos' },
  { value: 'new_members', label: 'Novos Membros' },
  { value: 'leaders', label: 'Líderes' },
];

const SchoolAdmin = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolClass | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', teacher_id: '', category: '',
    schedule: '', max_students: '', is_active: true,
  });

  const load = () => {
    Promise.all([
      api.get<SchoolClass[]>('/api/church/school/classes'),
      api.get<Member[]>('/api/church/members'),
    ]).then(([c, m]) => { setClasses(c); setMembers(m); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', teacher_id: '', category: '', schedule: '', max_students: '', is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (cls: SchoolClass) => {
    setEditing(cls);
    setForm({
      title: cls.title, description: cls.description || '', teacher_id: cls.teacher_id || '',
      category: cls.category || '', schedule: cls.schedule || '',
      max_students: cls.max_students?.toString() || '', is_active: cls.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return toast.error('Título obrigatório');
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        teacher_id: form.teacher_id || null,
        category: form.category || null,
        schedule: form.schedule || null,
        max_students: form.max_students ? parseInt(form.max_students) : null,
        is_active: form.is_active,
      };
      if (editing) {
        await api.put(`/api/church/school/classes/${editing.id}`, payload);
        toast.success('Classe atualizada');
      } else {
        await api.post('/api/church/school/classes', payload);
        toast.success('Classe criada');
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Erro');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta classe?')) return;
    try {
      await api.delete(`/api/church/school/classes/${id}`);
      toast.success('Classe removida');
      load();
    } catch {}
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-primary" />
          <h1 className="font-heading text-xl font-bold">Escola Bíblica</h1>
        </div>
        <Button onClick={openCreate} size="sm" className="rounded-xl">
          <Plus className="w-4 h-4 mr-1" /> Nova Classe
        </Button>
      </div>

      {classes.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <GraduationCap className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Nenhuma classe cadastrada</p>
          <Button onClick={openCreate} variant="outline" size="sm" className="mt-3 rounded-xl">
            <Plus className="w-4 h-4 mr-1" /> Criar primeira classe
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {classes.map(cls => (
            <Card key={cls.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-heading font-semibold">{cls.title}</h3>
                    <Badge variant={cls.is_active ? 'default' : 'secondary'} className="text-[10px]">
                      {cls.is_active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {cls.teacher_name && <span>Prof. {cls.teacher_name}</span>}
                    <span><Users className="w-3 h-3 inline mr-1" />{cls.student_count} alunos</span>
                    {cls.pending_count > 0 && (
                      <Badge className="bg-amber-500/20 text-amber-400 text-[10px]">
                        {cls.pending_count} pendente{cls.pending_count > 1 ? 's' : ''}
                      </Badge>
                    )}
                    <span><BookOpen className="w-3 h-3 inline mr-1" />{cls.lesson_count} aulas</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(cls)} className="h-8 w-8">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(cls.id)} className="h-8 w-8 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Classe' : 'Nova Classe'}</DialogTitle>
            <DialogDescription>Preencha os dados da classe</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: EBD Adultos" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>Professor(a)</Label>
              <Select value={form.teacher_id || '__none'} onValueChange={v => setForm({ ...form, teacher_id: v === '__none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Nenhum</SelectItem>
                  {members.filter(m => m.role !== 'member').map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={form.category || '__none'} onValueChange={v => setForm({ ...form, category: v === '__none' ? '' : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Geral</SelectItem>
                    {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Máx. Alunos</Label>
                <Input type="number" value={form.max_students} onChange={e => setForm({ ...form, max_students: e.target.value })} placeholder="Ilimitado" />
              </div>
            </div>
            <div>
              <Label>Horário</Label>
              <Input value={form.schedule} onChange={e => setForm({ ...form, schedule: e.target.value })} placeholder="Ex: Domingos 9h" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label>Classe ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchoolAdmin;
