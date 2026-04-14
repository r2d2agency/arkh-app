import { DraggableElement } from './SocialEditorCanvas';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Bold, Italic, Trash2, ChevronUp, ChevronDown, type LucideIcon } from 'lucide-react';

interface Props {
  element: DraggableElement;
  onChange: (updates: Partial<DraggableElement>) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

const fonts = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: "'Space Grotesk', sans-serif", label: 'Space Grotesk' },
  { value: "'DM Sans', sans-serif", label: 'DM Sans' },
  { value: "'Courier New', monospace", label: 'Courier' },
  { value: 'Impact, sans-serif', label: 'Impact' },
  { value: "'Playfair Display', serif", label: 'Playfair Display' },
  { value: "'Poppins', sans-serif", label: 'Poppins' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat' },
  { value: "'Roboto', sans-serif", label: 'Roboto' },
  { value: "'Oswald', sans-serif", label: 'Oswald' },
  { value: "'Lora', serif", label: 'Lora' },
  { value: "'Raleway', sans-serif", label: 'Raleway' },
  { value: "'Bebas Neue', sans-serif", label: 'Bebas Neue' },
  { value: "'Pacifico', cursive", label: 'Pacifico' },
  { value: "'Dancing Script', cursive", label: 'Dancing Script' },
  { value: "'Lobster', cursive", label: 'Lobster' },
  { value: "'Merriweather', serif", label: 'Merriweather' },
  { value: "'Nunito', sans-serif", label: 'Nunito' },
  { value: "'Abril Fatface', serif", label: 'Abril Fatface' },
  { value: "'Satisfy', cursive", label: 'Satisfy' },
  { value: "'Great Vibes', cursive", label: 'Great Vibes' },
  { value: "'Righteous', sans-serif", label: 'Righteous' },
  { value: "'Cinzel', serif", label: 'Cinzel' },
];

const quickColors = ['#ffffff', '#000000', '#fbbf24', '#f97316', '#ef4444', '#a78bfa', '#3b82f6', '#10b981', '#ec4899', '#6ee7b7'];

const ElementToolbar = ({ element, onChange, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: Props) => {
  const isText = element.type !== 'image' && element.type !== 'logo';

  const typeLabel = {
    image: 'Imagem',
    logo: 'Logo',
    'verse-ref': 'Referência',
    'church-name': 'Igreja',
    text: 'Texto',
  }[element.type] || 'Elemento';

  return (
    <div className="space-y-4">
      {/* Header with type + actions */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">{typeLabel}</span>
        <div className="flex items-center gap-1">
          {onMoveDown && (
            <button
              onClick={onMoveDown}
              disabled={!canMoveDown}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              title="Mover para trás"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}
          {onMoveUp && (
            <button
              onClick={onMoveUp}
              disabled={!canMoveUp}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              title="Mover para frente"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onDelete}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/15 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isText && (
        <>
          {/* Content */}
          <div>
            {element.content.length > 40 ? (
              <Textarea
                value={element.content}
                onChange={e => onChange({ content: e.target.value })}
                className="rounded-xl text-sm bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 resize-none"
                rows={3}
                placeholder="Digite o texto..."
              />
            ) : (
              <Input
                value={element.content}
                onChange={e => onChange({ content: e.target.value })}
                className="rounded-xl text-sm bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                placeholder="Digite o texto..."
              />
            )}
          </div>

          {/* Font selector + bold/italic */}
          <div className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <select
                value={element.fontFamily}
                onChange={e => onChange({ fontFamily: e.target.value })}
                className="w-full h-9 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs px-3 appearance-none cursor-pointer focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                style={{ fontFamily: element.fontFamily }}
              >
                {fonts.map(f => (
                  <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => onChange({ bold: !element.bold })}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                element.bold ? 'bg-primary text-primary-foreground' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => onChange({ italic: !element.italic })}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                element.italic ? 'bg-primary text-primary-foreground' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              <Italic className="w-4 h-4" />
            </button>
          </div>

          {/* Font size */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-zinc-500">Tamanho</span>
              <span className="text-[10px] font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-md">{element.fontSize}px</span>
            </div>
            <Slider
              value={[element.fontSize]}
              onValueChange={([v]) => onChange({ fontSize: v })}
              min={10} max={48} step={1}
            />
          </div>

          {/* Quick colors */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-zinc-500">Cor</span>
            <div className="flex items-center gap-1.5">
              {quickColors.map(c => (
                <button
                  key={c}
                  onClick={() => onChange({ color: c })}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    element.color === c ? 'border-primary scale-110' : 'border-zinc-700 hover:border-zinc-500'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={element.color}
                onChange={e => onChange({ color: e.target.value })}
                className="w-6 h-6 rounded-full border-2 border-zinc-700 cursor-pointer bg-transparent"
                title="Cor personalizada"
              />
            </div>
          </div>
        </>
      )}

      {/* Image/Logo width */}
      {(element.type === 'image' || element.type === 'logo') && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-zinc-500">Largura</span>
            <span className="text-[10px] font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-md">{element.width || 60}%</span>
          </div>
          <Slider
            value={[element.width || 60]}
            onValueChange={([v]) => onChange({ width: v })}
            min={10} max={100} step={1}
          />
        </div>
      )}

      {/* Opacity - for all elements */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-zinc-500">Opacidade</span>
          <span className="text-[10px] font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-md">{Math.round(element.opacity * 100)}%</span>
        </div>
        <Slider
          value={[element.opacity * 100]}
          onValueChange={([v]) => onChange({ opacity: v / 100 })}
          min={10} max={100} step={5}
        />
      </div>
    </div>
  );
};

export default ElementToolbar;
