import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Lightbulb, Link2, Heart, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { bibleBooks, type Difficulty, difficultyOptions } from './BibleData';

interface StudyData {
  study_content: string;
  summary: string;
  key_points: string[];
  cross_references: string[];
  practical_application: string;
  cached: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  bookIdx: number;
  chapter: number;
  difficulty: Difficulty;
}

export default function ChapterStudyModal({ open, onClose, bookIdx, chapter, difficulty }: Props) {
  const [study, setStudy] = useState<StudyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const book = bibleBooks[bookIdx];
  const diff = difficultyOptions.find(d => d.key === difficulty);

  const loadStudy = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<StudyData>(
        `/api/bible-study/chapter?book=${bookIdx}&chapter=${chapter}&difficulty=${difficulty}&bookName=${encodeURIComponent(book.name)}`
      );
      setStudy(data);
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar estudo');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && !study && !loading) loadStudy();
    if (!isOpen) { onClose(); setStudy(null); setError(''); }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <BookOpen className="w-5 h-5 text-primary" />
            {book?.name} {chapter}
            <span className={`text-xs px-2 py-0.5 rounded-full bg-muted ${diff?.color}`}>
              {diff?.icon} {diff?.label}
            </span>
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando estudo...
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {error && (
          <div className="py-4 text-center space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={loadStudy}>Tentar novamente</Button>
          </div>
        )}

        {study && (
          <div className="space-y-4 py-2">
            {study.cached && (
              <p className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-lg w-fit">
                ⚡ Estudo do cache — sem uso de tokens
              </p>
            )}

            {study.summary && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                <p className="text-sm font-medium">{study.summary}</p>
              </div>
            )}

            <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
              {study.study_content}
            </div>

            {study.key_points?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold flex items-center gap-1.5 text-primary">
                  <Lightbulb className="w-3.5 h-3.5" /> Pontos-chave
                </h4>
                <ul className="space-y-1">
                  {study.key_points.map((p, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-2">
                      <span className="text-primary font-bold">•</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {study.cross_references?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold flex items-center gap-1.5 text-primary">
                  <Link2 className="w-3.5 h-3.5" /> Referências cruzadas
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {study.cross_references.map((r, i) => (
                    <span key={i} className="text-xs bg-muted px-2 py-1 rounded-lg">{r}</span>
                  ))}
                </div>
              </div>
            )}

            {study.practical_application && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold flex items-center gap-1.5 text-primary">
                  <Heart className="w-3.5 h-3.5" /> Aplicação prática
                </h4>
                <p className="text-xs text-muted-foreground">{study.practical_application}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
