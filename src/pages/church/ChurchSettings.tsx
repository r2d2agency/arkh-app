import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Settings, Brain, Sparkles, Save, RotateCcw, Bot, Crown, MessageCircle, Church } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface AISettings {
  ai_prompt_template: string | null;
  ai_temperature: number | null;
  ai_max_tokens: number | null;
  ai_assistant_enabled: boolean;
  ai_assistant_prompt: string | null;
}

const defaultProcessingPrompt = `Você é um teólogo e analista bíblico especializado em pregações cristãs. Sua função é criar uma análise PROFUNDA, COMPLETA e DETALHADA de cada pregação.

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

const defaultAssistantPrompt = `Descreva aqui informações sobre a doutrina, valores e identidade da sua igreja. Essas informações serão usadas pelo Assistente ARKHÉ para contextualizar respostas aos membros.

Exemplo:
- Nossa igreja é da denominação Batista
- Cremos na Trindade, salvação pela graça e autoridade das Escrituras
- Valorizamos comunhão, missões e discipulado`;

const ChurchSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<AISettings>({
    ai_prompt_template: null,
    ai_temperature: null,
    ai_max_tokens: null,
    ai_assistant_enabled: false,
    ai_assistant_prompt: null,
  });
  const [togglingAssistant, setTogglingAssistant] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === 'admin_church';

  useEffect(() => {
    const fetchSettings = async () => {
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
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/church/ai-settings', settings);
      toast({ title: 'Configurações salvas com sucesso!' });
    } catch (err: any) {
      toast({ title: err.message || 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetProcessing = () => {
    setSettings(s => ({ ...s, ai_prompt_template: null, ai_temperature: null, ai_max_tokens: null }));
  };

  const handleResetAssistant = () => {
    setSettings(s => ({ ...s, ai_assistant_prompt: null }));
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-heading text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Apenas administradores podem alterar configurações.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Configurações gerais da sua igreja</p>
      </div>

      {/* ═══════ SEÇÃO 1: IA ASSISTENTE (PREMIUM) ═══════ */}
      <Card className="p-6 rounded-xl space-y-5 max-w-2xl border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" /> IA Assistente
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-0.5 rounded-full">
            <Crown className="w-3 h-3" /> Premium
          </span>
        </h3>
        <p className="text-sm text-muted-foreground">
          O Assistente ARKHÉ permite que os membros conversem com a IA, tirem dúvidas bíblicas e aprofundem estudos.
          Disponível em planos premium.
        </p>

        {/* Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
          <div>
            <p className="font-medium text-foreground">Ativar IA Assistente para membros</p>
            <p className="text-xs text-muted-foreground mt-0.5">Os membros verão o botão "Assistente ARKHÉ" no app</p>
          </div>
          <Switch
            checked={settings.ai_assistant_enabled}
            disabled={togglingAssistant}
            onCheckedChange={async () => {
              setTogglingAssistant(true);
              try {
                const data = await api.put<{ ai_assistant_enabled: boolean }>('/api/church/assistant/toggle', {});
                setSettings(s => ({ ...s, ai_assistant_enabled: data.ai_assistant_enabled }));
                toast({ title: data.ai_assistant_enabled ? 'IA Assistente ativada!' : 'IA Assistente desativada' });
              } catch (err: any) {
                toast({ title: err.message || 'Erro ao alterar', variant: 'destructive' });
              } finally {
                setTogglingAssistant(false);
              }
            }}
          />
        </div>

        {/* Prompt do Assistente — só aparece quando ativo */}
        {settings.ai_assistant_enabled && (
          <div className="space-y-4 pt-2 border-t border-border/50">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <MessageCircle className="w-3 h-3" /> Contexto da Igreja (Doutrina / Descrição)
              </Label>
              <Textarea
                placeholder={defaultAssistantPrompt}
                value={settings.ai_assistant_prompt || ''}
                onChange={e => setSettings(s => ({ ...s, ai_assistant_prompt: e.target.value || null }))}
                className="rounded-xl min-h-[140px] text-sm"
                rows={6}
              />
              <p className="text-[11px] text-muted-foreground">
                Descreva a doutrina, valores e identidade da sua igreja. Esse texto complementa o prompt principal (definido pelo Super Admin)
                e ajuda o assistente a dar respostas alinhadas com a sua denominação.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} size="sm" className="rounded-xl bg-primary hover:bg-primary/90 border-0 text-primary-foreground">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button variant="outline" onClick={handleResetAssistant} size="sm" className="rounded-xl">
                <RotateCcw className="w-4 h-4 mr-2" /> Limpar
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ═══════ SEÇÃO 2: IA PROCESSAMENTO (CULTOS) ═══════ */}
      <Card className="p-6 rounded-xl space-y-5 max-w-2xl">
        <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" /> IA de Processamento de Cultos
        </h3>
        <p className="text-sm text-muted-foreground">
          Configure como a IA gera resumos, pontos-chave e análises dos cultos. Este prompt é usado na <strong>IA Passiva</strong> (incluída no plano gratuito).
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Prompt de processamento
            </Label>
            <Textarea
              placeholder={defaultProcessingPrompt}
              value={settings.ai_prompt_template || ''}
              onChange={e => setSettings(s => ({ ...s, ai_prompt_template: e.target.value || null }))}
              className="rounded-xl min-h-[180px] font-mono text-xs"
              rows={10}
            />
            <p className="text-[11px] text-muted-foreground">
              Deixe vazio para usar o prompt padrão do sistema. O prompt deve instruir a IA a retornar JSON válido com resumo, versículos, etc.
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
              <p className="text-[11px] text-muted-foreground">0 = mais focado, 2 = mais criativo</p>
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
              <p className="text-[11px] text-muted-foreground">Mais tokens = resposta mais longa</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-primary hover:bg-primary/90 border-0 text-primary-foreground">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar configurações'}
          </Button>
          <Button variant="outline" onClick={handleResetProcessing} className="rounded-xl">
            <RotateCcw className="w-4 h-4 mr-2" /> Restaurar padrão
          </Button>
        </div>
      </Card>

      {/* ═══════ SEÇÃO 3: DADOS DA IGREJA ═══════ */}
      <Card className="p-6 rounded-xl space-y-5 max-w-2xl">
        <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
          <Church className="w-5 h-5" /> Dados da Igreja
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
