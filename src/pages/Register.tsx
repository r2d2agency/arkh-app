import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import logoImg from '@/assets/logo.png';

const Register = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    church_name: '',
    slug: '',
    admin_name: '',
    email: '',
    password: '',
    password_confirm: '',
  });

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'church_name') {
      const slug = value
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setForm(prev => ({ ...prev, slug }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step === 1) {
      if (!form.church_name || !form.slug) {
        toast.error('Preencha o nome da igreja');
        return;
      }
      setStep(2);
      return;
    }

    if (form.password !== form.password_confirm) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (form.password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const data = await api.post<{
        access_token: string;
        refresh_token: string;
        user: { id: string; name: string; email: string; role: string; church_id: string };
        church: any;
      }>('/api/register', {
        church_name: form.church_name,
        slug: form.slug,
        admin_name: form.admin_name,
        email: form.email,
        password: form.password,
      });

      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);

      toast.success('Igreja cadastrada com sucesso!');
      window.location.href = '/church';
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    'Estudos bíblicos com IA',
    'App personalizado para sua igreja',
    'Gestão de grupos e células',
    'Transcrição automática de cultos',
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left - Info */}
      <div className="hidden lg:flex lg:w-1/2 gradient-blue-gold items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        </div>
        <div className="relative z-10 max-w-lg text-white space-y-8">
          <img src={logoImg} alt="ARKHÉ" className="w-24 h-24 object-contain" />
          <h2 className="font-heading text-4xl font-bold leading-tight">
            Transforme a experiência digital da sua igreja
          </h2>
          <p className="text-lg text-white/80">
            Cadastre sua igreja gratuitamente e tenha acesso a ferramentas poderosas de gestão e engajamento.
          </p>
          <div className="space-y-4">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-white/90 shrink-0" />
                <span className="text-white/90">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 rounded-2xl space-y-6 border-gold/20">
          <div className="text-center space-y-2">
            <img src={logoImg} alt="ARKHÉ" className="mx-auto w-16 h-16 object-contain lg:hidden" />
            <h1 className="font-heading text-2xl font-bold tracking-tight gradient-text">
              {step === 1 ? 'Cadastre sua Igreja' : 'Seus dados de acesso'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {step === 1
                ? 'Comece com o plano gratuito — sem cartão de crédito'
                : 'Crie sua conta de administrador'}
            </p>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center gap-2 justify-center">
            <div className={`h-2 w-12 rounded-full transition-colors ${step >= 1 ? 'gradient-blue-gold' : 'bg-muted'}`} />
            <div className={`h-2 w-12 rounded-full transition-colors ${step >= 2 ? 'gradient-blue-gold' : 'bg-muted'}`} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 ? (
              <>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome da Igreja</Label>
                  <Input
                    value={form.church_name}
                    onChange={e => updateField('church_name', e.target.value)}
                    placeholder="Igreja Comunidade da Graça"
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Slug (URL)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">arkhe.app/</span>
                    <Input
                      value={form.slug}
                      onChange={e => updateField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="comunidade-da-graca"
                      className="rounded-xl"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Esse será o endereço único da sua igreja</p>
                </div>
                <Button type="submit" className="w-full rounded-xl gradient-blue-gold border-0 shadow-md shadow-primary/20 text-primary-foreground">
                  Continuar <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Seu nome</Label>
                  <Input
                    value={form.admin_name}
                    onChange={e => updateField('admin_name', e.target.value)}
                    placeholder="Pastor João Silva"
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => updateField('email', e.target.value)}
                    placeholder="joao@igreja.com"
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Senha</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={e => updateField('password', e.target.value)}
                    placeholder="••••••••"
                    className="rounded-xl"
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Confirmar senha</Label>
                  <Input
                    type="password"
                    value={form.password_confirm}
                    onChange={e => updateField('password_confirm', e.target.value)}
                    placeholder="••••••••"
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="rounded-xl">
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 rounded-xl gradient-blue-gold border-0 shadow-md shadow-primary/20 text-primary-foreground"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar minha igreja'}
                  </Button>
                </div>
              </>
            )}
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Fazer login
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Register;
