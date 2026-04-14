import { DraggableElement } from './SocialEditorCanvas';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Bold, Italic, Trash2 } from 'lucide-react';

interface Props {
  element: DraggableElement;
  onChange: (updates: Partial<DraggableElement>) => void;
  onDelete: () => void;
}

const fonts = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: "'Space Grotesk', sans-serif", label: 'Space Grotesk' },
  { value: "'DM Sans', sans-serif", label: 'DM Sans' },
  { value: "'Courier New', monospace", label: 'Courier' },
  { value: 'Impact, sans-serif', label: 'Impact' },
];

const ElementToolbar = ({ element, onChange, onDelete }: Props) => {
  const isText = element.type !== 'image' && element.type !== 'logo';

  return (
    <div className="space-y-3 p-3 bg-card rounded-xl border border-border">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {element.type === 'image' ? 'Imagem' : element.type === 'logo' ? 'Logo' : element.type === 'verse-ref' ? 'Referência' : element.type === 'church-name' ? 'Igreja' : 'Texto'}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {isText && (
        <>
          <div>
            <Label className="text-xs">Conteúdo</Label>
            {element.content.length > 50 ? (
              <Textarea
                value={element.content}
                onChange={e => onChange({ content: e.target.value })}
                className="rounded-lg text-xs mt-1"
                rows={3}
              />
            ) : (
              <Input
                value={element.content}
                onChange={e => onChange({ content: e.target.value })}
                className="rounded-lg text-xs mt-1"
              />
            )}
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs">Fonte</Label>
              <Select value={element.fontFamily} onValueChange={v => onChange({ fontFamily: v })}>
                <SelectTrigger className="rounded-lg text-xs mt-1 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fonts.map(f => (
                    <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-1">
              <Button
                variant={element.bold ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-8"
                onClick={() => onChange({ bold: !element.bold })}
              >
                <Bold className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant={element.italic ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-8"
                onClick={() => onChange({ italic: !element.italic })}
              >
                <Italic className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="text-xs">Tamanho: {element.fontSize}px</Label>
              <Slider
                value={[element.fontSize]}
                onValueChange={([v]) => onChange({ fontSize: v })}
                min={10}
                max={48}
                step={1}
                className="mt-1"
              />
            </div>
            <div className="w-16">
              <Label className="text-xs">Cor</Label>
              <input
                type="color"
                value={element.color}
                onChange={e => onChange({ color: e.target.value })}
                className="w-full h-8 rounded-lg border border-border cursor-pointer mt-1"
              />
            </div>
          </div>
        </>
      )}

      {(element.type === 'image' || element.type === 'logo') && (
        <div>
          <Label className="text-xs">Largura: {element.width || 60}%</Label>
          <Slider
            value={[element.width || 60]}
            onValueChange={([v]) => onChange({ width: v })}
            min={10}
            max={100}
            step={1}
            className="mt-1"
          />
        </div>
      )}

      <div>
        <Label className="text-xs">Opacidade: {Math.round(element.opacity * 100)}%</Label>
        <Slider
          value={[element.opacity * 100]}
          onValueChange={([v]) => onChange({ opacity: v / 100 })}
          min={10}
          max={100}
          step={5}
          className="mt-1"
        />
      </div>
    </div>
  );
};

export default ElementToolbar;
