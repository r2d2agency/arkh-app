import { Card } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';

const ChurchStudies = () => (
  <div className="space-y-6 animate-fade-in">
    <div>
      <h1 className="font-heading text-2xl font-bold">Estudos Bíblicos</h1>
      <p className="text-sm text-muted-foreground">Estudos gerados automaticamente pela IA a partir dos cultos</p>
    </div>
    <Card className="p-12 rounded-xl text-center space-y-4">
      <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40" />
      <h3 className="font-heading font-semibold text-lg">Nenhum estudo disponível</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Adicione cultos para que a IA gere estudos bíblicos automaticamente.
      </p>
    </Card>
  </div>
);

export default ChurchStudies;
