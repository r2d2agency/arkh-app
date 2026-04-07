import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { Lock, Loader2, Check } from 'lucide-react';

const ChangePassword = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.new_password !== form.confirm_password) {
      toast({ title: 'As senhas não coincidem', variant: 'destructive' });
      return;
    }
    if (form.new_password.length < 6) {
      toast({ title: 'A nova senha deve ter no mínimo 6 caracteres', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await api.put('/api/church/profile/password', {
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setSuccess(true);
      setForm({ current_password: '', new_password: '', confirm_password: '' });
      toast({ title: 'Senha alterada com sucesso!' });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      toast({ title: err.message || 'Erro ao alterar senha', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold">Alterar Senha</h1>
        <p className="text-sm text-muted-foreground">Mantenha sua conta segura com uma senha forte</p>
      </div>

      <Card className="p-6 rounded-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Senha atual</Label>
            <Input
              type="password"
              value={form.current_password}
              onChange={e => setForm(f => ({ ...f, current_password: e.target.value }))}
              placeholder="••••••••"
              className="rounded-xl"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nova senha</Label>
            <Input
              type="password"
              value={form.new_password}
              onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))}
              placeholder="••••••••"
              className="rounded-xl"
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Confirmar nova senha</Label>
            <Input
              type="password"
              value={form.confirm_password}
              onChange={e => setForm(f => ({ ...f, confirm_password: e.target.value }))}
              placeholder="••••••••"
              className="rounded-xl"
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : success ? (
              <><Check className="w-4 h-4 mr-2" /> Senha alterada</>
            ) : (
              <><Lock className="w-4 h-4 mr-2" /> Alterar senha</>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ChangePassword;
