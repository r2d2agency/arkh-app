import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Brain, Sparkles, Save, RotateCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface AISettings {
  ai_prompt_template: string | null;
  ai_temperature: number | null;
  ai_max_tokens: number | null;
}

const defaultPrompt = `Você é um teólogo e analista bíblico especializado em pregações cristãs. Sua função é criar uma análise PROFUNDA, COMPLETA e DETALHADA de cada pregação.

Responda SEMPRE em JSON válido com a seguinte estrutura:
{
  "summary": "Resumo DETALHADO da pregação em 5-8 parágrafos completos...",
  "theological_context": "Contexto teológico e histórico dos textos...",
  "sermon_structure": [{"part": "...", "description": "..."}],
  "topics": ["tópico 1", "tópico 2", ...],
  "key_verses": [{"reference": "...", "text": "...", "context": "..."}],
  "practical_applications": ["aplicação 1", ...],
  "reflection_questions": ["pergunta 1?", ...],
  "connections": [{"sermon_title": "...", "connection": "..."}]
}`;

const ChurchSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<AISettings>({ ai_prompt_template: null, ai_temperature: null, ai_max_tokens: null });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === 'admin_church';

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await api.get<AISettings>('/api/church/ai-settings');
        setSettings(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/church/ai-settings', settings);
      toast({ title: 'Configurações de IA salvas!' });
    } catch (err: any) {
      toast({ title: err.message || 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({ ai_prompt_template: null, ai_temperature: null, ai_max_tokens: null });
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-heading text-2xl font-bold">Configurações</h1>
          <p className="text-sm text-muted-foreground">Apenas administradores podem alterar configurações.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Configurações gerais da sua igreja</p>
      </div>

      <Card className="p-6 rounded-xl space-y-5 max-w-2xl">
        <h3 className="font-heading font-semibold flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" /> Configurações de IA
        </h3>
        <p className="text-sm text-muted-foreground">
          Personalize como a IA processa as pregações da sua igreja. O prompt define o formato e profundidade da análise.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Prompt personalizado
            </Label>
            <Textarea
              placeholder={defaultPrompt}
              value={settings.ai_prompt_template || ''}
              onChange={e => setSettings(s => ({ ...s, ai_prompt_template: e.target.value || null }))}
              className="rounded-xl min-h-[200px] font-mono text-xs"
              rows={12}
            />
            <p className="text-[10px] text-muted-foreground">
              Deixe vazio para usar o prompt padrão do sistema. O prompt deve instruir a IA a retornar JSON válido.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Temperatura</Label>
              <Input
                type="number"
                min="0"
                max="2"
                step="0.1"
                placeholder="0.7 (padrão)"
                value={settings.ai_temperature ?? ''}
                onChange={e => setSettings(s => ({ ...s, ai_temperature: e.target.value ? parseFloat(e.target.value) : null }))}
                className="rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground">
                0 = mais focado, 2 = mais criativo
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Max Tokens</Label>
              <Input
                type="number"
                min="1000"
                max="32000"
                step="1000"
                placeholder="8192 (padrão)"
                value={settings.ai_max_tokens ?? ''}
                onChange={e => setSettings(s => ({ ...s, ai_max_tokens: e.target.value ? parseInt(e.target.value) : null }))}
                className="rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground">
                Mais tokens = resposta mais longa
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-primary hover:bg-primary/90 border-0 text-primary-foreground">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar configurações'}
          </Button>
          <Button variant="outline" onClick={handleReset} className="rounded-xl">
            <RotateCcw className="w-4 h-4 mr-2" /> Restaurar padrão
          </Button>
        </div>
      </Card>

      <Card className="p-6 rounded-xl space-y-5 max-w-2xl">
        <h3 className="font-heading font-semibold flex items-center gap-2">
          <Settings className="w-4 h-4" /> Dados da Igreja
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome da Igreja</Label>
            <Input placeholder="Nome da igreja" className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Slug</Label>
            <Input placeholder="slug-da-igreja" className="rounded-xl" disabled />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Domínio personalizado</Label>
            <Input placeholder="app.minhaigreja.com.br" className="rounded-xl" />
          </div>
        </div>
        <Button className="rounded-xl bg-primary hover:bg-primary/90 border-0 text-primary-foreground">Salvar configurações</Button>
      </Card>
    </div>
  );
};

export default ChurchSettings;
