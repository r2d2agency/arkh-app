import AdminHeader from "@/components/admin/AdminHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, Bell, Smartphone, Link } from "lucide-react";
import { useSettings } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

const SettingsPage = () => {
  const { data: settings, isLoading } = useSettings();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const handleSave = async () => {
    try {
      await api.put('/api/settings', form);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Configurações salvas');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) {
    return (
      <>
        <AdminHeader title="Configurações" subtitle="Configurações globais da plataforma" />
        <div className="flex-1 p-6 space-y-6 max-w-3xl">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="Configurações" subtitle="Configurações globais da plataforma" />
      <div className="flex-1 overflow-auto p-6 space-y-6 max-w-3xl animate-slide-up">
        <Card className="p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Globe className="w-[18px] h-[18px] text-primary" /></div>
            <h2 className="font-heading font-bold text-base">Domínio</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Domínio Principal</Label>
              <Input value={typeof form.domain === 'string' ? form.domain : (form.domain as string) || ''} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} className="rounded-xl" />
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Smartphone className="w-[18px] h-[18px] text-primary" /></div>
            <h2 className="font-heading font-bold text-base">PWA</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div>
                <p className="text-sm font-medium">PWA por Igreja</p>
                <p className="text-xs text-muted-foreground">Permite cada igreja ter seu próprio manifest</p>
              </div>
              <Switch checked={form.pwa_per_church === true || form.pwa_per_church === 'true'} onCheckedChange={v => setForm(f => ({ ...f, pwa_per_church: v }))} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div>
                <p className="text-sm font-medium">Service Worker Global</p>
                <p className="text-xs text-muted-foreground">Cache e funcionamento offline</p>
              </div>
              <Switch checked={form.service_worker === true || form.service_worker === 'true'} onCheckedChange={v => setForm(f => ({ ...f, service_worker: v }))} />
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Bell className="w-[18px] h-[18px] text-primary" /></div>
            <h2 className="font-heading font-bold text-base">Notificações</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div>
                <p className="text-sm font-medium">Push Notifications</p>
                <p className="text-xs text-muted-foreground">Enviar notificações push via navegador</p>
              </div>
              <Switch checked={form.push_notifications === true || form.push_notifications === 'true'} onCheckedChange={v => setForm(f => ({ ...f, push_notifications: v }))} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div>
                <p className="text-sm font-medium">Email Notifications</p>
                <p className="text-xs text-muted-foreground">Enviar resumos por email</p>
              </div>
              <Switch checked={form.email_notifications === true || form.email_notifications === 'true'} onCheckedChange={v => setForm(f => ({ ...f, email_notifications: v }))} />
            </div>
          </div>
        </Card>

        <div className="flex justify-end pb-6">
          <Button onClick={handleSave} className="rounded-xl gradient-primary border-0 shadow-md shadow-primary/20 px-8">
            Salvar Configurações
          </Button>
        </div>
      </div>
    </>
  );
};

export default SettingsPage;
