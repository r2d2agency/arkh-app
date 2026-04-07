import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import logoImg from '@/assets/logo.png';

const JoinChurch = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [church, setChurch] = useState<{ id: string; name: string; logo_url?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirm: '' });

  useEffect(() => {
    if (!slug) return;
    api.get<{ id: string; name: string; logo_url?: string }>(`/api/join/${slug}`)
      .then(data => setChurch(data))
      .catch(() => toast.error('Igreja não encontrada'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.password_confirm) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (form.password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    setSubmitting(true);
    try {
      const data = await api.post<{
        access_token: string;
        refresh_token: string;
        user: any;
        church: any;
      }>(`/api/join/${slug}`, {
        name: form.name,
        email: form.email,
        password: form.password,
      });

      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      toast.success(`Bem-vindo à ${data.church.name}!`);
      window.location.href = '/church';
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cadastrar');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!church) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 rounded-2xl text-center space-y-4 max-w-md w-full">
          <img src={logoImg} alt="ARKHÉ" className="w-16 h-16 mx-auto object-contain" />
          <h1 className="font-heading text-xl font-bold">Igreja não encontrada</h1>
          <p className="text-sm text-muted-foreground">O link de convite pode estar incorreto ou a igreja não está mais ativa.</p>
          <Button onClick={() => navigate('/login')} className="rounded-xl">Ir para Login</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 rounded-2xl space-y-6 border-primary/15 shadow-xl shadow-primary/5">
        <div className="text-center space-y-3">
          <img src={logoImg} alt="ARKHÉ" className="w-16 h-16 mx-auto object-contain" />
          <h1 className="font-heading text-xl font-bold text-primary">Entrar na {church.name}</h1>
          <p className="text-muted-foreground text-sm">Crie sua conta para acessar os conteúdos da igreja</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Seu nome</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome completo" className="rounded-xl" required />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="seu@email.com" className="rounded-xl" required />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Senha</Label>
            <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" className="rounded-xl" required minLength={6} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Confirmar senha</Label>
            <Input type="password" value={form.password_confirm} onChange={e => setForm(f => ({ ...f, password_confirm: e.target.value }))} placeholder="••••••••" className="rounded-xl" required />
          </div>
          <Button type="submit" className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground" disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar minha conta'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Já tem uma conta?{' '}
          <a href="/login" className="text-primary hover:underline font-medium">Fazer login</a>
        </p>
      </Card>
    </div>
  );
};

export default JoinChurch;
