import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Play, BookOpen, Sparkles, MessageSquare, Tag,
  BookMarked, Save, Loader2, Volume2, Maximize2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface ServiceDetail {
  id: string;
  title: string;
  youtube_url: string;
  preacher: string;
  service_date: string;
  ai_status: string;
  ai_summary?: string;
  ai_topics?: string[];
  ai_key_phrases?: string[];
  ai_verses?: string[];
  ai_tags?: string[];
  ai_full_summary?: string;
}

const getYouTubeId = (url: string) => {
  const match = url?.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1];
};

const ServiceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get<ServiceDetail>(`/api/church/services/${id}`)
      .then(data => setService(data))
      .catch(() => toast.error('Erro ao carregar culto'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSaveNote = () => {
    toast.success('Anotação salva no seu caderno!');
    setNote('');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="p-4 text-center space-y-4">
        <p className="text-muted-foreground">Culto não encontrado</p>
        <Link to="/church/services">
          <Button variant="outline" className="rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </Link>
      </div>
    );
  }

  const ytId = getYouTubeId(service.youtube_url);
  const hasAI = service.ai_status === 'completed';

  return (
    <div className={`animate-fade-in ${focusMode ? 'bg-background' : ''}`}>
      {/* Video Player */}
      {ytId && (
        <div className="relative w-full aspect-video bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1">
            <h1 className="font-heading text-xl font-bold">{service.title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {service.preacher && <span>{service.preacher}</span>}
              <span>•</span>
              <span>{new Date(service.service_date || '').toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
          <Button
            size="sm"
            variant={focusMode ? 'default' : 'outline'}
            className="rounded-xl shrink-0"
            onClick={() => setFocusMode(!focusMode)}
          >
            <Maximize2 className="w-3.5 h-3.5 mr-1" />
            Foco
          </Button>
        </div>

        {/* AI Generated content */}
        {hasAI ? (
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="w-full rounded-xl bg-muted/50 p-1 h-auto">
              <TabsTrigger value="summary" className="rounded-lg text-xs flex-1 data-[state=active]:bg-card">
                Resumo
              </TabsTrigger>
              <TabsTrigger value="topics" className="rounded-lg text-xs flex-1 data-[state=active]:bg-card">
                Tópicos
              </TabsTrigger>
              <TabsTrigger value="verses" className="rounded-lg text-xs flex-1 data-[state=active]:bg-card">
                Versículos
              </TabsTrigger>
              <TabsTrigger value="phrases" className="rounded-lg text-xs flex-1 data-[state=active]:bg-card">
                Destaques
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-4 space-y-4">
              <Card className="p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gold" />
                  <h3 className="font-heading text-sm font-semibold">Resumo</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {service.ai_summary || 'Resumo gerado pela IA aparecerá aqui.'}
                </p>
              </Card>
              {service.ai_full_summary && (
                <Card className="p-4 rounded-2xl space-y-3">
                  <h3 className="font-heading text-sm font-semibold">Resumo completo</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {service.ai_full_summary}
                  </p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="topics" className="mt-4">
              <Card className="p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <h3 className="font-heading text-sm font-semibold">Tópicos principais</h3>
                </div>
                <div className="space-y-2">
                  {(service.ai_topics || []).map((topic, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {i + 1}
                      </span>
                      <p className="text-sm">{topic}</p>
                    </div>
                  ))}
                  {(!service.ai_topics || service.ai_topics.length === 0) && (
                    <p className="text-sm text-muted-foreground">Nenhum tópico extraído ainda.</p>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="verses" className="mt-4">
              <Card className="p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-gold" />
                  <h3 className="font-heading text-sm font-semibold">Versículos citados</h3>
                </div>
                <div className="space-y-2">
                  {(service.ai_verses || []).map((verse, i) => (
                    <div key={i} className="p-3 rounded-xl bg-gold/5 border border-gold/10">
                      <p className="text-sm font-medium text-gold">{verse}</p>
                    </div>
                  ))}
                  {(!service.ai_verses || service.ai_verses.length === 0) && (
                    <p className="text-sm text-muted-foreground">Nenhum versículo identificado.</p>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="phrases" className="mt-4">
              <Card className="p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <h3 className="font-heading text-sm font-semibold">Frases impactantes</h3>
                </div>
                <div className="space-y-2">
                  {(service.ai_key_phrases || []).map((phrase, i) => (
                    <blockquote key={i} className="border-l-2 border-primary/30 pl-3 py-1">
                      <p className="text-sm italic text-muted-foreground">"{phrase}"</p>
                    </blockquote>
                  ))}
                  {(!service.ai_key_phrases || service.ai_key_phrases.length === 0) && (
                    <p className="text-sm text-muted-foreground">Nenhuma frase destacada.</p>
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="p-6 rounded-2xl text-center space-y-3 border-dashed">
            <Sparkles className="w-8 h-8 mx-auto text-muted-foreground/40" />
            <h3 className="font-heading font-semibold">Conteúdo IA em processamento</h3>
            <p className="text-sm text-muted-foreground">
              O resumo, tópicos e versículos serão gerados em breve pela IA.
            </p>
          </Card>
        )}

        {/* Tags */}
        {hasAI && service.ai_tags && service.ai_tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {service.ai_tags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="rounded-full text-[10px] gap-1">
                <Tag className="w-2.5 h-2.5" /> {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Notes section */}
        <Card className="p-4 rounded-2xl space-y-3">
          <h3 className="font-heading text-sm font-semibold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Minhas anotações
          </h3>
          <Textarea
            placeholder="Escreva suas anotações sobre este culto..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-xl min-h-[100px] bg-muted/30 border-0 resize-none"
          />
          <Button
            size="sm"
            className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleSaveNote}
            disabled={!note.trim()}
          >
            <Save className="w-3.5 h-3.5 mr-1.5" /> Salvar no caderno
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default ServiceDetailPage;
