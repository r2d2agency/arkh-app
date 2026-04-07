import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'super_admin') {
        navigate('/admin');
      } else {
        navigate('/church');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 rounded-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-heading text-3xl font-bold tracking-tight">ARKHÉ</h1>
          <p className="text-muted-foreground text-sm">Acesse sua conta</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="rounded-xl"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Senha</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="rounded-xl"
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full rounded-xl gradient-primary border-0 shadow-md shadow-primary/20"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar'}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Sua igreja ainda não está cadastrada?{' '}
          <Link to="/register" className="text-primary hover:underline font-medium">
            Cadastre gratuitamente
          </Link>
        </p>
      </Card>
    </div>
  );
};

export default Login;
