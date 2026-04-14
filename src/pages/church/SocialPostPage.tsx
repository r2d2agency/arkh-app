import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Share2, Download, Camera, Upload, Loader2, Sparkles, Check, ImageIcon, Type, Palette, RotateCcw,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/sonner';

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
  filter: string;
}

const templates: PostTemplate[] = [
  {
    id: 'classic',
    name: 'Clássico',
    bgGradient: 'linear-gradient(135deg, #1e3a5f 0%, #0f1f33 100%)',
    textColor: '#ffffff',
    overlayColor: 'rgba(0,0,0,0.55)',
    fontStyle: 'serif',
    filter: 'none',
  },
  {
    id: 'golden',
    name: 'Dourado',
    bgGradient: 'linear-gradient(135deg, #92702e 0%, #3d2e10 100%)',
    textColor: '#fef3c7',
    overlayColor: 'rgba(30,20,0,0.6)',
    fontStyle: 'serif',
    filter: 'sepia(0.3)',
  },
  {
    id: 'sunset',
    name: 'Pôr do Sol',
    bgGradient: 'linear-gradient(135deg, #f97316 0%, #7c2d12 100%)',
    textColor: '#ffffff',
    overlayColor: 'rgba(124,45,18,0.55)',
    fontStyle: 'sans-serif',
    filter: 'saturate(1.3)',
  },
  {
    id: 'purple',
    name: 'Roxo',
    bgGradient: 'linear-gradient(135deg, #7c3aed 0%, #1e1b4b 100%)',
    textColor: '#e0e7ff',
    overlayColor: 'rgba(30,27,75,0.6)',
    fontStyle: 'sans-serif',
    filter: 'none',
  },
  {
    id: 'nature',
    name: 'Natureza',
    bgGradient: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)',
    textColor: '#ecfdf5',
    overlayColor: 'rgba(6,78,59,0.55)',
    fontStyle: 'serif',
    filter: 'saturate(1.2)',
  },
  {
    id: 'minimal',
    name: 'Minimalista',
    bgGradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    textColor: '#1e293b',
    overlayColor: 'rgba(255,255,255,0.7)',
    fontStyle: 'sans-serif',
    filter: 'grayscale(0.1)',
  },
];

