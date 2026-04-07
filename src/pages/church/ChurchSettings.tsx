import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

const ChurchSettings = () => (
  <div className="space-y-6 animate-fade-in">
    <div>
      <h1 className="font-heading text-2xl font-bold">Configurações</h1>
      <p className="text-sm text-muted-foreground">Configurações gerais da sua igreja</p>
    </div>

    <Card className="p-6 rounded-xl space-y-5 max-w-xl">
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
      <Button className="rounded-xl gradient-primary border-0">Salvar configurações</Button>
    </Card>
  </div>
);

export default ChurchSettings;
