import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BookOpen, Search, ChevronRight, ChevronLeft, 
  Highlighter, MessageSquare, Bookmark, 
  Settings2, Share2, BookMarked, Loader2, Sparkles
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';

interface BibleBook {
  id: number;
  name: string;
  abbreviation: string;
  chapters_count: number;
  book_index: number;
  testament: string;
}

interface Verse {
  id: string;
  book_index: number;
  chapter: number;
  verse: number;
  text: string;
}

interface Highlight {
  verse: number;
  color: string;
  note: string | null;
}

const COLORS = [
  { id: 'yellow', bg: 'bg-yellow-200 dark:bg-yellow-900/40', text: 'text-yellow-900 dark:text-yellow-100' },
  { id: 'blue', bg: 'bg-blue-200 dark:bg-blue-900/40', text: 'text-blue-900 dark:text-blue-100' },
  { id: 'green', bg: 'bg-green-200 dark:bg-green-900/40', text: 'text-green-900 dark:text-green-100' },
  { id: 'pink', bg: 'bg-pink-200 dark:bg-pink-900/40', text: 'text-pink-900 dark:text-pink-100' },
];

const BiblePage = () => {
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [currentBook, setCurrentBook] = useState<BibleBook | null>(null);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [verseNote, setVerseNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    loadBooks();
  }, []);

  useEffect(() => {
    if (currentBook) {
      loadChapter(currentBook.book_index, currentChapter);
    }
  }, [currentBook, currentChapter]);

  const loadBooks = async () => {
    try {
      const data = await api.get<BibleBook[]>('/api/bible/books');
      setBooks(data);
      if (data.length > 0) setCurrentBook(data[0]);
    } catch {
      toast.error('Erro ao carregar livros');
    }
  };

  const loadChapter = async (bookIdx: number, chapter: number) => {
    setLoading(true);
    try {
      const data = await api.get<{ verses: Verse[], highlights: Highlight[] }>(`/api/bible/chapter/${bookIdx}/${chapter}`);
      setVerses(data.verses);
      setHighlights(data.highlights);
    } catch {
      toast.error('Erro ao carregar capítulo');
    } finally {
      setLoading(false);
    }
  };

  const handleHighlight = async (verseNum: number, color: string) => {
    if (!currentBook) return;
    try {
      await api.post('/api/bible/highlight', {
        book_index: currentBook.book_index,
        chapter: currentChapter,
        verse: verseNum,
        color
      });
      
      setHighlights(prev => {
        const filtered = prev.filter(h => h.verse !== verseNum);
        return [...filtered, { verse: verseNum, color, note: null }];
      });
      setSelectedVerse(null);
      toast.success('Versículo marcado!');
    } catch {
      toast.error('Erro ao marcar');
    }
  };

  const handleSaveNote = async () => {
    if (!currentBook || !selectedVerse) return;
    setSavingNote(true);
    try {
      const highlight = highlights.find(h => h.verse === selectedVerse);
      await api.post('/api/bible/highlight', {
        book_index: currentBook.book_index,
        chapter: currentChapter,
        verse: selectedVerse,
        color: highlight?.color || 'yellow',
        note: verseNote
      });
      
      setHighlights(prev => {
        const filtered = prev.filter(h => h.verse !== selectedVerse);
        return [...filtered, { verse: selectedVerse, color: highlight?.color || 'yellow', note: verseNote }];
      });
      
      setNoteDialogOpen(false);
      setSelectedVerse(null);
      toast.success('Nota salva!');
    } catch {
      toast.error('Erro ao salvar nota');
    } finally {
      setSavingNote(false);
    }
  };

  const removeHighlight = async (verseNum: number) => {
    if (!currentBook) return;
    try {
      await api.delete(`/api/bible/highlight/${currentBook.book_index}/${currentChapter}/${verseNum}`);
      setHighlights(prev => prev.filter(h => h.verse !== verseNum));
      setSelectedVerse(null);
      toast.success('Marcação removida');
    } catch {
      toast.error('Erro ao remover');
    }
  };

  const getVerseHighlight = (verseNum: number) => {
    return highlights.find(h => h.verse === verseNum);
  };

  const nextChapter = () => {
    if (!currentBook) return;
    if (currentChapter < currentBook.chapters_count) {
      setCurrentChapter(prev => prev + 1);
    } else {
      const nextBook = books.find(b => b.book_index === currentBook.book_index + 1);
      if (nextBook) {
        setCurrentBook(nextBook);
        setCurrentChapter(1);
      }
    }
  };

  const prevChapter = () => {
    if (!currentBook) return;
    if (currentChapter > 1) {
      setCurrentChapter(prev => prev - 1);
    } else {
      const prevBook = books.find(b => b.book_index === currentBook.book_index - 1);
      if (prevBook) {
        setCurrentBook(prevBook);
        setCurrentChapter(prevBook.chapters_count);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Bible Header */}
      <header className="flex flex-col gap-4 p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <BookMarked className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-heading font-bold text-xl">Bíblia Digital</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Settings2 className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select 
            value={currentBook?.book_index.toString()} 
            onValueChange={(val) => {
              const b = books.find(book => book.book_index === parseInt(val));
              if (b) {
                setCurrentBook(b);
                setCurrentChapter(1);
              }
            }}
          >
            <SelectTrigger className="w-full md:w-[200px] rounded-xl border-slate-200">
              <SelectValue placeholder="Livro" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {books.map(b => (
                <SelectItem key={b.book_index} value={b.book_index.toString()}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={currentChapter.toString()} 
            onValueChange={(val) => setCurrentChapter(parseInt(val))}
          >
            <SelectTrigger className="w-[100px] rounded-xl border-slate-200">
              <SelectValue placeholder="Cap" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {currentBook && Array.from({ length: currentBook.chapters_count }, (_, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex relative">
        <ScrollArea className="flex-1 p-4 md:p-8">
          <div className="max-w-2xl mx-auto space-y-6 pb-24">
            <div className="flex items-center justify-between mb-8">
              <Button variant="ghost" size="icon" onClick={prevChapter} className="rounded-full">
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <h2 className="font-heading font-extrabold text-2xl">
                {currentBook?.name} {currentChapter}
              </h2>
              <Button variant="ghost" size="icon" onClick={nextChapter} className="rounded-full">
                <ChevronRight className="w-6 h-6" />
              </Button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
                <p className="text-muted-foreground animate-pulse">Buscando versículos...</p>
              </div>
            ) : verses.length === 0 ? (
              <Card className="p-8 text-center space-y-4 rounded-3xl border-slate-200/60">
                <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto">
                  <Sparkles className="w-8 h-8 text-primary/40" />
                </div>
                <h3 className="font-bold">Capítulo não carregado</h3>
                <p className="text-sm text-muted-foreground">
                  Estamos carregando a base de dados bíblica. Por enquanto, você pode usar nosso assistente de estudos para este capítulo.
                </p>
                <Button className="rounded-full gap-2">
                  <BookOpen className="w-4 h-4" /> Ver Estudo do Capítulo
                </Button>
              </Card>
            ) : (
              <div className="space-y-4 font-serif text-lg leading-relaxed text-slate-800 dark:text-slate-200 select-text">
                {verses.map((v) => {
                  const h = getVerseHighlight(v.verse);
                  const colorConfig = h ? COLORS.find(c => c.id === h.color) : null;
                  
                  return (
                    <span 
                      key={v.id}
                      className={cn(
                        "cursor-pointer transition-all rounded-md px-1 py-0.5",
                        colorConfig?.bg || "hover:bg-slate-100 dark:hover:bg-slate-800",
                        selectedVerse === v.verse && "ring-2 ring-primary ring-offset-2"
                      )}
                      onClick={() => setSelectedVerse(v.verse === selectedVerse ? null : v.verse)}
                    >
                      <sup className="text-[10px] font-bold mr-1 text-primary/60">{v.verse}</sup>
                      {v.text}
                      {" "}
                      {h?.note && (
                        <span className="inline-flex ml-1">
                          <MessageSquare className="w-3 h-3 text-primary/40" />
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Floating Context Menu (When verse is selected) */}
        {selectedVerse && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 animate-in slide-in-from-bottom-10 z-50">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Versículo {selectedVerse}
                </span>
                <Button variant="ghost" size="icon" onClick={() => setSelectedVerse(null)} className="h-6 w-6">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </Button>
              </div>

              <div className="flex items-center justify-center gap-4">
                {COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleHighlight(selectedVerse, c.id)}
                    className={cn(
                      "w-10 h-10 rounded-full border-2 transition-transform active:scale-90",
                      c.bg,
                      getVerseHighlight(selectedVerse)?.color === c.id ? "border-primary" : "border-transparent"
                    )}
                  />
                ))}
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="w-10 h-10 rounded-full"
                  onClick={() => removeHighlight(selectedVerse)}
                >
                  <Highlighter className="w-4 h-4 text-slate-400" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  className="flex-1 rounded-2xl gap-2"
                  onClick={() => {
                    setVerseNote(getVerseHighlight(selectedVerse)?.note || '');
                    setNoteDialogOpen(true);
                  }}
                >
                  <MessageSquare className="w-4 h-4" /> Anotar
                </Button>
                <Button variant="outline" className="flex-1 rounded-2xl gap-2">
                  <Bookmark className="w-4 h-4" /> Salvar
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Nota do Versículo {selectedVerse}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea 
              value={verseNote}
              onChange={(e) => setVerseNote(e.target.value)}
              placeholder="Sua reflexão sobre este versículo..."
              className="min-h-[120px] rounded-2xl bg-slate-50 border-slate-200"
            />
            <Button 
              className="w-full rounded-2xl h-12 font-bold"
              onClick={handleSaveNote}
              disabled={savingNote}
            >
              {savingNote ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Nota'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BiblePage;
