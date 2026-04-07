import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles, BookOpen, Heart, Users, Globe, Music, Loader2, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const spiritualInterests = [
  { id: 'prayer', label: 'Oração', icon: '🙏' },
  { id: 'worship', label: 'Louvor', icon: '🎵' },
  { id: 'study', label: 'Estudo Bíblico', icon: '📖' },
  { id: 'community', label: 'Comunidade', icon: '🤝' },
  { id: 'missions', label: 'Missões', icon: '🌍' },
  { id: 'service', label: 'Servir', icon: '💪' },
  { id: 'discipleship', label: 'Discipulado', icon: '🌱' },
  { id: 'family', label: 'Família', icon: '👨‍👩‍👧‍👦' },
];

const experienceLevels = [
  { id: 'new_believer', label: 'Novo na fé', desc: 'Comecei a caminhar com Cristo recentemente' },
  { id: 'growing', label: 'Em crescimento', desc: 'Buscando aprofundar minha fé' },
  { id: 'mature', label: 'Maduro na fé', desc: 'Caminho com Cristo há bastante tempo' },
  { id: 'leader', label: 'Líder/Professor', desc: 'Sirvo ensinando ou liderando' },
];

const topicOptions = [
  { id: 'old_testament', label: 'Antigo Testamento' },
  { id: 'new_testament', label: 'Novo Testamento' },
  { id: 'theology', label: 'Teologia' },
  { id: 'family', label: 'Família' },
  { id: 'leadership', label: 'Liderança' },
  { id: 'evangelism', label: 'Evangelismo' },
  { id: 'prophecy', label: 'Profecia' },
  { id: 'worship_topic', label: 'Adoração' },
];

const OnboardingPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    spiritual_interests: [] as string[],
    experience_level: '',
    preferred_topics: [] as string[],
    how_found: '',
    goals: '',
  });

  const steps = ['Interesses', 'Experiência', 'Tópicos', 'Sobre você'];
  const progress = ((step + 1) / steps.length) * 100;

  const toggleItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post('/api/church/onboarding', form);
      toast.success('Bem-vindo ao ARKHÉ! 🎉');
      navigate('/church');
    } catch {
      toast.error('Erro ao salvar');
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
          <Sparkles className="w-7 h-7 text-primary" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Vamos nos conhecer</h1>
        <p className="text-sm text-muted-foreground">Personalize sua experiência no ARKHÉ</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{steps[step]}</span>
          <span>{step + 1}/{steps.length}</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {step === 0 && (
        <Card className="p-6 space-y-4">
          <h2 className="font-heading font-semibold text-foreground">O que mais te interessa?</h2>
          <p className="text-sm text-muted-foreground">Selecione seus interesses espirituais</p>
          <div className="grid grid-cols-2 gap-2">
            {spiritualInterests.map(item => {
              const selected = form.spiritual_interests.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => setForm({ ...form, spiritual_interests: toggleItem(form.spiritual_interests, item.id) })}
                  className={`p-3 rounded-xl border text-left text-sm transition-all ${
                    selected ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <span className="text-lg mr-2">{item.icon}</span>
                  {item.label}
                  {selected && <CheckCircle className="w-4 h-4 inline ml-1" />}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card className="p-6 space-y-4">
          <h2 className="font-heading font-semibold text-foreground">Sua caminhada na fé</h2>
          <p className="text-sm text-muted-foreground">Como você descreveria sua jornada espiritual?</p>
          <div className="space-y-2">
            {experienceLevels.map(level => (
              <button
                key={level.id}
                onClick={() => setForm({ ...form, experience_level: level.id })}
                className={`w-full p-4 rounded-xl border text-left transition-all ${
                  form.experience_level === level.id ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <p className="font-medium text-sm text-foreground">{level.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{level.desc}</p>
              </button>
            ))}
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-6 space-y-4">
          <h2 className="font-heading font-semibold text-foreground">Tópicos de interesse</h2>
          <p className="text-sm text-muted-foreground">O que você gostaria de estudar?</p>
          <div className="flex flex-wrap gap-2">
            {topicOptions.map(topic => {
              const selected = form.preferred_topics.includes(topic.id);
              return (
                <button
                  key={topic.id}
                  onClick={() => setForm({ ...form, preferred_topics: toggleItem(form.preferred_topics, topic.id) })}
                  className={`px-4 py-2 rounded-full border text-sm transition-all ${
                    selected ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-muted-foreground/30 text-muted-foreground'
                  }`}
                >
                  {topic.label}
                  {selected && <CheckCircle className="w-3 h-3 inline ml-1" />}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-6 space-y-4">
          <h2 className="font-heading font-semibold text-foreground">Conte mais sobre você</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Como conheceu a igreja?</label>
              <Textarea
                value={form.how_found}
                onChange={e => setForm({ ...form, how_found: e.target.value })}
                rows={2}
                placeholder="Convite de amigo, redes sociais..."
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Quais são seus objetivos espirituais?</label>
              <Textarea
                value={form.goals}
                onChange={e => setForm({ ...form, goals: e.target.value })}
                rows={3}
                placeholder="Quero crescer em..."
              />
            </div>
          </div>
        </Card>
      )}

      <div className="flex items-center gap-3">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep(step - 1)} className="rounded-xl">
            <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
        )}
        <div className="flex-1" />
        {step < steps.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} className="rounded-xl">
            Próximo <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting} className="rounded-xl">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Começar! 🚀
          </Button>
        )}
      </div>

      <button onClick={() => navigate('/church')} className="block mx-auto text-xs text-muted-foreground hover:text-foreground">
        Pular por enquanto
      </button>
    </div>
  );
};

export default OnboardingPage;
