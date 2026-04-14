import { useState, useRef, useCallback } from 'react';
import { Pencil, RotateCw } from 'lucide-react';

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
  rotation?: number;
}

interface CanvasProps {
  elements: DraggableElement[];
  onElementMove: (id: string, x: number, y: number) => void;
  onElementSelect: (id: string | null) => void;
  onElementResize?: (id: string, width: number) => void;
  onElementRotate?: (id: string, rotation: number) => void;
  onOpenEditor?: (id: string) => void;
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

type InteractionMode = 'none' | 'drag' | 'resize' | 'rotate';

const SocialEditorCanvas = ({
  elements,
  onElementMove,
  onElementSelect,
  onElementResize,
  onElementRotate,
  onOpenEditor,
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
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('none');
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ clientX: 0, clientY: 0, startWidth: 0 });
  const [rotateStart, setRotateStart] = useState({ startAngle: 0, startRotation: 0 });

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
    setInteractionMode('drag');
    setActiveElementId(elementId);
    onElementSelect(elementId);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [elements, getPercentPosition, onElementSelect]);

  const handleResizeDown = useCallback((e: React.PointerEvent, elementId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const el = elements.find(el => el.id === elementId);
    if (!el) return;
    setResizeStart({ clientX: e.clientX, clientY: e.clientY, startWidth: el.width || 60 });
    setInteractionMode('resize');
    setActiveElementId(elementId);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [elements]);

  const handleRotateDown = useCallback((e: React.PointerEvent, elementId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const el = elements.find(el => el.id === elementId);
    if (!el) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + (el.x / 100) * rect.width;
    const cy = rect.top + (el.y / 100) * rect.height;
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
    setRotateStart({ startAngle: angle, startRotation: el.rotation || 0 });
    setInteractionMode('rotate');
    setActiveElementId(elementId);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [elements]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (interactionMode === 'none' || !activeElementId) return;

    if (interactionMode === 'drag') {
      const pos = getPercentPosition(e.clientX, e.clientY);
      onElementMove(activeElementId, pos.x - dragOffset.x, pos.y - dragOffset.y);
    } else if (interactionMode === 'resize' && onElementResize) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = e.clientX - resizeStart.clientX;
      const deltaPercent = (dx / rect.width) * 100;
      const newWidth = Math.max(5, Math.min(100, resizeStart.startWidth + deltaPercent));
      onElementResize(activeElementId, newWidth);
    } else if (interactionMode === 'rotate' && onElementRotate) {
      const el = elements.find(el => el.id === activeElementId);
      if (!el) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = rect.left + (el.x / 100) * rect.width;
      const cy = rect.top + (el.y / 100) * rect.height;
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
      const delta = angle - rotateStart.startAngle;
      onElementRotate(activeElementId, rotateStart.startRotation + delta);
    }
  }, [interactionMode, activeElementId, dragOffset, resizeStart, rotateStart, getPercentPosition, onElementMove, onElementResize, onElementRotate, elements]);

  const handlePointerUp = useCallback(() => {
    setInteractionMode('none');
    setActiveElementId(null);
  }, []);

  const handleBackgroundClick = useCallback((e: React.PointerEvent | React.MouseEvent) => {
    // Only deselect if clicking directly on the background, not on an element
    if (e.target === containerRef.current || (e.target as HTMLElement).dataset.bgLayer === 'true') {
      onElementSelect(null);
    }
  }, [onElementSelect]);

  const colorMatch = bgGradient.match(/#[a-f0-9]{6}/gi) || ['#1e3a5f', '#0f1f33'];

  const bgFilterParts: string[] = [];
  if (imageFilter !== 'none') bgFilterParts.push(imageFilter);
  if (bgBlur > 0) bgFilterParts.push(`blur(${bgBlur}px)`);
  const combinedBgFilter = bgFilterParts.length > 0 ? bgFilterParts.join(' ') : undefined;

  const isInteracting = interactionMode !== 'none';

  return (
    <div className="relative w-full h-full">
      {/* Lock button */}
      <button
        onClick={onToggleLock}
        className={`absolute top-12 right-3 z-30 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-md transition-all backdrop-blur-sm ${
          locked
            ? 'bg-primary text-primary-foreground'
            : 'bg-zinc-800/80 text-zinc-400'
        }`}
      >
        {locked ? '🔒' : '🔓'}
      </button>

      <div
        ref={containerRef}
        className={`relative w-full h-full overflow-hidden select-none ${
          locked || isInteracting ? 'touch-none' : ''
        }`}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleBackgroundClick}
      >
        {/* Background gradient */}
        <div
          className="absolute inset-0"
          data-bg-layer="true"
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
            data-bg-layer="true"
          />
        )}

        {/* Overlay */}
        <div
          className="absolute inset-0"
          data-bg-layer="true"
          style={{ backgroundColor: overlayColor, opacity: overlayOpacity }}
        />

        {/* Vignette */}
        {vignette && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,${vignetteIntensity}) 100%)`,
            }}
          />
        )}

        {/* Elements */}
        {elements.map(el => {
          const isSelected = el.id === selectedElementId;
          const isDragging = el.id === activeElementId && interactionMode === 'drag';
          const rotation = el.rotation || 0;

          const commonStyle: React.CSSProperties = {
            left: `${el.x}%`,
            top: `${el.y}%`,
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
            opacity: el.opacity,
          };

          if (el.type === 'image' && el.content) {
            return (
              <div
                key={el.id}
                className={`absolute cursor-move transition-shadow ${isDragging ? 'z-50' : 'z-10'}`}
                style={{ ...commonStyle, width: `${el.width || 60}%` }}
                onPointerDown={e => handlePointerDown(e, el.id)}
              >
                <img src={el.content} alt="" className="w-full h-auto rounded-lg" draggable={false} />
                {isSelected && !isInteracting && <SelectionOverlay el={el} onResize={handleResizeDown} onRotate={handleRotateDown} onEdit={onOpenEditor} />}
              </div>
            );
          }

          if (el.type === 'logo' && el.content) {
            return (
              <div
                key={el.id}
                className={`absolute cursor-move ${isDragging ? 'z-50' : 'z-10'}`}
                style={{ ...commonStyle, width: `${el.width || 15}%` }}
                onPointerDown={e => handlePointerDown(e, el.id)}
              >
                <img src={el.content} alt="logo" className="w-full h-auto" draggable={false} />
                {isSelected && !isInteracting && <SelectionOverlay el={el} onResize={handleResizeDown} onRotate={handleRotateDown} onEdit={onOpenEditor} />}
              </div>
            );
          }

          return (
            <div
              key={el.id}
              className={`absolute cursor-move px-2 py-1 rounded whitespace-pre-wrap text-center max-w-[90%] ${isDragging ? 'z-50' : 'z-10'}`}
              style={{
                ...commonStyle,
                color: el.color,
                fontSize: `${el.fontSize}px`,
                fontFamily: el.fontFamily,
                fontWeight: el.bold ? 'bold' : 'normal',
                fontStyle: el.italic ? 'italic' : 'normal',
                lineHeight: 1.4,
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
              }}
              onPointerDown={e => handlePointerDown(e, el.id)}
            >
              {el.content || (el.type === 'text' ? 'Texto aqui...' : el.type === 'verse-ref' ? 'Referência' : 'Igreja')}
              {isSelected && !isInteracting && <SelectionOverlay el={el} onResize={handleResizeDown} onRotate={handleRotateDown} onEdit={onOpenEditor} />}
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

/** Selection overlay with handles */
const SelectionOverlay = ({
  el,
  onResize,
  onRotate,
  onEdit,
}: {
  el: DraggableElement;
  onResize: (e: React.PointerEvent, id: string) => void;
  onRotate: (e: React.PointerEvent, id: string) => void;
  onEdit?: (id: string) => void;
}) => {
  return (
    <>
      {/* Selection border */}
      <div className="absolute inset-0 border-2 border-primary rounded pointer-events-none" style={{ margin: '-2px' }} />

      {/* Corner dots */}
      {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(corner => (
        <div
          key={corner}
          className={`absolute w-3 h-3 bg-primary rounded-full border-2 border-white shadow-md pointer-events-none ${
            corner === 'top-left' ? '-top-1.5 -left-1.5' :
            corner === 'top-right' ? '-top-1.5 -right-1.5' :
            corner === 'bottom-left' ? '-bottom-1.5 -left-1.5' :
            '-bottom-1.5 -right-1.5'
          }`}
        />
      ))}

      {/* Resize handle (bottom-right, interactive) */}
      <div
        className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-primary rounded-full border-2 border-white shadow-lg cursor-se-resize flex items-center justify-center z-20"
        onPointerDown={e => onResize(e, el.id)}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M7 1L1 7M7 4L4 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Rotate handle (top center) */}
      <div
        className="absolute -top-7 left-1/2 -translate-x-1/2 w-5 h-5 bg-primary rounded-full border-2 border-white shadow-lg cursor-grab flex items-center justify-center z-20"
        onPointerDown={e => onRotate(e, el.id)}
      >
        <RotateCw className="w-2.5 h-2.5 text-white" />
      </div>

      {/* Line from element to rotate handle */}
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-px h-4 bg-primary pointer-events-none" />

      {/* Edit button */}
      {onEdit && (
        <button
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-white text-[10px] font-bold shadow-lg z-20 whitespace-nowrap hover:bg-primary/90 transition-colors"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onEdit(el.id); }}
        >
          <Pencil className="w-2.5 h-2.5" />
          Editar
        </button>
      )}
    </>
  );
};

export default SocialEditorCanvas;
