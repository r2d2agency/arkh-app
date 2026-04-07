import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Palette, Upload } from 'lucide-react';

const ChurchCustomize = () => (
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
  </div>
);

export default ChurchCustomize;
