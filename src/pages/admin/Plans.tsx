import AdminHeader from "@/components/admin/AdminHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Plus, Pencil, Sparkles } from "lucide-react";

const plans = [
  {
    name: "Gratuito",
    price: "R$ 0",
    period: "/mês",
    churches: 29,
    features: [
      { name: "Até 10 cultos", included: true },
      { name: "Até 3 grupos", included: true },
      { name: "Até 5 eventos", included: true },
      { name: "Até 3 estudos", included: true },
      { name: "IA básica (limitada)", included: true },
      { name: "IA completa", included: false },
      { name: "Notificações avançadas", included: false },
      { name: "Personalização completa", included: false },
    ],
  },
  {
    name: "Premium",
    price: "R$ 149",
    period: "/mês",
    churches: 18,
    featured: true,
    features: [
      { name: "Cultos ilimitados", included: true },
      { name: "Grupos ilimitados", included: true },
      { name: "Eventos ilimitados", included: true },
      { name: "Estudos ilimitados", included: true },
      { name: "IA completa", included: true },
      { name: "Notificações avançadas", included: true },
      { name: "Personalização completa", included: true },
      { name: "Suporte prioritário", included: true },
    ],
  },
];

const Plans = () => {
  return (
    <>
      <AdminHeader title="Planos" subtitle="Gerencie os planos da plataforma" />
      <div className="flex-1 overflow-auto p-6 space-y-6 animate-slide-up">
        <div className="flex justify-end">
          <Button className="gap-2 rounded-xl gradient-primary border-0 shadow-md shadow-primary/20">
            <Plus className="w-4 h-4" />
            Novo Plano
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`p-6 rounded-2xl relative card-hover ${
                plan.featured ? "border-2 border-primary/50 glow-primary" : ""
              }`}
            >
              {plan.featured && (
                <Badge className="absolute -top-3 left-6 gradient-primary border-0 text-white gap-1 shadow-md shadow-primary/20">
                  <Sparkles className="w-3 h-3" />
                  Popular
                </Badge>
              )}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-heading font-bold text-xl">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm">{plan.churches} igrejas</p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-xl"><Pencil className="w-4 h-4" /></Button>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-heading font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
              <div className="space-y-3">
                {plan.features.map((f) => (
                  <div key={f.name} className="flex items-center gap-3 text-sm">
                    {f.included ? (
                      <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center">
                        <Check className="w-3 h-3 text-success" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                        <X className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                    <span className={f.included ? "" : "text-muted-foreground"}>{f.name}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
};

export default Plans;
