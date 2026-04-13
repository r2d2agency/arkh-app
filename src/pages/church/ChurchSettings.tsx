import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Settings, Brain, Sparkles, Save, RotateCcw, Bot, Crown, MessageCircle, Church, MapPin, Phone, Loader2, QrCode, DollarSign } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface ChurchInfo {
  name: string;
  slug: string;
  domain: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  whatsapp: string | null;
  phone: string | null;
  description: string | null;
  lat: number | null;
  lng: number | null;
  pix_key_type: string | null;
  pix_key: string | null;
  pix_beneficiary: string | null;
  pix_enabled: boolean;
}

const defaultProcessingPrompt = `Você é um teólogo e analista bíblico especializado...`;

const defaultAssistantPrompt = `Descreva aqui informações sobre a doutrina, valores e identidade da sua igreja.`;

const ChurchSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<AISettings>({
    ai_prompt_template: null, ai_temperature: null, ai_max_tokens: null,
    ai_assistant_enabled: false, ai_assistant_prompt: null,
  });
  const [churchInfo, setChurchInfo] = useState<ChurchInfo>({
    name: '', slug: '', domain: null, address: null, city: null, state: null, cep: null,
    whatsapp: null, phone: null, description: null, lat: null, lng: null,
    pix_key_type: null, pix_key: null, pix_beneficiary: null, pix_enabled: false,
  });
  const [fetchingCep, setFetchingCep] = useState(false);
  const [togglingAssistant, setTogglingAssistant] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);

  const isAdmin = user?.role === 'admin_church';

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<AISettings>('/api/church/ai-settings'),
      api.get<ChurchInfo>('/api/church/info'),
    ])
      .then(([ai, info]) => { setSettings(ai); setChurchInfo(info); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const notifyAssistantRefresh = () => {
    window.dispatchEvent(new Event('ai-assistant-settings-changed'));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/church/ai-settings', settings);
      notifyAssistantRefresh();
      toast({ title: 'Configurações salvas com sucesso!' });
    } catch (err: any) {
      toast({ title: err.message || 'Erro ao salvar', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const lookupCep = async (cep: string) => {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setFetchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setChurchInfo(s => ({
          ...s,
          address: [data.logradouro, data.bairro].filter(Boolean).join(', ') || s.address,
          city: data.localidade || s.city,
          state: data.uf || s.state,
        }));
      }
    } catch {}
    setFetchingCep(false);
  };

  const geocodeAddress = async (info: ChurchInfo): Promise<{ lat: number; lng: number } | null> => {
    const parts = [info.address, info.city, info.state, 'Brasil'].filter(Boolean);
    if (parts.length < 3) return null;
    try {
      const q = encodeURIComponent(parts.join(', '));
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`, {
        headers: { 'Accept-Language': 'pt-BR' },
      });
      const data = await res.json();
      if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch {}
    return null;
  };

  const handleSaveInfo = async () => {
    setSavingInfo(true);
    try {
      const geo = await geocodeAddress(churchInfo);
      const payload = { ...churchInfo, lat: geo?.lat ?? churchInfo.lat, lng: geo?.lng ?? churchInfo.lng };
      const updated = await api.put<ChurchInfo>('/api/church/info', payload);
      setChurchInfo(updated);
      toast({ title: 'Dados da igreja salvos!' });
    } catch (err: any) {
      toast({ title: err.message || 'Erro ao salvar', variant: 'destructive' });
    } finally { setSavingInfo(false); }
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

      {/* Church Data */}
      <Card className="p-6 rounded-xl space-y-5 max-w-2xl">
        <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
          <Church className="w-5 h-5" /> Dados da Igreja
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome da Igreja</Label>
              <Input value={churchInfo.name || ''} onChange={e => setChurchInfo(s => ({ ...s, name: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Slug</Label>
              <Input value={churchInfo.slug || ''} className="rounded-xl" disabled />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Domínio personalizado</Label>
              <Input value={churchInfo.domain || ''} onChange={e => setChurchInfo(s => ({ ...s, domain: e.target.value }))} className="rounded-xl" placeholder="app.minhaigreja.com.br" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Descrição da Igreja</Label>
            <Textarea
              value={churchInfo.description || ''}
              onChange={e => setChurchInfo(s => ({ ...s, description: e.target.value }))}
              className="rounded-xl min-h-[80px]"
              placeholder="Uma breve descrição da sua igreja para aparecer no catálogo..."
            />
          </div>

          <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Endereço</h4>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">CEP</Label>
              <div className="flex gap-2">
                <Input
                  value={churchInfo.cep || ''}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 8);
                    const formatted = v.length > 5 ? `${v.slice(0, 5)}-${v.slice(5)}` : v;
                    setChurchInfo(s => ({ ...s, cep: formatted }));
                    if (v.length === 8) lookupCep(v);
                  }}
                  className="rounded-xl max-w-[160px]"
                  placeholder="00000-000"
                  maxLength={9}
                />
                {fetchingCep && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground self-center" />}
              </div>
            </div>
            <div className="space-y-2">
              <Input value={churchInfo.address || ''} onChange={e => setChurchInfo(s => ({ ...s, address: e.target.value }))} className="rounded-xl" placeholder="Rua, número, bairro" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input value={churchInfo.city || ''} onChange={e => setChurchInfo(s => ({ ...s, city: e.target.value }))} className="rounded-xl" placeholder="Cidade" />
              <Input value={churchInfo.state || ''} onChange={e => setChurchInfo(s => ({ ...s, state: e.target.value }))} className="rounded-xl" placeholder="Estado" />
            </div>
            {churchInfo.lat && churchInfo.lng && (
              <p className="text-[11px] text-muted-foreground">📍 Coordenadas: {churchInfo.lat.toFixed(6)}, {churchInfo.lng.toFixed(6)} (geradas automaticamente)</p>
            )}
          </div>

          <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> Contato</h4>
            <div className="grid grid-cols-2 gap-3">
              <Input value={churchInfo.whatsapp || ''} onChange={e => setChurchInfo(s => ({ ...s, whatsapp: e.target.value }))} className="rounded-xl" placeholder="WhatsApp" />
              <Input value={churchInfo.phone || ''} onChange={e => setChurchInfo(s => ({ ...s, phone: e.target.value }))} className="rounded-xl" placeholder="Telefone" />
            </div>
          </div>

          {/* PIX */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2"><QrCode className="w-4 h-4 text-primary" /> Chave PIX — Ofertas e Dízimos</h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground text-sm">Habilitar PIX para membros</p>
                <p className="text-xs text-muted-foreground">Os membros verão a opção de contribuir via PIX</p>
              </div>
              <Switch checked={churchInfo.pix_enabled} onCheckedChange={v => setChurchInfo(s => ({ ...s, pix_enabled: v }))} />
            </div>
            {churchInfo.pix_enabled && (
              <div className="space-y-3 pt-2 border-t border-border/50">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tipo da Chave</Label>
                  <Select value={churchInfo.pix_key_type || ''} onValueChange={v => setChurchInfo(s => ({ ...s, pix_key_type: v }))}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="cnpj">CNPJ</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="phone">Telefone</SelectItem>
                      <SelectItem value="random">Chave aleatória</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Chave PIX</Label>
                  <Input value={churchInfo.pix_key || ''} onChange={e => setChurchInfo(s => ({ ...s, pix_key: e.target.value }))} className="rounded-xl" placeholder="Informe a chave PIX" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome do Beneficiário</Label>
                  <Input value={churchInfo.pix_beneficiary || ''} onChange={e => setChurchInfo(s => ({ ...s, pix_beneficiary: e.target.value }))} className="rounded-xl" placeholder="Nome que aparece na transferência" />
                </div>
              </div>
            )}
          </div>
        </div>
        <Button onClick={handleSaveInfo} disabled={savingInfo} className="rounded-xl bg-primary hover:bg-primary/90 border-0 text-primary-foreground">
          {savingInfo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar dados da igreja
        </Button>
      </Card>

      {/* AI Assistant */}
      <Card className="p-6 rounded-xl space-y-5 max-w-2xl border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" /> IA Assistente
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-0.5 rounded-full">
            <Crown className="w-3 h-3" /> Premium
          </span>
        </h3>
        <p className="text-sm text-muted-foreground">O Assistente ARKHÉ permite que os membros conversem com a IA.</p>

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
                notifyAssistantRefresh();
                toast({ title: data.ai_assistant_enabled ? 'IA Assistente ativada!' : 'IA Assistente desativada' });
              } catch (err: any) {
                toast({ title: err.message || 'Erro ao alterar', variant: 'destructive' });
              } finally { setTogglingAssistant(false); }
            }}
          />
        </div>

        {settings.ai_assistant_enabled && (
          <div className="space-y-4 pt-2 border-t border-border/50">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <MessageCircle className="w-3 h-3" /> Contexto da Igreja
              </Label>
              <Textarea
                placeholder={defaultAssistantPrompt}
                value={settings.ai_assistant_prompt || ''}
                onChange={e => setSettings(s => ({ ...s, ai_assistant_prompt: e.target.value || null }))}
                className="rounded-xl min-h-[140px] text-sm"
                rows={6}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} size="sm" className="rounded-xl bg-primary hover:bg-primary/90 border-0 text-primary-foreground">
                <Save className="w-4 h-4 mr-2" /> {saving ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button variant="outline" onClick={handleResetAssistant} size="sm" className="rounded-xl">
                <RotateCcw className="w-4 h-4 mr-2" /> Limpar
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* AI Processing */}
      <Card className="p-6 rounded-xl space-y-5 max-w-2xl">
        <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" /> IA de Processamento de Cultos
        </h3>
        <p className="text-sm text-muted-foreground">Configure como a IA gera resumos e análises dos cultos.</p>
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
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Temperatura</Label>
              <Input type="number" min="0" max="2" step="0.1" placeholder="0.7 (padrão)"
                value={settings.ai_temperature ?? ''}
                onChange={e => setSettings(s => ({ ...s, ai_temperature: e.target.value ? parseFloat(e.target.value) : null }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Max Tokens</Label>
              <Input type="number" min="1000" max="32000" step="1000" placeholder="8192 (padrão)"
                value={settings.ai_max_tokens ?? ''}
                onChange={e => setSettings(s => ({ ...s, ai_max_tokens: e.target.value ? parseInt(e.target.value) : null }))}
                className="rounded-xl"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-primary hover:bg-primary/90 border-0 text-primary-foreground">
            <Save className="w-4 h-4 mr-2" /> {saving ? 'Salvando...' : 'Salvar configurações'}
          </Button>
          <Button variant="outline" onClick={handleResetProcessing} className="rounded-xl">
            <RotateCcw className="w-4 h-4 mr-2" /> Restaurar padrão
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ChurchSettings;
