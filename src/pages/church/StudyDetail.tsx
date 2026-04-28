import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, BookOpen, BookMarked, Target, Lightbulb,
  HelpCircle, CheckCircle, Loader2, Save, Video, FileText, ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface StudyDetail {
  id: string;
  title: string;
  description: string;
  objective: string;
  key_verse: string;
  base_reading: string;
  introduction: string;
  topics: string[] | string;
  application: string;
  questions: string[] | string;
  conclusion: string;
  category: string;
  author_name: string;
  pdf_url: string;
  video_url: string;
  thumbnail_url: string;
  linked_services: { id: string; title: string; preacher: string; service_date: string }[];
  user_progress: { completed: boolean } | null;
}

/** Convert URLs in text to clickable links */
function linkify(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer"
        className="text-primary underline hover:text-primary/80 break-all">
        {part}
      </a>
    ) : part
  );
}

/** Convert YouTube/Vimeo URLs to embed */
function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

const StudyDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [study, setStudy] = useState<StudyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get<StudyDetail>(`/api/church/studies/${id}`)
      .then(data => {
        setStudy(data);
        setCompleted(data.user_progress?.completed || false);
      })
      .catch(() => toast.error('Erro ao carregar estudo'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleComplete = async () => {
    if (!id) return;
    setCompleting(true);
    try {
      await api.post(`/api/church/studies/${id}/progress`, {});
      setCompleted(true);
      toast.success('Estudo marcado como concluído! 🎉');
    } catch {
      toast.error('Erro ao marcar como concluído');
    } finally {
      setCompleting(false);
    }
  };

  const handleSaveNote = async () => {
    if (!note.trim() || !id) return;
    setSavingNote(true);
    try {
      await api.post('/api/church/notes', {
        title: `Estudo: ${study?.title || ''}`,
        content: note,
        note_type: 'note',
      });
      toast.success('Anotação salva no caderno!');
      setNote('');
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!study) return (
    <div className="p-4 text-center space-y-4">
      <p className="text-muted-foreground">Estudo não encontrado</p>
      <Link to="/church/studies"><Button variant="outline" className="rounded-xl"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</Button></Link>
    </div>
  );

  const topics = typeof study.topics === 'string' ? JSON.parse(study.topics) : (study.topics || []);
  const questions = typeof study.questions === 'string' ? JSON.parse(study.questions) : (study.questions || []);
  const embedUrl = study.video_url ? getEmbedUrl(study.video_url) : null;

  return (
    <div className="space-y-4 animate-fade-in p-4">
      <Link to="/church/studies" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar aos estudos
      </Link>

      {/* Thumbnail */}
      {study.thumbnail_url && (
        <div className="aspect-video w-full rounded-2xl overflow-hidden bg-muted">
          <img src={study.thumbnail_url} alt={study.title} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-heading text-xl font-bold">{study.title}</h1>
          {completed && (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 shrink-0">
              <CheckCircle className="w-3 h-3 mr-1" /> Concluído
            </Badge>
          )}
        </div>
        {study.category && <Badge variant="secondary" className="rounded-full">{study.category}</Badge>}
        {study.author_name && <p className="text-xs text-muted-foreground">Por {study.author_name}</p>}
      </div>

      {/* Video embed */}
      {embedUrl && (
        <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black">
          <iframe src={embedUrl} className="w-full h-full" allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
        </div>
      )}

      {/* Video link (if not embeddable) */}
      {study.video_url && !embedUrl && (
        <a href={study.video_url} target="_blank" rel="noopener noreferrer">
          <Card className="p-4 rounded-2xl flex items-center gap-3 hover:bg-muted/50 transition-colors">
            <Video className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium flex-1">Assistir vídeo</span>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </Card>
        </a>
      )}

      {/* PDF link */}
      {study.pdf_url && (
        <a href={study.pdf_url} target="_blank" rel="noopener noreferrer">
          <Card className="p-4 rounded-2xl flex items-center gap-3 hover:bg-muted/50 transition-colors">
            <FileText className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium flex-1">Baixar PDF do estudo</span>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </Card>
        </a>
      )}

      {/* Objective */}
      {study.objective && (
        <Card className="p-4 rounded-2xl space-y-2 border-primary/10 bg-primary/5">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <h3 className="font-heading text-sm font-semibold">Objetivo</h3>
          </div>
          <p className="text-sm text-muted-foreground">{study.objective}</p>
        </Card>
      )}

      {/* Key verse */}
      {study.key_verse && (
        <Card className="p-4 rounded-2xl border-accent/20 bg-accent/5 space-y-2">
          <div className="flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-accent" />
            <h3 className="font-heading text-sm font-semibold">Versículo-chave</h3>
          </div>
          <blockquote className="text-sm italic text-muted-foreground border-l-2 border-accent/40 pl-3">
            {study.key_verse}
          </blockquote>
        </Card>
      )}

      {/* Base reading */}
      {study.base_reading && (
        <Card className="p-4 rounded-2xl space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <h3 className="font-heading text-sm font-semibold">Leitura base</h3>
          </div>
          <p className="text-sm font-medium text-primary">{study.base_reading}</p>
        </Card>
      )}

      {/* Introduction */}
      {study.introduction && (
        <Card className="p-4 rounded-2xl space-y-2">
          <h3 className="font-heading text-sm font-semibold">Introdução</h3>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{linkify(study.introduction)}</p>
        </Card>
      )}

      {/* Description with clickable links */}
      {study.description && (
        <Card className="p-4 rounded-2xl space-y-2">
          <h3 className="font-heading text-sm font-semibold">Descrição</h3>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{linkify(study.description)}</p>
        </Card>
      )}

      {/* Topics */}
      {topics.length > 0 && (
        <Card className="p-4 rounded-2xl space-y-3">
          <h3 className="font-heading text-sm font-semibold">Tópicos</h3>
          <div className="space-y-2">
            {topics.map((topic: string, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{i + 1}</span>
                <p className="text-sm">{linkify(topic)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Application */}
      {study.application && (
        <Card className="p-4 rounded-2xl space-y-2 border-accent/10 bg-accent/5">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-accent" />
            <h3 className="font-heading text-sm font-semibold">Aplicação prática</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{linkify(study.application)}</p>
        </Card>
      )}

      {/* Questions */}
      {questions.length > 0 && (
        <Card className="p-4 rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-primary" />
            <h3 className="font-heading text-sm font-semibold">Perguntas para reflexão</h3>
          </div>
          <div className="space-y-2">
            {questions.map((q: string, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">?</span>
                <p className="text-sm text-muted-foreground">{q}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Conclusion */}
      {study.conclusion && (
        <Card className="p-4 rounded-2xl space-y-2">
          <h3 className="font-heading text-sm font-semibold">Conclusão</h3>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{linkify(study.conclusion)}</p>
        </Card>
      )}

      {/* Linked services */}
      {study.linked_services && study.linked_services.length > 0 && (
        <Card className="p-4 rounded-2xl space-y-3">
          <h3 className="font-heading text-sm font-semibold flex items-center gap-2">
            <Video className="w-4 h-4 text-primary" /> Cultos relacionados
          </h3>
          <div className="space-y-2">
            {study.linked_services.map(svc => (
              <Link key={svc.id} to={`/church/services/${svc.id}`}>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                  <Video className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{svc.title}</p>
                    <p className="text-xs text-muted-foreground">{svc.preacher}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Notes */}
      <Card className="p-4 rounded-2xl space-y-3">
        <h3 className="font-heading text-sm font-semibold flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" /> Minhas Anotações
        </h3>
        <Textarea
          placeholder="Escreva suas reflexões sobre este estudo..."
          value={note} onChange={e => setNote(e.target.value)}
          className="rounded-xl min-h-[80px] bg-muted/30 border-0 resize-none"
        />
        <Button size="sm" className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSaveNote} disabled={!note.trim() || savingNote}>
          {savingNote ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
          Salvar no caderno
        </Button>
      </Card>

      {/* Complete button */}
      {!completed && (
        <Button className="w-full rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-base font-semibold" onClick={handleComplete} disabled={completing}>
          {completing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle className="w-5 h-5 mr-2" />}
          Marcar estudo como concluído
        </Button>
      )}
    </div>
  );
};

export default StudyDetailPage;