const SocialPostPage = () => {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [devotional, setDevotional] = useState<Devotional | null>(null);
  const [verseText, setVerseText] = useState('');
  const [verseRef, setVerseRef] = useState('');
  const [customText, setCustomText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<PostTemplate>(templates[0]);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [generatedToday, setGeneratedToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [churchName, setChurchName] = useState('');
  const [churchLogoUrl, setChurchLogoUrl] = useState<string | null>(null);
  const [churchLogoImg, setChurchLogoImg] = useState<HTMLImageElement | null>(null);

  // Pre-load church logo image when URL changes
  useEffect(() => {
    if (!churchLogoUrl) { setChurchLogoImg(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setChurchLogoImg(img);
    img.onerror = () => setChurchLogoImg(null);
    img.src = churchLogoUrl;
  }, [churchLogoUrl]);

  useEffect(() => {
    Promise.all([
      api.get<Devotional>('/api/church/devotional').catch(() => null),
      api.get<{ generated_today: boolean }>('/api/church/social/today').catch(() => ({ generated_today: false })),
      api.get<{ name: string; logo_url: string | null }>('/api/church/info').catch(() => ({ name: '', logo_url: null })),
    ]).then(([dev, today, info]) => {
      if (dev) {
        setDevotional(dev);
        setVerseText(dev.verse);
        setVerseRef(dev.verse_reference);
      }
      setGeneratedToday(today.generated_today);
      setChurchName(info.name || '');
      setChurchLogoUrl(info.logo_url || null);
    }).finally(() => setLoading(false));
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setUserPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 1080;
    const H = 1080;
    canvas.width = W;
    canvas.height = H;

    const tpl = selectedTemplate;

    // Background
    const drawContent = () => {
      // Apply gradient background
      const gradient = ctx.createLinearGradient(0, 0, W, H);
      // Parse gradient colors from template
      const colorMatch = tpl.bgGradient.match(/#[a-f0-9]{6}/gi) || ['#1e3a5f', '#0f1f33'];
      gradient.addColorStop(0, colorMatch[0]);
      gradient.addColorStop(1, colorMatch[1] || colorMatch[0]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);

      // Overlay for readability
      ctx.fillStyle = tpl.overlayColor;
      ctx.fillRect(0, 0, W, H);

      // Decorative elements
      ctx.strokeStyle = tpl.textColor + '15';
      ctx.lineWidth = 1;
      // Top decorative line
      ctx.beginPath();
      ctx.moveTo(W * 0.15, H * 0.12);
      ctx.lineTo(W * 0.85, H * 0.12);
      ctx.stroke();
      // Bottom decorative line
      ctx.beginPath();
      ctx.moveTo(W * 0.15, H * 0.88);
      ctx.lineTo(W * 0.85, H * 0.88);
      ctx.stroke();

      // Quote marks
      ctx.fillStyle = tpl.textColor + '30';
      const quoteFont = tpl.fontStyle === 'serif' ? 'Georgia' : 'Arial';
      ctx.font = `bold 120px ${quoteFont}`;
      ctx.textAlign = 'left';
      ctx.fillText('"', W * 0.1, H * 0.25);
      ctx.textAlign = 'right';
      ctx.fillText('"', W * 0.9, H * 0.75);

      // Verse text
      ctx.fillStyle = tpl.textColor;
      const mainFont = tpl.fontStyle === 'serif' ? 'Georgia' : 'Arial';
      ctx.font = `italic 36px ${mainFont}`;
      ctx.textAlign = 'center';

      const text = customText || verseText || 'Seu versículo aqui...';
      const lines = wrapText(ctx, text, W * 0.7);
      const lineHeight = 52;
      const startY = H * 0.35 + ((8 - lines.length) * lineHeight) / 2;

      lines.forEach((line, i) => {
        ctx.fillText(line, W / 2, startY + i * lineHeight);
      });

      // Reference
      if (verseRef) {
        ctx.font = `bold 28px ${mainFont}`;
        ctx.fillStyle = tpl.textColor + 'cc';
        ctx.fillText(`— ${verseRef}`, W / 2, startY + lines.length * lineHeight + 40);
      }

      // Church logo watermark at bottom-right
      if (churchLogoImg) {
        const logoSize = 80;
        const padding = 30;
        ctx.globalAlpha = 0.5;
        ctx.drawImage(churchLogoImg, W - logoSize - padding, H - logoSize - padding, logoSize, logoSize);
        ctx.globalAlpha = 1.0;
      }

      // Church name at bottom
      if (churchName) {
        ctx.font = `600 22px Arial`;
        ctx.fillStyle = tpl.textColor + '88';
        ctx.textAlign = 'center';
        ctx.fillText(churchName, W / 2, H * 0.92);
      }

      // User name
      ctx.font = `500 20px Arial`;
      ctx.fillStyle = tpl.textColor + '66';
      ctx.textAlign = 'center';
      ctx.fillText(`@${user?.name || ''}`, W / 2, H * 0.96);
    };

    if (userPhoto) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Draw photo covering the canvas
        const scale = Math.max(W / img.width, H / img.height);
        const x = (W - img.width * scale) / 2;
        const y = (H - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        // Apply filter effect
        if (tpl.filter !== 'none') {
          ctx.filter = tpl.filter;
          ctx.drawImage(canvas, 0, 0);
          ctx.filter = 'none';
        }

        drawContent();
      };
      img.src = userPhoto;
    } else {
      drawContent();
    }
  }, [selectedTemplate, verseText, verseRef, customText, userPhoto, churchName, user?.name]);

  useEffect(() => {
    if (!loading) drawCanvas();
  }, [drawCanvas, loading]);

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  const handleGenerate = async () => {
    if (generatedToday) {
      toast.error('Você já gerou seu post de hoje. Volte amanhã!');
      return;
    }
    setGenerating(true);
    try {
      await api.post('/api/church/social/generate', {
        verse_text: verseText,
        verse_reference: verseRef,
        custom_text: customText,
        template_id: selectedTemplate.id,
      });
      setGenerated(true);
      setGeneratedToday(true);
      toast.success('Post salvo! Agora baixe e compartilhe.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar post');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `post-${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Imagem baixada!');
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'post.png', { type: 'image/png' });
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

  const useDevotional = () => {
    if (devotional) {
      setVerseText(devotional.verse);
      setVerseRef(devotional.verse_reference);
      setCustomText('');
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
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Share2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold">Post para Redes</h1>
          <p className="text-xs text-muted-foreground">
            {generatedToday && !generated ? 'Você já gerou seu post de hoje' : 'Crie 1 post por dia com o versículo'}
          </p>
        </div>
      </div>

      {/* Preview */}
      <Card className="rounded-2xl overflow-hidden">
        <div className="relative aspect-square bg-muted">
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain"
            style={{ imageRendering: 'auto' }}
          />
        </div>
      </Card>

      {/* Templates */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-sm font-semibold">
          <Palette className="w-4 h-4" /> Modelo
        </Label>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {templates.map(tpl => {
            const colorMatch = tpl.bgGradient.match(/#[a-f0-9]{6}/gi) || ['#1e3a5f'];
            return (
              <button
                key={tpl.id}
                onClick={() => setSelectedTemplate(tpl)}
                className={`shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                  selectedTemplate.id === tpl.id
                    ? 'ring-2 ring-primary bg-primary/10'
                    : 'hover:bg-muted'
                }`}
              >
                <div
                  className="w-12 h-12 rounded-lg"
                  style={{ background: `linear-gradient(135deg, ${colorMatch[0]}, ${colorMatch[1] || colorMatch[0]})` }}
                />
                <span className="text-[10px] font-medium text-muted-foreground">{tpl.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Photo */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-sm font-semibold">
          <ImageIcon className="w-4 h-4" /> Sua foto (opcional)
        </Label>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoUpload}
          />
          <Button
            variant="outline"
            className="flex-1 rounded-xl border-dashed border-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            {userPhoto ? 'Trocar foto' : 'Enviar foto'}
          </Button>
          {userPhoto && (
            <Button variant="outline" className="rounded-xl" onClick={() => setUserPhoto(null)}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Text */}
      <div className="space-y-3">
        <Label className="flex items-center gap-1.5 text-sm font-semibold">
          <Type className="w-4 h-4" /> Texto do post
        </Label>

        {devotional && (
          <Button variant="outline" size="sm" className="rounded-xl w-full" onClick={useDevotional}>
            <Sparkles className="w-4 h-4 mr-2 text-gold" />
            Usar devocional do dia
          </Button>
        )}

        <Textarea
          value={customText || verseText}
          onChange={e => {
            setCustomText(e.target.value);
          }}
          className="rounded-xl"
          rows={3}
          placeholder="Digite o texto do post ou use o devocional..."
        />
        <Input
          value={verseRef}
          onChange={e => setVerseRef(e.target.value)}
          className="rounded-xl"
          placeholder="Referência (ex: João 3:16)"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {!generated && !generatedToday ? (
          <Button
            className="flex-1 rounded-xl"
            onClick={handleGenerate}
            disabled={generating || (!verseText && !customText)}
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Gerando...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Gerar Post</>
            )}
          </Button>
        ) : (
          <>
            <Button className="flex-1 rounded-xl" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" /> Baixar
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={handleShare}>
              <Share2 className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      {generatedToday && !generated && (
        <Card className="p-4 rounded-2xl bg-gold/10 border-gold/20 text-center space-y-2">
          <Check className="w-6 h-6 text-gold mx-auto" />
          <p className="text-sm font-medium">Você já gerou seu post de hoje!</p>
          <p className="text-xs text-muted-foreground">Volte amanhã para criar um novo com o versículo do dia.</p>
          <div className="flex gap-2 justify-center pt-1">
            <Button size="sm" className="rounded-xl" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" /> Baixar último
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SocialPostPage;
