import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Plus } from 'lucide-react';

const ChurchMembers = () => (
  <div className="space-y-6 animate-fade-in">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="font-heading text-2xl font-bold">Membros</h1>
        <p className="text-sm text-muted-foreground">Gerencie os membros e líderes da sua igreja</p>
      </div>
      <Button className="rounded-xl gradient-primary border-0">
        <Plus className="w-4 h-4 mr-2" /> Convidar membro
      </Button>
    </div>
    <Card className="p-12 rounded-xl text-center space-y-4">
      <Users className="w-12 h-12 mx-auto text-muted-foreground/40" />
      <h3 className="font-heading font-semibold text-lg">Nenhum membro ainda</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Convide membros da sua igreja para começar a usar a plataforma.
      </p>
      <Button className="rounded-xl gradient-primary border-0">
        <Plus className="w-4 h-4 mr-2" /> Convidar primeiro membro
      </Button>
    </Card>
  </div>
);

export default ChurchMembers;
