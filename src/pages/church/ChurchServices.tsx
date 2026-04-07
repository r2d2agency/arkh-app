import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Video, Plus, Search } from 'lucide-react';

const ChurchServices = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Cultos</h1>
          <p className="text-sm text-muted-foreground">Adicione links do YouTube para transcrição e estudo com IA</p>
        </div>
        <Button className="rounded-xl gradient-primary border-0">
          <Plus className="w-4 h-4 mr-2" /> Novo culto
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar cultos..." className="pl-9 rounded-xl" />
      </div>

      <Card className="p-12 rounded-xl text-center space-y-4">
        <Video className="w-12 h-12 mx-auto text-muted-foreground/40" />
        <h3 className="font-heading font-semibold text-lg">Nenhum culto adicionado</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Adicione seu primeiro culto colando o link do YouTube. A IA vai transcrever e gerar estudos automaticamente.
        </p>
        <Button className="rounded-xl gradient-primary border-0">
          <Plus className="w-4 h-4 mr-2" /> Adicionar primeiro culto
        </Button>
      </Card>
    </div>
  );
};

export default ChurchServices;
