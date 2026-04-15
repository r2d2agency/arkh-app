import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import {
  Palette, Upload, Users, UsersRound, Home, HandHeart, Landmark, Cross, Heart, Church, Globe, Star,
  Baby, Mic2, BookHeart, PersonStanding, Check, Loader2, type LucideIcon,
} from 'lucide-react';

const iconOptions: { key: string; icon: LucideIcon; label: string }[] = [
  { key: 'Users', icon: Users, label: 'Pessoas' },
  { key: 'UsersRound', icon: UsersRound, label: 'Grupo' },
  { key: 'Home', icon: Home, label: 'Casa' },
  { key: 'HandHeart', icon: HandHeart, label: 'Cuidado' },
  { key: 'Landmark', icon: Landmark, label: 'Templo' },
  { key: 'Cross', icon: Cross, label: 'Cruz' },
  { key: 'Heart', icon: Heart, label: 'Coração' },
  { key: 'Church', icon: Church, label: 'Igreja' },
  { key: 'Globe', icon: Globe, label: 'Mundo' },
  { key: 'Star', icon: Star, label: 'Estrela' },
  { key: 'Baby', icon: Baby, label: 'Crianças' },
  { key: 'Mic2', icon: Mic2, label: 'Microfone' },
  { key: 'BookHeart', icon: BookHeart, label: 'Livro' },
  { key: 'PersonStanding', icon: PersonStanding, label: 'Pessoa' },
];

const colorOptions = [
  { value: '#8B5CF6', label: 'Roxo' },
  { value: '#3B82F6', label: 'Azul' },
  { value: '#10B981', label: 'Verde' },
  { value: '#F59E0B', label: 'Amarelo' },
  { value: '#EF4444', label: 'Vermelho' },
  { value: '#EC4899', label: 'Rosa' },
  { value: '#06B6D4', label: 'Ciano' },
  { value: '#F97316', label: 'Laranja' },
  { value: '#6366F1', label: 'Índigo' },
  { value: '#14B8A6', label: 'Teal' },
];

interface ChurchInfo {
  settings?: {
    groups_shortcut?: { label?: string; icon?: string; color?: string };
    [key: string]: any;
  };
}

const ChurchCustomize = () => {
  const { toast } = useToast();
  const [churchInfo, setChurchInfo] = useState<ChurchInfo | null>(null);
  const [gsLabel, setGsLabel] = useState('Grupos');
  const [gsIcon, setGsIcon] = useState('Users');
  const [gsColor, setGsColor] = useState('#8B5CF6');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ChurchInfo>('/api/church/info')
      .then(info => {
        setChurchInfo(info);
        const gs = info?.settings?.groups_shortcut;
        if (gs?.label) setGsLabel(gs.label);
        if (gs?.icon) setGsIcon(gs.icon);
        if (gs?.color) setGsColor(gs.color);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSaveGroupsShortcut = async () => {
    setSaving(true);
    try {
      await api.put('/api/church/settings-json', {
        settings: { groups_shortcut: { label: gsLabel, icon: gsIcon, color: gsColor } }
      });
      toast({ title: 'Atalho personalizado salvo!' });
    } catch (err: any) {
      toast({ title: err.message || 'Erro ao salvar', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const SelectedIcon = iconOptions.find(i => i.key === gsIcon)?.icon || Users;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold">Personalizar</h1>
        <p className="text-sm text-muted-foreground">Configure a identidade visual da sua igreja</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 rounded-xl space-y-4">
          <h3 className="font-heading font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4" /> Logo da Igreja
          </h3>
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center space-y-3">
            <Palette className="w-10 h-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Arraste ou clique para enviar</p>
            <Button variant="outline" size="sm" className="rounded-lg">
              Escolher arquivo
            </Button>
          </div>
        </Card>

        <Card className="p-6 rounded-xl space-y-4">
          <h3 className="font-heading font-semibold flex items-center gap-2">
            <Palette className="w-4 h-4" /> Cores
          </h3>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Cor primária</Label>
              <div className="flex gap-2">
                <input type="color" defaultValue="#4B6BFB" className="w-10 h-10 rounded border-0 cursor-pointer" />
                <Input defaultValue="#4B6BFB" className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Cor secundária</Label>
              <div className="flex gap-2">
                <input type="color" defaultValue="#E5A019" className="w-10 h-10 rounded border-0 cursor-pointer" />
                <Input defaultValue="#E5A019" className="rounded-xl" />
              </div>
            </div>
          </div>
          <Button className="w-full rounded-xl gradient-primary border-0">Salvar cores</Button>
        </Card>
      </div>

      {/* Groups Shortcut Customization */}
      <Card className="p-6 rounded-xl space-y-5">
        <h3 className="font-heading font-semibold flex items-center gap-2">
          <Users className="w-4 h-4" /> Atalho de Grupos na Tela Inicial
        </h3>
        <p className="text-sm text-muted-foreground">
          Personalize como o atalho de grupos aparece no dashboard dos membros. Cada igreja chama de um jeito: Células, Conecte, PGs, Grupos...
        </p>

        {/* Preview */}
        <div className="flex justify-center">
          <div className="p-3 rounded-2xl border text-center space-y-1.5 w-20">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto" style={{ backgroundColor: `${gsColor}15` }}>
              <SelectedIcon className="w-5 h-5" style={{ color: gsColor }} />
            </div>
            <p className="font-heading font-semibold text-[10px]">{gsLabel || 'Grupos'}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Nome do atalho</Label>
          <Input
            placeholder="Ex: Células, Conecte, PGs..."
            value={gsLabel}
            onChange={e => setGsLabel(e.target.value)}
            className="rounded-xl max-w-xs"
          />
        </div>

        <div className="space-y-2">
          <Label>Ícone</Label>
          <div className="grid grid-cols-7 gap-2">
            {iconOptions.map(opt => (
              <button
                key={opt.key}
                onClick={() => setGsIcon(opt.key)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                  gsIcon === opt.key
                    ? 'bg-primary/10 ring-2 ring-primary/30'
                    : 'bg-muted/50 hover:bg-muted'
                }`}
              >
                <opt.icon className="w-5 h-5" style={{ color: gsIcon === opt.key ? gsColor : undefined }} />
                <span className="text-[9px] text-muted-foreground">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Cor</Label>
          <div className="flex flex-wrap gap-2">
            {colorOptions.map(c => (
              <button
                key={c.value}
                onClick={() => setGsColor(c.value)}
                className={`w-9 h-9 rounded-xl border-2 transition-all flex items-center justify-center ${
                  gsColor === c.value ? 'border-foreground scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.label}
              >
                {gsColor === c.value && <Check className="w-4 h-4 text-white" />}
              </button>
            ))}
            <div className="flex items-center gap-1">
              <input
                type="color"
                value={gsColor}
                onChange={e => setGsColor(e.target.value)}
                className="w-9 h-9 rounded-xl border-0 cursor-pointer"
              />
              <span className="text-xs text-muted-foreground">Custom</span>
            </div>
          </div>
        </div>

        <Button onClick={handleSaveGroupsShortcut} disabled={saving} className="rounded-xl">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {saving ? 'Salvando...' : 'Salvar personalização'}
        </Button>
      </Card>
    </div>
  );
};

export default ChurchCustomize;
