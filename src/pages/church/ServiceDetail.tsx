import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Play, BookOpen, Sparkles, MessageSquare, Tag,
  BookMarked, Save, Loader2, Maximize2, Lightbulb, HelpCircle,
  Link2, ListOrdered, ChevronDown, ChevronUp, Heart,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface KeyVerse {
  reference: string;
  text: string;
  context?: string;
}

interface Connection {
  sermon_title?: string;
  theme?: string;
  connection: string;
}

interface SermonStructure {
  part: string;
  description: string;
}

interface AITopicsData {
  topics?: string[];
  practical_applications?: string[];
  connections?: Connection[];
  reflection_questions?: string[];
  theological_context?: string;
  sermon_structure?: SermonStructure[];
}

interface ServiceData {
  id: string;
  title: string;
  youtube_url: string;
  preacher: string;
  service_date: string;
  ai_status: string;
  ai_summary?: string;
  ai_topics?: string | string[] | AITopicsData;
  ai_key_verses?: string | KeyVerse[];
}

const getYouTubeId = (url: string) => {
  const match = url?.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1];
};

function parseTopics(raw: any): AITopicsData {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return { topics: [] }; }
  }
  if (Array.isArray(raw)) return { topics: raw };
  return raw as AITopicsData;
}

function parseVerses(raw: any): KeyVerse[] {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  return Array.isArray(raw) ? raw : [];
}

const ServiceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [service, setService] = useState<ServiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [expandedSummary, setExpandedSummary] = useState(false);
  const [savingVerse, setSavingVerse] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get<ServiceData>(`/api/church/services/${id}`)
      .then(data => setService(data))
      .catch(() => toast.error('Erro ao carregar culto'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSaveNote = async () => {
    if (!note.trim() || !id) return;
    setSavingNote(true);
    try {
      await api.post('/api/church/notes', {
        service_id: id,
        title: `Anotação - ${service?.title || 'Culto'}`,
        content: note,
        note_type: 'note',
      });
      toast.success('Anotação salva no caderno!');
      setNote('');
    } catch {
      toast.error('Erro ao salvar anotação');
    } finally {
      setSavingNote(false);
    }
  };

  const handleSaveVerse = async (verse: KeyVerse) => {
    setSavingVerse(verse.reference);
    try {
      await api.post('/api/church/notes', {
        service_id: id,
        title: verse.reference,
        content: verse.text,
        note_type: 'verse',
        verse_reference: verse.reference,
      });
      toast.success(`${verse.reference} salvo no caderno!`);
    } catch {
      toast.error('Erro ao salvar versículo');
    } finally {
      setSavingVerse(null);
    }
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
  const topicsData = parseTopics(service.ai_topics);
  const verses = parseVerses(service.ai_key_verses);
  const summaryText = service.ai_summary || '';
  const shouldTruncate = summaryText.length > 500;

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
            <TabsList className="w-full rounded-xl bg-muted/50 p-1 h-auto flex-wrap">
              <TabsTrigger value="summary" className="rounded-lg text-xs flex-1 data-[state=active]:bg-card">
                Resumo
              </TabsTrigger>
              <TabsTrigger value="topics" className="rounded-lg text-xs flex-1 data-[state=active]:bg-card">
                Tópicos
              </TabsTrigger>
              <TabsTrigger value="verses" className="rounded-lg text-xs flex-1 data-[state=active]:bg-card">
                Versículos
              </TabsTrigger>
              <TabsTrigger value="apply" className="rounded-lg text-xs flex-1 data-[state=active]:bg-card">
                Aplicar
              </TabsTrigger>
            </TabsList>

            {/* RESUMO */}
            <TabsContent value="summary" className="mt-4 space-y-4">
              <Card className="p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gold" />
                  <h3 className="font-heading text-sm font-semibold">Resumo da Pregação</h3>
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {shouldTruncate && !expandedSummary
                    ? summaryText.slice(0, 500) + '...'
                    : summaryText
                  }
                </div>
                {shouldTruncate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-primary"
                    onClick={() => setExpandedSummary(!expandedSummary)}
                  >
                    {expandedSummary ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                    {expandedSummary ? 'Ver menos' : 'Ler resumo completo'}
                  </Button>
                )}
              </Card>

              {/* Theological Context */}
              {topicsData.theological_context && (
                <Card className="p-4 rounded-2xl space-y-3 border-gold/20 bg-gold/5">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-gold" />
                    <h3 className="font-heading text-sm font-semibold">Contexto Teológico</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {topicsData.theological_context}
                  </p>
                </Card>
              )}

              {/* Sermon Structure */}
              {topicsData.sermon_structure && topicsData.sermon_structure.length > 0 && (
                <Card className="p-4 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <ListOrdered className="w-4 h-4 text-primary" />
                    <h3 className="font-heading text-sm font-semibold">Estrutura da Mensagem</h3>
                  </div>
                  <div className="space-y-2">
                    {topicsData.sermon_structure.map((item, i) => (
                      <div key={i} className="flex gap-3 p-3 rounded-xl bg-muted/30">
                        <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{item.part}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Connections with previous sermons */}
              {topicsData.connections && topicsData.connections.length > 0 && (
                <Card className="p-4 rounded-2xl space-y-3 border-primary/10">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-primary" />
                    <h3 className="font-heading text-sm font-semibold">Conexões com Pregações Anteriores</h3>
                  </div>
                  <div className="space-y-2">
                    {topicsData.connections.map((conn, i) => (
                      <div key={i} className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                        <p className="text-xs font-semibold text-primary mb-1">
                          {conn.sermon_title || conn.theme}
                        </p>
                        <p className="text-sm text-muted-foreground">{conn.connection}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* TÓPICOS */}
            <TabsContent value="topics" className="mt-4">
              <Card className="p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <h3 className="font-heading text-sm font-semibold">Tópicos Principais</h3>
                </div>
                <div className="space-y-2">
                  {(topicsData.topics || []).map((topic, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {i + 1}
                      </span>
                      <p className="text-sm">{topic}</p>
                    </div>
                  ))}
                  {(!topicsData.topics || topicsData.topics.length === 0) && (
                    <p className="text-sm text-muted-foreground">Nenhum tópico extraído.</p>
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* VERSÍCULOS */}
            <TabsContent value="verses" className="mt-4">
              <Card className="p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-gold" />
                  <h3 className="font-heading text-sm font-semibold">Versículos Citados</h3>
                </div>
                <div className="space-y-3">
                  {verses.map((verse, i) => (
                    <div key={i} className="p-4 rounded-xl bg-gold/5 border border-gold/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-gold">{verse.reference}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-primary"
                          onClick={() => handleSaveVerse(verse)}
                          disabled={savingVerse === verse.reference}
                        >
                          {savingVerse === verse.reference ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <><Heart className="w-3 h-3 mr-1" /> Salvar</>
                          )}
                        </Button>
                      </div>
                      {verse.text && (
                        <blockquote className="text-sm italic text-muted-foreground border-l-2 border-gold/30 pl-3">
                          "{verse.text}"
                        </blockquote>
                      )}
                      {verse.context && (
                        <p className="text-xs text-muted-foreground/80 mt-1">
                          💡 {verse.context}
                        </p>
                      )}
                    </div>
                  ))}
                  {verses.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum versículo identificado.</p>
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* APLICAR */}
            <TabsContent value="apply" className="mt-4 space-y-4">
              {/* Practical Applications */}
              {topicsData.practical_applications && topicsData.practical_applications.length > 0 && (
                <Card className="p-4 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-gold" />
                    <h3 className="font-heading text-sm font-semibold">Aplicações Práticas</h3>
                  </div>
                  <div className="space-y-2">
                    {topicsData.practical_applications.map((app, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gold/5 border border-gold/10">
                        <span className="text-gold text-sm mt-0.5">✦</span>
                        <p className="text-sm text-muted-foreground">{app}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Reflection Questions */}
              {topicsData.reflection_questions && topicsData.reflection_questions.length > 0 && (
                <Card className="p-4 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-primary" />
                    <h3 className="font-heading text-sm font-semibold">Perguntas para Reflexão</h3>
                  </div>
                  <div className="space-y-2">
                    {topicsData.reflection_questions.map((q, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                        <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          ?
                        </span>
                        <p className="text-sm text-muted-foreground">{q}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* If no applications or questions */}
              {(!topicsData.practical_applications || topicsData.practical_applications.length === 0) &&
               (!topicsData.reflection_questions || topicsData.reflection_questions.length === 0) && (
                <Card className="p-8 rounded-2xl text-center space-y-3">
                  <Lightbulb className="w-10 h-10 mx-auto text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Aplicações e reflexões serão geradas pela IA.</p>
                </Card>
              )}
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

        {/* Notes section */}
        <Card className="p-4 rounded-2xl space-y-3">
          <h3 className="font-heading text-sm font-semibold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Minhas Anotações
          </h3>
          <Textarea
            placeholder="Escreva suas reflexões sobre esta pregação..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-xl min-h-[100px] bg-muted/30 border-0 resize-none"
          />
          <Button
            size="sm"
            className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleSaveNote}
            disabled={!note.trim() || savingNote}
          >
            {savingNote ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            Salvar no caderno
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default ServiceDetailPage;
