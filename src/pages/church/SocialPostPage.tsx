import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Share2, Download, Loader2, Sparkles, Check,
  Type, ImageIcon, Camera, ChevronUp, ChevronDown,
  Layers, Palette, Send, RotateCcw, Trash2, X, Menu,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import SocialEditorCanvas, { DraggableElement } from '@/components/social/SocialEditorCanvas';
import ElementToolbar from '@/components/social/ElementToolbar';
import { storyTemplates, templateCategories, StoryTemplate } from '@/components/social/StoryTemplates';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';

interface Devotional {
  verse: string;
  verse_reference: string;
  reflection: string;
}

const imageFilters = [
  { id: 'none', name: 'Nenhum', icon: '✨' },
  { id: 'grayscale(1)', name: 'P&B', icon: '⬛' },
  { id: 'sepia(0.6)', name: 'Sépia', icon: '🟤' },
  { id: 'saturate(1.5)', name: 'Vibrante', icon: '🌈' },
  { id: 'contrast(1.3)', name: 'Contraste', icon: '◐' },
  { id: 'brightness(1.2)', name: 'Claro', icon: '☀️' },
  { id: 'brightness(0.7)', name: 'Escuro', icon: '🌙' },
];

let elementIdCounter = 0;
const nextId = () => `el-${++elementIdCounter}`;

type BottomPanel = 'none' | 'templates' | 'elements' | 'style' | 'export';

