import AdminHeader from "@/components/admin/AdminHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Globe, Bell, Smartphone, Link } from "lucide-react";

const SettingsPage = () => {
  return (
    <>
      <AdminHeader title="Configurações" subtitle="Configurações globais da plataforma" />
      <div className="flex-1 overflow-auto p-6 space-y-6 max-w-3xl animate-slide-up">
        <Card className="p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Globe className="w-[18px] h-[18px] text-primary" />
            </div>
            <h2 className="font-heading font-bold text-base">Domínio</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Domínio Principal</Label>
              <Input defaultValue="arkhe.app" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">URL padrão das igrejas</Label>
              <Input defaultValue="arkhe.app/igreja/{slug}" disabled className="rounded-xl" />
              <p className="text-xs text-muted-foreground">O slug é gerado automaticamente pelo nome da igreja</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-[18px] h-[18px] text-primary" />
            </div>
            <h2 className="font-heading font-bold text-base">PWA</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div>
                <p className="text-sm font-medium">PWA por Igreja</p>
                <p className="text-xs text-muted-foreground">Permite cada igreja ter seu próprio manifest e instalação</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div>
                <p className="text-sm font-medium">Service Worker Global</p>
                <p className="text-xs text-muted-foreground">Cache e funcionamento offline</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="w-[18px] h-[18px] text-primary" />
            </div>
            <h2 className="font-heading font-bold text-base">Notificações</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div>
                <p className="text-sm font-medium">Push Notifications</p>
                <p className="text-xs text-muted-foreground">Enviar notificações push via navegador</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div>
                <p className="text-sm font-medium">Email Notifications</p>
                <p className="text-xs text-muted-foreground">Enviar resumos por email</p>
              </div>
              <Switch />
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Link className="w-[18px] h-[18px] text-primary" />
            </div>
            <h2 className="font-heading font-bold text-base">Integrações</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">YouTube API Key</Label>
              <Input type="password" defaultValue="••••••••••••••••" className="rounded-xl" />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">SMTP Host</Label>
              <Input placeholder="smtp.exemplo.com" className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">SMTP Porta</Label>
                <Input placeholder="587" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">SMTP Usuário</Label>
                <Input placeholder="user@exemplo.com" className="rounded-xl" />
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end pb-6">
          <Button className="rounded-xl gradient-primary border-0 shadow-md shadow-primary/20 px-8">
            Salvar Configurações
          </Button>
        </div>
      </div>
    </>
  );
};

export default SettingsPage;
