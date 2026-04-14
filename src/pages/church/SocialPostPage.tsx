import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Share2, Download, Upload, Loader2, Sparkles, Check, Palette, RotateCcw,
  Type, ImageIcon, Plus, Layers, Camera, Eye,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import SocialEditorCanvas, { DraggableElement } from '@/components/social/SocialEditorCanvas';
import ElementToolbar from '@/components/social/ElementToolbar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Devotional {
  verse: string;
  verse_reference: string;
  reflection: string;
}

interface PostTemplate {
  id: string;
  name: string;
  bgGradient: string;
  textColor: string;
  overlayColor: string;
  fontStyle: string;
}

const templates: PostTemplate[] = [
  { id: 'classic', name: 'Clássico', bgGradient: 'linear-gradient(135deg, #1e3a5f 0%, #0f1f33 100%)', textColor: '#ffffff', overlayColor: 'rgba(0,0,0,0.35)', fontStyle: 'serif' },
  { id: 'golden', name: 'Dourado', bgGradient: 'linear-gradient(135deg, #92702e 0%, #3d2e10 100%)', textColor: '#fef3c7', overlayColor: 'rgba(30,20,0,0.4)', fontStyle: 'serif' },
  { id: 'sunset', name: 'Pôr do Sol', bgGradient: 'linear-gradient(135deg, #f97316 0%, #7c2d12 100%)', textColor: '#ffffff', overlayColor: 'rgba(124,45,18,0.35)', fontStyle: 'sans-serif' },
  { id: 'purple', name: 'Roxo', bgGradient: 'linear-gradient(135deg, #7c3aed 0%, #1e1b4b 100%)', textColor: '#e0e7ff', overlayColor: 'rgba(30,27,75,0.4)', fontStyle: 'sans-serif' },
  { id: 'nature', name: 'Natureza', bgGradient: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)', textColor: '#ecfdf5', overlayColor: 'rgba(6,78,59,0.35)', fontStyle: 'serif' },
  { id: 'minimal', name: 'Minimalista', bgGradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', textColor: '#1e293b', overlayColor: 'rgba(255,255,255,0.5)', fontStyle: 'sans-serif' },
];

const imageFilters = [
  { id: 'none', name: 'Nenhum' },
  { id: 'grayscale(1)', name: 'P&B' },
  { id: 'sepia(0.6)', name: 'Sépia' },
  { id: 'saturate(1.5)', name: 'Vibrante' },
  { id: 'contrast(1.3)', name: 'Contraste' },
  { id: 'brightness(1.2)', name: 'Claro' },
  { id: 'brightness(0.7)', name: 'Escuro' },
  { id: 'blur(2px)', name: 'Desfocado' },
];

let elementIdCounter = 0;
const nextId = () => `el-${++elementIdCounter}`;

const SocialPostPage = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement>(null);

  const [devotional, setDevotional] = useState<Devotional | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PostTemplate>(templates[0]);
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
  const [activeTab, setActiveTab] = useState<'elements' | 'style' | 'export'>('elements');
  const [overlayOpacity, setOverlayOpacity] = useState(0.35);
  const [bgBlur, setBgBlur] = useState(0);
  const [vignette, setVignette] = useState(false);
  const [vignetteIntensity, setVignetteIntensity] = useState(0.7);
  const [canvasLocked, setCanvasLocked] = useState(false);

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

      // Default elements
      const defaultElements: DraggableElement[] = [];
      if (dev) {
        defaultElements.push({
          id: nextId(), type: 'text', x: 50, y: 40,
          content: dev.verse, fontSize: 22, fontFamily: 'Georgia, serif',
          color: '#ffffff', bold: false, italic: true, opacity: 1,
        });
        defaultElements.push({
          id: nextId(), type: 'verse-ref', x: 50, y: 60,
          content: dev.verse_reference, fontSize: 16, fontFamily: 'Georgia, serif',
          color: '#ffffff', bold: true, italic: false, opacity: 0.8,
        });
      }
      if (info.name) {
        defaultElements.push({
          id: nextId(), type: 'church-name', x: 50, y: 90,
          content: info.name, fontSize: 14, fontFamily: 'Arial, sans-serif',
          color: '#ffffff', bold: true, italic: false, opacity: 0.5,
        });
      }
      if (info.logo_url) {
        defaultElements.push({
          id: nextId(), type: 'logo', x: 88, y: 93,
          content: info.logo_url, fontSize: 14, fontFamily: 'Arial, sans-serif',
          color: '#ffffff', bold: false, italic: false, opacity: 0.5, width: 12,
        });
      }
      setElements(defaultElements);
    }).finally(() => setLoading(false));
  }, []);

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

  const addTextElement = () => {
    const newEl: DraggableElement = {
      id: nextId(), type: 'text', x: 50, y: 50,
      content: 'Novo texto', fontSize: 20, fontFamily: 'Arial, sans-serif',
      color: selectedTemplate.textColor, bold: false, italic: false, opacity: 1,
    };
    setElements(prev => [...prev, newEl]);
    setSelectedElementId(newEl.id);
  };

  const addImageElement = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      // Ask: background or element?
      setBgImage(dataUrl);
      toast.success('Foto adicionada como fundo! Use os filtros para ajustar.');
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addPhotoAsElement = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
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
        toast.success('Imagem adicionada! Arraste para posicionar.');
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const useDevotional = () => {
    if (!devotional) return;
    // Update or add verse text
    const verseEl = elements.find(el => el.type === 'text');
    const refEl = elements.find(el => el.type === 'verse-ref');
    if (verseEl) {
      handleElementUpdate(verseEl.id, { content: devotional.verse });
    } else {
      const newEl: DraggableElement = {
        id: nextId(), type: 'text', x: 50, y: 40,
        content: devotional.verse, fontSize: 22, fontFamily: 'Georgia, serif',
        color: selectedTemplate.textColor, bold: false, italic: true, opacity: 1,
      };
      setElements(prev => [...prev, newEl]);
    }
    if (refEl) {
      handleElementUpdate(refEl.id, { content: devotional.verse_reference });
    } else {
      const newEl: DraggableElement = {
        id: nextId(), type: 'verse-ref', x: 50, y: 60,
        content: devotional.verse_reference, fontSize: 16, fontFamily: 'Georgia, serif',
        color: selectedTemplate.textColor, bold: true, italic: false, opacity: 0.8,
      };
      setElements(prev => [...prev, newEl]);
    }
    toast.success('Devocional do dia aplicado!');
  };

  // Export to canvas for download
  const exportToCanvas = useCallback((): Promise<HTMLCanvasElement> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const W = 1080;
      const H = 1920;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d')!;

      const colorMatch = selectedTemplate.bgGradient.match(/#[a-f0-9]{6}/gi) || ['#1e3a5f', '#0f1f33'];

      const drawElements = () => {
        // Gradient
        const gradient = ctx.createLinearGradient(0, 0, W, H);
        gradient.addColorStop(0, colorMatch[0]);
        gradient.addColorStop(1, colorMatch[1] || colorMatch[0]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);

        // Overlay
        ctx.fillStyle = selectedTemplate.overlayColor;
        ctx.fillRect(0, 0, W, H);

        // Elements
        for (const el of elements) {
          const ex = (el.x / 100) * W;
          const ey = (el.y / 100) * H;
          ctx.globalAlpha = el.opacity;

          if (el.type === 'image' && el.content) {
            // Will be drawn async below
            continue;
          }
          if (el.type === 'logo' && el.content) {
            continue;
          }

          // Text elements
          const scaledSize = el.fontSize * (W / 400);
          const weight = el.bold ? 'bold' : 'normal';
          const style = el.italic ? 'italic' : 'normal';
          ctx.font = `${style} ${weight} ${scaledSize}px ${el.fontFamily}`;
          ctx.fillStyle = el.color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 8;

          // Wrap text
          const maxW = W * 0.85;
          const words = (el.content || '').split(' ');
          const lines: string[] = [];
          let line = '';
          for (const word of words) {
            const test = line ? `${line} ${word}` : word;
            if (ctx.measureText(test).width > maxW && line) {
              lines.push(line);
              line = word;
            } else {
              line = test;
            }
          }
          if (line) lines.push(line);

          const lh = scaledSize * 1.4;
          const startY = ey - ((lines.length - 1) * lh) / 2;
          lines.forEach((l, i) => {
            ctx.fillText(l, ex, startY + i * lh);
          });
          ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
      };

      // Load bg image first if present
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

        // Draw image and logo elements
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
                const ex = (el.x / 100) * W - elW / 2;
                const ey = (el.y / 100) * H - elH / 2;
                ctx.drawImage(img, ex, ey, elW, elH);
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
  }, [elements, selectedTemplate, bgImage]);

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
    } catch {
      handleDownload();
    }
  };

  const handleGenerate = async () => {
    if (postsToday >= maxPostsPerDay) {
      toast.error(`Você atingiu o limite de ${maxPostsPerDay} posts hoje. Volte amanhã!`);
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
      toast.success('Post salvo! Agora baixe e compartilhe.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar post');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Share2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold">Editor de Story</h1>
          <p className="text-xs text-muted-foreground">
            {postsToday >= maxPostsPerDay && !generated ? `Limite atingido (${postsToday}/${maxPostsPerDay})` : `Crie seu story (${postsToday}/${maxPostsPerDay} hoje)`}
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {/* Canvas Preview */}
      <SocialEditorCanvas
        elements={elements}
        onElementMove={handleElementMove}
        onElementSelect={setSelectedElementId}
        selectedElementId={selectedElementId}
        bgGradient={selectedTemplate.bgGradient}
        bgImage={bgImage}
        imageFilter={imageFilter}
        overlayColor={selectedTemplate.overlayColor}
        churchLogoUrl={churchLogoUrl}
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1">
        {[
          { key: 'elements' as const, icon: Layers, label: 'Elementos' },
          { key: 'style' as const, icon: Palette, label: 'Estilo' },
          { key: 'export' as const, icon: Download, label: 'Exportar' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Elements Tab */}
      {activeTab === 'elements' && (
        <div className="space-y-3">
          {/* Add buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="rounded-xl h-10 text-xs" onClick={addTextElement}>
              <Type className="w-4 h-4 mr-1.5" /> Texto
            </Button>
            <Button variant="outline" className="rounded-xl h-10 text-xs" onClick={addPhotoAsElement}>
              <ImageIcon className="w-4 h-4 mr-1.5" /> Imagem
            </Button>
            <Button variant="outline" className="rounded-xl h-10 text-xs" onClick={() => fileInputRef.current?.click()}>
              <Camera className="w-4 h-4 mr-1.5" /> Foto Fundo
            </Button>
            {devotional && (
              <Button variant="outline" className="rounded-xl h-10 text-xs" onClick={useDevotional}>
                <Sparkles className="w-4 h-4 mr-1.5 text-amber-500" /> Devocional
              </Button>
            )}
          </div>

          {bgImage && (
            <Button variant="ghost" size="sm" className="w-full text-xs text-destructive" onClick={() => setBgImage(null)}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Remover foto de fundo
            </Button>
          )}

          {/* Selected element toolbar */}
          {selectedElement && (
            <ElementToolbar
              element={selectedElement}
              onChange={updates => handleElementUpdate(selectedElement.id, updates)}
              onDelete={() => handleDeleteElement(selectedElement.id)}
            />
          )}

          {/* Element list */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Camadas ({elements.length})</Label>
            {elements.map(el => (
              <button
                key={el.id}
                onClick={() => setSelectedElementId(el.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-all ${
                  el.id === selectedElementId ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                }`}
              >
                {el.type === 'image' ? <ImageIcon className="w-3.5 h-3.5" /> :
                 el.type === 'logo' ? <Eye className="w-3.5 h-3.5" /> :
                 <Type className="w-3.5 h-3.5" />}
                <span className="truncate flex-1">
                  {el.type === 'image' ? 'Imagem' : el.type === 'logo' ? 'Logo' : el.content || 'Sem texto'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Style Tab */}
      {activeTab === 'style' && (
        <div className="space-y-4">
          {/* Templates */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Modelo de fundo</Label>
            <div className="grid grid-cols-3 gap-2">
              {templates.map(tpl => {
                const colorMatch = tpl.bgGradient.match(/#[a-f0-9]{6}/gi) || ['#1e3a5f'];
                return (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                      selectedTemplate.id === tpl.id ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-muted'
                    }`}
                  >
                    <div
                      className="w-full aspect-[9/16] rounded-lg"
                      style={{ background: `linear-gradient(135deg, ${colorMatch[0]}, ${colorMatch[1] || colorMatch[0]})` }}
                    />
                    <span className="text-[10px] font-medium text-muted-foreground">{tpl.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Image filters */}
          {bgImage && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Filtro de imagem</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {imageFilters.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setImageFilter(f.id)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-medium transition-all ${
                      imageFilter === f.id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="space-y-3">
          {!generated && postsToday < maxPostsPerDay ? (
            <>
              <Button
                className="w-full rounded-xl h-12"
                onClick={handleGenerate}
                disabled={generating || elements.length === 0}
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvando...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Salvar e Gerar</>
                )}
              </Button>
              <p className="text-[10px] text-center text-muted-foreground">Você pode gerar até {maxPostsPerDay} posts por dia ({postsToday}/{maxPostsPerDay})</p>
            </>
          ) : (
            <div className="space-y-2">
              <Button className="w-full rounded-xl h-12" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" /> Baixar Story (1080×1920)
              </Button>
              <Button variant="outline" className="w-full rounded-xl h-10" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" /> Compartilhar
              </Button>
            </div>
          )}

          {postsToday >= maxPostsPerDay && !generated && (
            <Card className="p-4 rounded-2xl bg-accent/10 border-accent/20 text-center space-y-2">
              <Check className="w-6 h-6 text-accent mx-auto" />
              <p className="text-sm font-medium">Limite de {maxPostsPerDay} posts atingido hoje!</p>
              <p className="text-xs text-muted-foreground">Volte amanhã para criar novos.</p>
              <Button size="sm" className="rounded-xl" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" /> Baixar último
              </Button>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default SocialPostPage;
