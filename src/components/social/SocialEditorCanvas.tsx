import { useState, useRef, useCallback } from 'react';

export interface DraggableElement {
  id: string;
  type: 'text' | 'image' | 'verse-ref' | 'church-name' | 'logo';
  x: number;
  y: number;
  content: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  opacity: number;
  width?: number;
  height?: number;
  objectFit?: 'cover' | 'contain';
}

interface CanvasProps {
  elements: DraggableElement[];
  onElementMove: (id: string, x: number, y: number) => void;
  onElementSelect: (id: string | null) => void;
  selectedElementId: string | null;
  bgGradient: string;
  bgImage: string | null;
  imageFilter: string;
  overlayColor: string;
  overlayOpacity: number;
  bgBlur: number;
  vignette: boolean;
  vignetteIntensity: number;
  locked: boolean;
  onToggleLock: () => void;
}

const SocialEditorCanvas = ({
  elements,
  onElementMove,
  onElementSelect,
  selectedElementId,
  bgGradient,
  bgImage,
  imageFilter,
  overlayColor,
  overlayOpacity,
  bgBlur,
  vignette,
  vignetteIntensity,
  locked,
  onToggleLock,
}: CanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const getPercentPosition = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent, elementId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const el = elements.find(el => el.id === elementId);
    if (!el) return;
    const pos = getPercentPosition(e.clientX, e.clientY);
    setDragOffset({ x: pos.x - el.x, y: pos.y - el.y });
    setDragging(elementId);
    onElementSelect(elementId);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [elements, getPercentPosition, onElementSelect]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const pos = getPercentPosition(e.clientX, e.clientY);
    onElementMove(dragging, pos.x - dragOffset.x, pos.y - dragOffset.y);
  }, [dragging, dragOffset, getPercentPosition, onElementMove]);

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    onElementSelect(null);
  }, [onElementSelect]);

  const colorMatch = bgGradient.match(/#[a-f0-9]{6}/gi) || ['#1e3a5f', '#0f1f33'];

  // Build combined filter for bg image
  const bgFilterParts: string[] = [];
  if (imageFilter !== 'none') bgFilterParts.push(imageFilter);
  if (bgBlur > 0) bgFilterParts.push(`blur(${bgBlur}px)`);
  const combinedBgFilter = bgFilterParts.length > 0 ? bgFilterParts.join(' ') : undefined;

  return (
    <div className="relative">
      {/* Lock button */}
      <button
        onClick={onToggleLock}
        className={`absolute -top-3 right-2 z-30 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-md transition-all ${
          locked
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {locked ? '🔒 Travado' : '🔓 Travar'}
      </button>

      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden rounded-2xl border-2 shadow-lg select-none ${
          locked || dragging ? 'touch-none border-primary/50' : 'border-border'
        }`}
        style={{ aspectRatio: '9/16' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleBackgroundClick}
      >
        {/* Background gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${colorMatch[0]}, ${colorMatch[1] || colorMatch[0]})`,
          }}
        />

        {/* Background image */}
        {bgImage && (
          <img
            src={bgImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: combinedBgFilter }}
            draggable={false}
          />
        )}

        {/* Overlay with adjustable opacity */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: overlayColor,
            opacity: overlayOpacity,
          }}
        />

        {/* Vignette effect */}
        {vignette && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,${vignetteIntensity}) 100%)`,
            }}
          />
        )}

        {/* Draggable elements */}
        {elements.map(el => {
          const isSelected = el.id === selectedElementId;
          const isDraggingThis = el.id === dragging;

          if (el.type === 'image' && el.content) {
            return (
              <div
                key={el.id}
                className={`absolute cursor-move transition-shadow ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''} ${isDraggingThis ? 'z-50' : 'z-10'}`}
                style={{
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: `${el.width || 60}%`,
                  opacity: el.opacity,
                }}
                onPointerDown={e => handlePointerDown(e, el.id)}
              >
                <img
                  src={el.content}
                  alt=""
                  className="w-full h-auto rounded-lg"
                  draggable={false}
                />
              </div>
            );
          }

          if (el.type === 'logo' && el.content) {
            return (
              <div
                key={el.id}
                className={`absolute cursor-move ${isSelected ? 'ring-2 ring-primary ring-offset-1 rounded' : ''} ${isDraggingThis ? 'z-50' : 'z-10'}`}
                style={{
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: `${el.width || 15}%`,
                  opacity: el.opacity,
                }}
                onPointerDown={e => handlePointerDown(e, el.id)}
              >
                <img src={el.content} alt="logo" className="w-full h-auto" draggable={false} />
              </div>
            );
          }

          return (
            <div
              key={el.id}
              className={`absolute cursor-move px-2 py-1 rounded transition-shadow whitespace-pre-wrap text-center max-w-[90%] ${isSelected ? 'ring-2 ring-primary bg-black/10' : ''} ${isDraggingThis ? 'z-50' : 'z-10'}`}
              style={{
                left: `${el.x}%`,
                top: `${el.y}%`,
                transform: 'translate(-50%, -50%)',
                color: el.color,
                fontSize: `${el.fontSize}px`,
                fontFamily: el.fontFamily,
                fontWeight: el.bold ? 'bold' : 'normal',
                fontStyle: el.italic ? 'italic' : 'normal',
                opacity: el.opacity,
                lineHeight: 1.4,
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
              }}
              onPointerDown={e => handlePointerDown(e, el.id)}
            >
              {el.content || (el.type === 'text' ? 'Texto aqui...' : el.type === 'verse-ref' ? 'Referência' : 'Igreja')}
            </div>
          );
        })}

        {elements.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm font-medium pointer-events-none">
            Adicione elementos para começar
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialEditorCanvas;