const SocialPostPage = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  const [devotional, setDevotional] = useState<Devotional | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<StoryTemplate>(storyTemplates[0]);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [imageFilter, setImageFilter] = useState('none');
  const [postsToday, setPostsToday] = useState(0);
  const maxPostsPerDay = 5;
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [churchName, setChurchName] = useState('');
  const [churchLogoUrl, setChurchLogoUrl] = useState<string | null>(null);

  const [elements, setElements] = useState<DraggableElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<BottomPanel>('none');
  const [overlayOpacity, setOverlayOpacity] = useState(0.35);
  const [bgBlur, setBgBlur] = useState(0);
  const [vignette, setVignette] = useState(false);
  const [vignetteIntensity, setVignetteIntensity] = useState(0.7);
  const [canvasLocked, setCanvasLocked] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<string>('all');
  const [showElementEditor, setShowElementEditor] = useState(false);

  const selectedElement = elements.find(el => el.id === selectedElementId) || null;

  useEffect(() => {
    Promise.all([
      api.get<Devotional>('/api/church/devotional').catch(() => null),
      api.get<{ count_today: number }>('/api/church/social/today').catch(() => ({ count_today: 0 })),
      api.get<{ name: string; logo_url: string | null }>('/api/church/info').catch(() => ({ name: '', logo_url: null })),
    ]).then(([dev, today, info]) => {
      setDevotional(dev);
      setPostsToday(today.count_today);
      setChurchName(info.name || '');
      setChurchLogoUrl(info.logo_url || null);
      // Apply first template elements
      applyTemplate(storyTemplates[0], dev, info.name, info.logo_url);
    }).finally(() => setLoading(false));
  }, []);

  const applyTemplate = (tpl: StoryTemplate, dev?: Devotional | null, name?: string, logo?: string | null) => {
    const useDev = dev ?? devotional;
    const useName = name ?? churchName;
    const useLogo = logo ?? churchLogoUrl;

    const newElements: DraggableElement[] = tpl.defaultElements.map(el => ({
      ...el,
      id: nextId(),
    }));

    // Replace verse content with actual devotional if available
    if (useDev) {
      const verseEl = newElements.find(e => e.type === 'text');
      if (verseEl) verseEl.content = useDev.verse;
      const refEl = newElements.find(e => e.type === 'verse-ref');
      if (refEl) refEl.content = useDev.verse_reference;
    }

    // Add church name
    if (useName) {
      newElements.push({
        id: nextId(), type: 'church-name', x: 50, y: 90,
        content: useName, fontSize: 13, fontFamily: "'DM Sans', sans-serif",
        color: tpl.textColor, bold: true, italic: false, opacity: 0.45,
      });
    }

    // Add logo
    if (useLogo) {
      newElements.push({
        id: nextId(), type: 'logo', x: 88, y: 93,
        content: useLogo, fontSize: 14, fontFamily: 'Arial, sans-serif',
        color: '#ffffff', bold: false, italic: false, opacity: 0.45, width: 11,
      });
    }

    setElements(newElements);
    setSelectedTemplate(tpl);
    setOverlayOpacity(tpl.overlayOpacity);
    setVignette(tpl.vignette);
    setVignetteIntensity(tpl.vignetteIntensity);
    setSelectedElementId(null);
  };

  const handleElementMove = useCallback((id: string, x: number, y: number) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, x, y } : el));
  }, []);

  const handleElementUpdate = useCallback((id: string, updates: Partial<DraggableElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  }, []);

  const handleDeleteElement = useCallback((id: string) => {
    setElements(prev => prev.filter(el => el.id !== id));
    if (selectedElementId === id) setSelectedElementId(null);
  }, [selectedElementId]);

  const handleMoveElement = useCallback((id: string, direction: 'up' | 'down') => {
    setElements(prev => {
      const idx = prev.findIndex(el => el.id === id);
      if (idx === -1) return prev;
      const newIdx = direction === 'up' ? idx + 1 : idx - 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      return copy;
    });
  }, []);

  const addTextElement = () => {
    const newEl: DraggableElement = {
      id: nextId(), type: 'text', x: 50, y: 50,
      content: 'Novo texto', fontSize: 20, fontFamily: "'DM Sans', sans-serif",
      color: selectedTemplate.textColor, bold: false, italic: false, opacity: 1,
    };
    setElements(prev => [...prev, newEl]);
    setSelectedElementId(newEl.id);
  };

  const addPhotoAsElement = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoElementUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      const newEl: DraggableElement = {
        id: nextId(), type: 'image', x: 50, y: 50,
        content: dataUrl, fontSize: 14, fontFamily: 'Arial, sans-serif',
        color: '#ffffff', bold: false, italic: false, opacity: 1, width: 60,
      };
      setElements(prev => [...prev, newEl]);
      setSelectedElementId(newEl.id);
      toast.success('Imagem adicionada!');
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setBgImage(ev.target?.result as string);
      toast.success('Foto de fundo aplicada!');
    };
    reader.readAsDataURL(file);
    if (bgFileInputRef.current) bgFileInputRef.current.value = '';
  };

  const useDevotional = () => {
    if (!devotional) return;
    const verseEl = elements.find(el => el.type === 'text');
    const refEl = elements.find(el => el.type === 'verse-ref');
    if (verseEl) handleElementUpdate(verseEl.id, { content: devotional.verse });
    else {
      const newEl: DraggableElement = {
        id: nextId(), type: 'text', x: 50, y: 40,
        content: devotional.verse, fontSize: 22, fontFamily: 'Georgia, serif',
        color: selectedTemplate.textColor, bold: false, italic: true, opacity: 1,
      };
      setElements(prev => [...prev, newEl]);
    }
    if (refEl) handleElementUpdate(refEl.id, { content: devotional.verse_reference });
    else {
      const newEl: DraggableElement = {
        id: nextId(), type: 'verse-ref', x: 50, y: 60,
        content: devotional.verse_reference, fontSize: 16, fontFamily: 'Georgia, serif',
        color: selectedTemplate.textColor, bold: true, italic: false, opacity: 0.8,
      };
      setElements(prev => [...prev, newEl]);
    }
    toast.success('Devocional aplicado!');
  };

  // Export
  const exportToCanvas = useCallback((): Promise<HTMLCanvasElement> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const W = 1080, H = 1920;
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d')!;
      const colorMatch = selectedTemplate.bgGradient.match(/#[a-f0-9]{6}/gi) || ['#1e3a5f', '#0f1f33'];

      const drawElements = () => {
        const gradient = ctx.createLinearGradient(0, 0, W, H);
        gradient.addColorStop(0, colorMatch[0]);
        gradient.addColorStop(1, colorMatch[1] || colorMatch[0]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);

        ctx.globalAlpha = overlayOpacity;
        ctx.fillStyle = selectedTemplate.overlayColor;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;

        if (vignette) {
          const vGrad = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.3, W/2, H/2, Math.max(W,H)*0.7);
          vGrad.addColorStop(0, 'rgba(0,0,0,0)');
          vGrad.addColorStop(1, `rgba(0,0,0,${vignetteIntensity})`);
          ctx.fillStyle = vGrad;
          ctx.fillRect(0, 0, W, H);
        }

        for (const el of elements) {
          const ex = (el.x / 100) * W;
          const ey = (el.y / 100) * H;
          ctx.globalAlpha = el.opacity;
          if (el.type === 'image' || el.type === 'logo') continue;

          const scaledSize = el.fontSize * (W / 400);
          ctx.font = `${el.italic ? 'italic' : 'normal'} ${el.bold ? 'bold' : 'normal'} ${scaledSize}px ${el.fontFamily}`;
          ctx.fillStyle = el.color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 8;

          const maxW = W * 0.85;
          const words = (el.content || '').split(' ');
          const lines: string[] = [];
          let line = '';
          for (const word of words) {
            const test = line ? `${line} ${word}` : word;
            if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; }
            else line = test;
          }
          if (line) lines.push(line);

          const lh = scaledSize * 1.4;
          const startY = ey - ((lines.length - 1) * lh) / 2;
          lines.forEach((l, i) => ctx.fillText(l, ex, startY + i * lh));
          ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
      };

      const loadAndDraw = async () => {
        if (bgImage) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((res) => {
            img.onload = () => {
              const scale = Math.max(W / img.width, H / img.height);
              const ix = (W - img.width * scale) / 2;
              const iy = (H - img.height * scale) / 2;
              ctx.drawImage(img, ix, iy, img.width * scale, img.height * scale);
              res();
            };
            img.onerror = () => res();
            img.src = bgImage;
          });
        }
        drawElements();

        for (const el of elements) {
          if ((el.type === 'image' || el.type === 'logo') && el.content) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise<void>((res) => {
              img.onload = () => {
                ctx.globalAlpha = el.opacity;
                const elW = ((el.width || 60) / 100) * W;
                const ratio = img.height / img.width;
                const elH = elW * ratio;
                ctx.drawImage(img, (el.x/100)*W - elW/2, (el.y/100)*H - elH/2, elW, elH);
                ctx.globalAlpha = 1;
                res();
              };
              img.onerror = () => res();
              img.src = el.content;
            });
          }
        }
        resolve(canvas);
      };
      loadAndDraw();
    });
  }, [elements, selectedTemplate, bgImage, overlayOpacity, vignette, vignetteIntensity]);

  const handleDownload = async () => {
    const canvas = await exportToCanvas();
    const link = document.createElement('a');
    link.download = `story-${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Imagem baixada!');
  };

  const handleShare = async () => {
    try {
      const canvas = await exportToCanvas();
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'story.png', { type: 'image/png' });
        if (navigator.share) {
          await navigator.share({ files: [file], title: 'Meu post devocional' });
        } else {
          handleDownload();
        }
      });
    } catch { handleDownload(); }
  };

  const handleGenerate = async () => {
    if (postsToday >= maxPostsPerDay) {
      toast.error(`Limite de ${maxPostsPerDay} posts atingido hoje!`);
      return;
    }
    setGenerating(true);
    try {
      const verseEl = elements.find(el => el.type === 'text');
      const refEl = elements.find(el => el.type === 'verse-ref');
      await api.post('/api/church/social/generate', {
        verse_text: verseEl?.content || '',
        verse_reference: refEl?.content || '',
        custom_text: verseEl?.content || '',
        template_id: selectedTemplate.id,
      });
      setGenerated(true);
      setPostsToday(prev => prev + 1);
      toast.success('Post salvo! Baixe e compartilhe.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar post');
    } finally { setGenerating(false); }
  };

  const togglePanel = (panel: BottomPanel) => {
    setActivePanel(prev => prev === panel ? 'none' : panel);
  };

  const handleElementSelect = useCallback((id: string | null) => {
    setSelectedElementId(id);
  }, []);

  const handleElementResize = useCallback((id: string, width: number) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, width } : el));
  }, []);

  const handleElementRotate = useCallback((id: string, rotation: number) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, rotation } : el));
  }, []);

  const handleOpenEditor = useCallback((id: string) => {
    setSelectedElementId(id);
    setShowElementEditor(true);
  }, []);

  const filteredTemplates = templateCategory === 'all'
    ? storyTemplates
    : storyTemplates.filter(t => t.category === templateCategory);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-zinc-950 overflow-hidden animate-fade-in">
      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoElementUpload} />
      <input ref={bgFileInputRef} type="file" accept="image/*;capture=camera" className="hidden" onChange={handleBgUpload} />

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white font-heading">Story Editor</h1>
            <p className="text-[10px] text-zinc-500">{postsToday}/{maxPostsPerDay} hoje</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!generated && postsToday < maxPostsPerDay ? (
            <Button
              size="sm"
              className="rounded-full h-8 px-4 text-xs gap-1.5"
              onClick={handleGenerate}
              disabled={generating || elements.length === 0}
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Salvar
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" className="rounded-full h-8 w-8 p-0 border-zinc-700 text-zinc-300" onClick={handleShare}>
                <Share2 className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" className="rounded-full h-8 px-4 text-xs gap-1.5" onClick={handleDownload}>
                <Download className="w-3.5 h-3.5" /> Baixar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Canvas area - takes remaining space */}
      <div className="flex-1 flex items-center justify-center p-3 overflow-hidden">
        <div className="w-full max-w-[280px]">
          <SocialEditorCanvas
            elements={elements}
            onElementMove={handleElementMove}
            onElementSelect={handleElementSelect}
            onElementResize={handleElementResize}
            onElementRotate={handleElementRotate}
            onOpenEditor={handleOpenEditor}
            selectedElementId={selectedElementId}
            bgGradient={selectedTemplate.bgGradient}
            bgImage={bgImage}
            imageFilter={imageFilter}
            overlayColor={selectedTemplate.overlayColor}
            overlayOpacity={overlayOpacity}
            bgBlur={bgBlur}
            vignette={vignette}
            vignetteIntensity={vignetteIntensity}
            locked={canvasLocked}
            onToggleLock={() => setCanvasLocked(prev => !prev)}
          />
        </div>
      </div>

      {/* Bottom panel content */}
      {activePanel !== 'none' && (
        <div className="bg-zinc-900 border-t border-zinc-800 max-h-[40vh] overflow-y-auto animate-fade-in">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              {activePanel === 'templates' && 'Modelos'}
              {activePanel === 'elements' && 'Elementos'}
              {activePanel === 'style' && 'Estilo'}
              {activePanel === 'export' && 'Exportar'}
            </span>
            <button onClick={() => setActivePanel('none')} className="text-zinc-500 hover:text-zinc-300">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Templates Panel */}
          {activePanel === 'templates' && (
            <div className="px-4 pb-4 space-y-3">
              {/* Category filters */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {templateCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setTemplateCategory(cat.id)}
                    className={`px-3 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all ${
                      templateCategory === cat.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              {/* Template grid */}
              <div className="grid grid-cols-4 gap-2">
                {filteredTemplates.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl)}
                    className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${
                      selectedTemplate.id === tpl.id ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-zinc-800'
                    }`}
                  >
                    <div
                      className="w-full aspect-[9/16] rounded-lg"
                      style={{ background: tpl.thumbnail }}
                    />
                    <span className="text-[9px] font-medium text-zinc-400 truncate w-full text-center">{tpl.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Elements Panel */}
          {activePanel === 'elements' && (
            <div className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={addTextElement}
                  className="flex items-center gap-2 px-3 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-all"
                >
                  <Type className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-zinc-200">Texto</span>
                </button>
                <button
                  onClick={addPhotoAsElement}
                  className="flex items-center gap-2 px-3 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-all"
                >
                  <ImageIcon className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-zinc-200">Imagem</span>
                </button>
                <button
                  onClick={() => bgFileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-all"
                >
                  <Camera className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-zinc-200">Foto Fundo</span>
                </button>
                {devotional && (
                  <button
                    onClick={useDevotional}
                    className="flex items-center gap-2 px-3 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-medium text-zinc-200">Devocional</span>
                  </button>
                )}
              </div>

              {bgImage && (
                <button
                  onClick={() => setBgImage(null)}
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remover fundo
                </button>
              )}

              {/* Layers */}
              {elements.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Camadas</span>
                  {elements.map((el, idx) => (
                    <div
                      key={el.id}
                      className={`flex items-center gap-1 rounded-lg transition-all ${
                        el.id === selectedElementId ? 'bg-primary/20' : 'hover:bg-zinc-800'
                      }`}
                    >
                      <button
                        onClick={() => { setSelectedElementId(el.id); setShowElementEditor(true); }}
                        className={`flex-1 text-left px-3 py-2 text-xs flex items-center gap-2 ${
                          el.id === selectedElementId ? 'text-primary' : 'text-zinc-400'
                        }`}
                      >
                        {el.type === 'image' ? <ImageIcon className="w-3 h-3" /> : <Type className="w-3 h-3" />}
                        <span className="truncate flex-1">
                          {el.type === 'image' ? 'Imagem' : el.type === 'logo' ? 'Logo' : el.content || 'Sem texto'}
                        </span>
                      </button>
                      <div className="flex items-center pr-1">
                        <button
                          onClick={() => handleMoveElement(el.id, 'down')}
                          disabled={idx === 0}
                          className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-200 disabled:opacity-20 transition-all"
                          title="Mover para trás"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleMoveElement(el.id, 'up')}
                          disabled={idx === elements.length - 1}
                          className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-200 disabled:opacity-20 transition-all"
                          title="Mover para frente"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Style Panel */}
          {activePanel === 'style' && (
            <div className="px-4 pb-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Camada escura: {Math.round(overlayOpacity * 100)}%</Label>
                <Slider value={[overlayOpacity * 100]} onValueChange={([v]) => setOverlayOpacity(v / 100)} min={0} max={90} step={5} />
              </div>

              {bgImage && (
                <>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Filtro</Label>
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {imageFilters.map(f => (
                        <button
                          key={f.id}
                          onClick={() => setImageFilter(f.id)}
                          className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-[10px] whitespace-nowrap transition-all ${
                            imageFilter === f.id ? 'bg-primary text-primary-foreground' : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          <span>{f.icon}</span>
                          <span>{f.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Desfoque: {bgBlur}px</Label>
                    <Slider value={[bgBlur]} onValueChange={([v]) => setBgBlur(v)} min={0} max={20} step={1} />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Vinheta</Label>
                  <button
                    onClick={() => setVignette(!vignette)}
                    className={`w-9 h-5 rounded-full transition-colors flex items-center ${vignette ? 'bg-primary' : 'bg-zinc-700'}`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${vignette ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                  </button>
                </div>
                {vignette && (
                  <div>
                    <Label className="text-[10px] text-zinc-500">Intensidade: {Math.round(vignetteIntensity * 100)}%</Label>
                    <Slider value={[vignetteIntensity * 100]} onValueChange={([v]) => setVignetteIntensity(v / 100)} min={20} max={100} step={5} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Export Panel */}
          {activePanel === 'export' && (
            <div className="px-4 pb-4 space-y-3">
              {!generated && postsToday < maxPostsPerDay ? (
                <>
                  <Button className="w-full rounded-xl h-12 gap-2" onClick={handleGenerate} disabled={generating || elements.length === 0}>
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Salvar e Gerar
                  </Button>
                  <p className="text-[10px] text-center text-zinc-500">{postsToday}/{maxPostsPerDay} posts hoje</p>
                </>
              ) : (
                <>
                  <Button className="w-full rounded-xl h-12 gap-2" onClick={handleDownload}>
                    <Download className="w-4 h-4" /> Baixar (1080×1920)
                  </Button>
                  <Button variant="outline" className="w-full rounded-xl h-10 gap-2 border-zinc-700 text-zinc-300" onClick={handleShare}>
                    <Share2 className="w-4 h-4" /> Compartilhar
                  </Button>
                </>
              )}

              {postsToday >= maxPostsPerDay && !generated && (
                <div className="p-4 rounded-2xl bg-zinc-800 text-center space-y-2">
                  <Check className="w-6 h-6 text-primary mx-auto" />
                  <p className="text-sm font-medium text-zinc-200">Limite atingido!</p>
                  <p className="text-[10px] text-zinc-500">Volte amanhã para criar novos.</p>
                  <Button size="sm" className="rounded-xl gap-1.5" onClick={handleDownload}>
                    <Download className="w-3.5 h-3.5" /> Baixar último
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bottom toolbar */}
      <div className="bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800 px-2 py-2 safe-bottom">
        <div className="flex items-center justify-around max-w-sm mx-auto">
          {[
            { key: 'templates' as const, icon: Layers, label: 'Modelos' },
            { key: 'elements' as const, icon: Type, label: 'Elementos' },
            { key: 'style' as const, icon: Palette, label: 'Estilo' },
            { key: 'export' as const, icon: Send, label: 'Exportar' },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => togglePanel(item.key)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all ${
                activePanel === item.key
                  ? 'text-primary bg-primary/10'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-semibold">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Element editor sheet */}
      <Sheet open={showElementEditor && !!selectedElement} onOpenChange={setShowElementEditor}>
        <SheetContent side="bottom" className="bg-zinc-900 border-zinc-800 rounded-t-2xl max-h-[50vh]">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-sm text-zinc-200">Editar elemento</SheetTitle>
            <SheetDescription className="sr-only">Edite as propriedades do elemento selecionado</SheetDescription>
          </SheetHeader>
          {selectedElement && (
            <div className="overflow-y-auto">
              <ElementToolbar
                element={selectedElement}
                onChange={updates => handleElementUpdate(selectedElement.id, updates)}
                onDelete={() => { handleDeleteElement(selectedElement.id); setShowElementEditor(false); }}
                onMoveUp={() => handleMoveElement(selectedElement.id, 'up')}
                onMoveDown={() => handleMoveElement(selectedElement.id, 'down')}
                canMoveUp={elements.indexOf(selectedElement) < elements.length - 1}
                canMoveDown={elements.indexOf(selectedElement) > 0}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default SocialPostPage;
