import { DraggableElement } from './SocialEditorCanvas';

export interface StoryTemplate {
  id: string;
  name: string;
  category: 'devocional' | 'culto' | 'evento' | 'motivacional' | 'minimalista';
  bgGradient: string;
  textColor: string;
  overlayColor: string;
  overlayOpacity: number;
  vignette: boolean;
  vignetteIntensity: number;
  fontStyle: string;
  thumbnail: string; // CSS gradient for preview
  defaultElements: Omit<DraggableElement, 'id'>[];
}

let _templateIdCounter = 1000;
const tplId = () => `tpl-el-${++_templateIdCounter}`;

export const storyTemplates: StoryTemplate[] = [
  {
    id: 'dark-verse',
    name: 'Versículo Dark',
    category: 'devocional',
    bgGradient: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%)',
    textColor: '#ffffff',
    overlayColor: 'rgba(0,0,0,0.3)',
    overlayOpacity: 0.3,
    vignette: true,
    vignetteIntensity: 0.6,
    fontStyle: 'serif',
    thumbnail: 'linear-gradient(135deg, #0f0f0f, #1a1a2e)',
    defaultElements: [
      { type: 'text', x: 50, y: 35, content: '"Porque Deus amou o mundo de tal maneira..."', fontSize: 24, fontFamily: 'Georgia, serif', color: '#ffffff', bold: false, italic: true, opacity: 1 },
      { type: 'verse-ref', x: 50, y: 55, content: 'João 3:16', fontSize: 16, fontFamily: "'Space Grotesk', sans-serif", color: '#a78bfa', bold: true, italic: false, opacity: 0.9 },
    ],
  },
  {
    id: 'golden-light',
    name: 'Luz Dourada',
    category: 'devocional',
    bgGradient: 'linear-gradient(135deg, #92702e 0%, #3d2e10 100%)',
    textColor: '#fef3c7',
    overlayColor: 'rgba(30,20,0,0.4)',
    overlayOpacity: 0.4,
    vignette: true,
    vignetteIntensity: 0.7,
    fontStyle: 'serif',
    thumbnail: 'linear-gradient(135deg, #92702e, #3d2e10)',
    defaultElements: [
      { type: 'text', x: 50, y: 40, content: 'A Palavra é lâmpada para os meus pés', fontSize: 22, fontFamily: 'Georgia, serif', color: '#fef3c7', bold: false, italic: true, opacity: 1 },
      { type: 'verse-ref', x: 50, y: 58, content: 'Salmos 119:105', fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: '#fbbf24', bold: true, italic: false, opacity: 0.85 },
    ],
  },
  {
    id: 'sunset-fire',
    name: 'Pôr do Sol',
    category: 'motivacional',
    bgGradient: 'linear-gradient(135deg, #f97316 0%, #7c2d12 100%)',
    textColor: '#ffffff',
    overlayColor: 'rgba(124,45,18,0.3)',
    overlayOpacity: 0.3,
    vignette: false,
    vignetteIntensity: 0.5,
    fontStyle: 'sans-serif',
    thumbnail: 'linear-gradient(135deg, #f97316, #7c2d12)',
    defaultElements: [
      { type: 'text', x: 50, y: 40, content: 'Confie no Senhor de todo o seu coração', fontSize: 24, fontFamily: "'Space Grotesk', sans-serif", color: '#ffffff', bold: true, italic: false, opacity: 1 },
      { type: 'verse-ref', x: 50, y: 58, content: 'Provérbios 3:5', fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: '#fed7aa', bold: false, italic: false, opacity: 0.9 },
    ],
  },
  {
    id: 'royal-purple',
    name: 'Real Roxo',
    category: 'culto',
    bgGradient: 'linear-gradient(135deg, #7c3aed 0%, #1e1b4b 100%)',
    textColor: '#e0e7ff',
    overlayColor: 'rgba(30,27,75,0.35)',
    overlayOpacity: 0.35,
    vignette: true,
    vignetteIntensity: 0.5,
    fontStyle: 'sans-serif',
    thumbnail: 'linear-gradient(135deg, #7c3aed, #1e1b4b)',
    defaultElements: [
      { type: 'text', x: 50, y: 38, content: 'Venha adorar conosco', fontSize: 26, fontFamily: "'Space Grotesk', sans-serif", color: '#e0e7ff', bold: true, italic: false, opacity: 1 },
      { type: 'text', x: 50, y: 55, content: 'Domingo · 18h', fontSize: 18, fontFamily: "'DM Sans', sans-serif", color: '#c4b5fd', bold: false, italic: false, opacity: 0.85 },
    ],
  },
  {
    id: 'forest-calm',
    name: 'Floresta',
    category: 'motivacional',
    bgGradient: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)',
    textColor: '#ecfdf5',
    overlayColor: 'rgba(6,78,59,0.3)',
    overlayOpacity: 0.3,
    vignette: true,
    vignetteIntensity: 0.5,
    fontStyle: 'serif',
    thumbnail: 'linear-gradient(135deg, #059669, #064e3b)',
    defaultElements: [
      { type: 'text', x: 50, y: 40, content: 'Ele renova as minhas forças', fontSize: 22, fontFamily: 'Georgia, serif', color: '#ecfdf5', bold: false, italic: true, opacity: 1 },
      { type: 'verse-ref', x: 50, y: 58, content: 'Salmos 23:3', fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: '#6ee7b7', bold: true, italic: false, opacity: 0.9 },
    ],
  },
  {
    id: 'clean-white',
    name: 'Clean',
    category: 'minimalista',
    bgGradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    textColor: '#1e293b',
    overlayColor: 'rgba(255,255,255,0.3)',
    overlayOpacity: 0.3,
    vignette: false,
    vignetteIntensity: 0.3,
    fontStyle: 'sans-serif',
    thumbnail: 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
    defaultElements: [
      { type: 'text', x: 50, y: 40, content: 'Paz a todos', fontSize: 28, fontFamily: "'Space Grotesk', sans-serif", color: '#1e293b', bold: true, italic: false, opacity: 1 },
    ],
  },
  {
    id: 'midnight-blue',
    name: 'Meia-Noite',
    category: 'devocional',
    bgGradient: 'linear-gradient(180deg, #0c1445 0%, #1e3a5f 50%, #0f1f33 100%)',
    textColor: '#ffffff',
    overlayColor: 'rgba(0,0,40,0.3)',
    overlayOpacity: 0.3,
    vignette: true,
    vignetteIntensity: 0.65,
    fontStyle: 'serif',
    thumbnail: 'linear-gradient(180deg, #0c1445, #1e3a5f, #0f1f33)',
    defaultElements: [
      { type: 'text', x: 50, y: 35, content: 'O Senhor é meu pastor e nada me faltará', fontSize: 22, fontFamily: 'Georgia, serif', color: '#ffffff', bold: false, italic: true, opacity: 1 },
      { type: 'verse-ref', x: 50, y: 55, content: 'Salmos 23:1', fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: '#93c5fd', bold: true, italic: false, opacity: 0.9 },
    ],
  },
  {
    id: 'rose-warm',
    name: 'Rosa Quente',
    category: 'evento',
    bgGradient: 'linear-gradient(135deg, #be185d 0%, #831843 100%)',
    textColor: '#fce7f3',
    overlayColor: 'rgba(80,10,40,0.3)',
    overlayOpacity: 0.3,
    vignette: false,
    vignetteIntensity: 0.4,
    fontStyle: 'sans-serif',
    thumbnail: 'linear-gradient(135deg, #be185d, #831843)',
    defaultElements: [
      { type: 'text', x: 50, y: 35, content: 'Chá de Mulheres', fontSize: 28, fontFamily: "'Space Grotesk', sans-serif", color: '#fce7f3', bold: true, italic: false, opacity: 1 },
      { type: 'text', x: 50, y: 52, content: 'Um encontro especial', fontSize: 16, fontFamily: "'DM Sans', sans-serif", color: '#fbcfe8', bold: false, italic: true, opacity: 0.9 },
      { type: 'text', x: 50, y: 70, content: 'Sábado · 15h', fontSize: 18, fontFamily: "'DM Sans', sans-serif", color: '#fce7f3', bold: true, italic: false, opacity: 0.85 },
    ],
  },
];

export const templateCategories = [
  { id: 'all', label: 'Todos' },
  { id: 'devocional', label: 'Devocional' },
  { id: 'culto', label: 'Culto' },
  { id: 'evento', label: 'Evento' },
  { id: 'motivacional', label: 'Motivacional' },
  { id: 'minimalista', label: 'Minimalista' },
] as const;
